import { useQuery } from "@tanstack/react-query";
import type { Health } from "@deep-notes/shared";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

/** Shows whether the web app can reach the API. Doubles as a live check of the dev proxy. */
export function ApiStatus() {
  const { data, isPending, isError } = useQuery({
    queryKey: ["health"],
    queryFn: () => api<Health>("/health"),
    refetchInterval: 30_000,
  });

  if (isPending) return <Badge variant="secondary">API: checking</Badge>;
  if (isError) return <Badge variant="destructive">API: offline</Badge>;
  return <Badge variant="secondary">API: {data.status}</Badge>;
}
