import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateNotebookInput, CreateWorkspaceNoteInput, NotebookListItem, NotebookResponse, SourceResponse, UpdateWorkspaceNoteInput, WorkspaceNoteResponse } from "@deep-notes/shared";
import { api, jsonBody } from "@/lib/api";

export const notebookListKey = ["notebooks"] as const;
export const notebookKey = (id: string) => ["notebooks", id] as const;
export const sourceKey = (id: string) => ["notebooks", id, "sources"] as const;
export const workspaceNotesKey = (id: string) => ["notebooks", id, "notes"] as const;

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

export function useWorkspaceNotes(notebookId: string) {
  return useQuery({
    queryKey: workspaceNotesKey(notebookId),
    queryFn: () => api<WorkspaceNoteResponse[]>(`/notebooks/${notebookId}/notes`),
    enabled: Boolean(notebookId),
  });
}

export function useCreateWorkspaceNote(notebookId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWorkspaceNoteInput) => api<WorkspaceNoteResponse>(`/notebooks/${notebookId}/notes`, jsonBody("POST", input)),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: workspaceNotesKey(notebookId) }),
  });
}

export function useUpdateWorkspaceNote(notebookId: string, noteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateWorkspaceNoteInput) => api<WorkspaceNoteResponse>(`/notebooks/${notebookId}/notes/${noteId}`, jsonBody("PATCH", input)),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: workspaceNotesKey(notebookId) }),
  });
}

export function useDeleteWorkspaceNote(notebookId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) => api<{ deleted: true }>(`/notebooks/${notebookId}/notes/${noteId}`, { method: "DELETE" }),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: workspaceNotesKey(notebookId) }),
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
