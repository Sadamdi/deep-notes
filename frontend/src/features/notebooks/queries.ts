import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateNotebookInput, NotebookListItem, NotebookResponse, SourceResponse } from "@deep-notes/shared";
import { api, jsonBody } from "@/lib/api";

export const notebookListKey = ["notebooks"] as const;
export const notebookKey = (id: string) => ["notebooks", id] as const;
export const sourceKey = (id: string) => ["notebooks", id, "sources"] as const;

export function useNotebooks() {
  return useQuery({
    queryKey: notebookListKey,
    queryFn: () => api<NotebookListItem[]>("/notebooks"),
  });
}

export function useNotebook(notebookId: string) {
  return useQuery({
    queryKey: notebookKey(notebookId),
    queryFn: () => api<NotebookResponse>(`/notebooks/${notebookId}`),
    enabled: Boolean(notebookId),
  });
}

export function useSources(notebookId: string) {
  return useQuery({
    queryKey: sourceKey(notebookId),
    queryFn: () => api<SourceResponse[]>(`/notebooks/${notebookId}/sources`),
    enabled: Boolean(notebookId),
    refetchInterval: (query) => query.state.data?.some((source) => source.status === "processing") ? 2_000 : false,
  });
}

export function useCreateNotebook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateNotebookInput) => api<NotebookResponse>("/notebooks", jsonBody("POST", input)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: notebookListKey });
    },
  });
}
