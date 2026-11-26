import {
  BADGES,
  REACTION_FOR_EVENT,
  answerRoundSchema,
  createSessionSchema,
  type BadgeId,
  type Performance,
  teachBackSchema,
} from "@deep-notes/shared";
import crypto from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { getAi } from "../../ai/index.js";
import { getDb } from "../../db/index.js";
import { ok } from "../../lib/apiResponse.js";
import { AppError } from "../../lib/errors.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { notebookAccess, requireAuth } from "../../middleware/auth.js";
import { rateLimit } from "../../middleware/rateLimit.js";
import { validate } from "../../middleware/validate.js";
import { RULES } from "../answers/answers.service.js";
import { logActivity } from "../../lib/activity.js";
import { gradeItem, toPublic } from "./items.js";
import { planSession, type PlannedRound } from "./planner.js";
import { evaluateTeachBack } from "./teach.js";

export const playRoutes = Router({ mergeParams: true });
playRoutes.use(requireAuth);

const aiLimit = rateLimit({ windowMs: 10 * 60_000, max: 20, key: (req) => `play:${req.user?.id}` });
const MAX_PLAYERS = { solo: 1, duel: 2, group: 12 } as const;

interface SessionRow {
  id: string;
  notebook_id: string;
  created_by: string;
  mode: "solo" | "duel" | "group";
  status: "waiting" | "running" | "finished";
  focus_topic: string | null;
  plan: PlannedRound[];
  created_at: Date;
}

async function loadSession(notebookId: string, sid: string): Promise<SessionRow> {
  const rows = await (await getDb()).query<SessionRow>("SELECT * FROM game_sessions WHERE notebook_id = $1 AND id::text = $2", [notebookId, sid]);
  if (!rows[0]) throw new AppError("NOT_FOUND", "Session not found");
  return rows[0];
}

async function participants(sid: string) {
  const db = await getDb();
  return db.query(
    `SELECT p.user_id AS "userId", u.name, p.score, p.finished,
       (SELECT count(*)::int FROM session_answers a WHERE a.session_id = p.session_id AND a.user_id = p.user_id) AS "roundsAnswered"
     FROM session_participants p JOIN users u ON u.id = p.user_id WHERE p.session_id = $1 ORDER BY p.score DESC, p.joined_at`,
    [sid],
  );
}

const publicRounds = (plan: PlannedRound[]) =>
  plan.map((r) => ({ index: r.index, type: r.type, topic: r.topic, timeLimitSec: r.timeLimitSec, items: r.items.map(toPublic), cue: r.cue }));

async function sessionView(s: SessionRow, userId: string) {
  const parts = await participants(s.id);
  const answered = await (await getDb()).query<{ round_index: number }>("SELECT round_index FROM session_answers WHERE session_id = $1 AND user_id = $2", [s.id, userId]);
  return {
    id: s.id,
    hostId: s.created_by,
    mode: s.mode,
    status: s.status,
    focusTopic: s.focus_topic,
    roundCount: s.plan.length,
    // items are only revealed once the session runs, so waiting players cannot read ahead
    rounds: s.status === "waiting" ? [] : publicRounds(s.plan),
    answeredRounds: answered.map((a) => a.round_index),
    participants: parts,
    reactions: REACTION_FOR_EVENT,
  };
}

playRoutes.post(
  "/sessions",
  notebookAccess("viewer"),
  aiLimit,
  validate("body", createSessionSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as ReturnType<typeof createSessionSchema.parse>;
    const plan = await planSession(req.member!.notebookId, body);
    const db = await getDb();
    const rows = await db.query<{ id: string }>(
      "INSERT INTO game_sessions(notebook_id, created_by, mode, status, focus_topic, plan, started_at) VALUES ($1,$2,$3,$4,$5,$6, CASE WHEN $4 = 'running' THEN now() END) RETURNING id",
      [req.member!.notebookId, req.user!.id, body.mode, body.mode === "solo" ? "running" : "waiting", body.focusTopic ?? null, JSON.stringify(plan)],
    );
    await db.query("INSERT INTO session_participants(session_id, user_id) VALUES ($1,$2)", [rows[0]!.id, req.user!.id]);
    res.status(201).json(ok(await sessionView(await loadSession(req.member!.notebookId, rows[0]!.id), req.user!.id)));
  }),
);

playRoutes.get(
  "/sessions",
  notebookAccess("viewer"),
  asyncHandler(async (req, res) => {
    const rows = await (await getDb()).query(
      `SELECT g.id, g.mode, g.status, g.focus_topic AS "focusTopic", g.created_at AS "createdAt", jsonb_array_length(g.plan)::int AS "roundCount",
              (SELECT count(*)::int FROM session_participants p WHERE p.session_id = g.id) AS "players"
       FROM game_sessions g WHERE g.notebook_id = $1 AND (g.status <> 'finished' OR EXISTS (SELECT 1 FROM session_participants p WHERE p.session_id = g.id AND p.user_id = $2))
       ORDER BY g.created_at DESC LIMIT 30`,
      [req.member!.notebookId, req.user!.id],
    );
    res.json(ok(rows));
  }),
);

playRoutes.get(
  "/sessions/:sid",
  notebookAccess("viewer"),
  asyncHandler(async (req, res) => {
    const s = await loadSession(req.member!.notebookId, String(req.params.sid));
    const me = (await participants(s.id)).find((p: { userId: string }) => p.userId === req.user!.id);
    if (!me && s.status !== "waiting") throw new AppError("FORBIDDEN", "You are not a player in this session");
    res.json(ok(await sessionView(s, req.user!.id)));
  }),
);

playRoutes.post(
  "/sessions/:sid/join",
  notebookAccess("viewer"),
  asyncHandler(async (req, res) => {
    const s = await loadSession(req.member!.notebookId, String(req.params.sid));
    if (s.status !== "waiting") throw new AppError("CONFLICT", "This session already started");
    const parts = await participants(s.id);
    if (parts.some((p: { userId: string }) => p.userId === req.user!.id)) return res.json(ok(await sessionView(s, req.user!.id)));
    if (parts.length >= MAX_PLAYERS[s.mode]) throw new AppError("CONFLICT", "This session is full");
    await (await getDb()).query("INSERT INTO session_participants(session_id, user_id) VALUES ($1,$2)", [s.id, req.user!.id]);
    res.json(ok(await sessionView(s, req.user!.id)));
  }),
);

playRoutes.post(
  "/sessions/:sid/start",
  notebookAccess("viewer"),
  asyncHandler(async (req, res) => {
    const s = await loadSession(req.member!.notebookId, String(req.params.sid));
    if (s.created_by !== req.user!.id) throw new AppError("FORBIDDEN", "Only the creator can start the session");
    if (s.status !== "waiting") throw new AppError("CONFLICT", "The session already started");
    if ((await participants(s.id)).length < 2) throw new AppError("CONFLICT", "At least two players must join before the session starts");
    await (await getDb()).query("UPDATE game_sessions SET status = 'running', started_at = now() WHERE id = $1", [s.id]);
    res.json(ok(await sessionView({ ...s, status: "running" }, req.user!.id)));
  }),
);

playRoutes.get(
  "/sessions/:sid/scoreboard",
  notebookAccess("viewer"),
  asyncHandler(async (req, res) => {
    const s = await loadSession(req.member!.notebookId, String(req.params.sid));
    const parts = await participants(s.id);
    res.json(ok({ status: s.status, roundCount: s.plan.length, ranking: parts.map((p: object, i: number) => ({ rank: i + 1, ...p })) }));
  }),
);

const speedBonus = (elapsedMs: number | undefined, limitSec: number) => (elapsedMs === undefined ? 0 : Math.round(50 * Math.max(0, 1 - elapsedMs / (limitSec * 1000))));

playRoutes.post(
  "/sessions/:sid/rounds/:n/answer",
  notebookAccess("viewer"),
  aiLimit,
  validate("body", answerRoundSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as ReturnType<typeof answerRoundSchema.parse>;
    const s = await loadSession(req.member!.notebookId, String(req.params.sid));
    if (s.status !== "running") throw new AppError("CONFLICT", "The session is not running");
    const db = await getDb();
    const me = await db.query<{ finished: boolean }>("SELECT finished FROM session_participants WHERE session_id = $1 AND user_id = $2", [s.id, req.user!.id]);
    if (!me[0]) throw new AppError("FORBIDDEN", "You are not a player in this session");
    if (me[0].finished) throw new AppError("CONFLICT", "You already finished this session");
    const n = Number(req.params.n);
    const round = s.plan[n];
    if (!Number.isInteger(n) || !round) throw new AppError("NOT_FOUND", "Round not found");
    if (body.answers.length !== round.items.length) throw new AppError("VALIDATION", `Expected ${round.items.length} answers`);
    const dup = await db.query("SELECT 1 FROM session_answers WHERE session_id = $1 AND user_id = $2 AND round_index = $3", [s.id, req.user!.id, n]);
    if (dup.length) throw new AppError("CONFLICT", "You already answered this round");

    let fractionSum = 0;
    let points = 0;
    const results = [];
    for (const [i, item] of round.items.entries()) {
      const answer = body.answers[i];
      if (item.type === "teach") {
        const t = await evaluateTeachBack(s.notebook_id, item.topic, typeof answer === "string" ? answer : "", [item.ref.sourceId]);
        const fraction = t.checkable ? t.score / 100 : 0;
        fractionSum += fraction;
        points += Math.round(fraction * 200);
        results.push({ index: i, type: item.type, correct: t.understood === "yes", fraction, correctAnswer: null, explanation: item.explanation, topic: item.topic, ref: item.ref, teach: t });
      } else {
        const g = gradeItem(item, answer);
        fractionSum += g.fraction;
        points += g.correct ? 100 : 0;
        results.push({ index: i, type: item.type, correct: g.correct, fraction: g.fraction, correctAnswer: g.correctAnswer, explanation: item.explanation, topic: item.topic, ref: item.ref });
      }
    }
    const correctCount = results.filter((r) => r.correct).length;
    points += Math.round(speedBonus(body.elapsedMs, round.timeLimitSec) * (fractionSum / round.items.length));
    await db.query(
      "INSERT INTO session_answers(session_id, user_id, round_index, results, correct_count, total, points, elapsed_ms) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
      [s.id, req.user!.id, n, JSON.stringify(results), correctCount, round.items.length, points, body.elapsedMs ?? null],
    );
    await db.query("UPDATE session_participants SET score = score + $1 WHERE session_id = $2 AND user_id = $3", [points, s.id, req.user!.id]);
    const ratio = correctCount / round.items.length;
    const reaction = ratio === 1 ? REACTION_FOR_EVENT.quiz_perfect : ratio >= 0.5 ? REACTION_FOR_EVENT.quiz_correct : REACTION_FOR_EVENT.quiz_wrong;
    res.status(201).json(ok({ roundIndex: n, results, correctCount, total: round.items.length, points, reaction, scoreboard: await participants(s.id) }));
  }),
);

function newBadges(opts: { first: boolean; accuracy: number; avgSpeedRatio: number | null; streak: number; focus: boolean; social: boolean }): BadgeId[] {
  const out: BadgeId[] = [];
  if (opts.first) out.push("first_session");
  if (opts.accuracy === 1) out.push("perfect");
  if (opts.avgSpeedRatio !== null && opts.avgSpeedRatio < 0.5 && opts.accuracy >= 0.8) out.push("speedster");
  if (opts.streak >= 3) out.push("streak_3");
  if (opts.streak >= 7) out.push("streak_7");
  if (opts.focus && opts.accuracy >= 0.8) out.push("gap_guardian");
  if (opts.social) out.push("teammate");
  return out;
}

playRoutes.post(
  "/sessions/:sid/finish",
  notebookAccess("viewer"),
  asyncHandler(async (req, res) => {
    const s = await loadSession(req.member!.notebookId, String(req.params.sid));
    const db = await getDb();
    const me = await db.query<{ finished: boolean; score: number }>("SELECT finished, score FROM session_participants WHERE session_id = $1 AND user_id = $2", [s.id, req.user!.id]);
    if (!me[0]) throw new AppError("FORBIDDEN", "You are not a player in this session");
    if (s.status !== "running" && !me[0].finished) throw new AppError("CONFLICT", "The session is not running");
    const answers = await db.query<{ round_index: number; results: Array<{ correct: boolean; topic: string; ref: { sourceTitle: string; page: number | null } }>; correct_count: number; total: number; elapsed_ms: number | null }>(
      "SELECT round_index, results, correct_count, total, elapsed_ms FROM session_answers WHERE session_id = $1 AND user_id = $2 ORDER BY round_index",
      [s.id, req.user!.id],
    );
    if (!answers.length) throw new AppError("CONFLICT", "Answer at least one round before finishing");
    const total = answers.reduce((a, r) => a + r.total, 0);
    const correct = answers.reduce((a, r) => a + r.correct_count, 0);
    const accuracy = total ? correct / total : 0;
    const speed = answers.filter((a) => a.elapsed_ms !== null).map((a) => a.elapsed_ms! / (s.plan[a.round_index]!.timeLimitSec * 1000));
    const avgSpeedRatio = speed.length ? speed.reduce((a, b) => a + b, 0) / speed.length : null;

    let streak = 0;
    let earned: BadgeId[] = [];
    if (!me[0].finished) {
      const today = new Date().toISOString().slice(0, 10);
      const st = await db.query<{ streak: number; best_streak: number; last_play_date: string | null; sessions_played: number }>("SELECT streak, best_streak, last_play_date::text, sessions_played FROM user_stats WHERE user_id = $1", [req.user!.id]);
      const prev = st[0];
      const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
      streak = !prev ? 1 : prev.last_play_date === today ? Math.max(1, prev.streak) : prev.last_play_date === yesterday ? prev.streak + 1 : 1;
      await db.query(
        `INSERT INTO user_stats(user_id, points, streak, best_streak, last_play_date, sessions_played) VALUES ($1,$2,$3,$3,$4,1)
         ON CONFLICT (user_id) DO UPDATE SET points = user_stats.points + $2, streak = $3, best_streak = GREATEST(user_stats.best_streak, $3), last_play_date = $4, sessions_played = user_stats.sessions_played + 1`,
        [req.user!.id, me[0].score, streak, today],
      );
      const have = new Set((await db.query<{ badge: string }>("SELECT badge FROM badges WHERE user_id = $1", [req.user!.id])).map((b) => b.badge));
      const nPlayers = (await participants(s.id)).length;
      earned = newBadges({ first: !prev || prev.sessions_played === 0, accuracy, avgSpeedRatio, streak, focus: !!s.focus_topic, social: nPlayers >= 2 }).filter((b) => !have.has(b));
      for (const b of earned) await db.query("INSERT INTO badges(user_id, badge) VALUES ($1,$2) ON CONFLICT DO NOTHING", [req.user!.id, b]);
      await db.query("UPDATE session_participants SET finished = true WHERE session_id = $1 AND user_id = $2", [s.id, req.user!.id]);
      const left = await db.query("SELECT 1 FROM session_participants WHERE session_id = $1 AND NOT finished", [s.id]);
      if (!left.length) await db.query("UPDATE game_sessions SET status = 'finished', finished_at = now() WHERE id = $1", [s.id]);
      await logActivity(s.notebook_id, req.user!.id, "quiz_taken", s.id);
    }
    const miss = new Map<string, { missed: number; pages: Set<string> }>();
    for (const a of answers) for (const r of a.results) if (!r.correct) {
      const m = miss.get(r.topic) ?? { missed: 0, pages: new Set<string>() };
      m.missed += 1;
      m.pages.add(`${r.ref.sourceTitle}${r.ref.page ? `, halaman ${r.ref.page}` : ""}`);
      miss.set(r.topic, m);
    }
    const weakTopics = [...miss.entries()].sort((a, b) => b[1].missed - a[1].missed).map(([topic, m]) => ({ topic, missed: m.missed, reviewAt: [...m.pages] }));
    const board = await participants(s.id);
    const rank = board.findIndex((p: { userId: string }) => p.userId === req.user!.id) + 1;
    const event = accuracy === 1 ? REACTION_FOR_EVENT.quiz_perfect : accuracy >= 0.6 ? REACTION_FOR_EVENT.streak_kept : REACTION_FOR_EVENT.quiz_wrong;
    res.json(ok({
      sessionId: s.id,
      points: me[0].score,
      accuracyPercent: Math.round(accuracy * 100),
      correct,
      total,
      streak: streak || undefined,
      badgesEarned: earned.map((id) => ({ id, name: BADGES[id] })),
      weakTopics,
      recoveryTopics: weakTopics.map((w) => w.topic),
      rank,
      players: board.length,
      reaction: event,
    }));
  }),
);

// ---- stats and badges ----------------------------------------------------------------------------------
export const statsRoutes = Router();
statsRoutes.use(requireAuth);
statsRoutes.get(
  "/",
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const st = await db.query('SELECT points, streak, best_streak AS "bestStreak", last_play_date::text AS "lastPlayDate", sessions_played AS "sessionsPlayed" FROM user_stats WHERE user_id = $1', [req.user!.id]);
    const b = await db.query<{ badge: BadgeId; earned_at: Date }>("SELECT badge, earned_at FROM badges WHERE user_id = $1 ORDER BY earned_at", [req.user!.id]);
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const s = st[0] ?? { points: 0, streak: 0, bestStreak: 0, lastPlayDate: null, sessionsPlayed: 0 };
    // a streak that was not kept yesterday or today is already broken
    const live = s.lastPlayDate === today || s.lastPlayDate === yesterday ? s.streak : 0;
    res.json(ok({ ...s, streak: live, playedToday: s.lastPlayDate === today, badges: b.map((x) => ({ id: x.badge, name: BADGES[x.badge], earnedAt: x.earned_at })), allBadges: Object.entries(BADGES).map(([id, name]) => ({ id, name })) }));
  }),
);

// ---- teach-back and visualisation (notebook scoped) ------------------------------------------------------
playRoutes.post(
  "/companion/teach-back",
  notebookAccess("viewer"),
  aiLimit,
  validate("body", teachBackSchema),
  asyncHandler(async (req, res) => {
    const b = req.body as { topic: string; explanation: string; sourceIds?: string[] };
    const t = await evaluateTeachBack(req.member!.notebookId, b.topic, b.explanation, b.sourceIds);
    const beats: Performance["beats"] = [{ index: 0, say: t.reply, emotion: t.emotion, animation: t.animation, citation: t.citations.length ? 0 : null, durationMs: Math.min(12_000, Math.max(1_500, t.reply.length * 45)), voiceNoteId: null }];
    if (t.checkable && t.missing.length) {
      const say = `Yang masih kurang: ${t.missing.slice(0, 3).join("; ")}.`;
      beats.push({ index: 1, say, emotion: "semangat", animation: "point_right", citation: t.citations.length ? 0 : null, durationMs: Math.min(12_000, Math.max(1_500, say.length * 45)), voiceNoteId: null });
    }
    const performance: Performance = { id: crypto.randomUUID(), mascotId: "kiko", style: "friend", level: "normal", grounded: t.checkable, beats, citations: t.citations, followUps: [] };
    await logActivity(req.member!.notebookId, req.user!.id, "question_asked", undefined);
    res.json(ok({ evaluation: { checkable: t.checkable, understood: t.understood, score: t.score, covered: t.covered, missing: t.missing, wrong: t.wrong }, performance }));
  }),
);

const mapLlm = z.object({
  nodes: z.array(z.object({ id: z.string().min(1).max(20), label: z.string().min(1).max(60), page: z.number().int().positive().nullable().default(null), level: z.number().int().min(0).max(3).default(1) })).min(2).max(25),
  edges: z.array(z.object({ from: z.string(), to: z.string(), label: z.string().max(40).default("") })).max(40),
});

playRoutes.get(
  "/sources/:sourceId/visual",
  notebookAccess("viewer"),
  asyncHandler(async (req, res) => {
    const kind = req.query.kind === undefined ? "mindmap" : String(req.query.kind);
    if (kind !== "mindmap" && kind !== "timeline" && kind !== "chart") throw new AppError("VALIDATION", "Supported visualizations are mindmap, timeline, and chart");
    const db = await getDb();
    const sid = String(req.params.sourceId);
    const src = await db.query<{ id: string; title: string; kind: string; status: string }>("SELECT id, title, kind, status FROM sources WHERE notebook_id = $1 AND id::text = $2", [req.member!.notebookId, sid]);
    if (!src[0]) throw new AppError("NOT_FOUND", "Source not found");
    if (src[0].status !== "ready") throw new AppError("CONFLICT", "The source is not ready yet");
    if (kind === "timeline" && src[0].kind !== "pptx") throw new AppError("VALIDATION", "Timelines are available only for PowerPoint sources");
    if (kind === "chart" && src[0].kind !== "csv" && src[0].kind !== "xlsx") throw new AppError("VALIDATION", "Charts are available only for CSV or Excel sources");
    const cached = await db.query<{ data: unknown }>("SELECT data FROM source_visuals WHERE source_id = $1 AND kind = $2", [src[0].id, kind]);
    if (cached[0]) return res.json(ok({ sourceId: src[0].id, kind, cached: true, ...(cached[0].data as object) }));
    if (kind === "timeline") {
      const rows = await db.query<{ slide: number; text: string }>("SELECT page AS slide, string_agg(content, E'\\n\\n' ORDER BY idx) AS text FROM source_chunks WHERE source_id = $1 AND page IS NOT NULL GROUP BY page ORDER BY page", [src[0].id]);
      const data = { slides: rows };
      await db.query("INSERT INTO source_visuals(source_id, kind, data) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING", [src[0].id, kind, JSON.stringify(data)]);
      return res.json(ok({ sourceId: src[0].id, kind, cached: false, ...data }));
    }
    if (kind === "chart") {
      const rows = await db.query<{ name: string; headers: unknown; rows: unknown }>("SELECT name, headers, rows FROM source_tables WHERE source_id = $1 ORDER BY table_index", [src[0].id]);
      const tables = rows.map((table) => {
        const headers = Array.isArray(table.headers) ? table.headers.map(String) : [];
        const body = Array.isArray(table.rows) ? table.rows as unknown[][] : [];
        const categoryColumn = headers[0] ?? "Category";
        const series = headers.slice(1).map((name, index) => ({
          name,
          points: body.flatMap((row, rowIndex) => {
            const raw = row[index + 1];
            if (raw === null || raw === undefined || String(raw).trim() === "") return [];
            const value = Number(String(raw).trim());
            return Number.isFinite(value) ? [{ label: String(row[0] ?? `Row ${rowIndex + 1}`), value }] : [];
          }),
        })).filter((item) => item.points.length > 0);
        return { name: table.name, categoryColumn, series };
      }).filter((table) => table.series.length > 0);
      if (!tables.length) throw new AppError("CONFLICT", "No numeric columns were found in this spreadsheet");
      const data = { tables };
      await db.query("INSERT INTO source_visuals(source_id, kind, data) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING", [src[0].id, kind, JSON.stringify(data)]);
      return res.json(ok({ sourceId: src[0].id, kind, cached: false, ...data }));
    }
    const chunks = await db.query<{ page: number | null; content: string }>("SELECT page, content FROM source_chunks WHERE source_id = $1 ORDER BY idx", [src[0].id]);
    let used = 0;
    const text = chunks.filter((c) => (used += c.content.length) < 9000).map((c) => `${c.page ? `[halaman ${c.page}] ` : ""}${c.content}`).join("\n\n");
    const pages = new Set(chunks.map((c) => c.page).filter((p): p is number => p !== null));
    const out = await getAi().generateJson({
      purpose: "visual",
      system: `${RULES}\nBuat peta konsep dari SUMBER. "nodes": 6 sampai 20 simpul (id pendek unik, label maksimal 6 kata, "level" 0 untuk topik utama, 1 subtopik, 2 detail, "page" nomor halaman bila ada). "edges": hubungan antar simpul (from, to, label singkat). Hanya konsep yang ada di sumber.\nFormat JSON: {"nodes":[{"id":string,"label":string,"page":number|null,"level":number}],"edges":[{"from":string,"to":string,"label":string}]}`,
      user: `SUMBER (${src[0].title}):\n${text}`,
      schema: mapLlm,
    });
    const ids = new Set(out.nodes.map((n) => n.id));
    const data = {
      nodes: out.nodes.map((n) => ({ ...n, page: n.page !== null && pages.has(n.page) ? n.page : null })),
      edges: out.edges.filter((e) => ids.has(e.from) && ids.has(e.to) && e.from !== e.to),
    };
    await db.query("INSERT INTO source_visuals(source_id, kind, data) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING", [src[0].id, kind, JSON.stringify(data)]);
    res.json(ok({ sourceId: src[0].id, kind, cached: false, ...data }));
  }),
);

