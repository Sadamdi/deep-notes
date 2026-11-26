import { FileImage, FileSpreadsheet, FileText, Globe2, Presentation } from "lucide-react";
import { Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SourceResponse } from "@deep-notes/shared";
import { Button } from "@/components/ui/button";
import { SourceStatus } from "@/features/sources/SourceStatus";
import { api } from "@/lib/api";

const kindIcons = {
  pdf: FileText,
  text: FileText,
  docx: FileText,
  pptx: Presentation,
  xlsx: FileSpreadsheet,
  csv: FileSpreadsheet,
  image: FileImage,
  link: Globe2,
} as const;

export function SourceList({ notebookId, sources, selectedId, onSelect, canDeleteSource }: {
  notebookId: string;
  sources: SourceResponse[];
  selectedId?: string;
  onSelect?: (source: SourceResponse) => void;
  canDeleteSource?: (source: SourceResponse) => boolean;
}) {
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: (sourceId: string) => api<{ deleted: true }>(`/notebooks/${notebookId}/sources/${sourceId}`, { method: "DELETE" }),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["notebooks", notebookId, "sources"] }),
  });
  if (!sources.length) {
    return <p className="rounded-xl bg-muted/70 p-4 text-sm leading-6 text-muted-foreground">Belum ada materi. Tambahkan sumber kelompok agar Bubi bisa menjawab dan membuat kuis dari bahan yang sama.</p>;
  }

  return (
    <div className="space-y-2"><ul className="space-y-2" aria-label="Daftar materi">
      {sources.map((source) => {
        const Icon = kindIcons[source.kind];
        const row = (
          <>
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted text-primary"><Icon aria-hidden="true" className="size-4" /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-foreground">{source.title}</span>
              <span className="mt-1 block truncate text-xs text-muted-foreground">{source.uploadedByName}{source.pageCount ? ` · ${source.pageCount} halaman` : ""}</span>
            </span>
            <SourceStatus status={source.status} />
          </>
        );
        return (
          <li key={source.id}>
            <div className={`flex items-center gap-2 rounded-xl border transition ${selectedId === source.id ? "border-primary/40 bg-secondary/70" : "border-transparent bg-white"}`}>
              {onSelect ? <button aria-pressed={selectedId === source.id} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-3 text-left hover:bg-muted/60" onClick={() => onSelect(source)} type="button">{row}</button> : <div className="flex min-w-0 flex-1 items-center gap-3 p-3">{row}</div>}
              {canDeleteSource?.(source) && <Button aria-label={`Hapus materi ${source.title}`} className="mr-1 shrink-0" disabled={remove.isPending} onClick={() => { if (window.confirm(`Hapus “${source.title}” dari workspace? Materi ini tidak lagi dipakai untuk jawaban atau kuis baru.`)) remove.mutate(source.id); }} size="icon-sm" variant="ghost"><Trash2 aria-hidden="true" className="size-4"/></Button>}
            </div>
            {source.status === "failed" && source.error && <p className="px-3 pt-1 text-xs text-destructive">{source.error}</p>}
          </li>
        );
      })}
    </ul>{remove.isError && <p className="rounded-xl bg-destructive/5 p-3 text-sm text-destructive" role="alert">{remove.error.message}</p>}</div>
  );
}
