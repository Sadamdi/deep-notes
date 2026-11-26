import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, Paperclip, Send } from "lucide-react";
import { createDiscussionMessageSchema, type DiscussionMessage, type DiscussionResponse, type SourceResponse } from "@deep-notes/shared";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ErrorState, LoadingState, PageTitle } from "@/components/shared/PageStates";
import { useAuthMe } from "@/features/auth/useAuth";
import { useNotebook, useSources } from "@/features/notebooks/queries";
import { AiAssistPanel } from "@/features/answers/AiAssistPanel";
import { useSelectedText } from "@/features/answers/useSelectedText";
import { ApiRequestError, api, jsonBody } from "@/lib/api";

type LegacyMessage = { id: string; userId: string; author: string; body: string; sourceId: string | null; createdAt: string };

function readLegacyMessages(notebookId: string): LegacyMessage[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(`deep-notes:local-discussion:v1:${notebookId}`) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is LegacyMessage => Boolean(item && typeof item === "object" && "id" in item && typeof item.id === "string" && "userId" in item && typeof item.userId === "string" && "author" in item && typeof item.author === "string" && "body" in item && typeof item.body === "string" && "sourceId" in item && (typeof item.sourceId === "string" || item.sourceId === null) && "createdAt" in item && typeof item.createdAt === "string")) : [];
  } catch {
    return [];
  }
}

export function WorkspaceDiscussionPage() {
  const { notebookId = "" } = useParams();
  const queryClient = useQueryClient();
  const auth = useAuthMe();
  const notebook = useNotebook(notebookId);
  const sources = useSources(notebookId);
  const [legacyMessages, setLegacyMessages] = useState(() => readLegacyMessages(notebookId));
  const [body, setBody] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [notice, setNotice] = useState("");
  const selectedContent = useSelectedText(body);
  const discussionKey = ["notebooks", notebookId, "discussion"] as const;
  const messagesQuery = useInfiniteQuery({
    queryKey: discussionKey,
    initialPageParam: null as string | null,
    enabled: Boolean(notebookId),
    queryFn: ({ pageParam }) => api<DiscussionResponse>(`/notebooks/${notebookId}/discussion?limit=30${pageParam ? `&before=${encodeURIComponent(pageParam)}` : ""}`),
    getNextPageParam: (lastPage) => lastPage.nextBefore ?? undefined,
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
  });
  const messages = useMemo(() => messagesQuery.data?.pages.flatMap((page) => page.messages).reverse() ?? [], [messagesQuery.data]);
  const legacyForAccount = legacyMessages.filter((message) => message.userId === auth.data?.id);
  const importedIds = new Set(messages.map((message) => message.id));
  const legacyToImport = legacyForAccount.filter((message) => !importedIds.has(message.id));
  const send = useMutation({
    mutationFn: (input: ReturnType<typeof createDiscussionMessageSchema.parse>) => api<DiscussionMessage>(`/notebooks/${notebookId}/discussion`, jsonBody("POST", input)),
    onSuccess: async () => {
      setBody("");
      setNotice("Pesan berhasil dikirim ke diskusi workspace.");
      selectedContent.clear();
      await queryClient.invalidateQueries({ queryKey: discussionKey });
    },
    onError: (error) => setNotice(error instanceof Error ? error.message : "Pesan belum berhasil dikirim."),
  });
  const importLegacy = useMutation({
    mutationFn: async () => {
      let count = 0;
      for (const message of legacyToImport) {
        const attachedSource = sources.data?.some((source) => source.id === message.sourceId);
        const id = /^[0-9a-f-]{36}$/i.test(message.id) ? message.id : undefined;
        const input = createDiscussionMessageSchema.parse({ id, body: message.body, sourceId: attachedSource ? message.sourceId : null });
        await api<DiscussionMessage>(`/notebooks/${notebookId}/discussion`, jsonBody("POST", input));
        count++;
      }
      return count;
    },
    onSuccess: async (count) => {
      await queryClient.invalidateQueries({ queryKey: discussionKey });
      setNotice(`${count} pesan lama berhasil diproses. Salinan browser tetap disimpan.`);
    },
  });

  useEffect(() => { setLegacyMessages(readLegacyMessages(notebookId)); setBody(""); setSourceId(""); setNotice(""); }, [notebookId]);

  const backToLearning = <Button asChild variant="outline"><Link to={`/workspaces/${notebookId}`}><ArrowLeft aria-hidden="true"/>Kembali ke belajar</Link></Button>;

  if (auth.isPending || notebook.isPending || sources.isPending || messagesQuery.isPending) return <div className="space-y-4">{backToLearning}<LoadingState label="Membuka diskusi workspace…"/></div>;
  if (auth.isError || !auth.data) return <div className="space-y-4">{backToLearning}<ErrorState message={auth.error?.message ?? "Akun belum berhasil dimuat."}/></div>;
  if (notebook.isError) return <div className="space-y-4">{backToLearning}<ErrorState message={notebook.error.message} onRetry={() => void notebook.refetch()}/></div>;
  if (sources.isError) return <div className="space-y-4">{backToLearning}<ErrorState message={sources.error.message} onRetry={() => void sources.refetch()}/></div>;
  if (messagesQuery.isError) return <div className="space-y-4">{backToLearning}<ErrorState message={messagesQuery.error instanceof ApiRequestError && messagesQuery.error.status === 404 ? "Server belum menyediakan API diskusi ini atau akses workspace berubah. Sambungkan ke backend terbaru; pesan lokal tetap aman." : messagesQuery.error.message} onRetry={() => void messagesQuery.refetch()}/></div>;
  const source = sources.data.find((item: SourceResponse) => item.id === sourceId);
  const submit = () => {
    const parsed = createDiscussionMessageSchema.safeParse({ body: body.trim(), sourceId: source?.id ?? null });
    if (!parsed.success) { setNotice("Tulis pesan maksimal 2.000 karakter sebelum mengirim."); return; }
    send.mutate(parsed.data);
  };

  return <div className="space-y-6"><PageTitle eyebrow={notebook.data.title} title="Diskusi workspace" description="Catat hal yang ingin dibahas dan lampirkan sumber yang relevan." action={backToLearning}/>
    {legacyMessages.length > 0 && <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warning/50 bg-warning/15 p-4 text-sm leading-6"><p><strong className="text-navy">Ada {legacyMessages.length} pesan lama di browser ini.</strong> Impor pesan yang dibuat akun ini; pesan akun lain tidak akan dikirim atas namamu.</p><Button disabled={!legacyToImport.length || importLegacy.isPending} onClick={() => importLegacy.mutate()} size="sm">{importLegacy.isPending ? "Mengimpor…" : "Impor pesan lama"}</Button></div>}
    {importLegacy.isError && <p className="text-sm text-destructive" role="alert">{importLegacy.error instanceof Error ? importLegacy.error.message : "Sebagian pesan belum berhasil diimpor. Coba lagi; pengiriman ulang tidak menggandakan pesan."}</p>}
    <section aria-label="Pesan diskusi" className="space-y-3 rounded-3xl border bg-card p-4 sm:p-6">{messagesQuery.hasNextPage && <Button disabled={messagesQuery.isFetchingNextPage} onClick={() => void messagesQuery.fetchNextPage()} size="sm" variant="outline">{messagesQuery.isFetchingNextPage ? "Memuat…" : "Muat diskusi sebelumnya"}</Button>}{messages.length ? messages.map((message) => { const attachment = sources.data.find((item) => item.id === message.sourceId); return <article className="rounded-2xl bg-muted/50 p-4" key={message.id}><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-navy">{message.authorName}{message.authorId === auth.data.id ? " · kamu" : ""}</p><time className="text-xs text-muted-foreground" dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString("id-ID")}</time></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{message.body}</p>{attachment && <p className="mt-3 rounded-xl bg-white p-3 text-xs font-medium">Materi terkait · {attachment.title}</p>}</article>; }) : <div className="rounded-2xl border border-dashed p-8 text-center"><h2 className="font-semibold text-navy">Belum ada pesan diskusi</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Pesan baru akan muncul di sini untuk semua anggota workspace.</p></div>}</section>
    <section className="space-y-3 rounded-3xl border bg-card p-4 sm:p-6"><label className="text-sm font-semibold" htmlFor="discussion-message">Pesan</label><Textarea id="discussion-message" maxLength={2000} onChange={(event) => { setBody(event.target.value); selectedContent.clear(); }} onSelect={selectedContent.onSelect} placeholder="Tulis pesan untuk dibahas bersama…" value={body}/><AiAssistPanel availableTasks={["draft", "summarize", "suggest_questions"]} applyLabel="Gunakan hasil pada pesan" input={selectedContent.input} description="Pilih sebagian teks untuk bantuan terarah; jika tidak ada yang dipilih, seluruh kolom digunakan." notebookId={notebookId} onApply={(text) => { if (text.length > 2000) { setNotice("Hasil Bubi melebihi batas 2.000 karakter. Ringkas dulu sebelum dipakai."); return; } setBody(text); selectedContent.clear(); setNotice("Hasil Bubi dimasukkan ke pesan. Periksa sebelum mengirim."); }} sources={sources.data} title="Bantuan untuk pesan"/><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><label className="inline-flex items-center gap-2 text-sm text-muted-foreground" htmlFor="discussion-source"><Paperclip aria-hidden="true" className="size-4"/>Lampirkan materi</label><select className="h-10 min-w-0 rounded-xl border bg-background px-3 text-sm sm:max-w-xs" id="discussion-source" onChange={(event) => setSourceId(event.target.value)} value={sourceId}><option value="">Tanpa lampiran</option>{sources.data.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></div><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground" role="status">{notice || `${body.length}/2.000 karakter`}</p><Button disabled={!body.trim() || send.isPending} onClick={submit}><Send aria-hidden="true"/>{send.isPending ? "Mengirim…" : "Kirim pesan"}</Button></div></section>
  </div>;
}
