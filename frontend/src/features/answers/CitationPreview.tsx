import { useQuery } from "@tanstack/react-query";
import type { Citation } from "@deep-notes/shared";
import { AppDialog } from "@/components/shared/AppDialog";
import { LoadingState } from "@/components/shared/PageStates";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export function CitationPreview({ notebookId, citation, open, onOpenChange, trigger }: {
  notebookId: string;
  citation: Citation;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}) {
  const pageQuery = useQuery({
    queryKey: ["notebooks", notebookId, "sources", citation.sourceId, "page", citation.page],
    queryFn: () => api<{ page: number; text: string }>(`/notebooks/${notebookId}/sources/${citation.sourceId}/pages/${citation.page}`),
    enabled: Boolean(open && citation.page),
  });

  return (
    <AppDialog
      contentClassName="max-w-2xl"
      description={`${citation.sourceTitle}${citation.page ? ` · halaman ${citation.page}` : ""}`}
      onOpenChange={onOpenChange}
      open={open}
      title="Pratinjau sitasi"
      trigger={trigger}
    >
      <div className="space-y-4">
        <blockquote className="rounded-2xl border-l-4 border-cite bg-secondary/70 px-4 py-3 text-sm leading-6 text-foreground">“{citation.quote}”</blockquote>
        {citation.page && pageQuery.isPending && <LoadingState label="Membuka halaman sumber…" />}
        {citation.page && pageQuery.isError && <p className="text-sm text-muted-foreground" role="status">Kutipan tetap tersedia. Halaman penuh belum berhasil dibuka.</p>}
        {citation.page && pageQuery.data && (
          <div className="max-h-72 overflow-y-auto rounded-2xl border bg-muted/50 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Halaman {pageQuery.data.page}</p>
            <p className="whitespace-pre-wrap text-sm leading-7">{pageQuery.data.text}</p>
          </div>
        )}
        <div className="flex justify-end">
          <Button onClick={() => onOpenChange?.(false)} variant="outline">Tutup</Button>
        </div>
      </div>
    </AppDialog>
  );
}
