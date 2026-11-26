export type WorkspaceNote = {
  id: string;
  title: string;
  body: string;
  sourceId: string;
  page: number | null;
  updatedAt: string;
};

function storageKey(notebookId: string) {
  return `deep-notes:workspace-notes:v1:${notebookId}`;
}

export function readWorkspaceNotes(notebookId: string): WorkspaceNote[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(storageKey(notebookId)) ?? "[]");
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is WorkspaceNote => Boolean(
      item && typeof item === "object" &&
      "id" in item && typeof item.id === "string" &&
      "title" in item && typeof item.title === "string" &&
      "body" in item && typeof item.body === "string" &&
      "sourceId" in item && typeof item.sourceId === "string" &&
      "page" in item && (typeof item.page === "number" || item.page === null) &&
      "updatedAt" in item && typeof item.updatedAt === "string",
    ));
  } catch {
    return [];
  }
}
