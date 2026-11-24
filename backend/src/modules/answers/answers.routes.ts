import { askQuestionSchema } from "@deep-notes/shared";
import { Router } from "express";
import { getDb } from "../../db/index.js";
import { ok } from "../../lib/apiResponse.js";
import { logActivity } from "../../lib/activity.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { notebookAccess, requireAuth } from "../../middleware/auth.js";
import { rateLimit } from "../../middleware/rateLimit.js";
import { validate } from "../../middleware/validate.js";
import { answerQuestion, explainQuestion } from "./answers.service.js";

export const answerRoutes = Router({ mergeParams: true });
answerRoutes.use(requireAuth);

const aiLimit = rateLimit({ windowMs: 10 * 60_000, max: 40, key: (req) => `ai:${req.user?.id}` });

answerRoutes.post(
  "/ask",
  notebookAccess("viewer"),
  aiLimit,
  validate("body", askQuestionSchema),
  asyncHandler(async (req, res) => {
    const { question, sourceIds } = req.body as { question: string; sourceIds?: string[] };
    const result = await answerQuestion(req.member!.notebookId, question, sourceIds);
    const rows = await (await getDb()).query<{ id: string; created_at: Date }>(
      "INSERT INTO questions(notebook_id, asked_by, question, grounded, answer, citations) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, created_at",
      [req.member!.notebookId, req.user!.id, question, result.grounded, result.text, JSON.stringify(result.citations)],
    );
    await logActivity(req.member!.notebookId, req.user!.id, "question_asked", rows[0]!.id);
    res.json(ok({ id: rows[0]!.id, question, ...result }));
  }),
);

answerRoutes.post(
  "/explain",
  notebookAccess("viewer"),
  aiLimit,
  validate("body", askQuestionSchema),
  asyncHandler(async (req, res) => {
    const { question, sourceIds } = req.body as { question: string; sourceIds?: string[] };
    const result = await explainQuestion(req.member!.notebookId, question, sourceIds);
    const text = result.steps.map((s) => s.text).join("\n");
    const rows = await (await getDb()).query<{ id: string }>(
      "INSERT INTO questions(notebook_id, asked_by, question, grounded, answer, citations, steps) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id",
      [req.member!.notebookId, req.user!.id, question, result.grounded, text, JSON.stringify(result.citations), JSON.stringify(result.steps)],
    );
    await logActivity(req.member!.notebookId, req.user!.id, "question_asked", rows[0]!.id);
    res.json(ok({ id: rows[0]!.id, question, ...result }));
  }),
);

answerRoutes.get(
  "/questions",
  notebookAccess("viewer"),
  asyncHandler(async (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const rows = await (await getDb()).query(
      `SELECT q.id, q.question, q.grounded, q.answer, q.citations, q.steps, q.created_at AS "createdAt", u.name AS "askedByName", q.asked_by AS "askedBy"
       FROM questions q JOIN users u ON u.id = q.asked_by WHERE q.notebook_id = $1 ORDER BY q.created_at DESC LIMIT $2`,
      [req.member!.notebookId, limit],
    );
    res.json(ok(rows));
  }),
);
