import { useEffect, useState } from "react";
import type { SourceResponse } from "@deep-notes/shared";

const scopeKey = (notebookId: string) => `deep-notes:source-scope:v1:${notebookId}`;
const scopeEvent = "deep-notes:source-scope-change";

function readScope(notebookId: string): string[] | null {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(scopeKey(notebookId)) ?? "null");
    return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : null;
  } catch {
    return null;
  }
}

export function useSourceScope(notebookId: string, sources: SourceResponse[]) {
  const [sourceIds, setSourceIds] = useState<string[] | null>(() => readScope(notebookId));
  const readyIds = sources.filter((source) => source.status === "ready").map((source) => source.id);

  useEffect(() => setSourceIds(readScope(notebookId)), [notebookId]);
  useEffect(() => {
    const sync = (event: Event) => {
      if (event.type === "storage" && (event as StorageEvent).key !== scopeKey(notebookId)) return;
      setSourceIds(readScope(notebookId));
    };
    window.addEventListener(scopeEvent, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(scopeEvent, sync);
      window.removeEventListener("storage", sync);
    };
  }, [notebookId]);

  function updateSourceIds(next: string[] | null) {
    setSourceIds(next);
    try {
      if (next === null) window.localStorage.removeItem(scopeKey(notebookId));
      else window.localStorage.setItem(scopeKey(notebookId), JSON.stringify(next));
    } catch {
      // The in-memory choice still applies for this page when storage is unavailable.
    }
    window.dispatchEvent(new Event(scopeEvent));
  }

  return {
    sourceIds,
    selectedSourceIds: sourceIds === null ? readyIds : sourceIds.filter((id) => readyIds.includes(id)),
    setSourceIds: updateSourceIds,
  };
}
