import { useQuery } from "@tanstack/react-query";
import type { Health } from "@deep-notes/shared";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

/** Live check of `/api/v1/health` so connection issues surface immediately in the shell. */
export function ApiStatus() {
  const { data, isPending, isError } = useQuery({
    queryKey: ["health"],
    queryFn: () => api<Health>("/health"),
    refetchInterval: 30_000,
  });

  if (isPending) {
    return (
      <Badge variant="outline" role="status" aria-live="polite">
        API: memeriksa
      </Badge>
    );
  }
  if (isError) {
    return (
      <Badge variant="destructive" role="status" aria-live="polite">
        API: luring
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" role="status" aria-live="polite">
      API: {data.status === "ok" ? "aktif" : data.status}
    </Badge>
  );
}
