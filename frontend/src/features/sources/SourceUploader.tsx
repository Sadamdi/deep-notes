import { useRef, useState } from "react";
import { FilePlus2, Link2, LoaderCircle, Upload } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import type { SourceAccepted } from "@deep-notes/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppDialog } from "@/components/shared/AppDialog";
import { ErrorState } from "@/components/shared/PageStates";
import { sourceKey } from "@/features/notebooks/queries";
import { ApiRequestError, api, jsonBody } from "@/lib/api";

const acceptedFiles = ".pdf,.txt,.md,.docx,.pptx,.xlsx,.csv,.png,.jpg,.jpeg,.webp,.mp3,.m4a,.mp4,.wav,.aac,.ogg,.webm";

// the hosted API gateway rejects request bodies above about 4.5 MB, below the 15 MB the server itself accepts
const MAX_FILE_MB = 4;

export function SourceUploader({ notebookId, canUpload }: { notebookId: string; canUpload: boolean }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const [textOpen, setTextOpen] = useState(false);
  const [textTitle, setTextTitle] = useState("");
  const [textValue, setTextValue] = useState("");

  async function refreshSources() {
    await queryClient.invalidateQueries({ queryKey: sourceKey(notebookId) });
  }

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError("");
    setMessage("");
    let uploaded = 0;
    try {
      for (const file of Array.from(files)) {
        if (file.size > MAX_FILE_MB * 1024 * 1024) throw new ApiRequestError("VALIDATION", `${file.name} melebihi batas ${MAX_FILE_MB} MB per file.`);
        const form = new FormData();
        form.set("file", file);
        await api<SourceAccepted>(`/notebooks/${notebookId}/sources/file`, { method: "POST", body: form });
        uploaded += 1;
      }
      await refreshSources();
      setMessage(`${uploaded} materi masuk antrean untuk dibaca.`);
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : "Materi belum berhasil diunggah.");
      if (uploaded > 0) {
        await refreshSources();
        setMessage(`${uploaded} materi sudah masuk antrean. Periksa pesan di atas untuk file berikutnya.`);
      }
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function addLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api<SourceAccepted>(`/notebooks/${notebookId}/sources/link`, jsonBody("POST", { url: link }));
      await refreshSources();
      setMessage(`“${result.title}” sedang dibaca.`);
      setLink("");
      setLinkOpen(false);
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : "Tautan belum berhasil ditambahkan.");
    } finally {
      setBusy(false);
    }
  }

  async function addText(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (textValue.trim().length < 20) {
      setError("Catatan perlu berisi setidaknya 20 karakter agar bisa dipakai sebagai sumber.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await api<SourceAccepted>(
        `/notebooks/${notebookId}/sources/text`,
        jsonBody("POST", { title: textTitle.trim(), text: textValue }),
      );
      await refreshSources();
      setMessage(`“${result.title}” sedang dibaca.`);
      setTextTitle("");
      setTextValue("");
      setTextOpen(false);
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : "Catatan belum berhasil disimpan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="source-upload-title" className="space-y-3">
      <div className="rounded-2xl bg-secondary p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-primary"><Upload aria-hidden="true" className="size-5" /></span>
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-navy" id="source-upload-title">Kumpulkan bahan kuliah</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">PDF, slide, spreadsheet, gambar, audio, catatan, dan tautan halaman · maksimal {MAX_FILE_MB} MB per file.</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <input accept={acceptedFiles} aria-label="Pilih materi untuk diunggah" className="sr-only" multiple onChange={(event) => void uploadFiles(event.target.files)} ref={fileInput} tabIndex={-1} type="file" />
          <Button disabled={!canUpload || busy} onClick={() => fileInput.current?.click()}>
            {busy ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Upload aria-hidden="true" />}
            {busy ? "Mengunggah…" : "Pilih file"}
          </Button>
          <AppDialog
            description="Kami membaca halaman publik dan hanya menyimpan teks yang berhasil diekstrak."
            onOpenChange={setLinkOpen}
            open={linkOpen}
            title="Tempel tautan"
            trigger={<Button disabled={!canUpload || busy} onClick={() => setLinkOpen(true)} variant="outline"><Link2 aria-hidden="true" /> Tempel link</Button>}
          >
            <form className="space-y-4" onSubmit={(event) => void addLink(event)}>
              <div className="space-y-2"><Label htmlFor="source-link">Alamat halaman</Label><Input autoFocus id="source-link" onChange={(event) => setLink(event.target.value)} placeholder="https://…" required type="url" value={link} /></div>
              <Button className="w-full" disabled={busy || !link.trim()} type="submit">Tambahkan tautan</Button>
            </form>
          </AppDialog>
          <AppDialog
            description="Tambahkan ringkasan atau catatan teks yang boleh dipakai Bubi untuk menjawab."
            onOpenChange={setTextOpen}
            open={textOpen}
            title="Tulis catatan"
            trigger={<Button disabled={!canUpload || busy} onClick={() => setTextOpen(true)} variant="ghost"><FilePlus2 aria-hidden="true" /> Tulis catatan</Button>}
          >
            <form className="space-y-4" onSubmit={(event) => void addText(event)}>
              <div className="space-y-2"><Label htmlFor="source-title">Judul catatan</Label><Input id="source-title" maxLength={160} onChange={(event) => setTextTitle(event.target.value)} required value={textTitle} /></div>
              <div className="space-y-2"><Label htmlFor="source-text">Isi catatan</Label><Textarea className="min-h-40" id="source-text" maxLength={400000} minLength={20} onChange={(event) => setTextValue(event.target.value)} required value={textValue} /></div>
              <Button className="w-full" disabled={busy} type="submit">Simpan sebagai sumber</Button>
            </form>
          </AppDialog>
        </div>
      </div>
      {error && <ErrorState message={error} />}
      {message && <p className="rounded-xl bg-muted px-3 py-2 text-sm text-foreground" role="status">{message}</p>}
    </section>
  );
}
