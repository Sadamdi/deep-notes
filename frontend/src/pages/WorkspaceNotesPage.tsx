import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { ArrowLeft, FilePenLine, Plus, Save, Trash2 } from "lucide-react";
import type { SourceAccepted, SourceResponse, WorkspaceAiTask } from "@deep-notes/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, ErrorState, LoadingState, PageTitle } from "@/components/shared/PageStates";
import { useNotebook, useSources } from "@/features/notebooks/queries";
import { readWorkspaceNotes, writeWorkspaceNotes, type WorkspaceNote } from "@/features/notebooks/localNotes";
import { SourcePageDialog } from "@/features/sources/SourcePageDialog";
import { AiAssistPanel } from "@/features/answers/AiAssistPanel";
import { useSelectedText } from "@/features/answers/useSelectedText";
import { ApiRequestError, api, jsonBody } from "@/lib/api";

export function WorkspaceNotesPage() {
  const { notebookId = "" } = useParams();
  const notebook = useNotebook(notebookId);
  const sources = useSources(notebookId);
  const [notes, setNotes] = useState(() => readWorkspaceNotes(notebookId));
  const [selectedId, setSelectedId] = useState<string | null>(notes[0]?.id ?? null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [page, setPage] = useState("");
  const [message, setMessage] = useState("");
  const selectedContent = useSelectedText(body);
  const makeSource = useMutation({
    mutationFn: () => api<SourceAccepted>(`/notebooks/${notebookId}/sources/text`, jsonBody("POST", { title: title.trim(), text: body.trim() })),
    onSuccess: async (source) => { setMessage(`“${source.title}” dikirim untuk dibaca dan akan tersedia setelah siap.`); await sources.refetch(); },
  });
  const selectedNote = useMemo(() => notes.find((note) => note.id === selectedId) ?? null, [notes, selectedId]);

  useEffect(() => {
    const next = readWorkspaceNotes(notebookId);
    setNotes(next);
    setSelectedId(next[0]?.id ?? null);
    setTitle(next[0]?.title ?? "");
    setBody(next[0]?.body ?? "");
    setSourceId(next[0]?.sourceId ?? "");
    setPage(next[0]?.page?.toString() ?? "");
    setMessage("");
  }, [notebookId]);

  if (notebook.isPending || sources.isPending) return <LoadingState label="Memuat catatan workspace…"/>;
  if (notebook.isError) return <ErrorState message={notebook.error.message} onRetry={() => void notebook.refetch()}/>;
  if (sources.isError) return <ErrorState message={sources.error.message} onRetry={() => void sources.refetch()}/>;
  const readySources = sources.data.filter((source: SourceResponse) => source.status === "ready");
  const currentSource = readySources.find((source) => source.id === selectedNote?.sourceId);
  const startNew = () => { setSelectedId(null); setTitle(""); setBody(""); setSourceId(readySources[0]?.id ?? ""); setPage(""); setMessage(""); };
  const openNote = (note: WorkspaceNote) => { setSelectedId(note.id); setTitle(note.title); setBody(note.body); setSourceId(note.sourceId); setPage(note.page?.toString() ?? ""); setMessage(""); };
  const save = () => {
    if (!title.trim() || !body.trim()) { setMessage("Isi judul dan catatan sebelum menyimpan."); return; }
    if (!readySources.some((source) => source.id === sourceId)) { setMessage("Pilih sumber workspace yang siap sebagai acuan."); return; }
    const parsedPage = page.trim() ? Number(page) : null;
    const selectedSource = readySources.find((source) => source.id === sourceId)!;
    if (parsedPage !== null && (!Number.isInteger(parsedPage) || parsedPage < 1 || (selectedSource.pageCount !== null && parsedPage > selectedSource.pageCount))) { setMessage(selectedSource.pageCount === null ? "Halaman harus berupa angka positif." : `Halaman harus antara 1 dan ${selectedSource.pageCount}.`); return; }
    const note: WorkspaceNote = { id: selectedId ?? crypto.randomUUID(), title: title.trim(), body: body.trim(), sourceId, page: parsedPage, updatedAt: new Date().toISOString() };
    const next = [note, ...notes.filter((item) => item.id !== note.id)];
    if (!writeWorkspaceNotes(notebookId, next)) { setMessage("Browser tidak dapat menyimpan catatan di perangkat ini."); return; }
    setNotes(next); setSelectedId(note.id); setMessage("Catatan tersimpan di perangkat ini.");
  };
  const remove = () => {
    if (!selectedId) return;
    const next = notes.filter((note) => note.id !== selectedId);
    if (!writeWorkspaceNotes(notebookId, next)) { setMessage("Browser tidak dapat menghapus catatan dari perangkat ini."); return; }
    setNotes(next); setSelectedId(next[0]?.id ?? null); setTitle(next[0]?.title ?? ""); setBody(next[0]?.body ?? ""); setSourceId(next[0]?.sourceId ?? ""); setPage(next[0]?.page?.toString() ?? ""); setMessage("Catatan dihapus dari perangkat ini.");
  };

  return <div className="space-y-6"><PageTitle eyebrow={notebook.data.title} title="Catatan workspace" description="Simpan ringkasan pribadi dan tautkan ke halaman sumber yang mendukungnya." action={<Button asChild variant="outline"><Link to={`/workspaces/${notebookId}`}><ArrowLeft aria-hidden="true"/>Kembali ke belajar</Link></Button>}/>
    <div className="rounded-2xl border border-warning/50 bg-warning/15 p-4 text-sm leading-6"><strong className="text-navy">Tersimpan di perangkat ini.</strong> Catatan belum disinkronkan ke anggota lain karena backend belum menyediakan API catatan.</div>
    <div className="grid gap-5 xl:grid-cols-[minmax(220px,0.65fr)_minmax(0,1.35fr)]">
      <aside className="space-y-4 rounded-3xl border bg-card p-4 sm:p-5"><div className="flex items-center justify-between gap-2"><h2 className="font-bold text-navy">Catatan saya</h2><Button aria-label="Buat catatan baru" onClick={startNew} size="icon-sm" variant="outline"><Plus aria-hidden="true"/></Button></div>
        {notes.length ? <ul className="space-y-2">{notes.map((note) => <li key={note.id}><button aria-current={selectedId === note.id ? "page" : undefined} className={`w-full rounded-xl border p-3 text-left ${selectedId === note.id ? "border-primary bg-secondary/40" : "hover:bg-muted/70"}`} onClick={() => openNote(note)}><span className="block truncate text-sm font-semibold text-navy">{note.title}</span><span className="mt-1 block text-xs text-muted-foreground">Diperbarui {new Date(note.updatedAt).toLocaleDateString("id-ID")}</span></button></li>)}</ul> : <EmptyState title="Belum ada catatan" description="Catatan yang kamu buat akan muncul di daftar ini."/>}
      </aside>
      <section className="space-y-4 rounded-3xl border bg-card p-4 sm:p-6"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><FilePenLine aria-hidden="true" className="size-4 text-teal"/><h2 className="font-bold text-navy">Ringkasan belajar</h2></div>{selectedNote && <Button onClick={remove} size="sm" variant="outline"><Trash2 aria-hidden="true"/>Hapus</Button>}</div>
        <div className="space-y-2"><Label htmlFor="note-title">Judul catatan</Label><Input id="note-title" maxLength={120} onChange={(event) => setTitle(event.target.value)} value={title}/></div>
        <div className="space-y-2"><Label htmlFor="note-body">Isi catatan</Label><Textarea className="min-h-48" id="note-body" maxLength={10000} onChange={(event) => { setBody(event.target.value); selectedContent.clear(); }} onSelect={selectedContent.onSelect} placeholder="Tulis ringkasanmu sendiri dari materi yang sudah dipelajari." value={body}/></div>
        <AiAssistPanel availableTasks={["summarize", "suggest_questions", "practice_guide"] satisfies WorkspaceAiTask[]} input={selectedContent.input} description="Pilih sebagian teks untuk bantuan terarah; jika tidak ada yang dipilih, seluruh kolom digunakan." notebookId={notebookId} onApply={(text) => { setBody((current) => [current.trim(), text].filter(Boolean).join("\n\n")); selectedContent.clear(); }} sources={sources.data} title="Bantuan belajar dari catatan"/>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_130px]"><div className="space-y-2"><Label htmlFor="note-source">Acuan sumber</Label><select className="h-10 w-full rounded-xl border bg-background px-3 text-sm" id="note-source" onChange={(event) => { setSourceId(event.target.value); setPage(""); }} value={sourceId}><option value="">Pilih sumber yang siap</option>{readySources.map((source) => <option key={source.id} value={source.id}>{source.title}</option>)}</select></div><div className="space-y-2"><Label htmlFor="note-page">Halaman <span className="font-normal text-muted-foreground">(opsional)</span></Label><Input id="note-page" max={readySources.find((source) => source.id === sourceId)?.pageCount ?? undefined} min={1} onChange={(event) => setPage(event.target.value)} type="number" value={page}/></div></div>
        {message && <p className="text-sm text-muted-foreground" role="status">{message}</p>}
        {makeSource.isError && <p className="text-sm text-destructive" role="alert">{makeSource.error instanceof ApiRequestError ? makeSource.error.message : "Catatan belum berhasil dijadikan sumber."}</p>}
        {notebook.data.role !== "viewer" && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-secondary/40 p-3"><p className="text-xs leading-5 text-muted-foreground">Anggota workspace dapat memakai catatan ini sebagai sumber setelah selesai diproses.</p><Button disabled={makeSource.isPending || !title.trim() || body.trim().length < 20} onClick={() => makeSource.mutate()} size="sm" type="button" variant="outline">{makeSource.isPending ? "Mengirim catatan…" : "Jadikan sumber workspace"}</Button></div>}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4"><div className="flex flex-wrap items-center gap-3">{currentSource && selectedNote?.page && <SourcePageDialog notebookId={notebookId} page={selectedNote.page} sourceId={currentSource.id} sourceTitle={currentSource.title}/ >}{selectedNote && <Button asChild size="sm" variant="outline"><Link to={`/studio?note=${selectedNote.id}&notebook=${notebookId}`}>Buat draf tulisan</Link></Button>}</div><Button disabled={!readySources.length} onClick={save}><Save aria-hidden="true"/>Simpan catatan</Button></div>
      </section>
    </div>
  </div>;
}
