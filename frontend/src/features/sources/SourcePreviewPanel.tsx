import { useQuery } from "@tanstack/react-query";
import type { SourceResponse } from "@deep-notes/shared";
import { LoadingState } from "@/components/shared/PageStates";
import { api } from "@/lib/api";

export function SourcePreviewPanel({ notebookId, source }: { notebookId: string; source: SourceResponse | undefined }) {
  const sourceId = source?.id;
  const canPreviewPage = source?.status === "ready" && Boolean(source.pageCount);
  const firstPage = useQuery({
    queryKey: ["notebooks", notebookId, "sources", sourceId, "page", 1],
    queryFn: () => api<{ page: number; text: string }>(`/notebooks/${notebookId}/sources/${sourceId}/pages/1`),
    enabled: Boolean(sourceId && canPreviewPage),
  });

  if (!source) {
    return <div className="flex h-full min-h-56 flex-col justify-between rounded-2xl bg-card p-5"><div><h2 className="font-bold text-navy">Pratinjau sumber</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Pilih satu materi untuk melihat status dan teks yang berhasil dibaca.</p></div><div className="mt-8 rounded-xl bg-muted/60 p-4 text-sm text-muted-foreground">Bubi hanya menjawab dari sumber yang siap.</div></div>;
  }

  return (
    <section className="flex h-full min-h-56 flex-col rounded-2xl bg-card p-5" aria-labelledby="source-preview-title">
      <h2 className="font-bold text-navy" id="source-preview-title">Pratinjau sumber</h2>
      <p className="mt-3 font-semibold">{source.title}</p>
      <p className="mt-1 text-xs text-muted-foreground">Ditambahkan oleh {source.uploadedByName}{source.pageCount ? ` · ${source.pageCount} halaman` : ""}</p>
      <div className="mt-4 flex-1 rounded-xl bg-muted/60 p-4">
        {source.status === "processing" && <p className="text-sm leading-6 text-muted-foreground">Materi sedang dibaca. Pratinjau akan muncul setelah statusnya siap.</p>}
        {source.status === "failed" && <p className="text-sm leading-6 text-destructive">Materi belum bisa dipakai. {source.error}</p>}
        {source.status === "ready" && canPreviewPage && firstPage.isPending && <LoadingState label="Membuka halaman pertama…" />}
        {source.status === "ready" && canPreviewPage && firstPage.data && <><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Halaman 1</p><p className="max-h-72 overflow-y-auto whitespace-pre-wrap text-sm leading-6">{firstPage.data.text}</p></>}
        {source.status === "ready" && !canPreviewPage && <p className="text-sm leading-6 text-muted-foreground">Materi teks siap digunakan sebagai acuan. Pratinjau bagian lengkap dapat dibuka lewat sitasi jawaban.</p>}
        {firstPage.isError && <p className="text-sm leading-6 text-muted-foreground">Pratinjau halaman belum tersedia. Sumber tetap dapat dipakai jika statusnya siap.</p>}
      </div>
    </section>
  );
}
