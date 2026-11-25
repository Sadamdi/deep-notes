import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, Paperclip, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ErrorState, LoadingState, PageTitle } from "@/components/shared/PageStates";
import { useAuthMe } from "@/features/auth/useAuth";
import { useNotebook, useSources } from "@/features/notebooks/queries";
import { AiAssistPanel } from "@/features/answers/AiAssistPanel";
import { useSelectedText } from "@/features/answers/useSelectedText";
import type { SourceResponse } from "@deep-notes/shared";

type LocalMessage = { id: string; userId: string; author: string; body: string; sourceId: string | null; createdAt: string };

function readMessages(notebookId: string): LocalMessage[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(`deep-notes:local-discussion:v1:${notebookId}`) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is LocalMessage => Boolean(item && typeof item === "object" && "id" in item && typeof item.id === "string" && "userId" in item && typeof item.userId === "string" && "author" in item && typeof item.author === "string" && "body" in item && typeof item.body === "string" && "sourceId" in item && (typeof item.sourceId === "string" || item.sourceId === null) && "createdAt" in item && typeof item.createdAt === "string")) : [];
  } catch {
    return [];
  }
}

export function WorkspaceDiscussionPage() {
  const { notebookId = "" } = useParams();
  const auth = useAuthMe();
  const notebook = useNotebook(notebookId);
  const sources = useSources(notebookId);
  const [messages, setMessages] = useState(() => readMessages(notebookId));
  const [body, setBody] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [notice, setNotice] = useState("");
  const selectedContent = useSelectedText(body);
  useEffect(() => { setMessages(readMessages(notebookId)); setBody(""); setSourceId(""); setNotice(""); }, [notebookId]);
  if (auth.isPending || notebook.isPending || sources.isPending) return <LoadingState label="Membuka diskusi workspace…"/>;
  if (auth.isError || !auth.data) return <ErrorState message={auth.error?.message ?? "Akun belum berhasil dimuat."}/>;
  if (notebook.isError) return <ErrorState message={notebook.error.message} onRetry={() => void notebook.refetch()}/>;
  if (sources.isError) return <ErrorState message={sources.error.message} onRetry={() => void sources.refetch()}/>;
  const source = sources.data.find((item: SourceResponse) => item.id === sourceId);
  const send = () => {
    if (!body.trim()) { setNotice("Tulis pesan sebelum mengirim."); return; }
    const next: LocalMessage[] = [...messages, { id: crypto.randomUUID(), userId: auth.data.id, author: auth.data.name, body: body.trim(), sourceId: source?.id ?? null, createdAt: new Date().toISOString() }];
    try {
      window.localStorage.setItem(`deep-notes:local-discussion:v1:${notebookId}`, JSON.stringify(next));
      setMessages(next); setBody(""); setNotice("Pesan tersimpan di perangkat ini saja.");
    } catch {
      setNotice("Browser tidak dapat menyimpan pesan di perangkat ini.");
    }
  };

  return <div className="space-y-6"><PageTitle eyebrow={notebook.data.title} title="Diskusi workspace" description="Catat hal yang ingin dibahas dan lampirkan sumber yang relevan." action={<Button asChild variant="outline"><Link to={`/workspaces/${notebookId}`}><ArrowLeft aria-hidden="true"/>Kembali ke workspace</Link></Button>}/>
    <div className="rounded-2xl border border-warning/50 bg-warning/15 p-4 text-sm leading-6"><strong className="text-navy">Diskusi lokal di perangkat ini.</strong> Pesan tidak dikirim ke anggota lain karena backend belum menyediakan endpoint diskusi workspace.</div>
    <section aria-label="Pesan lokal" className="space-y-3 rounded-3xl border bg-card p-4 sm:p-6">{messages.length ? messages.map((message) => { const attachment = sources.data.find((item) => item.id === message.sourceId); return <article className="rounded-2xl bg-muted/50 p-4" key={message.id}><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-navy">{message.author}{message.userId === auth.data.id ? " · kamu" : ""}</p><time className="text-xs text-muted-foreground" dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString("id-ID")}</time></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{message.body}</p>{attachment && <p className="mt-3 rounded-xl bg-white p-3 text-xs font-medium">Materi terkait · {attachment.title}</p>}</article>; }) : <div className="rounded-2xl border border-dashed p-8 text-center"><h2 className="font-semibold text-navy">Belum ada catatan diskusi</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Pesan yang kamu simpan secara lokal akan muncul di sini.</p></div>}</section>
    <section className="space-y-3 rounded-3xl border bg-card p-4 sm:p-6"><label className="text-sm font-semibold" htmlFor="discussion-message">Pesan</label><Textarea id="discussion-message" maxLength={2000} onChange={(event) => { setBody(event.target.value); selectedContent.clear(); }} onSelect={selectedContent.onSelect} placeholder="Tulis pesan untuk dibahas bersama…" value={body}/><AiAssistPanel availableTasks={["draft", "summarize", "suggest_questions"]} applyLabel="Gunakan hasil pada pesan" input={selectedContent.input} description="Pilih sebagian teks untuk bantuan terarah; jika tidak ada yang dipilih, seluruh kolom digunakan." notebookId={notebookId} onApply={(text) => { if (text.length > 2000) { setNotice("Hasil Bubi melebihi batas 2.000 karakter. Ringkas dulu sebelum dipakai."); return; } setBody(text); selectedContent.clear(); setNotice("Hasil Bubi dimasukkan ke pesan. Periksa sebelum menyimpan."); }} sources={sources.data} title="Bantuan untuk pesan"/><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><label className="inline-flex items-center gap-2 text-sm text-muted-foreground" htmlFor="discussion-source"><Paperclip aria-hidden="true" className="size-4"/>Lampirkan materi</label><select className="h-10 min-w-0 rounded-xl border bg-background px-3 text-sm sm:max-w-xs" id="discussion-source" onChange={(event) => setSourceId(event.target.value)} value={sourceId}><option value="">Tanpa lampiran</option>{sources.data.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></div><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{notice || `${body.length}/2.000 karakter`}</p><Button disabled={!body.trim()} onClick={send}><Send aria-hidden="true"/>Simpan pesan</Button></div></section>
  </div>;
}
