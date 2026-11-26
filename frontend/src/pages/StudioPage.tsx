import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { BookOpenText, FilePenLine, Plus, Save, Trash2 } from "lucide-react";
import { createWriterDraftSchema, updateWriterDraftSchema, type CreateWriterDraftInput, type WriterDraftResponse } from "@deep-notes/shared";
import { AppDialog } from "@/components/shared/AppDialog";
import { EmptyState, ErrorState, LoadingState, PageTitle } from "@/components/shared/PageStates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { readWriterDrafts, type LocalDraft } from "@/features/studio/localDrafts";
import { useCreateWriterDraft, useDeleteWriterDraft, useUpdateWriterDraft, useWriterDrafts } from "@/features/studio/queries";
import { useNotebooks, useSources, useWorkspaceNotes } from "@/features/notebooks/queries";
import { AiAssistPanel } from "@/features/answers/AiAssistPanel";
import { useSelectedText } from "@/features/answers/useSelectedText";
import { ApiRequestError, api, jsonBody } from "@/lib/api";

export function StudioPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const requestedDraftId = searchParams.get("draft");
  const importedNoteId = searchParams.get("note");
  const importedNotebookId = searchParams.get("notebook");
  const notebooks = useNotebooks();
  const draftsQuery = useWriterDrafts();
  const notesQuery = useWorkspaceNotes(importedNotebookId ?? "");
  const [assistNotebookId, setAssistNotebookId] = useState(importedNotebookId ?? "");
  const assistSources = useSources(assistNotebookId);
  const [legacyDrafts] = useState<LocalDraft[]>(readWriterDrafts);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const selectedContent = useSelectedText([title, summary, body].filter(Boolean).join("\n"));
  const [notice, setNotice] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const drafts = draftsQuery.data ?? [];
  const selectedDraft = useMemo(() => drafts.find((draft) => draft.id === selectedId) ?? null, [drafts, selectedId]);
  const createDraft = useCreateWriterDraft();
  const updateDraft = useUpdateWriterDraft(selectedId ?? "");
  const deleteDraftMutation = useDeleteWriterDraft();
  const legacyToImport = legacyDrafts.filter((draft) => !drafts.some((saved) => saved.id === draft.id));
  const copiedNote = useRef("");
  const importLegacy = useMutation({
    mutationFn: async () => {
      let imported = 0;
      for (const draft of legacyToImport) {
        const parsed = createWriterDraftSchema.parse({ id: draft.id, title: draft.title, summary: draft.summary, body: draft.body });
        await api<WriterDraftResponse>("/me/drafts", jsonBody("POST", parsed));
        imported++;
      }
      return imported;
    },
    onSuccess: async (count) => {
      await draftsQuery.refetch();
      setNotice(`${count} draft lama berhasil diimpor. Salinan di browser tetap disimpan.`);
    },
  });

  useEffect(() => { if (importedNotebookId) setAssistNotebookId(importedNotebookId); }, [importedNotebookId]);
  useEffect(() => { if (!assistNotebookId && notebooks.data?.length) setAssistNotebookId(notebooks.data[0]!.id); }, [assistNotebookId, notebooks.data]);

  const openDraft = (draft: WriterDraftResponse) => {
    setSelectedId(draft.id);
    setTitle(draft.title);
    setSummary(draft.summary);
    setBody(draft.body);
    setNotice("");
    navigate(`/studio?draft=${draft.id}`, { replace: true });
  };

  useEffect(() => {
    if (requestedDraftId && draftsQuery.isSuccess) {
      const draft = drafts.find((item) => item.id === requestedDraftId);
      if (draft && selectedId !== draft.id) {
        setSelectedId(draft.id);
        setTitle(draft.title);
        setSummary(draft.summary);
        setBody(draft.body);
        setNotice("");
      }
      return;
    }
    if (importedNoteId && importedNotebookId && notesQuery.isSuccess && copiedNote.current !== `${importedNotebookId}:${importedNoteId}`) {
      copiedNote.current = `${importedNotebookId}:${importedNoteId}`;
      const note = notesQuery.data.find((item) => item.id === importedNoteId);
      if (note) {
        setSelectedId(null);
        setTitle(note.title);
        setSummary("");
        setBody(note.body);
        setNotice("Catatan disalin ke editor. Simpan untuk membuat draft di akunmu.");
      }
    }
  }, [requestedDraftId, importedNoteId, importedNotebookId, draftsQuery.isSuccess, drafts, selectedId, notesQuery.isSuccess, notesQuery.data]);

  const startNewDraft = () => {
    setSelectedId(null);
    setTitle("");
    setSummary("");
    setBody("");
    setNotice("");
    navigate("/studio", { replace: true });
  };

  const saveDraft = async () => {
    const parsed = createWriterDraftSchema.safeParse({ title: title.trim(), summary: summary.trim(), body });
    if (!parsed.success) { setNotice("Periksa judul, ringkasan, dan isi draft sebelum menyimpan."); return; }
    try {
      const saved = selectedId
        ? await updateDraft.mutateAsync(updateWriterDraftSchema.parse(parsed.data))
        : await createDraft.mutateAsync(parsed.data as CreateWriterDraftInput);
      setSelectedId(saved.id);
      setTitle(saved.title);
      setSummary(saved.summary);
      setBody(saved.body);
      setNotice("Draft berhasil disimpan ke akunmu.");
      navigate(`/studio?draft=${saved.id}`, { replace: true });
    } catch (error) {
      setNotice(error instanceof ApiRequestError ? error.message : "Draft belum berhasil disimpan.");
    }
  };

  const deleteDraft = async () => {
    if (!selectedId) return;
    try {
      await deleteDraftMutation.mutateAsync(selectedId);
      setConfirmDelete(false);
      setSelectedId(null);
      setTitle("");
      setSummary("");
      setBody("");
      setNotice("Draft berhasil dihapus dari server.");
      navigate("/studio", { replace: true });
    } catch (error) {
      setNotice(error instanceof ApiRequestError ? error.message : "Draft belum berhasil dihapus.");
    }
  };

  if (draftsQuery.isPending) return <LoadingState label="Memuat draft tulisan…"/>;
  if (draftsQuery.isError) return <ErrorState message={draftsQuery.error instanceof ApiRequestError && draftsQuery.error.status === 404 ? "Server belum menyediakan API draft tulisan. Sambungkan ke backend terbaru; draft lama di browser tetap aman." : draftsQuery.error.message} onRetry={() => void draftsQuery.refetch()}/>;

  return (
    <div className="space-y-6">
      <PageTitle action={<Button onClick={startNewDraft}><Plus aria-hidden="true"/>Tulisan baru</Button>} description="Rangkai pemahamanmu menjadi tulisan. Draft tersimpan di akunmu." eyebrow="Studio penulis" title="Kelola tulisanmu"/>
      {legacyToImport.length > 0 && <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warning/50 bg-warning/15 p-4 text-sm leading-6"><p><strong className="text-navy">Ada {legacyToImport.length} draft lama di browser ini.</strong> Impor ke akunmu; salinan browser tetap disimpan.</p><Button disabled={importLegacy.isPending} onClick={() => importLegacy.mutate()} size="sm">{importLegacy.isPending ? "Mengimpor…" : "Impor draft lama"}</Button></div>}
      {importLegacy.isError && <p className="text-sm text-destructive" role="alert">{importLegacy.error instanceof Error ? importLegacy.error.message : "Sebagian draft belum berhasil diimpor. Coba lagi; item yang sudah masuk tidak akan digandakan."}</p>}
      <div className="grid gap-5 xl:grid-cols-[minmax(220px,0.65fr)_minmax(0,1.55fr)]">
        <aside className="space-y-4">
          <section className="rounded-3xl border bg-card p-4 sm:p-5">
            <div className="flex items-center gap-2"><BookOpenText aria-hidden="true" className="size-4 text-teal"/><h2 className="font-bold text-navy">Tulisan saya</h2></div>
            {drafts.length ? <ul className="mt-3 space-y-2">{drafts.map((draft) => <li key={draft.id}><button aria-current={selectedId === draft.id ? "page" : undefined} className={`w-full rounded-2xl border p-3 text-left ${selectedId === draft.id ? "border-primary bg-secondary/50" : "hover:bg-muted/70"}`} onClick={() => openDraft(draft)}><span className="block truncate text-sm font-semibold text-navy">{draft.title}</span><span className="mt-1 block text-xs text-muted-foreground">Disimpan {new Date(draft.updatedAt).toLocaleDateString("id-ID")}</span></button></li>)}</ul> : <EmptyState title="Belum ada draft" description="Mulai menulis dan simpan ke akunmu."/>}
          </section>
          <section className="rounded-3xl bg-secondary/50 p-4"><h3 className="text-sm font-semibold text-navy">Tersimpan di akun</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Draft bisa dibuka kembali setelah kamu masuk di perangkat lain.</p></section>
        </aside>
        <section className="min-w-0 rounded-3xl border bg-card p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><FilePenLine aria-hidden="true" className="size-4 text-teal"/><h2 className="font-bold text-navy">Editor tulisan</h2></div><div className="flex flex-wrap gap-2">{selectedDraft && <><Button asChild size="sm" variant="outline"><Link to={`/studio/preview/${selectedDraft.id}`}>Pratinjau</Link></Button><AppDialog description="Draft ini tersimpan di akunmu." onOpenChange={setConfirmDelete} open={confirmDelete} title="Hapus draft?" trigger={<Button onClick={() => setConfirmDelete(true)} size="sm" variant="outline"><Trash2 aria-hidden="true"/>Hapus</Button>}><p className="text-sm leading-6 text-muted-foreground">“{selectedDraft.title}” akan dihapus dari akunmu dan tidak dapat dipulihkan.</p>{deleteDraftMutation.isError && <p className="mt-3 text-sm text-destructive" role="alert">{deleteDraftMutation.error.message}</p>}<Button className="mt-4 w-full" disabled={deleteDraftMutation.isPending} onClick={() => void deleteDraft()} variant="destructive">{deleteDraftMutation.isPending ? "Menghapus…" : "Hapus draft"}</Button></AppDialog></>}</div></div>
          <div className="mt-5 space-y-4">
            <div className="space-y-2"><Label htmlFor="writer-title">Judul tulisan</Label><Input id="writer-title" maxLength={160} onChange={(event) => setTitle(event.target.value)} placeholder="Contoh: Memahami topologi jaringan" value={title}/></div>
            <div className="space-y-2"><Label htmlFor="writer-summary">Ringkasan <span className="font-normal text-muted-foreground">(opsional)</span></Label><Textarea className="min-h-20" id="writer-summary" maxLength={400} onChange={(event) => setSummary(event.target.value)} placeholder="Satu atau dua kalimat tentang tulisanmu." value={summary}/></div>
            <div className="space-y-2"><Label htmlFor="writer-body">Isi tulisan</Label><Textarea className="min-h-[360px]" id="writer-body" maxLength={30000} onChange={(event) => { setBody(event.target.value); selectedContent.clear(); }} onSelect={selectedContent.onSelect} placeholder="Mulai menulis dari catatan dan pemahamanmu sendiri…" value={body}/><p className="text-right text-xs text-muted-foreground">{body.length.toLocaleString("id-ID")} / 30.000 karakter</p></div><div className="space-y-3 rounded-2xl bg-muted/50 p-4"><div className="space-y-2"><Label htmlFor="studio-ai-workspace">Acuan workspace</Label><select className="h-10 w-full rounded-xl border bg-background px-3 text-sm" disabled={notebooks.isPending || !notebooks.data?.length} id="studio-ai-workspace" onChange={(event) => setAssistNotebookId(event.target.value)} value={assistNotebookId}><option value="">Pilih workspace</option>{notebooks.data?.map((notebook) => <option key={notebook.id} value={notebook.id}>{notebook.title}</option>)}</select></div>{assistSources.isError && <p className="text-sm text-destructive" role="alert">Sumber workspace belum berhasil dimuat.</p>}<AiAssistPanel input={selectedContent.input} description="Pilih bagian tulisan untuk bantuan terarah; jika tidak ada yang dipilih, judul, ringkasan, dan isi digunakan." notebookId={assistNotebookId} onApply={(text, _items, task) => { if (task === "summarize") setSummary(text.slice(0, 400)); else setBody(text.slice(0, 30000)); selectedContent.clear(); }} sources={assistSources.data ?? []} title="Bantuan Bubi untuk tulisan"/></div>
            {notice && <p className={`text-sm ${notice.includes("Periksa") ? "text-destructive" : "text-teal"}`} role="status">{notice}</p>}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4"><p className="max-w-xl text-xs leading-5 text-muted-foreground">Penerbitan dan publikasi bersama belum tersedia karena belum ada kontrak API publikasi.</p><Button disabled={!title.trim() || createDraft.isPending || updateDraft.isPending} onClick={() => void saveDraft()}><Save aria-hidden="true"/>{createDraft.isPending || updateDraft.isPending ? "Menyimpan…" : "Simpan draft"}</Button></div>
          </div>
        </section>
      </div>
      <section className="rounded-3xl border border-dashed p-5"><h2 className="font-bold text-navy">Publikasi</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Backend belum menyediakan API artikel, audiens, komentar, atau profil penulis. Draft tetap dapat disimpan dan dipratinjau secara pribadi.</p><Button asChild className="mt-4" variant="outline"><Link to="/publications">Buka publikasi</Link></Button></section>
    </div>
  );
}
