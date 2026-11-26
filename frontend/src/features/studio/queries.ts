import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateWriterDraftInput, UpdateWriterDraftInput, WriterDraftResponse } from "@deep-notes/shared";
import { api, jsonBody } from "@/lib/api";

export const writerDraftsKey = ["me", "drafts"] as const;

export function useWriterDrafts() {
  return useQuery({ queryKey: writerDraftsKey, queryFn: () => api<WriterDraftResponse[]>("/me/drafts") });
}

export function useCreateWriterDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWriterDraftInput) => api<WriterDraftResponse>("/me/drafts", jsonBody("POST", input)),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: writerDraftsKey }),
  });
}

export function useUpdateWriterDraft(draftId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateWriterDraftInput) => api<WriterDraftResponse>(`/me/drafts/${draftId}`, jsonBody("PATCH", input)),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: writerDraftsKey }),
  });
}

export function useDeleteWriterDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (draftId: string) => api<{ deleted: true }>(`/me/drafts/${draftId}`, { method: "DELETE" }),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: writerDraftsKey }),
  });
}
