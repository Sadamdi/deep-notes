import { changePasswordSchema, createWriterDraftSchema, deleteAccountSchema, draftIdParamsSchema, updateWriterDraftSchema } from "@deep-notes/shared";
import { Router } from "express";
import { getDb } from "../../db/index.js";
import { ok } from "../../lib/apiResponse.js";
import { AppError } from "../../lib/errors.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { SESSION_COOKIE, cookieOptions, hashToken, requireAuth } from "../../middleware/auth.js";
import { rateLimit } from "../../middleware/rateLimit.js";
import { validate } from "../../middleware/validate.js";

/** Account management under /me: password change, sign out everywhere, data export, account deletion. */
export const accountRoutes = Router();
accountRoutes.use(requireAuth);

const DRAFT_FIELDS = `id, title, summary, body, created_at AS "createdAt", updated_at AS "updatedAt"`;

accountRoutes.get(
  "/drafts",
  asyncHandler(async (req, res) => {
    const drafts = await (await getDb()).query(
      `SELECT ${DRAFT_FIELDS} FROM writer_drafts WHERE user_id = $1 ORDER BY updated_at DESC`,
      [req.user!.id],
    );
    res.json(ok(drafts));
  }),
);

accountRoutes.post(
  "/drafts",
  validate("body", createWriterDraftSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as { id?: string; title: string; summary: string; body: string };
    const db = await getDb();
    const rows = await db.query(
      `INSERT INTO writer_drafts(id, user_id, title, summary, body)
       VALUES (COALESCE($1::uuid, gen_random_uuid()), $2,$3,$4,$5)
       ON CONFLICT (id) DO NOTHING RETURNING ${DRAFT_FIELDS}`,
      [input.id ?? null, req.user!.id, input.title, input.summary, input.body],
    );
    if (rows[0]) return res.status(201).json(ok(rows[0]));
    const existing = input.id ? await db.query(
      `SELECT ${DRAFT_FIELDS} FROM writer_drafts WHERE id = $1 AND user_id = $2`,
      [input.id, req.user!.id],
    ) : [];
    if (!existing[0]) throw new AppError("CONFLICT", "That draft ID already belongs to another record");
    res.json(ok(existing[0]));
  }),
);

accountRoutes.patch(
  "/drafts/:draftId",
  validate("params", draftIdParamsSchema),
  validate("body", updateWriterDraftSchema),
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const current = await db.query<{ title: string; summary: string; body: string }>(
      "SELECT title, summary, body FROM writer_drafts WHERE id = $1 AND user_id = $2",
      [req.params.draftId, req.user!.id],
    );
    if (!current[0]) throw new AppError("NOT_FOUND", "Draft not found");
    const input = req.body as { title?: string; summary?: string; body?: string };
    const rows = await db.query(
      `UPDATE writer_drafts SET title = $1, summary = $2, body = $3, updated_at = now()
       WHERE id = $4 AND user_id = $5 RETURNING ${DRAFT_FIELDS}`,
      [input.title ?? current[0].title, input.summary ?? current[0].summary, input.body ?? current[0].body, req.params.draftId, req.user!.id],
    );
    res.json(ok(rows[0]));
  }),
);

accountRoutes.delete(
  "/drafts/:draftId",
  validate("params", draftIdParamsSchema),
  asyncHandler(async (req, res) => {
    const rows = await (await getDb()).query(
      "DELETE FROM writer_drafts WHERE id = $1 AND user_id = $2 RETURNING id",
      [req.params.draftId, req.user!.id],
    );
    if (!rows[0]) throw new AppError("NOT_FOUND", "Draft not found");
    res.json(ok({ deleted: true }));
  }),
);

const sensitive = rateLimit({ windowMs: 15 * 60_000, max: 10, key: (req) => `acct:${req.user?.id}` });

async function checkPassword(userId: string, password: string): Promise<void> {
  const rows = await (await getDb()).query<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = $1", [userId]);
  if (!rows[0] || !(await verifyPassword(password, rows[0].password_hash))) throw new AppError("UNAUTHORIZED", "Password is incorrect");
}

accountRoutes.post(
  "/password",
  sensitive,
  validate("body", changePasswordSchema),
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };
    await checkPassword(req.user!.id, currentPassword);
    const db = await getDb();
    await db.query("UPDATE users SET password_hash = $1 WHERE id = $2", [await hashPassword(newPassword), req.user!.id]);
    // keep this device signed in, end every other session
    const keep = hashToken(String(req.cookies?.[SESSION_COOKIE] ?? ""));
    await db.query("DELETE FROM sessions WHERE user_id = $1 AND token_hash <> $2", [req.user!.id, keep]);
    res.json(ok({ changed: true }));
  }),
);

accountRoutes.post(
  "/logout-all",
  asyncHandler(async (req, res) => {
    await (await getDb()).query("DELETE FROM sessions WHERE user_id = $1", [req.user!.id]);
    res.clearCookie(SESSION_COOKIE, cookieOptions()).json(ok({ loggedOut: true }));
  }),
);

/** A copy of the user's own data (GDPR-style access). Contains no other member's private details. */
accountRoutes.get(
  "/export",
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const id = req.user!.id;
    const [profile, notebooks, questions, attempts, sources, assignments, notes, discussion, drafts, savedPosts] = await Promise.all([
      db.query('SELECT id, email, name, course, looking_for_partners AS "lookingForPartners", created_at AS "createdAt" FROM users WHERE id = $1', [id]),
      db.query('SELECT n.id, n.title, m.role, m.joined_at AS "joinedAt" FROM notebook_members m JOIN notebooks n ON n.id = m.notebook_id WHERE m.user_id = $1', [id]),
      db.query('SELECT notebook_id AS "notebookId", question, answer, grounded, created_at AS "createdAt" FROM questions WHERE asked_by = $1 ORDER BY created_at', [id]),
      db.query('SELECT quiz_id AS "quizId", score, total, duration_ms AS "durationMs", created_at AS "createdAt" FROM quiz_attempts WHERE user_id = $1 ORDER BY created_at', [id]),
      db.query('SELECT id, notebook_id AS "notebookId", title, kind, created_at AS "createdAt" FROM sources WHERE uploaded_by = $1', [id]),
      db.query('SELECT topic, status, due_at AS "dueAt" FROM assignments WHERE assignee_id = $1', [id]),
      db.query('SELECT notebook_id AS "notebookId", title, body, source_id AS "sourceId", page, created_at AS "createdAt", updated_at AS "updatedAt" FROM workspace_notes WHERE user_id = $1', [id]),
      db.query('SELECT notebook_id AS "notebookId", body, source_id AS "sourceId", created_at AS "createdAt" FROM discussion_messages WHERE author_id = $1', [id]),
      db.query(`SELECT ${DRAFT_FIELDS} FROM writer_drafts WHERE user_id = $1`, [id]),
      db.query('SELECT post_id AS "postId", created_at AS "savedAt" FROM saved_posts WHERE user_id = $1', [id]),
    ]);
    res.json(ok({ profile: profile[0], notebooks, questions, quizAttempts: attempts, sourcesUploaded: sources, assignments, notes, discussion, drafts, savedPosts }));
  }),
);

accountRoutes.delete(
  "/",
  sensitive,
  validate("body", deleteAccountSchema),
  asyncHandler(async (req, res) => {
    await checkPassword(req.user!.id, (req.body as { password: string }).password);
    const db = await getDb();
    const owned = await db.query<{ title: string }>("SELECT title FROM notebooks WHERE owner_id = $1", [req.user!.id]);
    if (owned.length) {
      throw new AppError("CONFLICT", "Delete the notebooks you own first", { notebooks: owned.map((n) => n.title) });
    }
    await db.query("DELETE FROM users WHERE id = $1", [req.user!.id]);
    res.clearCookie(SESSION_COOKIE, cookieOptions()).json(ok({ deleted: true }));
  }),
);
