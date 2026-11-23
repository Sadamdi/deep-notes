import { Router } from "express";
import { getDb } from "../../db/index.js";
import { ok } from "../../lib/apiResponse.js";
import { AppError } from "../../lib/errors.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { notebookAccess, requireAuth } from "../../middleware/auth.js";

/** Housekeeping routes for a notebook: invite management and quiz removal. */
export const extrasRoutes = Router({ mergeParams: true });
extrasRoutes.use(requireAuth);

extrasRoutes.get(
  "/invites",
  notebookAccess("owner"),
  asyncHandler(async (req, res) => {
    const rows = await (await getDb()).query(
      `SELECT token, role, uses, max_uses AS "maxUses", expires_at AS "expiresAt", created_at AS "createdAt",
              (expires_at < now() OR uses >= max_uses) AS "inactive"
       FROM invites WHERE notebook_id = $1 ORDER BY created_at DESC`,
      [req.member!.notebookId],
    );
    res.json(ok(rows));
  }),
);

extrasRoutes.delete(
  "/invites/:token",
  notebookAccess("owner"),
  asyncHandler(async (req, res) => {
    const r = await (await getDb()).query("DELETE FROM invites WHERE notebook_id = $1 AND token = $2 RETURNING token", [req.member!.notebookId, req.params.token]);
    if (!r.length) throw new AppError("NOT_FOUND", "Invite not found");
    res.json(ok({ revoked: true }));
  }),
);

extrasRoutes.delete(
  "/quizzes/:quizId",
  notebookAccess("editor"),
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const q = await db.query<{ created_by: string }>("SELECT created_by FROM quizzes WHERE notebook_id = $1 AND id::text = $2", [req.member!.notebookId, req.params.quizId]);
    if (!q[0]) throw new AppError("NOT_FOUND", "Quiz not found");
    if (req.member!.role !== "owner" && q[0].created_by !== req.user!.id) throw new AppError("FORBIDDEN", "Only the creator or the owner can delete a quiz");
    await db.query("DELETE FROM quizzes WHERE id::text = $1", [req.params.quizId]);
    res.json(ok({ deleted: true }));
  }),
);

extrasRoutes.delete(
  "/questions/:questionId",
  notebookAccess("viewer"),
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const q = await db.query<{ asked_by: string }>("SELECT asked_by FROM questions WHERE notebook_id = $1 AND id::text = $2", [req.member!.notebookId, req.params.questionId]);
    if (!q[0]) throw new AppError("NOT_FOUND", "Question not found");
    if (req.member!.role !== "owner" && q[0].asked_by !== req.user!.id) throw new AppError("FORBIDDEN", "Only the asker or the owner can delete a question");
    await db.query("DELETE FROM questions WHERE id::text = $1", [req.params.questionId]);
    res.json(ok({ deleted: true }));
  }),
);
