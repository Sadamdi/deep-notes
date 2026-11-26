import type { Db } from "../db/index.js";

export type NotificationKind = "friend_request" | "friend_accepted" | "workspace_member_added" | "join_request_decision";

export async function createNotification(db: Db, input: {
  recipientId: string;
  actorId?: string | null;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string;
}): Promise<void> {
  if (input.actorId === input.recipientId) return;
  await db.query(
    "INSERT INTO notifications(recipient_id, actor_id, kind, title, body, href) VALUES ($1,$2,$3,$4,$5,$6)",
    [input.recipientId, input.actorId ?? null, input.kind, input.title, input.body, input.href],
  );
}
