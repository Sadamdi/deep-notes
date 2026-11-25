import { Badge } from "@/components/ui/badge";

const labels = {
  processing: "Sedang dibaca",
  ready: "Siap dipakai",
  failed: "Perlu diperiksa",
} as const;

export function SourceStatus({ status }: { status: keyof typeof labels }) {
  const variant = status === "failed" ? "destructive" : status === "ready" ? "secondary" : "outline";
  return <Badge aria-label={`Status materi: ${labels[status]}`} className={status === "processing" ? "border-warning/70 text-warning-foreground" : ""} variant={variant}>{labels[status]}</Badge>;
}
