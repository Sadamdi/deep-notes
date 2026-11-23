import crypto from "node:crypto";
import {
  addMemberSchema,
  changeRoleSchema,
  createInviteSchema,
  createNotebookSchema,
  joinRequestSchema,
  updateNotebookSchema,
} from "@deep-notes/shared";
import { Router } from "express";
import { getDb } from "../../db/index.js";
import { ok } from "../../lib/apiResponse.js";
import { AppError } from "../../lib/errors.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { notebookAccess, requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";

export const notebookRoutes = Router();
notebookRoutes.use(requireAuth);

export const MAX_NOTEBOOKS_PER_USER = 20;
export const MAX_MEMBERS_PER_NOTEBOOK = 50;

async function assertRoomForMember(notebookId: string): Promise<void> {
  const c = await (await getDb()).query<{ n: number }>("SELECT count(*)::int AS n FROM notebook_members WHERE notebook_id = $1", [notebookId]);
  if (c[0]!.n >= MAX_MEMBERS_PER_NOTEBOOK) throw new AppError("CONFLICT", `A notebook can have at most ${MAX_MEMBERS_PER_NOTEBOOK} members`);
}

const FIELDS = `n.id, n.title, n.course, n.description, n.category, n.visibility, n.owner_id AS "ownerId", n.created_at AS "createdAt"`;

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
    const { email, role } = req.body as { email: string; role: string };
    const db = await getDb();
    const u = await db.query<{ id: string }>("SELECT id FROM users WHERE email = $1", [email]);
    if (!u[0]) throw new AppError("NOT_FOUND", "No user with that email");
    const exists = await db.query("SELECT 1 FROM notebook_members WHERE notebook_id = $1 AND user_id = $2", [req.member!.notebookId, u[0].id]);
    if (exists.length) throw new AppError("CONFLICT", "Already a member");
    await assertRoomForMember(req.member!.notebookId);
    await db.query("INSERT INTO notebook_members(notebook_id, user_id, role) VALUES ($1,$2,$3)", [req.member!.notebookId, u[0].id, role]);
    res.status(201).json(ok({ userId: u[0].id, role }));
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
    const inv = await db.query<{ notebook_id: string; role: string; uses: number; max_uses: number; expires_at: Date }>(
      "SELECT notebook_id, role, uses, max_uses, expires_at FROM invites WHERE token = $1",
      [req.params.token],
    );
    const i = inv[0];
    if (!i || new Date(i.expires_at) < new Date() || i.uses >= i.max_uses) throw new AppError("NOT_FOUND", "Invite is invalid or expired");
    const member = await db.query("SELECT 1 FROM notebook_members WHERE notebook_id = $1 AND user_id = $2", [i.notebook_id, req.user!.id]);
    if (!member.length) {
      await assertRoomForMember(i.notebook_id);
      await db.query("INSERT INTO notebook_members(notebook_id, user_id, role) VALUES ($1,$2,$3)", [i.notebook_id, req.user!.id, i.role]);
      await db.query("UPDATE invites SET uses = uses + 1 WHERE token = $1", [req.params.token]);
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
    res.json(ok({ userId: req.params.userId, status: decision === "approve" ? "approved" : "rejected" }));
  }),
);
