import { createCommentSchema, createPostSchema, postIdParamsSchema } from "@deep-notes/shared";
import { Router } from "express";
import { getDb } from "../../db/index.js";
import { ok } from "../../lib/apiResponse.js";
import { AppError } from "../../lib/errors.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAuth } from "../../middleware/auth.js";
import { rateLimit } from "../../middleware/rateLimit.js";
import { validate } from "../../middleware/validate.js";

/** Social feed: posts with an optional attached public workspace or shared session result, likes, comments, follows. */
export const feedRoutes = Router();
feedRoutes.use(["/posts", "/feed", "/users", "/saved-posts"], requireAuth);

const postLimit = rateLimit({ windowMs: 10 * 60_000, max: 20, key: (req) => `post:${req.user?.id}` });
const UUID = /^[0-9a-f-]{36}$/i;

async function assertPostId(id: string) {
  if (!UUID.test(id)) throw new AppError("NOT_FOUND", "Post not found");
  const rows = await (await getDb()).query<{ author_id: string }>("SELECT author_id FROM posts WHERE id = $1", [id]);
  if (!rows[0]) throw new AppError("NOT_FOUND", "Post not found");
  return rows[0];
}

const POST_SQL = `
  SELECT p.id, p.body, p.attach, p.created_at AS "createdAt", p.author_id AS "authorId", u.name AS "authorName", u.course AS "authorCourse",
    (SELECT count(*)::int FROM post_likes l WHERE l.post_id = p.id) AS "likes",
    EXISTS (SELECT 1 FROM post_likes l WHERE l.post_id = p.id AND l.user_id = $1) AS "likedByMe",
    EXISTS (SELECT 1 FROM saved_posts s WHERE s.post_id = p.id AND s.user_id = $1) AS "savedByMe",
    (SELECT count(*)::int FROM post_comments c WHERE c.post_id = p.id) AS "comments",
    EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = $1 AND f.followee_id = p.author_id) AS "followingAuthor"
  FROM posts p JOIN users u ON u.id = p.author_id`;

/** Resolves the attachment of a post into a card. Private notebooks never leak: only public ones are shown as cards. */
async function cardFor(attach: { type: string; notebookId?: string; sessionId?: string; authorId?: string } | null) {
  if (!attach) return null;
  const db = await getDb();
  if (attach.type === "notebook" && attach.notebookId) {
    const rows = await db.query(
      `SELECT n.id, n.title, n.description, n.category, n.course,
         (SELECT count(*)::int FROM notebook_members m WHERE m.notebook_id = n.id) AS "memberCount",
         (SELECT count(*)::int FROM sources s WHERE s.notebook_id = n.id) AS "sourceCount"
       FROM notebooks n WHERE n.id = $1 AND n.visibility = 'public'`,
      [attach.notebookId],
    );
    return rows[0] ? { type: "notebook", ...rows[0] } : { type: "notebook", unavailable: true };
  }
  if (attach.type === "result" && attach.sessionId) {
    const rows = await db.query(
      `SELECT g.mode, (SELECT sum(a.correct_count)::int FROM session_answers a WHERE a.session_id = g.id AND a.user_id = $2) AS correct,
              (SELECT sum(a.total)::int FROM session_answers a WHERE a.session_id = g.id AND a.user_id = $2) AS total,
              (SELECT p.score FROM session_participants p WHERE p.session_id = g.id AND p.user_id = $2) AS points
       FROM game_sessions g WHERE g.id = $1`,
      [attach.sessionId, attach.authorId],
    );
    return rows[0] ? { type: "result", ...rows[0] } : null;
  }
  return null;
}

async function withCards(rows: Array<{ attach: { type: string; notebookId?: string; sessionId?: string } | null; authorId: string }>) {
  return Promise.all(rows.map(async (r) => ({ ...r, attach: undefined, card: await cardFor(r.attach ? { ...r.attach, authorId: r.authorId } as never : null) })));
}

feedRoutes.post(
  "/posts",
  postLimit,
  validate("body", createPostSchema),
  asyncHandler(async (req, res) => {
    const b = req.body as { body: string; attach?: { type: "notebook"; notebookId: string } | { type: "result"; sessionId: string } };
    const db = await getDb();
    if (b.attach?.type === "notebook") {
      const nb = await db.query("SELECT 1 FROM notebooks WHERE id = $1 AND visibility = 'public'", [b.attach.notebookId]);
      if (!nb.length) throw new AppError("VALIDATION", "Only public workspaces can be attached to a post");
    }
    if (b.attach?.type === "result") {
      const mine = await db.query("SELECT 1 FROM session_participants WHERE session_id = $1 AND user_id = $2 AND finished", [b.attach.sessionId, req.user!.id]);
      if (!mine.length) throw new AppError("VALIDATION", "You can only share a session you finished");
    }
    const rows = await db.query<{ id: string }>("INSERT INTO posts(author_id, body, attach) VALUES ($1,$2,$3) RETURNING id", [req.user!.id, b.body, b.attach ? JSON.stringify(b.attach) : null]);
    const post = (await db.query(`${POST_SQL} WHERE p.id = $2`, [req.user!.id, rows[0]!.id])) as Array<{ attach: never; authorId: string }>;
    res.status(201).json(ok((await withCards(post))[0]));
  }),
);

feedRoutes.get(
  "/feed",
  asyncHandler(async (req, res) => {
    const scope = req.query.scope === "following" ? "following" : "all";
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
    const before = typeof req.query.before === "string" && !Number.isNaN(Date.parse(req.query.before)) ? new Date(req.query.before) : null;
    const rows = (await (await getDb()).query(
      `${POST_SQL}
       WHERE ($2::timestamptz IS NULL OR p.created_at < $2)
         AND ($3 = 'all' OR p.author_id = $1 OR p.author_id IN (SELECT followee_id FROM follows WHERE follower_id = $1))
       ORDER BY p.created_at DESC LIMIT $4`,
      [req.user!.id, before, scope, limit + 1],
    )) as Array<{ attach: never; authorId: string; createdAt: Date }>;
    const page = rows.slice(0, limit);
    res.json(ok({ posts: await withCards(page), nextBefore: rows.length > limit ? page[page.length - 1]!.createdAt : null }));
  }),
);

feedRoutes.get(
  "/saved-posts",
  asyncHandler(async (req, res) => {
    const rows = (await (await getDb()).query(
      `${POST_SQL}
       JOIN saved_posts s ON s.post_id = p.id AND s.user_id = $2
       ORDER BY s.created_at DESC`,
      [req.user!.id, req.user!.id],
    )) as Array<{ attach: never; authorId: string }>;
    res.json(ok({ posts: await withCards(rows) }));
  }),
);

feedRoutes.post(
  "/posts/:id/save",
  validate("params", postIdParamsSchema),
  asyncHandler(async (req, res) => {
    await assertPostId(String(req.params.id));
    await (await getDb()).query("INSERT INTO saved_posts(user_id, post_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [req.user!.id, req.params.id]);
    res.json(ok({ saved: true }));
  }),
);

feedRoutes.delete(
  "/posts/:id/save",
  validate("params", postIdParamsSchema),
  asyncHandler(async (req, res) => {
    await assertPostId(String(req.params.id));
    await (await getDb()).query("DELETE FROM saved_posts WHERE user_id = $1 AND post_id = $2", [req.user!.id, req.params.id]);
    res.json(ok({ saved: false }));
  }),
);

feedRoutes.get(
  "/posts/:id",
  asyncHandler(async (req, res) => {
    await assertPostId(String(req.params.id));
    const post = (await (await getDb()).query(`${POST_SQL} WHERE p.id = $2`, [req.user!.id, req.params.id])) as Array<{ attach: never; authorId: string }>;
    res.json(ok((await withCards(post))[0]));
  }),
);

feedRoutes.delete(
  "/posts/:id",
  asyncHandler(async (req, res) => {
    const p = await assertPostId(String(req.params.id));
    if (p.author_id !== req.user!.id) throw new AppError("FORBIDDEN", "Only the author can delete a post");
    await (await getDb()).query("DELETE FROM posts WHERE id = $1", [req.params.id]);
    res.json(ok({ deleted: true }));
  }),
);

feedRoutes.post(
  "/posts/:id/like",
  asyncHandler(async (req, res) => {
    await assertPostId(String(req.params.id));
    const db = await getDb();
    await db.query("INSERT INTO post_likes(post_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [req.params.id, req.user!.id]);
    const c = await db.query<{ n: number }>("SELECT count(*)::int AS n FROM post_likes WHERE post_id = $1", [req.params.id]);
    res.json(ok({ liked: true, likes: c[0]!.n }));
  }),
);

feedRoutes.delete(
  "/posts/:id/like",
  asyncHandler(async (req, res) => {
    await assertPostId(String(req.params.id));
    const db = await getDb();
    await db.query("DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2", [req.params.id, req.user!.id]);
    const c = await db.query<{ n: number }>("SELECT count(*)::int AS n FROM post_likes WHERE post_id = $1", [req.params.id]);
    res.json(ok({ liked: false, likes: c[0]!.n }));
  }),
);

feedRoutes.get(
  "/posts/:id/comments",
  asyncHandler(async (req, res) => {
    await assertPostId(String(req.params.id));
    const rows = await (await getDb()).query(
      `SELECT c.id, c.body, c.created_at AS "createdAt", c.author_id AS "authorId", u.name AS "authorName" FROM post_comments c JOIN users u ON u.id = c.author_id WHERE c.post_id = $1 ORDER BY c.created_at LIMIT 200`,
      [req.params.id],
    );
    res.json(ok(rows));
  }),
);

feedRoutes.post(
  "/posts/:id/comments",
  postLimit,
  validate("body", createCommentSchema),
  asyncHandler(async (req, res) => {
    await assertPostId(String(req.params.id));
    const rows = await (await getDb()).query<{ id: string }>("INSERT INTO post_comments(post_id, author_id, body) VALUES ($1,$2,$3) RETURNING id", [req.params.id, req.user!.id, (req.body as { body: string }).body]);
    res.status(201).json(ok({ id: rows[0]!.id }));
  }),
);

feedRoutes.delete(
  "/posts/:id/comments/:commentId",
  asyncHandler(async (req, res) => {
    const post = await assertPostId(String(req.params.id));
    const db = await getDb();
    const c = await db.query<{ author_id: string }>("SELECT author_id FROM post_comments WHERE post_id = $1 AND id::text = $2", [req.params.id, req.params.commentId]);
    if (!c[0]) throw new AppError("NOT_FOUND", "Comment not found");
    if (c[0].author_id !== req.user!.id && post.author_id !== req.user!.id) throw new AppError("FORBIDDEN", "Only the commenter or the post author can delete a comment");
    await db.query("DELETE FROM post_comments WHERE id::text = $1", [req.params.commentId]);
    res.json(ok({ deleted: true }));
  }),
);

// ---- follows and public profiles ---------------------------------------------------------------------------
feedRoutes.post(
  "/users/:userId/follow",
  asyncHandler(async (req, res) => {
    const id = String(req.params.userId);
    if (!UUID.test(id) || id === req.user!.id) throw new AppError("VALIDATION", "Invalid user");
    const db = await getDb();
    if (!(await db.query("SELECT 1 FROM users WHERE id = $1", [id])).length) throw new AppError("NOT_FOUND", "User not found");
    await db.query("INSERT INTO follows(follower_id, followee_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [req.user!.id, id]);
    res.json(ok({ following: true }));
  }),
);

feedRoutes.delete(
  "/users/:userId/follow",
  asyncHandler(async (req, res) => {
    await (await getDb()).query("DELETE FROM follows WHERE follower_id = $1 AND followee_id::text = $2", [req.user!.id, req.params.userId]);
    res.json(ok({ following: false }));
  }),
);

/** Public profile: name, course, counts and badges. Never an email. */
feedRoutes.get(
  "/users/:userId",
  asyncHandler(async (req, res) => {
    const id = String(req.params.userId);
    if (!UUID.test(id)) throw new AppError("NOT_FOUND", "User not found");
    const db = await getDb();
    const u = await db.query(
      `SELECT u.id, u.name, u.course,
         (SELECT count(*)::int FROM follows f WHERE f.followee_id = u.id) AS followers,
         (SELECT count(*)::int FROM follows f WHERE f.follower_id = u.id) AS following,
         (SELECT count(*)::int FROM posts p WHERE p.author_id = u.id) AS posts,
         EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = $2 AND f.followee_id = u.id) AS "followedByMe",
         CASE
           WHEN EXISTS (SELECT 1 FROM friendships f WHERE f.status = 'accepted' AND LEAST(f.requester_id, f.addressee_id) = LEAST($2::uuid, u.id) AND GREATEST(f.requester_id, f.addressee_id) = GREATEST($2::uuid, u.id)) THEN 'friends'
           WHEN EXISTS (SELECT 1 FROM friendships f WHERE f.status = 'pending' AND f.requester_id = u.id AND f.addressee_id = $2) THEN 'incoming'
           WHEN EXISTS (SELECT 1 FROM friendships f WHERE f.status = 'pending' AND f.requester_id = $2 AND f.addressee_id = u.id) THEN 'outgoing'
           ELSE 'none'
         END AS "friendshipStatus"
       FROM users u WHERE u.id = $1`,
      [id, req.user!.id],
    );
    if (!u[0]) throw new AppError("NOT_FOUND", "User not found");
    const stats = await db.query('SELECT streak, points FROM user_stats WHERE user_id = $1', [id]);
    const badges = await db.query("SELECT badge FROM badges WHERE user_id = $1", [id]);
    res.json(ok({ ...u[0], points: stats[0]?.points ?? 0, badges: badges.map((b: { badge: string }) => b.badge) }));
  }),
);
