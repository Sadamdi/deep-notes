import { useQuery } from "@tanstack/react-query";
import { AppDialog } from "@/components/shared/AppDialog";
import { LoadingState } from "@/components/shared/PageStates";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export function SourcePageDialog({ notebookId, sourceId, sourceTitle, page }: {
  notebookId: string;
  sourceId: string;
  sourceTitle: string;
  page: number | null;
}) {
  const pageQuery = useQuery({
    queryKey: ["notebooks", notebookId, "sources", sourceId, "page", page],
    queryFn: () => api<{ page: number; text: string }>(`/notebooks/${notebookId}/sources/${sourceId}/pages/${page}`),
    enabled: page !== null,
  });

  return (
    <AppDialog
      contentClassName="max-w-3xl"
      description={`${sourceTitle}${page ? ` · halaman ${page}` : ""}`}
      title="Buka materi"
      trigger={<Button size="sm" variant="outline">{page ? `Buka halaman ${page}` : "Lihat sumber"}</Button>}
    >
      {page === null ? <p className="text-sm leading-6 text-muted-foreground">Sumber ini tidak memiliki nomor halaman. Lihat materi aslinya di daftar sumber workspace.</p> : pageQuery.isPending ? <LoadingState label="Membuka halaman materi…" /> : pageQuery.isError ? <p className="text-sm leading-6 text-muted-foreground">Halaman sumber belum berhasil dibuka. Coba lagi nanti.</p> : <p className="max-h-[55dvh] overflow-y-auto whitespace-pre-wrap rounded-2xl bg-muted/60 p-5 text-sm leading-7">{pageQuery.data?.text}</p>}
    </AppDialog>
  );
}
