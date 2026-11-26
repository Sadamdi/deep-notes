import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { ArrowLeft, FilePenLine, Plus, Save, Trash2 } from "lucide-react";
import { createWorkspaceNoteSchema, updateWorkspaceNoteSchema, type SourceAccepted, type SourceResponse, type WorkspaceAiTask, type WorkspaceNoteResponse } from "@deep-notes/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, ErrorState, LoadingState, PageTitle } from "@/components/shared/PageStates";
import { useCreateWorkspaceNote, useDeleteWorkspaceNote, useNotebook, useSources, useUpdateWorkspaceNote, useWorkspaceNotes } from "@/features/notebooks/queries";
import { readWorkspaceNotes, type WorkspaceNote } from "@/features/notebooks/localNotes";
import { SourcePageDialog } from "@/features/sources/SourcePageDialog";
import { AiAssistPanel } from "@/features/answers/AiAssistPanel";
import { useSelectedText } from "@/features/answers/useSelectedText";
import { ApiRequestError, api, jsonBody } from "@/lib/api";

export function WorkspaceNotesPage() {
  const { notebookId = "" } = useParams();
  const notebook = useNotebook(notebookId);
  const sources = useSources(notebookId);
  const notesQuery = useWorkspaceNotes(notebookId);
  const [legacyNotes, setLegacyNotes] = useState<WorkspaceNote[]>(() => readWorkspaceNotes(notebookId));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [page, setPage] = useState("");
  const [message, setMessage] = useState("");
  const initializedFor = useRef("");
  const createNote = useCreateWorkspaceNote(notebookId);
  const updateNote = useUpdateWorkspaceNote(notebookId, selectedId ?? "");
  const deleteNote = useDeleteWorkspaceNote(notebookId);
  const notes = notesQuery.data ?? [];
  const selectedContent = useSelectedText(body);
  const makeSource = useMutation({
    mutationFn: () => api<SourceAccepted>(`/notebooks/${notebookId}/sources/text`, jsonBody("POST", { title: title.trim(), text: body.trim() })),
    onSuccess: async (source) => { setMessage(`“${source.title}” dikirim untuk dibaca dan akan tersedia setelah siap.`); await sources.refetch(); },
  });
  const selectedNote = useMemo(() => notes.find((note) => note.id === selectedId) ?? null, [notes, selectedId]);
  const notesToImport = legacyNotes.filter((note) => !notes.some((saved) => saved.id === note.id));
  const importLegacy = useMutation({
    mutationFn: async () => {
      let imported = 0;
      for (const note of notesToImport) {
        const source = sources.data?.find((item) => item.id === note.sourceId);
        const parsed = createWorkspaceNoteSchema.parse({
          id: note.id,
          title: note.title,
          body: note.body,
          sourceId: source ? note.sourceId : null,
          page: source && note.page && (!source.pageCount || note.page <= source.pageCount) ? note.page : null,
        });
        await api<WorkspaceNoteResponse>(`/notebooks/${notebookId}/notes`, jsonBody("POST", parsed));
        imported++;
      }
      return imported;
    },
    onSuccess: async (count) => {
      await notesQuery.refetch();
      setMessage(`${count} catatan lama berhasil diimpor. Salinan di browser tetap disimpan.`);
    },
  });

  const openNote = (note: WorkspaceNoteResponse) => {
    setSelectedId(note.id);
    setTitle(note.title);
    setBody(note.body);
    setSourceId(note.sourceId ?? "");
    setPage(note.page?.toString() ?? "");
    setMessage("");
  };

  useEffect(() => {
    initializedFor.current = "";
    setSelectedId(null);
    setTitle("");
    setBody("");
    setSourceId("");
    setPage("");
    setMessage("");
    setLegacyNotes(readWorkspaceNotes(notebookId));
  }, [notebookId]);

  useEffect(() => {
    if (!notesQuery.isSuccess || initializedFor.current === notebookId) return;
    initializedFor.current = notebookId;
    if (notes[0]) openNote(notes[0]);
  }, [notebookId, notesQuery.isSuccess, notes]);

  const backToLearning = <Button asChild variant="outline"><Link to={`/workspaces/${notebookId}`}><ArrowLeft aria-hidden="true"/>Kembali ke belajar</Link></Button>;

  if (notebook.isPending || sources.isPending || notesQuery.isPending) return <div className="space-y-4">{backToLearning}<LoadingState label="Memuat catatan workspace…"/></div>;
  if (notebook.isError) return <div className="space-y-4">{backToLearning}<ErrorState message={notebook.error.message} onRetry={() => void notebook.refetch()}/></div>;
  if (sources.isError) return <div className="space-y-4">{backToLearning}<ErrorState message={sources.error.message} onRetry={() => void sources.refetch()}/></div>;
  if (notesQuery.isError) return <div className="space-y-4">{backToLearning}<ErrorState message={notesQuery.error instanceof ApiRequestError && notesQuery.error.status === 404 ? "Server belum menyediakan API catatan ini atau akses workspace berubah. Sambungkan ke backend terbaru; salinan lama di browser tetap aman." : notesQuery.error.message} onRetry={() => void notesQuery.refetch()}/></div>;
  const readySources = sources.data.filter((source: SourceResponse) => source.status === "ready");
  const currentSource = readySources.find((source) => source.id === selectedNote?.sourceId);
  const startNew = () => { setSelectedId(null); setTitle(""); setBody(""); setSourceId(readySources[0]?.id ?? ""); setPage(""); setMessage(""); };
  const save = async () => {
    const parsedPage = page.trim() ? Number(page) : null;
    const noteInput = {
      title: title.trim(),
      body: body.trim(),
      sourceId: sourceId || null,
      page: parsedPage,
    };
    const parsed = createWorkspaceNoteSchema.safeParse(noteInput);
    if (!parsed.success) { setMessage("Periksa judul, isi, dan halaman sumber sebelum menyimpan."); return; }
    const selectedSource = readySources.find((source) => source.id === sourceId);
    if (parsedPage !== null && selectedSource?.pageCount != null && parsedPage > selectedSource.pageCount) { setMessage(`Halaman harus antara 1 dan ${selectedSource.pageCount}.`); return; }
    try {
      const saved = selectedId
        ? await updateNote.mutateAsync(updateWorkspaceNoteSchema.parse(parsed.data))
        : await createNote.mutateAsync(parsed.data);
      openNote(saved);
      setMessage("Catatan berhasil disimpan ke akunmu.");
    } catch (error) {
      setMessage(error instanceof ApiRequestError ? error.message : "Catatan belum berhasil disimpan.");
    }
  };
  const remove = async () => {
    if (!selectedId) return;
    try {
      await deleteNote.mutateAsync(selectedId);
      const next = notes.find((note) => note.id !== selectedId);
      if (next) openNote(next);
      else startNew();
      setMessage("Catatan berhasil dihapus dari server.");
    } catch (error) {
      setMessage(error instanceof ApiRequestError ? error.message : "Catatan belum berhasil dihapus.");
    }
  };

  return <div className="space-y-6"><PageTitle eyebrow={notebook.data.title} title="Catatan workspace" description="Simpan ringkasan pribadi dan tautkan ke halaman sumber yang mendukungnya." action={backToLearning}/>
    {notesToImport.length > 0 && <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warning/50 bg-warning/15 p-4 text-sm leading-6"><p><strong className="text-navy">Ada {notesToImport.length} catatan lama di browser ini.</strong> Impor ke akunmu; salinan browser tidak akan dihapus.</p><Button disabled={importLegacy.isPending} onClick={() => importLegacy.mutate()} size="sm">{importLegacy.isPending ? "Mengimpor…" : "Impor catatan lama"}</Button></div>}
    {importLegacy.isError && <p className="text-sm text-destructive" role="alert">{importLegacy.error instanceof ApiRequestError ? importLegacy.error.message : "Sebagian catatan belum berhasil diimpor. Coba lagi; item yang sudah masuk tidak akan digandakan."}</p>}
    <div className="grid gap-5 xl:grid-cols-[minmax(220px,0.65fr)_minmax(0,1.35fr)]">
      <aside className="space-y-4 rounded-3xl border bg-card p-4 sm:p-5"><div className="flex items-center justify-between gap-2"><h2 className="font-bold text-navy">Catatan saya</h2><Button aria-label="Buat catatan baru" onClick={startNew} size="icon-sm" variant="outline"><Plus aria-hidden="true"/></Button></div>
        {notes.length ? <ul className="space-y-2">{notes.map((note) => <li key={note.id}><button aria-current={selectedId === note.id ? "page" : undefined} className={`w-full rounded-xl border p-3 text-left ${selectedId === note.id ? "border-primary bg-secondary/40" : "hover:bg-muted/70"}`} onClick={() => openNote(note)}><span className="block truncate text-sm font-semibold text-navy">{note.title}</span><span className="mt-1 block text-xs text-muted-foreground">Diperbarui {new Date(note.updatedAt).toLocaleDateString("id-ID")}</span></button></li>)}</ul> : <EmptyState title="Belum ada catatan" description="Catatan yang kamu buat akan tersimpan ke akunmu."/>}
      </aside>
      <section className="space-y-4 rounded-3xl border bg-card p-4 sm:p-6"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><FilePenLine aria-hidden="true" className="size-4 text-teal"/><h2 className="font-bold text-navy">Ringkasan belajar</h2></div>{selectedNote && <Button disabled={deleteNote.isPending} onClick={() => void remove()} size="sm" variant="outline"><Trash2 aria-hidden="true"/>Hapus</Button>}</div>
        <div className="space-y-2"><Label htmlFor="note-title">Judul catatan</Label><Input id="note-title" maxLength={120} onChange={(event) => setTitle(event.target.value)} value={title}/></div>
        <div className="space-y-2"><Label htmlFor="note-body">Isi catatan</Label><Textarea className="min-h-48" id="note-body" maxLength={10000} onChange={(event) => { setBody(event.target.value); selectedContent.clear(); }} onSelect={selectedContent.onSelect} placeholder="Tulis ringkasanmu sendiri dari materi yang sudah dipelajari." value={body}/></div>
        <AiAssistPanel availableTasks={["summarize", "suggest_questions", "practice_guide"] satisfies WorkspaceAiTask[]} input={selectedContent.input} description="Pilih sebagian teks untuk bantuan terarah; jika tidak ada yang dipilih, seluruh kolom digunakan." notebookId={notebookId} onApply={(text) => { setBody((current) => [current.trim(), text].filter(Boolean).join("\n\n")); selectedContent.clear(); }} sources={sources.data} title="Bantuan belajar dari catatan"/>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_130px]"><div className="space-y-2"><Label htmlFor="note-source">Acuan sumber <span className="font-normal text-muted-foreground">(opsional)</span></Label><select className="h-10 w-full rounded-xl border bg-background px-3 text-sm" id="note-source" onChange={(event) => { setSourceId(event.target.value); setPage(""); }} value={sourceId}><option value="">Tanpa acuan sumber</option>{readySources.map((source) => <option key={source.id} value={source.id}>{source.title}</option>)}</select></div><div className="space-y-2"><Label htmlFor="note-page">Halaman <span className="font-normal text-muted-foreground">(opsional)</span></Label><Input id="note-page" max={readySources.find((source) => source.id === sourceId)?.pageCount ?? undefined} min={1} onChange={(event) => setPage(event.target.value)} type="number" value={page}/></div></div>
        {message && <p className="text-sm text-muted-foreground" role="status">{message}</p>}
        {makeSource.isError && <p className="text-sm text-destructive" role="alert">{makeSource.error instanceof ApiRequestError ? makeSource.error.message : "Catatan belum berhasil dijadikan sumber."}</p>}
        {notebook.data.role !== "viewer" && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-secondary/40 p-3"><p className="text-xs leading-5 text-muted-foreground">Anggota workspace dapat memakai catatan ini sebagai sumber setelah selesai diproses.</p><Button disabled={makeSource.isPending || !title.trim() || body.trim().length < 20} onClick={() => makeSource.mutate()} size="sm" type="button" variant="outline">{makeSource.isPending ? "Mengirim catatan…" : "Jadikan sumber workspace"}</Button></div>}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4"><div className="flex flex-wrap items-center gap-3">{currentSource && selectedNote?.page && <SourcePageDialog notebookId={notebookId} page={selectedNote.page} sourceId={currentSource.id} sourceTitle={currentSource.title}/ >}{selectedNote && <Button asChild size="sm" variant="outline"><Link to={`/studio?note=${selectedNote.id}&notebook=${notebookId}`}>Buat draf tulisan</Link></Button>}</div><Button disabled={!title.trim() || !body.trim() || createNote.isPending || updateNote.isPending} onClick={() => void save()}><Save aria-hidden="true"/>{createNote.isPending || updateNote.isPending ? "Menyimpan…" : "Simpan catatan"}</Button></div>
      </section>
    </div>
  </div>;
}
