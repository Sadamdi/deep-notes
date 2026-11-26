import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Citation } from "@deep-notes/shared";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/shared/PageStates";
import { AppDialog } from "@/components/shared/AppDialog";
import { api } from "@/lib/api";

export function CitationPreviewPanel({ notebookId, citation }: { notebookId: string; citation: Citation | null }) {
  const [open, setOpen] = useState(false);
  const pageQuery = useQuery({
    queryKey: ["notebooks", notebookId, "sources", citation?.sourceId, "page", citation?.page],
    queryFn: () => api<{ page: number; text: string }>(`/notebooks/${notebookId}/sources/${citation?.sourceId}/pages/${citation?.page}`),
    enabled: Boolean(citation?.page && citation.sourceId),
  });

  if (!citation) {
    return (
      <div className="flex h-full min-h-56 flex-col justify-between rounded-2xl bg-card p-5">
        <div><h2 className="font-bold text-navy">Pratinjau sumber</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Pilih kutipan dari jawaban Bubi untuk membuka bagian materi yang dirujuk.</p></div>
        <div className="mt-8 rounded-xl bg-muted/60 p-4 text-sm text-muted-foreground">Sumber kelompok tetap menjadi acuan utama.</div>
      </div>
    );
  }

  return (
    <section className="flex h-full min-h-56 flex-col rounded-2xl bg-card p-5" aria-labelledby="citation-preview-title">
      <h2 className="font-bold text-navy" id="citation-preview-title">Pratinjau sumber</h2>
      <p className="mt-3 text-sm font-semibold">{citation.sourceTitle}</p>
      <p className="mt-1 text-xs text-muted-foreground">{citation.page ? `Halaman ${citation.page}` : "Materi tanpa nomor halaman"}</p>
      <blockquote className="mt-4 flex-1 rounded-xl bg-secondary/70 p-4 text-sm leading-6">{citation.quote}</blockquote>
      <AppDialog
        contentClassName="max-w-3xl"
        description={`${citation.sourceTitle}${citation.page ? ` · halaman ${citation.page}` : ""}`}
        onOpenChange={setOpen}
        open={open}
        title="Buka sitasi"
        trigger={<Button className="mt-4 w-full" onClick={() => setOpen(true)}>Buka sitasi</Button>}
      >
        {citation.page ? pageQuery.isPending ? <LoadingState label="Membuka halaman materi…" /> : pageQuery.isError ? <p className="text-sm text-muted-foreground">Kutipan masih tersedia, tetapi halaman penuh belum bisa dibuka.</p> : <p className="max-h-[55dvh] overflow-y-auto whitespace-pre-wrap rounded-xl bg-muted/60 p-4 text-sm leading-7">{pageQuery.data?.text}</p> : <p className="rounded-xl bg-secondary/50 p-4 text-sm leading-7">{citation.quote}</p>}
      </AppDialog>
    </section>
  );
}
