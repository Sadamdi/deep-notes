import {
  articleCommentSchema,
  articleIdParamsSchema,
  authorIdParamsSchema,
  publishArticleSchema,
  updatePublishedArticleSchema,
  publicationSearchSchema,
} from "@deep-notes/shared";
import { Router, type Request, type Response } from "express";
import { getDb } from "../../db/index.js";
import { ok } from "../../lib/apiResponse.js";
import { AppError } from "../../lib/errors.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";

export const publicationRoutes = Router();

const articleFields = `a.id, a.author_id AS "authorId", u.name AS "authorName", a.notebook_id AS "notebookId", a.visibility,
  a.current_version AS version, v.title, v.summary, v.body, v.cover_url AS "coverUrl", a.created_at AS "createdAt", a.updated_at AS "updatedAt",
  (SELECT count(*)::int FROM article_comments c WHERE c.article_id = a.id) AS "commentCount"`;

const visibleTo = (userParam: string) => `a.status = 'published' AND (a.visibility = 'public' OR EXISTS (
  SELECT 1 FROM notebook_members m WHERE m.notebook_id = a.notebook_id AND m.user_id = ${userParam}
))`;

async function loadArticle(articleId: string, userId: string) {
  const rows = await (await getDb()).query(
    `SELECT ${articleFields} FROM published_articles a
     JOIN published_article_versions v ON v.article_id = a.id AND v.version = a.current_version
     JOIN users u ON u.id = a.author_id
     WHERE a.id::text = $1 AND ${visibleTo("$2")}`,
    [articleId, userId],
  );
  if (!rows[0]) throw new AppError("NOT_FOUND", "Article not found");
  return rows[0];
}

async function canPublishToNotebook(notebookId: string, userId: string) {
  const rows = await (await getDb()).query<{ role: "owner" | "editor" | "viewer" }>(
    "SELECT role FROM notebook_members WHERE notebook_id = $1 AND user_id = $2",
    [notebookId, userId],
  );
  if (!rows[0] || rows[0].role === "viewer") throw new AppError("NOT_FOUND", "Notebook not found");
}

async function publish(req: Request, res: Response, articleId?: string) {
  const input = req.body as { draftId: string; visibility: "public" | "workspace"; notebookId?: string; coverUrl?: string | null };
  const db = await getDb();
  const drafts = await db.query<{ title: string; summary: string; body: string }>(
    "SELECT title, summary, body FROM writer_drafts WHERE id = $1 AND user_id = $2",
    [input.draftId, req.user!.id],
  );
  if (!drafts[0]) throw new AppError("NOT_FOUND", "Writer draft not found");
  if (input.visibility === "workspace") await canPublishToNotebook(input.notebookId!, req.user!.id);

  let id = articleId ?? (req.body as { articleId?: string }).articleId;
  const isUpdate = Boolean(id);
  if (id) {
    const current = await db.query<{ id: string; current_version: number; cover_url: string | null }>(
      `SELECT a.id, a.current_version, v.cover_url FROM published_articles a
       JOIN published_article_versions v ON v.article_id = a.id AND v.version = a.current_version
       WHERE a.id = $1 AND a.author_id = $2`,
      [id, req.user!.id],
    );
    if (!current[0]) throw new AppError("NOT_FOUND", "Article not found");
    const version = current[0].current_version + 1;
    const cover = Object.hasOwn(input, "coverUrl") ? input.coverUrl ?? null : current[0].cover_url;
    await db.query(
      `INSERT INTO published_article_versions(article_id, version, title, summary, body, cover_url)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, version, drafts[0].title, drafts[0].summary, drafts[0].body, cover],
    );
    await db.query(
      `UPDATE published_articles SET notebook_id = $1, visibility = $2, status = 'published', current_version = $3, updated_at = now()
       WHERE id = $4 AND author_id = $5`,
      [input.notebookId ?? null, input.visibility, version, id, req.user!.id],
    );
  } else {
    const article = await db.query<{ id: string }>(
      `INSERT INTO published_articles(author_id, notebook_id, visibility) VALUES ($1,$2,$3) RETURNING id`,
      [req.user!.id, input.notebookId ?? null, input.visibility],
    );
    id = article[0]!.id;
    await db.query(
      `INSERT INTO published_article_versions(article_id, version, title, summary, body, cover_url)
       VALUES ($1,1,$2,$3,$4,$5)`,
      [id, drafts[0].title, drafts[0].summary, drafts[0].body, input.coverUrl ?? null],
    );
  }
  res.status(isUpdate ? 200 : 201).json(ok(await loadArticle(id, req.user!.id)));
}

publicationRoutes.get(
  "/publications",
  requireAuth,
  validate("query", publicationSearchSchema),
  asyncHandler(async (req, res) => {
    const { q, cursor, limit } = req.query as unknown as { q?: string; cursor?: string; limit: number };
    const before = cursor && Number.isFinite(Date.parse(cursor)) ? new Date(cursor).toISOString() : null;
    const rows = await (await getDb()).query(
      `SELECT ${articleFields} FROM published_articles a
       JOIN published_article_versions v ON v.article_id = a.id AND v.version = a.current_version
       JOIN users u ON u.id = a.author_id
       WHERE ${visibleTo("$1")} AND ($2::text = '' OR v.title ILIKE '%' || $2 || '%' OR v.summary ILIKE '%' || $2 || '%' OR v.body ILIKE '%' || $2 || '%')
         AND ($3::timestamptz IS NULL OR a.created_at < $3)
       ORDER BY a.created_at DESC LIMIT $4`,
      [req.user!.id, q ?? "", before, limit + 1],
    );
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit);
    const last = items.at(-1) as { createdAt?: string | Date } | undefined;
    res.json(ok({ items, nextCursor: hasMore && last ? new Date(last.createdAt!).toISOString() : null }));
  }),
);

publicationRoutes.post(
  "/publications",
  requireAuth,
  validate("body", publishArticleSchema),
  asyncHandler(async (req, res) => publish(req, res)),
);

publicationRoutes.get(
  "/authors/:authorId/publications",
  requireAuth,
  validate("params", authorIdParamsSchema),
  validate("query", publicationSearchSchema),
  asyncHandler(async (req, res) => {
    const { q, cursor, limit } = req.query as unknown as { q?: string; cursor?: string; limit: number };
    const before = cursor && Number.isFinite(Date.parse(cursor)) ? new Date(cursor).toISOString() : null;
    const rows = await (await getDb()).query(
      `SELECT ${articleFields} FROM published_articles a
       JOIN published_article_versions v ON v.article_id = a.id AND v.version = a.current_version
       JOIN users u ON u.id = a.author_id
       WHERE a.author_id = $1 AND ${visibleTo("$2")} AND ($3::text = '' OR v.title ILIKE '%' || $3 || '%' OR v.summary ILIKE '%' || $3 || '%')
         AND ($4::timestamptz IS NULL OR a.created_at < $4)
       ORDER BY a.created_at DESC LIMIT $5`,
      [req.params.authorId, req.user!.id, q ?? "", before, limit + 1],
    );
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit);
    const last = items.at(-1) as { createdAt?: string | Date } | undefined;
    res.json(ok({ items, nextCursor: hasMore && last ? new Date(last.createdAt!).toISOString() : null }));
  }),
);

publicationRoutes.get(
  "/publications/:articleId",
  requireAuth,
  validate("params", articleIdParamsSchema),
  asyncHandler(async (req, res) => {
    const articleId = String(req.params.articleId);
    const article = await loadArticle(articleId, req.user!.id);
    const comments = await (await getDb()).query(
      `SELECT c.id, c.parent_id AS "parentId", c.body, c.author_id AS "authorId", u.name AS "authorName", c.created_at AS "createdAt"
       FROM article_comments c JOIN users u ON u.id = c.author_id
       WHERE c.article_id = $1 ORDER BY c.created_at`,
      [articleId],
    );
    res.json(ok({ article, comments }));
  }),
);

publicationRoutes.patch(
  "/publications/:articleId",
  requireAuth,
  validate("params", articleIdParamsSchema),
  validate("body", updatePublishedArticleSchema),
  asyncHandler(async (req, res) => publish(req, res, String(req.params.articleId))),
);

publicationRoutes.delete(
  "/publications/:articleId",
  requireAuth,
  validate("params", articleIdParamsSchema),
  asyncHandler(async (req, res) => {
    const rows = await (await getDb()).query(
      "UPDATE published_articles SET status = 'withdrawn', updated_at = now() WHERE id = $1 AND author_id = $2 RETURNING id",
      [String(req.params.articleId), req.user!.id],
    );
    if (!rows[0]) throw new AppError("NOT_FOUND", "Article not found");
    res.json(ok({ withdrawn: true }));
  }),
);

publicationRoutes.post(
  "/publications/:articleId/comments",
  requireAuth,
  validate("params", articleIdParamsSchema),
  validate("body", articleCommentSchema),
  asyncHandler(async (req, res) => {
    const articleId = String(req.params.articleId);
    await loadArticle(articleId, req.user!.id);
    const { body, parentId } = req.body as { body: string; parentId?: string };
    const db = await getDb();
    if (parentId) {
      const parent = await db.query("SELECT 1 FROM article_comments WHERE id = $1 AND article_id = $2", [parentId, articleId]);
      if (!parent[0]) throw new AppError("NOT_FOUND", "Parent comment not found");
    }
    const rows = await db.query(
      `INSERT INTO article_comments(article_id, author_id, parent_id, body) VALUES ($1,$2,$3,$4)
       RETURNING id, parent_id AS "parentId", body, author_id AS "authorId", now() AS "createdAt"`,
      [articleId, req.user!.id, parentId ?? null, body],
    );
    res.status(201).json(ok({ ...rows[0], authorName: req.user!.name }));
  }),
);
