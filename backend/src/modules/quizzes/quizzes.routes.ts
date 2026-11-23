import { generateQuizSchema, submitAttemptSchema, type QuizItem } from "@deep-notes/shared";
import { Router } from "express";
import { getDb } from "../../db/index.js";
import { ok } from "../../lib/apiResponse.js";
import { logActivity } from "../../lib/activity.js";
import { AppError } from "../../lib/errors.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { notebookAccess, requireAuth } from "../../middleware/auth.js";
import { rateLimit } from "../../middleware/rateLimit.js";
import { validate } from "../../middleware/validate.js";
import { generateItems, grade, hideAnswers } from "./quizzes.service.js";

export const quizRoutes = Router({ mergeParams: true });
quizRoutes.use(requireAuth);

const aiLimit = rateLimit({ windowMs: 10 * 60_000, max: 12, key: (req) => `quiz:${req.user?.id}` });
const GRACE_MS = 15_000;

const META = `q.id, q.title, q.kind, q.time_limit_sec AS "timeLimitSec", q.per_question_sec AS "perQuestionSec", q.due_at AS "dueAt",
  q.created_at AS "createdAt", jsonb_array_length(q.items)::int AS "questionCount", q.created_by AS "createdBy"`;

quizRoutes.post(
  "/",
  notebookAccess("editor"),
  aiLimit,
  validate("body", generateQuizSchema),
  asyncHandler(async (req, res) => {
    const b = req.body as { title?: string; kind: string; count: number; topic?: string; sourceId?: string; timeLimitSec?: number; perQuestionSec?: number; dueAt?: string };
    if (b.kind === "weekly" && !b.dueAt) throw new AppError("VALIDATION", "A weekly quiz needs a due date");
    if (b.kind === "exam" && !b.timeLimitSec) throw new AppError("VALIDATION", "An exam needs a time limit");
    const items = await generateItems(req.member!.notebookId, b.count, { topic: b.topic, sourceId: b.sourceId });
    const rows = await (await getDb()).query<{ id: string }>(
      `INSERT INTO quizzes(notebook_id, created_by, title, kind, items, time_limit_sec, per_question_sec, due_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [
        req.member!.notebookId,
        req.user!.id,
        b.title ?? (b.kind === "weekly" ? "Kuis mingguan" : b.kind === "exam" ? "Ujian" : b.topic ? `Latihan: ${b.topic}` : "Latihan"),
        b.kind,
        JSON.stringify(items),
        b.timeLimitSec ?? null,
        b.perQuestionSec ?? null,
        b.dueAt ?? null,
      ],
    );
    res.status(201).json(ok({ id: rows[0]!.id, questionCount: items.length, kind: b.kind }));
  }),
);

quizRoutes.get(
  "/",
  notebookAccess("viewer"),
  asyncHandler(async (req, res) => {
    const rows = await (await getDb()).query(
      `SELECT ${META},
         (SELECT count(*)::int FROM quiz_attempts a WHERE a.quiz_id = q.id AND a.user_id = $2) AS "myAttempts",
         (SELECT max(a.score) FROM quiz_attempts a WHERE a.quiz_id = q.id AND a.user_id = $2) AS "myBest"
       FROM quizzes q WHERE q.notebook_id = $1 ORDER BY q.created_at DESC`,
      [req.member!.notebookId, req.user!.id],
    );
    res.json(ok(rows));
  }),
);

async function loadQuiz(notebookId: string, quizId: string) {
  const rows = await (await getDb()).query<{ id: string; kind: string; items: QuizItem[]; time_limit_sec: number | null; per_question_sec: number | null; due_at: Date | null; title: string }>(
    "SELECT id, kind, items, time_limit_sec, per_question_sec, due_at, title FROM quizzes WHERE notebook_id = $1 AND id::text = $2",
    [notebookId, quizId],
  );
  if (!rows[0]) throw new AppError("NOT_FOUND", "Quiz not found");
  return rows[0];
}

quizRoutes.get(
  "/:quizId",
  notebookAccess("viewer"),
  asyncHandler(async (req, res) => {
    const q = await loadQuiz(req.member!.notebookId, String(req.params.quizId));
    res.json(ok({ id: q.id, title: q.title, kind: q.kind, timeLimitSec: q.time_limit_sec, perQuestionSec: q.per_question_sec, dueAt: q.due_at, questions: hideAnswers(q.items) }));
  }),
);

/** Exam mode: the server starts the clock, so the limit cannot be skipped from the browser. */
quizRoutes.post(
  "/:quizId/start",
  notebookAccess("viewer"),
  asyncHandler(async (req, res) => {
    const q = await loadQuiz(req.member!.notebookId, String(req.params.quizId));
    const db = await getDb();
    await db.query("INSERT INTO quiz_starts(quiz_id, user_id) VALUES ($1,$2) ON CONFLICT (quiz_id, user_id) DO UPDATE SET started_at = now()", [q.id, req.user!.id]);
    res.json(ok({ startedAt: new Date().toISOString(), timeLimitSec: q.time_limit_sec }));
  }),
);

quizRoutes.post(
  "/:quizId/attempts",
  notebookAccess("viewer"),
  validate("body", submitAttemptSchema),
  asyncHandler(async (req, res) => {
    const b = req.body as { answers: Array<number | null>; durationMs?: number };
    const q = await loadQuiz(req.member!.notebookId, String(req.params.quizId));
    const db = await getDb();
    let durationMs = b.durationMs ?? null;

    if (q.kind === "weekly") {
      if (q.due_at && new Date(q.due_at) < new Date()) throw new AppError("CONFLICT", "This weekly quiz is closed");
      const done = await db.query("SELECT 1 FROM quiz_attempts WHERE quiz_id = $1 AND user_id = $2", [q.id, req.user!.id]);
      if (done.length) throw new AppError("CONFLICT", "You already took this weekly quiz");
    }
    if (q.kind === "exam") {
      const st = await db.query<{ started_at: Date }>("SELECT started_at FROM quiz_starts WHERE quiz_id = $1 AND user_id = $2", [q.id, req.user!.id]);
      if (!st[0]) throw new AppError("CONFLICT", "Start the exam first");
      const elapsed = Date.now() - new Date(st[0].started_at).getTime();
      if (q.time_limit_sec && elapsed > q.time_limit_sec * 1000 + GRACE_MS) throw new AppError("CONFLICT", "Time is up for this exam");
      durationMs = elapsed;
      await db.query("DELETE FROM quiz_starts WHERE quiz_id = $1 AND user_id = $2", [q.id, req.user!.id]);
    }

    const { results, score } = grade(q.items, b.answers);
    const rows = await db.query<{ id: string }>(
      `INSERT INTO quiz_attempts(quiz_id, notebook_id, user_id, answers, results, score, total, duration_ms)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [q.id, req.member!.notebookId, req.user!.id, JSON.stringify(b.answers), JSON.stringify(results), score, results.length, durationMs],
    );
    await logActivity(req.member!.notebookId, req.user!.id, "quiz_taken", rows[0]!.id);
    res.status(201).json(ok({ attemptId: rows[0]!.id, score, total: results.length, durationMs, results }));
  }),
);

/** Scoreboard: best attempt per member (weekly quizzes have exactly one). Ranked by score, then speed. */
quizRoutes.get(
  "/:quizId/scoreboard",
  notebookAccess("viewer"),
  asyncHandler(async (req, res) => {
    const q = await loadQuiz(req.member!.notebookId, String(req.params.quizId));
    const rows = await (await getDb()).query(
      `SELECT DISTINCT ON (a.user_id) a.user_id AS "userId", u.name, a.score, a.total, a.duration_ms AS "durationMs", a.created_at AS "takenAt"
       FROM quiz_attempts a JOIN users u ON u.id = a.user_id
       WHERE a.quiz_id = $1 ORDER BY a.user_id, a.score DESC, a.duration_ms ASC NULLS LAST`,
      [q.id],
    );
    const ranked = [...rows].sort((a, b) => b.score - a.score || (a.durationMs ?? 1e12) - (b.durationMs ?? 1e12));
    const members = await (await getDb()).query<{ id: string; name: string }>(
      "SELECT u.id, u.name FROM notebook_members m JOIN users u ON u.id = m.user_id WHERE m.notebook_id = $1",
      [req.member!.notebookId],
    );
    const taken = new Set(ranked.map((r) => r.userId));
    res.json(ok({
      quizId: q.id,
      dueAt: q.due_at,
      ranking: ranked.map((r, i) => ({ rank: i + 1, ...r })),
      notYetTaken: members.filter((m) => !taken.has(m.id)).map((m) => ({ userId: m.id, name: m.name })),
    }));
  }),
);

quizRoutes.get(
  "/:quizId/attempts/mine",
  notebookAccess("viewer"),
  asyncHandler(async (req, res) => {
    const q = await loadQuiz(req.member!.notebookId, String(req.params.quizId));
    const rows = await (await getDb()).query(
      `SELECT id, score, total, duration_ms AS "durationMs", results, created_at AS "createdAt"
       FROM quiz_attempts WHERE quiz_id = $1 AND user_id = $2 ORDER BY created_at DESC`,
      [q.id, req.user!.id],
    );
    res.json(ok(rows));
  }),
);
