import crypto from "node:crypto";
import {
  addMemberSchema,
  changeRoleSchema,
  createDiscussionMessageSchema,
  createInviteSchema,
  createNotebookSchema,
  createWorkspaceNoteSchema,
  discussionQuerySchema,
  joinRequestSchema,
  noteIdParamsSchema,
  resourceIdParamsSchema,
  updateWorkspaceNoteSchema,
  updateNotebookSchema,
} from "@deep-notes/shared";
import { Router } from "express";
import { getDb } from "../../db/index.js";
import { ok } from "../../lib/apiResponse.js";
import { AppError } from "../../lib/errors.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { notebookAccess, requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { createNotification } from "../../lib/notifications.js";

export const notebookRoutes = Router();
notebookRoutes.use(requireAuth);

export const MAX_NOTEBOOKS_PER_USER = 20;
export const MAX_MEMBERS_PER_NOTEBOOK = 50;

async function assertRoomForMember(notebookId: string): Promise<void> {
  const c = await (await getDb()).query<{ n: number }>("SELECT count(*)::int AS n FROM notebook_members WHERE notebook_id = $1", [notebookId]);
  if (c[0]!.n >= MAX_MEMBERS_PER_NOTEBOOK) throw new AppError("CONFLICT", `A notebook can have at most ${MAX_MEMBERS_PER_NOTEBOOK} members`);
}

const FIELDS = `n.id, n.title, n.course, n.description, n.category, n.visibility, n.owner_id AS "ownerId", n.created_at AS "createdAt"`;

const NOTE_FIELDS = `id, title, body, source_id AS "sourceId", page, created_at AS "createdAt", updated_at AS "updatedAt"`;

async function assertNoteAnchor(notebookId: string, sourceId: string | null | undefined, page: number | null | undefined) {
  if (page != null && !sourceId) throw new AppError("VALIDATION", "A page reference needs a source");
  if (!sourceId) return;
  const rows = await (await getDb()).query<{ page_count: number | null }>(
    "SELECT page_count FROM sources WHERE id = $1 AND notebook_id = $2",
    [sourceId, notebookId],
  );
  if (!rows[0]) throw new AppError("VALIDATION", "The source must belong to this notebook");
  if (page != null && rows[0].page_count != null && page > rows[0].page_count) {
    throw new AppError("VALIDATION", `Page must be between 1 and ${rows[0].page_count}`);
  }
}

notebookRoutes.get(
  "/:id/notes",
  notebookAccess("viewer"),
  validate("params", resourceIdParamsSchema),
  asyncHandler(async (req, res) => {
    const notes = await (await getDb()).query(
      `SELECT ${NOTE_FIELDS} FROM workspace_notes WHERE notebook_id = $1 AND user_id = $2 ORDER BY updated_at DESC`,
      [req.member!.notebookId, req.user!.id],
    );
    res.json(ok(notes));
  }),
);

notebookRoutes.post(
  "/:id/notes",
  notebookAccess("viewer"),
  validate("params", resourceIdParamsSchema),
  validate("body", createWorkspaceNoteSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as { id?: string; title: string; body: string; sourceId?: string | null; page?: number | null };
    const notebookId = req.member!.notebookId;
    await assertNoteAnchor(notebookId, input.sourceId, input.page);
    const db = await getDb();
    const rows = await db.query(
      `INSERT INTO workspace_notes(id, notebook_id, user_id, title, body, source_id, page)
       VALUES (COALESCE($1::uuid, gen_random_uuid()), $2,$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO NOTHING RETURNING ${NOTE_FIELDS}`,
      [input.id ?? null, notebookId, req.user!.id, input.title, input.body, input.sourceId ?? null, input.page ?? null],
    );
    if (rows[0]) return res.status(201).json(ok(rows[0]));
    const existing = input.id ? await db.query(
      `SELECT ${NOTE_FIELDS} FROM workspace_notes WHERE id = $1 AND notebook_id = $2 AND user_id = $3`,
      [input.id, notebookId, req.user!.id],
    ) : [];
    if (!existing[0]) throw new AppError("CONFLICT", "That note ID already belongs to another record");
    res.json(ok(existing[0]));
  }),
);

notebookRoutes.patch(
  "/:id/notes/:noteId",
  notebookAccess("viewer"),
  validate("params", noteIdParamsSchema),
  validate("body", updateWorkspaceNoteSchema),
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const existing = await db.query<{ id: string; title: string; body: string; sourceId: string | null; page: number | null }>(
      `SELECT id, title, body, source_id AS "sourceId", page FROM workspace_notes WHERE id = $1 AND notebook_id = $2 AND user_id = $3`,
      [req.params.noteId, req.member!.notebookId, req.user!.id],
    );
    if (!existing[0]) throw new AppError("NOT_FOUND", "Note not found");
    const input = req.body as { title?: string; body?: string; sourceId?: string | null; page?: number | null };
    const sourceId = Object.hasOwn(input, "sourceId") ? input.sourceId : existing[0].sourceId;
    const page = Object.hasOwn(input, "page") ? input.page : existing[0].page;
    await assertNoteAnchor(req.member!.notebookId, sourceId, page);
    const rows = await db.query(
      `UPDATE workspace_notes SET title = $1, body = $2, source_id = $3, page = $4, updated_at = now()
       WHERE id = $5 AND notebook_id = $6 AND user_id = $7 RETURNING ${NOTE_FIELDS}`,
      [input.title ?? existing[0].title, input.body ?? existing[0].body, sourceId ?? null, page ?? null, req.params.noteId, req.member!.notebookId, req.user!.id],
    );
    res.json(ok(rows[0]));
  }),
);

notebookRoutes.delete(
  "/:id/notes/:noteId",
  notebookAccess("viewer"),
  validate("params", noteIdParamsSchema),
  asyncHandler(async (req, res) => {
    const rows = await (await getDb()).query(
      "DELETE FROM workspace_notes WHERE id = $1 AND notebook_id = $2 AND user_id = $3 RETURNING id",
      [req.params.noteId, req.member!.notebookId, req.user!.id],
    );
    if (!rows[0]) throw new AppError("NOT_FOUND", "Note not found");
    res.json(ok({ deleted: true }));
  }),
);

notebookRoutes.get(
  "/:id/discussion",
  notebookAccess("viewer"),
  validate("params", resourceIdParamsSchema),
  validate("query", discussionQuerySchema),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as { before?: string; limit: number };
    let cursor: { createdAt: string; id: string } | null = null;
    if (query.before) {
      try {
        const [createdAt, id] = Buffer.from(query.before, "base64url").toString().split("|");
        if (!createdAt || !id || Number.isNaN(Date.parse(createdAt)) || !/^[0-9a-f-]{36}$/i.test(id)) throw new Error();
        cursor = { createdAt, id };
      } catch {
        throw new AppError("VALIDATION", "Invalid discussion cursor");
      }
    }
    const rows = await (await getDb()).query<{ id: string; authorId: string; authorName: string; body: string; sourceId: string | null; createdAt: Date; cursorCreatedAt: string }>(
      `SELECT m.id, m.author_id AS "authorId", u.name AS "authorName", m.body, m.source_id AS "sourceId", m.created_at AS "createdAt", m.created_at::text AS "cursorCreatedAt"
       FROM discussion_messages m JOIN users u ON u.id = m.author_id
       WHERE m.notebook_id = $1 AND ($2::timestamptz IS NULL OR (m.created_at, m.id) < ($2::timestamptz, $3::uuid))
       ORDER BY m.created_at DESC, m.id DESC LIMIT $4`,
      [req.member!.notebookId, cursor?.createdAt ?? null, cursor?.id ?? null, query.limit + 1],
    );
    const messages = rows.slice(0, query.limit);
    const oldest = messages[messages.length - 1];
    const nextBefore = rows.length > query.limit && oldest ? Buffer.from(`${oldest.cursorCreatedAt}|${oldest.id}`).toString("base64url") : null;
    res.json(ok({ messages: messages.map(({ cursorCreatedAt: _cursor, ...message }) => message), nextBefore }));
  }),
);

notebookRoutes.post(
  "/:id/discussion",
  notebookAccess("viewer"),
  validate("params", resourceIdParamsSchema),
  validate("body", createDiscussionMessageSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as { id?: string; body: string; sourceId?: string | null };
    if (input.sourceId) {
      const source = await (await getDb()).query("SELECT 1 FROM sources WHERE id = $1 AND notebook_id = $2", [input.sourceId, req.member!.notebookId]);
      if (!source.length) throw new AppError("VALIDATION", "The source must belong to this notebook");
    }
    const db = await getDb();
    const rows = await db.query(
      `INSERT INTO discussion_messages(id, notebook_id, author_id, body, source_id)
       VALUES (COALESCE($1::uuid, gen_random_uuid()), $2,$3,$4,$5)
       ON CONFLICT (id) DO NOTHING RETURNING id`,
      [input.id ?? null, req.member!.notebookId, req.user!.id, input.body, input.sourceId ?? null],
    );
    const created = Boolean(rows[0]);
    if (!created && input.id) {
      const owned = await db.query("SELECT 1 FROM discussion_messages WHERE id = $1 AND notebook_id = $2 AND author_id = $3", [input.id, req.member!.notebookId, req.user!.id]);
      if (!owned.length) throw new AppError("CONFLICT", "That message ID already belongs to another record");
    }
    const message = await db.query(
      `SELECT m.id, m.author_id AS "authorId", u.name AS "authorName", m.body, m.source_id AS "sourceId", m.created_at AS "createdAt"
       FROM discussion_messages m JOIN users u ON u.id = m.author_id WHERE m.id = COALESCE($1::uuid, $2::uuid)`,
      [input.id ?? null, rows[0]?.id],
    );
    res.status(created ? 201 : 200).json(ok(message[0]));
  }),
);

notebookRoutes.post(
  "/",
  validate("body", createNotebookSchema),
  asyncHandler(async (req, res) => {
    const b = req.body as { title: string; course?: string; description?: string; category?: string; visibility?: string };
    const db = await getDb();
    const owned = await db.query<{ n: number }>("SELECT count(*)::int AS n FROM notebooks WHERE owner_id = $1", [req.user!.id]);
    if (owned[0]!.n >= MAX_NOTEBOOKS_PER_USER) throw new AppError("CONFLICT", `You can own at most ${MAX_NOTEBOOKS_PER_USER} notebooks`);
    const rows = await db.query<{ id: string }>(
      "INSERT INTO notebooks(title, course, description, category, visibility, owner_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id",
      [b.title, b.course ?? null, b.description ?? null, b.category ?? null, b.visibility ?? "private", req.user!.id],
    );
    const id = rows[0]!.id;
    await db.query("INSERT INTO notebook_members(notebook_id, user_id, role) VALUES ($1,$2,'owner')", [id, req.user!.id]);
    const nb = await db.query(`SELECT ${FIELDS} FROM notebooks n WHERE n.id = $1`, [id]);
    res.status(201).json(ok({ ...nb[0], role: "owner" }));
  }),
);

notebookRoutes.get(
  "/",
  asyncHandler(async (req, res) => {
    const rows = await (await getDb()).query(
      `SELECT ${FIELDS}, m.role,
         (SELECT count(*)::int FROM notebook_members x WHERE x.notebook_id = n.id) AS "memberCount",
         (SELECT count(*)::int FROM sources s WHERE s.notebook_id = n.id) AS "sourceCount"
       FROM notebooks n JOIN notebook_members m ON m.notebook_id = n.id AND m.user_id = $1
       ORDER BY n.created_at DESC`,
      [req.user!.id],
    );
    res.json(ok(rows));
  }),
);

notebookRoutes.get(
  "/:id",
  notebookAccess("viewer"),
  asyncHandler(async (req, res) => {
    const rows = await (await getDb()).query(`SELECT ${FIELDS} FROM notebooks n WHERE n.id = $1`, [req.member!.notebookId]);
    res.json(ok({ ...rows[0], role: req.member!.role }));
  }),
);

notebookRoutes.patch(
  "/:id",
  notebookAccess("owner"),
  validate("body", updateNotebookSchema),
  asyncHandler(async (req, res) => {
    const b = req.body as Record<string, unknown>;
    const cols: Record<string, string> = { title: "title", course: "course", description: "description", category: "category", visibility: "visibility" };
    const sets: string[] = [];
    const params: unknown[] = [];
    for (const [k, col] of Object.entries(cols)) {
      if (b[k] !== undefined) {
        params.push(b[k]);
        sets.push(`${col} = $${params.length}`);
      }
    }
    if (!sets.length) throw new AppError("VALIDATION", "Nothing to update");
    params.push(req.member!.notebookId);
    const db = await getDb();
    await db.query(`UPDATE notebooks SET ${sets.join(", ")} WHERE id = $${params.length}`, params);
    const rows = await db.query(`SELECT ${FIELDS} FROM notebooks n WHERE n.id = $1`, [req.member!.notebookId]);
    res.json(ok({ ...rows[0], role: "owner" }));
  }),
);

notebookRoutes.delete(
  "/:id",
  notebookAccess("owner"),
  asyncHandler(async (req, res) => {
    await (await getDb()).query("DELETE FROM notebooks WHERE id = $1", [req.member!.notebookId]);
    res.json(ok({ deleted: true }));
  }),
);

// ---- members -------------------------------------------------------------------------------------

notebookRoutes.get(
  "/:id/members",
  notebookAccess("viewer"),
  asyncHandler(async (req, res) => {
    const rows = await (await getDb()).query(
      `SELECT u.id, u.name, u.email, m.role, m.joined_at AS "joinedAt"
       FROM notebook_members m JOIN users u ON u.id = m.user_id WHERE m.notebook_id = $1 ORDER BY m.joined_at`,
      [req.member!.notebookId],
    );
    res.json(ok(rows));
  }),
);

notebookRoutes.post(
  "/:id/members",
  notebookAccess("owner"),
  validate("body", addMemberSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as { email: string; role: string } | { friendId: string; role: string };
    const db = await getDb();
    const u = "friendId" in body
      ? await db.query<{ id: string }>(
        `SELECT CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END AS id FROM friendships f
         WHERE f.status = 'accepted' AND LEAST(f.requester_id, f.addressee_id) = LEAST($1::uuid, $2::uuid)
           AND GREATEST(f.requester_id, f.addressee_id) = GREATEST($1::uuid, $2::uuid)`,
        [req.user!.id, body.friendId],
      )
      : await db.query<{ id: string }>("SELECT id FROM users WHERE email = $1", [body.email]);
    if (!u[0]) throw new AppError("NOT_FOUND", "friendId" in body ? "This account is not an accepted friend" : "No user with that email");
    if (u[0].id === req.user!.id) throw new AppError("VALIDATION", "You already own this workspace");
    const exists = await db.query("SELECT 1 FROM notebook_members WHERE notebook_id = $1 AND user_id = $2", [req.member!.notebookId, u[0].id]);
    if (exists.length) throw new AppError("CONFLICT", "Already a member");
    await assertRoomForMember(req.member!.notebookId);
    await db.query("INSERT INTO notebook_members(notebook_id, user_id, role) VALUES ($1,$2,$3)", [req.member!.notebookId, u[0].id, body.role]);
    const room = await db.query<{ title: string }>("SELECT title FROM notebooks WHERE id = $1", [req.member!.notebookId]);
    await createNotification(db, { recipientId: u[0].id, actorId: req.user!.id, kind: "workspace_member_added", title: "Kamu ditambahkan ke workspace", body: `${req.user!.name} menambahkanmu ke ${room[0]?.title ?? "workspace"}.`, href: `/workspaces/${req.member!.notebookId}` });
    res.status(201).json(ok({ userId: u[0].id, role: body.role }));
  }),
);

notebookRoutes.patch(
  "/:id/members/:userId",
  notebookAccess("owner"),
  validate("body", changeRoleSchema),
  asyncHandler(async (req, res) => {
    const { role } = req.body as { role: string };
    const db = await getDb();
    const nb = await db.query<{ owner_id: string }>("SELECT owner_id FROM notebooks WHERE id = $1", [req.member!.notebookId]);
    if (nb[0]?.owner_id === req.params.userId) throw new AppError("FORBIDDEN", "The owner's role cannot change");
    const r = await db.query("UPDATE notebook_members SET role = $1 WHERE notebook_id = $2 AND user_id = $3 RETURNING user_id", [
      role,
      req.member!.notebookId,
      req.params.userId,
    ]);
    if (!r.length) throw new AppError("NOT_FOUND", "Member not found");
    res.json(ok({ userId: req.params.userId, role }));
  }),
);

notebookRoutes.delete(
  "/:id/members/:userId",
  notebookAccess("viewer"),
  asyncHandler(async (req, res) => {
    const target = String(req.params.userId);
    const self = target === req.user!.id;
    if (!self && req.member!.role !== "owner") throw new AppError("FORBIDDEN", "Only the owner can remove others");
    const db = await getDb();
    const nb = await db.query<{ owner_id: string }>("SELECT owner_id FROM notebooks WHERE id = $1", [req.member!.notebookId]);
    if (nb[0]?.owner_id === target) throw new AppError("FORBIDDEN", "The owner cannot leave; delete the notebook instead");
    await db.query("DELETE FROM notebook_members WHERE notebook_id = $1 AND user_id = $2", [req.member!.notebookId, target]);
    res.json(ok({ removed: true }));
  }),
);

notebookRoutes.get(
  "/:id/classroom/presence",
  notebookAccess("viewer"),
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const notebookId = req.member!.notebookId;
    await db.query("DELETE FROM classroom_presence WHERE notebook_id = $1 AND last_seen_at < now() - interval '45 seconds'", [notebookId]);
    const members = await db.query(
      `SELECT p.user_id AS "userId", u.name, p.last_seen_at AS "lastSeenAt"
       FROM classroom_presence p JOIN users u ON u.id = p.user_id
       WHERE p.notebook_id = $1 ORDER BY p.last_seen_at DESC`,
      [notebookId],
    );
    res.json(ok({ members, expiresAfterSec: 45, heartbeatEverySec: 15 }));
  }),
);

notebookRoutes.put(
  "/:id/classroom/presence",
  notebookAccess("viewer"),
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const notebookId = req.member!.notebookId;
    await db.query(
      `INSERT INTO classroom_presence(notebook_id, user_id, last_seen_at) VALUES ($1,$2,now())
       ON CONFLICT (notebook_id, user_id) DO UPDATE SET last_seen_at = now()`,
      [notebookId, req.user!.id],
    );
    await db.query("DELETE FROM classroom_presence WHERE notebook_id = $1 AND last_seen_at < now() - interval '45 seconds'", [notebookId]);
    const members = await db.query(
      `SELECT p.user_id AS "userId", u.name, p.last_seen_at AS "lastSeenAt"
       FROM classroom_presence p JOIN users u ON u.id = p.user_id
       WHERE p.notebook_id = $1 ORDER BY p.last_seen_at DESC`,
      [notebookId],
    );
    res.json(ok({ members, expiresAfterSec: 45, heartbeatEverySec: 15 }));
  }),
);

notebookRoutes.delete(
  "/:id/classroom/presence",
  notebookAccess("viewer"),
  asyncHandler(async (req, res) => {
    await (await getDb()).query("DELETE FROM classroom_presence WHERE notebook_id = $1 AND user_id = $2", [req.member!.notebookId, req.user!.id]);
    res.json(ok({ present: false }));
  }),
);

// ---- invites -------------------------------------------------------------------------------------

notebookRoutes.post(
  "/:id/invites",
  notebookAccess("owner"),
  validate("body", createInviteSchema),
  asyncHandler(async (req, res) => {
    const { role, expiresInDays, maxUses } = req.body as { role: string; expiresInDays: number; maxUses: number };
    const token = crypto.randomBytes(18).toString("base64url");
    await (await getDb()).query(
      "INSERT INTO invites(token, notebook_id, role, created_by, expires_at, max_uses) VALUES ($1,$2,$3,$4,$5,$6)",
      [token, req.member!.notebookId, role, req.user!.id, new Date(Date.now() + expiresInDays * 86_400_000), maxUses],
    );
    res.status(201).json(ok({ token, role, expiresInDays, maxUses }));
  }),
);

export const inviteRoutes = Router();
inviteRoutes.use(requireAuth);
inviteRoutes.post(
  "/:token/accept",
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const inv = await db.query<{ notebook_id: string; role: string; uses: number; max_uses: number; expires_at: Date; owner_id: string; title: string }>(
      "SELECT i.notebook_id, i.role, i.uses, i.max_uses, i.expires_at, n.owner_id, n.title FROM invites i JOIN notebooks n ON n.id = i.notebook_id WHERE i.token = $1",
      [req.params.token],
    );
    const i = inv[0];
    if (!i || new Date(i.expires_at) < new Date() || i.uses >= i.max_uses) throw new AppError("NOT_FOUND", "Invite is invalid or expired");
    const member = await db.query("SELECT 1 FROM notebook_members WHERE notebook_id = $1 AND user_id = $2", [i.notebook_id, req.user!.id]);
    if (!member.length) {
      await assertRoomForMember(i.notebook_id);
      await db.query("INSERT INTO notebook_members(notebook_id, user_id, role) VALUES ($1,$2,$3)", [i.notebook_id, req.user!.id, i.role]);
      await db.query("UPDATE invites SET uses = uses + 1 WHERE token = $1", [req.params.token]);
      await createNotification(db, { recipientId: req.user!.id, actorId: i.owner_id, kind: "workspace_member_added", title: "Kamu bergabung ke workspace", body: `Undangan ${i.title} berhasil digunakan.`, href: `/workspaces/${i.notebook_id}` });
    }
    res.json(ok({ notebookId: i.notebook_id, role: member.length ? "existing" : i.role }));
  }),
);

// ---- public notebooks and join requests (F-11) ---------------------------------------------------

export const publicRoutes = Router();
publicRoutes.use(requireAuth);

publicRoutes.get(
  "/notebooks",
  asyncHandler(async (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 80) : "";
    const category = typeof req.query.category === "string" ? req.query.category.trim().slice(0, 60) : "";
    const rows = await (await getDb()).query(
      `SELECT ${FIELDS},
         (SELECT count(*)::int FROM notebook_members x WHERE x.notebook_id = n.id) AS "memberCount",
         (SELECT count(*)::int FROM sources s WHERE s.notebook_id = n.id) AS "sourceCount",
         EXISTS (SELECT 1 FROM notebook_members x WHERE x.notebook_id = n.id AND x.user_id = $1) AS "isMember"
       FROM notebooks n
       WHERE n.visibility = 'public'
         AND ($2 = '' OR n.title ILIKE '%' || $2 || '%' OR n.course ILIKE '%' || $2 || '%' OR n.description ILIKE '%' || $2 || '%')
         AND ($3 = '' OR n.category = $3)
       ORDER BY n.created_at DESC LIMIT 50`,
      [req.user!.id, q, category],
    );
    res.json(ok(rows));
  }),
);

publicRoutes.post(
  "/notebooks/:id/join-requests",
  validate("body", joinRequestSchema),
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const id = String(req.params.id);
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new AppError("NOT_FOUND", "Public notebook not found");
    const nb = await db.query("SELECT 1 FROM notebooks WHERE id = $1 AND visibility = 'public'", [id]);
    if (!nb.length) throw new AppError("NOT_FOUND", "Public notebook not found");
    const member = await db.query("SELECT 1 FROM notebook_members WHERE notebook_id = $1 AND user_id = $2", [id, req.user!.id]);
    if (member.length) throw new AppError("CONFLICT", "Already a member");
    await db.query(
      `INSERT INTO join_requests(notebook_id, user_id, message) VALUES ($1,$2,$3)
       ON CONFLICT (notebook_id, user_id) DO UPDATE SET status = 'pending', message = EXCLUDED.message, created_at = now()`,
      [id, req.user!.id, (req.body as { message?: string }).message ?? null],
    );
    res.status(201).json(ok({ status: "pending" }));
  }),
);

notebookRoutes.get(
  "/:id/join-requests",
  notebookAccess("owner"),
  asyncHandler(async (req, res) => {
    const rows = await (await getDb()).query(
      `SELECT u.id AS "userId", u.name, u.email, j.message, j.created_at AS "createdAt"
       FROM join_requests j JOIN users u ON u.id = j.user_id WHERE j.notebook_id = $1 AND j.status = 'pending' ORDER BY j.created_at`,
      [req.member!.notebookId],
    );
    res.json(ok(rows));
  }),
);

notebookRoutes.post(
  "/:id/join-requests/:userId/:decision",
  notebookAccess("owner"),
  asyncHandler(async (req, res) => {
    const decision = req.params.decision;
    if (decision !== "approve" && decision !== "reject") throw new AppError("VALIDATION", "Decision must be approve or reject");
    const db = await getDb();
    const r = await db.query(
      "UPDATE join_requests SET status = $1 WHERE notebook_id = $2 AND user_id = $3 AND status = 'pending' RETURNING user_id",
      [decision === "approve" ? "approved" : "rejected", req.member!.notebookId, req.params.userId],
    );
    if (!r.length) throw new AppError("NOT_FOUND", "No pending request");
    if (decision === "approve") {
      await assertRoomForMember(req.member!.notebookId);
      await db.query(
        "INSERT INTO notebook_members(notebook_id, user_id, role) VALUES ($1,$2,'viewer') ON CONFLICT DO NOTHING",
        [req.member!.notebookId, req.params.userId],
      );
    }
    const notebook = await db.query<{ title: string }>("SELECT title FROM notebooks WHERE id = $1", [req.member!.notebookId]);
    await createNotification(db, {
      recipientId: String(req.params.userId), actorId: req.user!.id, kind: "join_request_decision",
      title: decision === "approve" ? "Permintaan bergabung diterima" : "Permintaan bergabung ditolak",
      body: `Permintaanmu ke ${notebook[0]?.title ?? "workspace"} ${decision === "approve" ? "diterima" : "ditolak"}.`,
      href: decision === "approve" ? `/workspaces/${req.member!.notebookId}` : "/discover",
    });
    res.json(ok({ userId: req.params.userId, status: decision === "approve" ? "approved" : "rejected" }));
  }),
);
