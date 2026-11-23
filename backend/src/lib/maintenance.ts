import { getDb } from "../db/index.js";

/** Removes expired sessions and long-dead invites. Safe to run repeatedly. */
export async function cleanupExpired(): Promise<{ sessions: number; invites: number }> {
  const db = await getDb();
  const s = await db.query("DELETE FROM sessions WHERE expires_at < now() RETURNING 1");
  const i = await db.query("DELETE FROM invites WHERE expires_at < now() - interval '30 days' RETURNING 1");
  return { sessions: s.length, invites: i.length };
}
