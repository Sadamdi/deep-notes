export const legacySavedPostIdsKey = ["legacy-saved-post-ids"] as const;

export function readSavedPostIds() {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem("deep-notes:saved-posts:v1") ?? "[]");
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}
