import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type ChangeEvent, type FormEvent, useRef, useState } from "react";
import notebookIcon from "@/assets/icons/notebook.svg";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SelectedPreviewTarget, WorkspaceSource } from "@/features/notebooks/types";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type Props = {
  notebookId: string;
  isSample: boolean;
  canEdit: boolean;
  currentUserId: string | null;
  isOwner: boolean;
  sources: WorkspaceSource[];
  activeSourceId: string | null;
  referenceIds: string[];
  onToggleReference: (sourceId: string) => void;
  onClearReferences: () => void;
  onSelectPreview: (target: SelectedPreviewTarget) => void;
};

const STATUS_TEXT: Record<WorkspaceSource["status"], string> = {
  ready: "Siap",
  processing: "Diproses",
  failed: "Gagal",
};

export function WorkspaceSourcesColumn({
  notebookId,
  isSample,
  canEdit,
  currentUserId,
  isOwner,
  sources,
  activeSourceId,
  referenceIds,
  onToggleReference,
  onClearReferences,
  onSelectPreview,
}: Props) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pickingRefs, setPickingRefs] = useState(false);
  const [addMode, setAddMode] = useState<"none" | "text" | "link">("none");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [feedback, setFeedback] = useState<{ tone: "error" | "info"; text: string } | null>(null);

  const invalidateSources = () => queryClient.invalidateQueries({ queryKey: ["notebook-sources", notebookId] });

  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return api(`/notebooks/${notebookId}/sources/file`, { method: "POST", body: form });
    },
    onSuccess: async () => {
      setFeedback({ tone: "info", text: "Berkas diterima dan sedang diproses menjadi potongan halaman." });
      await invalidateSources();
    },
    onError: (err) => {
      setFeedback({
        tone: "error",
        text: err instanceof Error ? err.message : "Gagal mengunggah berkas.",
      });
    },
  });

  const addTextMutation = useMutation({
    mutationFn: () =>
      api(`/notebooks/${notebookId}/sources/text`, {
        method: "POST",
        body: JSON.stringify({ title: noteTitle.trim(), text: noteBody.trim() }),
      }),
    onSuccess: async () => {
      setNoteTitle("");
      setNoteBody("");
      setAddMode("none");
      setFeedback({ tone: "info", text: "Catatan teks ditambahkan ke sumber ruang." });
      await invalidateSources();
    },
    onError: (err) => {
      setFeedback({ tone: "error", text: err instanceof Error ? err.message : "Gagal menyimpan teks sumber." });
    },
  });

  const addLinkMutation = useMutation({
    mutationFn: () =>
      api(`/notebooks/${notebookId}/sources/link`, {
        method: "POST",
        body: JSON.stringify({ url: linkUrl.trim(), title: linkTitle.trim() || undefined }),
      }),
    onSuccess: async () => {
      setLinkUrl("");
      setLinkTitle("");
      setAddMode("none");
      setFeedback({ tone: "info", text: "Tautan web ditambahkan dan sedang dibaca." });
      await invalidateSources();
    },
    onError: (err) => {
      setFeedback({ tone: "error", text: err instanceof Error ? err.message : "Gagal mengambil isi tautan." });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (sourceId: string) => api(`/notebooks/${notebookId}/sources/${sourceId}`, { method: "DELETE" }),
    onSuccess: () => invalidateSources(),
  });

  const handleFilePicked = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setFeedback(null);
    uploadFileMutation.mutate(file);
  };

  const handleTextSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (noteTitle.trim().length < 1 || noteBody.trim().length < 20) {
      setFeedback({ tone: "error", text: "Isi judul dan minimal 20 karakter materi teks." });
      return;
    }
    setFeedback(null);
    addTextMutation.mutate();
  };

  const handleLinkSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!linkUrl.trim().startsWith("http")) {
      setFeedback({ tone: "error", text: "Masukkan URL lengkap yang diawali http:// atau https://." });
      return;
    }
    setFeedback(null);
    addLinkMutation.mutate();
  };

  return (
    <section
      id="sumber-ruang"
      aria-labelledby="sources-heading"
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id="sources-heading" className="text-xl font-bold text-card-foreground">
          Sumber
        </h2>
        <Badge variant="outline">{sources.length}/40</Badge>
      </div>

      {!isSample && canEdit && (
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            id="workspace-file-upload"
            type="file"
            accept=".pdf,.txt,.md,.markdown,.docx,.pptx,.xlsx,.csv,.png,.jpg,.jpeg,.webp"
            onChange={handleFilePicked}
            className="sr-only"
          />
          <Button
            type="button"
            className="w-full justify-start"
            disabled={uploadFileMutation.isPending}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploadFileMutation.isPending ? "Mengunggah berkas..." : "Unggah File"}
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={addMode === "text" ? "secondary" : "outline"}
              size="sm"
              onClick={() => setAddMode((m) => (m === "text" ? "none" : "text"))}
            >
              Tempel Teks
            </Button>
            <Button
              type="button"
              variant={addMode === "link" ? "secondary" : "outline"}
              size="sm"
              onClick={() => setAddMode((m) => (m === "link" ? "none" : "link"))}
            >
              Tautan Web
            </Button>
          </div>
        </div>
      )}

      {addMode === "text" && (
        <form onSubmit={handleTextSubmit} className="space-y-3 rounded-xl bg-muted p-3">
          <div className="space-y-1.5">
            <Label htmlFor="source-note-title" className="text-xs font-bold">
              Judul materi teks
            </Label>
            <Input
              id="source-note-title"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="Contoh: Ringkasan Bab 1 Topologi"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="source-note-body" className="text-xs font-bold">
              Isi materi (minimal 20 karakter)
            </Label>
            <textarea
              id="source-note-body"
              rows={4}
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              placeholder="Tempel catatan kuliah atau rangkuman bab di sini..."
              className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-card-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            />
          </div>
          <Button type="submit" size="sm" className="w-full" disabled={addTextMutation.isPending}>
            {addTextMutation.isPending ? "Menyimpan..." : "Simpan Materi Teks"}
          </Button>
        </form>
      )}

      {addMode === "link" && (
        <form onSubmit={handleLinkSubmit} className="space-y-3 rounded-xl bg-muted p-3">
          <div className="space-y-1.5">
            <Label htmlFor="source-link-url" className="text-xs font-bold">
              Alamat tautan publik
            </Label>
            <Input
              id="source-link-url"
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="source-link-title" className="text-xs font-bold">
              Judul tampilan (opsional)
            </Label>
            <Input
              id="source-link-title"
              value={linkTitle}
              onChange={(e) => setLinkTitle(e.target.value)}
              placeholder="Contoh: Artikel RFC 793"
            />
          </div>
          <Button type="submit" size="sm" className="w-full" disabled={addLinkMutation.isPending}>
            {addLinkMutation.isPending ? "Mengambil tautan..." : "Simpan Tautan"}
          </Button>
        </form>
      )}

      {feedback && (
        <p
          role={feedback.tone === "error" ? "alert" : "status"}
          className={
            feedback.tone === "error"
              ? "rounded-lg border border-destructive/40 bg-destructive/10 p-2.5 text-xs font-bold text-destructive"
              : "rounded-lg bg-secondary/50 p-2.5 text-xs font-bold text-foreground"
          }
        >
          {feedback.text}
        </p>
      )}

      {sources.length === 0 ? (
        <div className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
          Belum ada sumber di ruang ini. Unggah PDF, slide, atau tempel catatan agar Bubi bisa menjawab dengan sitasi.
        </div>
      ) : (
        <ul className="space-y-2.5">
          {sources.map((src) => {
            const isSelected = src.id === activeSourceId;
            const isRef = referenceIds.includes(src.id);
            const canDelete = !isSample && (isOwner || src.uploadedBy === currentUserId);
            return (
              <li
                key={src.id}
                className={cn(
                  "rounded-xl p-3 transition-colors",
                  isSelected ? "bg-secondary text-secondary-foreground" : "bg-muted text-foreground",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    disabled={src.status !== "ready"}
                    onClick={() =>
                      onSelectPreview({
                        sourceId: src.id,
                        sourceTitle: src.title,
                        page: 1,
                      })
                    }
                    className="flex min-h-11 flex-1 items-start gap-2.5 rounded-md text-left focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-70"
                  >
                    <img
                      src={notebookIcon}
                      alt=""
                      aria-hidden="true"
                      width={18}
                      height={18}
                      className="mt-0.5 shrink-0 dark:brightness-0 dark:invert"
                    />
                    <span className="min-w-0 space-y-0.5">
                      <span className="block truncate text-sm font-bold">{src.title}</span>
                      <span className="block text-xs text-muted-foreground">
                        {STATUS_TEXT[src.status]}
                        {src.pageCount ? ` · ${src.pageCount} halaman` : ""}
                        {src.uploadedByName ? ` · ${src.uploadedByName}` : ""}
                      </span>
                      {src.status === "failed" && src.error && (
                        <span className="block text-xs font-bold text-destructive">{src.error}</span>
                      )}
                    </span>
                  </button>

                  {canDelete && (
                    <button
                      type="button"
                      aria-label={`Hapus sumber ${src.title}`}
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(src.id)}
                      className="min-h-11 rounded-md px-2 text-xs font-bold text-destructive hover:bg-destructive/10 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      Hapus
                    </button>
                  )}
                </div>

                {pickingRefs && src.status === "ready" && (
                  <label className="mt-2 flex min-h-9 items-center gap-2 rounded-md bg-card/80 px-2.5 py-1.5 text-xs font-bold text-card-foreground">
                    <input
                      type="checkbox"
                      checked={isRef}
                      onChange={() => onToggleReference(src.id)}
                      className="size-4 accent-primary"
                    />
                    <span>Jadikan acuan aktif</span>
                  </label>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {sources.some((s) => s.status === "ready") && (
        <div className="space-y-2 pt-1">
          <Button
            type="button"
            variant="secondary"
            className="w-full justify-between"
            onClick={() => setPickingRefs((v) => !v)}
          >
            <span>{pickingRefs ? "Selesai Pilih Acuan" : "Pilih Acuan"}</span>
            {referenceIds.length > 0 && (
              <span className="rounded bg-card px-2 py-0.5 text-xs">{referenceIds.length} dipilih</span>
            )}
          </Button>
          {referenceIds.length > 0 && (
            <button
              type="button"
              onClick={onClearReferences}
              className="min-h-11 w-full rounded-lg text-xs font-bold text-muted-foreground underline underline-offset-4 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              Gunakan kembali semua sumber ({sources.filter((s) => s.status === "ready").length})
            </button>
          )}
        </div>
      )}
    </section>
  );
}
