import { createAssignmentSchema, friendRequestSchema, profileSchema, updateAssignmentSchema } from "@deep-notes/shared";
import { Router } from "express";
import { getDb } from "../../db/index.js";
import { ok } from "../../lib/apiResponse.js";
import { logActivity } from "../../lib/activity.js";
import { AppError } from "../../lib/errors.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { notebookAccess, requireAuth } from "../../middleware/auth.js";
import { rateLimit } from "../../middleware/rateLimit.js";
import { validate } from "../../middleware/validate.js";
import { createNotification } from "../../lib/notifications.js";

/** Group-level views: contributions (F-06), progress (F-08), knowledge gaps (F-16), assignments (F-17). */
export const groupRoutes = Router({ mergeParams: true });
groupRoutes.use(requireAuth);

// F-06 ---------------------------------------------------------------------------------------------
groupRoutes.get(
  "/contributions",
  notebookAccess("viewer"),
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const id = req.member!.notebookId;
    const members = await db.query(
      `SELECT u.id AS "userId", u.name, m.role,
         (SELECT count(*)::int FROM activity a WHERE a.notebook_id = m.notebook_id AND a.user_id = u.id AND a.type = 'source_added') AS "sourcesAdded",
         (SELECT count(*)::int FROM activity a WHERE a.notebook_id = m.notebook_id AND a.user_id = u.id AND a.type = 'question_asked') AS "questionsAsked",
         (SELECT count(*)::int FROM activity a WHERE a.notebook_id = m.notebook_id AND a.user_id = u.id AND a.type = 'quiz_taken') AS "quizzesTaken",
         (SELECT count(*)::int FROM activity a WHERE a.notebook_id = m.notebook_id AND a.user_id = u.id AND a.type = 'assignment_done') AS "assignmentsDone",
         (SELECT max(a.created_at) FROM activity a WHERE a.notebook_id = m.notebook_id AND a.user_id = u.id) AS "lastActiveAt"
       FROM notebook_members m JOIN users u ON u.id = m.user_id WHERE m.notebook_id = $1 ORDER BY m.joined_at`,
      [id],
    );
    const recent = await db.query(
      `SELECT a.type, a.created_at AS "at", u.name AS "userName", a.user_id AS "userId", a.ref_id AS "refId"
       FROM activity a JOIN users u ON u.id = a.user_id WHERE a.notebook_id = $1 ORDER BY a.created_at DESC LIMIT 30`,
      [id],
    );
    res.json(ok({ members, recent }));
  }),
);

// F-08 ---------------------------------------------------------------------------------------------
groupRoutes.get(
  "/progress",
  notebookAccess("viewer"),
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const id = req.member!.notebookId;
    const members = await db.query(
      `SELECT u.id AS "userId", u.name,
         count(a.id)::int AS attempts,
         coalesce(round(avg(a.score::numeric / nullif(a.total, 0) * 100))::int, NULL) AS "averagePercent",
         coalesce(round(max(a.score::numeric / nullif(a.total, 0) * 100))::int, NULL) AS "bestPercent",
         max(a.created_at) AS "lastAttemptAt"
       FROM notebook_members m JOIN users u ON u.id = m.user_id
       LEFT JOIN quiz_attempts a ON a.notebook_id = m.notebook_id AND a.user_id = u.id
       WHERE m.notebook_id = $1 GROUP BY u.id, u.name, m.joined_at ORDER BY m.joined_at`,
      [id],
    );
    const group = await db.query(
      `SELECT count(*)::int AS attempts, round(avg(score::numeric / nullif(total, 0) * 100))::int AS "averagePercent"
       FROM quiz_attempts WHERE notebook_id = $1`,
      [id],
    );
    res.json(ok({ members, group: group[0] }));
  }),
);

// F-16 ---------------------------------------------------------------------------------------------
groupRoutes.get(
  "/gaps",
  notebookAccess("viewer"),
  asyncHandler(async (req, res) => {
    const rows = await (await getDb()).query<{
      topic: string;
      answered: number;
      missed: number;
      members_missed: number;
      pages: Array<{ sourceId: string; sourceTitle: string; page: number | null }>;
    }>(
      `WITH items AS (
         SELECT a.user_id, r->>'topic' AS topic, (r->>'correct')::boolean AS correct,
                r->>'sourceId' AS "sourceId", r->>'sourceTitle' AS "sourceTitle", NULLIF(r->>'page','')::int AS page
         FROM quiz_attempts a, jsonb_array_elements(a.results) r WHERE a.notebook_id = $1
       )
       SELECT topic, count(*)::int AS answered, count(*) FILTER (WHERE NOT correct)::int AS missed,
              count(DISTINCT user_id) FILTER (WHERE NOT correct)::int AS members_missed,
              coalesce(jsonb_agg(DISTINCT jsonb_build_object('sourceId', "sourceId", 'sourceTitle', "sourceTitle", 'page', page))
                       FILTER (WHERE NOT correct), '[]'::jsonb) AS pages
       FROM items GROUP BY topic HAVING count(*) FILTER (WHERE NOT correct) > 0
       ORDER BY count(*) FILTER (WHERE NOT correct)::float / count(*) DESC, count(*) DESC LIMIT 20`,
      [req.member!.notebookId],
    );
    const gaps = rows.map((r) => ({
      topic: r.topic,
      answered: r.answered,
      missed: r.missed,
      missRatePercent: Math.round((r.missed / r.answered) * 100),
      membersMissed: r.members_missed,
      reviewPages: r.pages,
    }));
    res.json(ok({ gaps }));
  }),
);

// F-17 ---------------------------------------------------------------------------------------------
const ASSIGN = `a.id, a.topic, a.status, a.due_at AS "dueAt", a.created_at AS "createdAt", a.source_id AS "sourceId",
  a.assignee_id AS "assigneeId", u.name AS "assigneeName", s.title AS "sourceTitle"`;

groupRoutes.get(
  "/assignments",
  notebookAccess("viewer"),
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const items = await db.query(
      `SELECT ${ASSIGN} FROM assignments a JOIN users u ON u.id = a.assignee_id LEFT JOIN sources s ON s.id = a.source_id
       WHERE a.notebook_id = $1 ORDER BY a.created_at DESC`,
      [req.member!.notebookId],
    );
    const perMember = await db.query(
      `SELECT u.id AS "userId", u.name, count(a.id)::int AS total, count(a.id) FILTER (WHERE a.status = 'done')::int AS done
       FROM notebook_members m JOIN users u ON u.id = m.user_id LEFT JOIN assignments a ON a.notebook_id = m.notebook_id AND a.assignee_id = u.id
       WHERE m.notebook_id = $1 GROUP BY u.id, u.name, m.joined_at ORDER BY m.joined_at`,
      [req.member!.notebookId],
    );
    res.json(ok({ items, perMember }));
  }),
);

groupRoutes.post(
  "/assignments",
  notebookAccess("owner"),
  validate("body", createAssignmentSchema),
  asyncHandler(async (req, res) => {
    const b = req.body as { assigneeId: string; topic: string; sourceId?: string; dueAt?: string };
    const db = await getDb();
    const member = await db.query("SELECT 1 FROM notebook_members WHERE notebook_id = $1 AND user_id = $2", [req.member!.notebookId, b.assigneeId]);
    if (!member.length) throw new AppError("VALIDATION", "The assignee is not a member of this notebook");
    if (b.sourceId) {
      const s = await db.query("SELECT 1 FROM sources WHERE id = $1 AND notebook_id = $2", [b.sourceId, req.member!.notebookId]);
      if (!s.length) throw new AppError("VALIDATION", "That source is not in this notebook");
    }
    const rows = await db.query<{ id: string }>(
      "INSERT INTO assignments(notebook_id, assignee_id, assigned_by, topic, source_id, due_at) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id",
      [req.member!.notebookId, b.assigneeId, req.user!.id, b.topic, b.sourceId ?? null, b.dueAt ?? null],
    );
    res.status(201).json(ok({ id: rows[0]!.id }));
  }),
);

groupRoutes.patch(
  "/assignments/:assignmentId",
  notebookAccess("viewer"),
  validate("body", updateAssignmentSchema),
  asyncHandler(async (req, res) => {
    const { status } = req.body as { status: string };
    const db = await getDb();
    const rows = await db.query<{ assignee_id: string }>("SELECT assignee_id FROM assignments WHERE notebook_id = $1 AND id::text = $2", [
      req.member!.notebookId,
      req.params.assignmentId,
    ]);
    if (!rows[0]) throw new AppError("NOT_FOUND", "Assignment not found");
    if (rows[0].assignee_id !== req.user!.id && req.member!.role !== "owner") throw new AppError("FORBIDDEN", "Only the assignee or the owner can update it");
    await db.query("UPDATE assignments SET status = $1 WHERE id::text = $2", [status, req.params.assignmentId]);
    if (status === "done") await logActivity(req.member!.notebookId, rows[0].assignee_id, "assignment_done", String(req.params.assignmentId));
    res.json(ok({ id: req.params.assignmentId, status }));
  }),
);

groupRoutes.delete(
  "/assignments/:assignmentId",
  notebookAccess("owner"),
  asyncHandler(async (req, res) => {
    const r = await (await getDb()).query("DELETE FROM assignments WHERE notebook_id = $1 AND id::text = $2 RETURNING id", [req.member!.notebookId, req.params.assignmentId]);
    if (!r.length) throw new AppError("NOT_FOUND", "Assignment not found");
    res.json(ok({ deleted: true }));
  }),
);

// F-14 (profile and study partners) ------------------------------------------------------------------
export const profileRoutes = Router();
profileRoutes.use(requireAuth);

profileRoutes.patch(
  "/profile",
  validate("body", profileSchema),
  asyncHandler(async (req, res) => {
    const b = req.body as { course?: string | null; lookingForPartners?: boolean };
    const db = await getDb();
    if (b.course !== undefined) await db.query("UPDATE users SET course = $1 WHERE id = $2", [b.course, req.user!.id]);
    if (b.lookingForPartners !== undefined) await db.query("UPDATE users SET looking_for_partners = $1 WHERE id = $2", [b.lookingForPartners, req.user!.id]);
    const rows = await db.query('SELECT course, looking_for_partners AS "lookingForPartners" FROM users WHERE id = $1', [req.user!.id]);
    res.json(ok(rows[0]));
  }),
);

/** Opt-in only. Shows name and course, never an email; contact happens inside shared notebooks. */
profileRoutes.get(
  "/partners",
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const me = await db.query<{ course: string | null }>("SELECT course FROM users WHERE id = $1", [req.user!.id]);
    const course = me[0]?.course?.trim();
    if (!course) return res.json(ok({ partners: [], hint: "Set your course in your profile to find study partners." }));
    const rows = await db.query(
      `SELECT id, name, course FROM users WHERE looking_for_partners AND id <> $1 AND lower(course) = lower($2) ORDER BY name LIMIT 20`,
      [req.user!.id, course],
    );
    res.json(ok({ partners: rows }));
  }),
);

const friendRequestLimit = rateLimit({ windowMs: 10 * 60_000, max: 20, key: (req) => `friend-request:${req.user?.id}` });

profileRoutes.get(
  "/friends",
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const rows = await db.query<{ id: string; userId: string; name: string; course: string | null; createdAt: Date; acceptedAt: Date | null; status: "pending" | "accepted"; requesterId: string }>(
      `SELECT f.id, CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END AS "userId",
              u.name, u.course, f.created_at AS "createdAt", f.accepted_at AS "acceptedAt", f.status, f.requester_id AS "requesterId"
       FROM friendships f
       JOIN users u ON u.id = CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END
       WHERE f.requester_id = $1 OR f.addressee_id = $1
       ORDER BY f.created_at DESC`,
      [req.user!.id],
    );
    res.json(ok({
      friends: rows.filter((row) => row.status === "accepted").map(({ userId, name, course, createdAt, acceptedAt }) => ({ id: userId, name, course, since: acceptedAt ?? createdAt })),
      requests: rows.filter((row) => row.status === "pending").map(({ id, userId, name, course, createdAt, requesterId }) => ({
        id, userId, name, course, createdAt, direction: requesterId === req.user!.id ? "outgoing" : "incoming",
      })),
    }));
  }),
);

profileRoutes.post(
  "/friend-requests",
  friendRequestLimit,
  validate("body", friendRequestSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as { email: string } | { userId: string };
    const db = await getDb();
    const target = "userId" in body
      ? await db.query<{ id: string }>("SELECT id FROM users WHERE id = $1", [body.userId])
      : await db.query<{ id: string }>("SELECT id FROM users WHERE email = $1", [body.email]);
    if (target[0] && target[0].id !== req.user!.id) {
      const inserted = await db.query<{ id: string }>(
        "INSERT INTO friendships(requester_id, addressee_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING id",
        [req.user!.id, target[0].id],
      );
      if (inserted[0]) await createNotification(db, {
        recipientId: target[0].id, actorId: req.user!.id, kind: "friend_request",
        title: "Permintaan teman belajar", body: `${req.user!.name} ingin menjadi teman belajarmu.`, href: "/friends",
      });
    }
    res.status(202).json(ok({ sent: true, message: "Jika akun memenuhi syarat, permintaan akan muncul di halaman Teman." }));
  }),
);

profileRoutes.post(
  "/friend-requests/:requestId/accept",
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const accepted = await db.query<{ id: string; requester_id: string }>(
      "UPDATE friendships SET status = 'accepted', accepted_at = now() WHERE id::text = $1 AND addressee_id = $2 AND status = 'pending' RETURNING id, requester_id",
      [req.params.requestId, req.user!.id],
    );
    if (accepted[0]) await createNotification(db, {
      recipientId: accepted[0].requester_id, actorId: req.user!.id, kind: "friend_accepted",
      title: "Permintaan teman diterima", body: `${req.user!.name} menerima permintaan teman belajarmu.`, href: "/friends",
    });
    if (!accepted.length) {
      const existing = await db.query(
        "SELECT 1 FROM friendships WHERE id::text = $1 AND addressee_id = $2 AND status = 'accepted'",
        [req.params.requestId, req.user!.id],
      );
      if (!existing.length) throw new AppError("NOT_FOUND", "Friend request not found");
    }
    res.json(ok({ accepted: true }));
  }),
);

profileRoutes.delete(
  "/friend-requests/:requestId",
  asyncHandler(async (req, res) => {
    await (await getDb()).query(
      "DELETE FROM friendships WHERE id::text = $1 AND status = 'pending' AND (requester_id = $2 OR addressee_id = $2)",
      [req.params.requestId, req.user!.id],
    );
    res.json(ok({ removed: true }));
  }),
);

profileRoutes.delete(
  "/friends/:userId",
  asyncHandler(async (req, res) => {
    await (await getDb()).query(
      "DELETE FROM friendships WHERE status = 'accepted' AND LEAST(requester_id, addressee_id) = LEAST($1::uuid, $2::uuid) AND GREATEST(requester_id, addressee_id) = GREATEST($1::uuid, $2::uuid)",
      [req.user!.id, req.params.userId],
    );
    res.json(ok({ removed: true }));
  }),
);
