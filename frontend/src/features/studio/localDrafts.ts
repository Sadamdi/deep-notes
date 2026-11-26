export type LocalDraft = { id: string; title: string; summary: string; body: string; updatedAt: string };

const storageKey = "deep-notes:writer-drafts:v1";

export function readWriterDrafts(): LocalDraft[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]");
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is LocalDraft => Boolean(
      item && typeof item === "object" &&
      "id" in item && typeof item.id === "string" &&
      "title" in item && typeof item.title === "string" &&
      "summary" in item && typeof item.summary === "string" &&
      "body" in item && typeof item.body === "string" &&
      "updatedAt" in item && typeof item.updatedAt === "string",
    ));
  } catch {
    return [];
  }
}

export function writeWriterDrafts(drafts: LocalDraft[]) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(drafts));
    return true;
  } catch {
    return false;
  }
}
