import { getDb } from "../db/index.js";

export type ActivityType = "source_added" | "question_asked" | "quiz_taken" | "assignment_done";

/** Append-only log behind the contributions view (F-06). */
export async function logActivity(notebookId: string, userId: string, type: ActivityType, refId?: string): Promise<void> {
  await (await getDb()).query("INSERT INTO activity(notebook_id, user_id, type, ref_id) VALUES ($1,$2,$3,$4)", [
    notebookId,
    userId,
    type,
    refId ?? null,
  ]);
}
