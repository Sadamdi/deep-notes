import { notificationIdParamsSchema } from "@deep-notes/shared";
import { Router } from "express";
import { getDb } from "../../db/index.js";
import { ok } from "../../lib/apiResponse.js";
import { AppError } from "../../lib/errors.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";

export const notificationRoutes = Router();
notificationRoutes.use(requireAuth);

notificationRoutes.get("/", asyncHandler(async (req, res) => {
  const db = await getDb();
  const [items, count] = await Promise.all([
    db.query(
      `SELECT n.id, n.kind, n.title, n.body, n.href, n.read_at AS "readAt", n.created_at AS "createdAt",
              CASE WHEN a.id IS NULL THEN NULL ELSE jsonb_build_object('id', a.id, 'name', a.name) END AS actor
       FROM notifications n LEFT JOIN users a ON a.id = n.actor_id
       WHERE n.recipient_id = $1 ORDER BY n.created_at DESC LIMIT 100`,
      [req.user!.id],
    ),
    db.query<{ unread: number }>("SELECT count(*)::int AS unread FROM notifications WHERE recipient_id = $1 AND read_at IS NULL", [req.user!.id]),
  ]);
  res.json(ok({ items, unreadCount: count[0]?.unread ?? 0 }));
}));

notificationRoutes.patch(
  "/:notificationId",
  validate("params", notificationIdParamsSchema),
  asyncHandler(async (req, res) => {
    const updated = await (await getDb()).query(
      "UPDATE notifications SET read_at = coalesce(read_at, now()) WHERE id = $1 AND recipient_id = $2 RETURNING id, read_at AS \"readAt\"",
      [req.params.notificationId, req.user!.id],
    );
    if (!updated[0]) throw new AppError("NOT_FOUND", "Notification not found");
    res.json(ok({ item: updated[0] }));
  }),
);

notificationRoutes.post("/read-all", asyncHandler(async (req, res) => {
  const result = await (await getDb()).query<{ id: string }>(
    "UPDATE notifications SET read_at = now() WHERE recipient_id = $1 AND read_at IS NULL RETURNING id",
    [req.user!.id],
  );
  res.json(ok({ updated: result.length }));
}));
