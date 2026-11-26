import {
  ANIMATIONS,
  BUBI_EMOTIONS,
  REACTION_FOR_EVENT,
  explainLevelSchema,
  explainRequestSchema,
  mascotRoleSchema,
  sourceKindSchema,
} from "@deep-notes/shared";
import { Router } from "express";
import { getDb } from "../../db/index.js";
import { ok } from "../../lib/apiResponse.js";
import { logActivity } from "../../lib/activity.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { notebookAccess, requireAuth } from "../../middleware/auth.js";
import { rateLimit } from "../../middleware/rateLimit.js";
import { validate } from "../../middleware/validate.js";
import { MASCOTS, demoPerformance, explainAsPerformance } from "./companion.service.js";

/** Public, static data the frontend reads once: mascots, animation names, reactions, limits. No login needed. */
export const companionPublicRoutes = Router();

companionPublicRoutes.get("/catalog", (_req, res) => {
  res.json(
    ok({
      mascots: MASCOTS,
      animations: ANIMATIONS,
      emotions: BUBI_EMOTIONS,
      styles: mascotRoleSchema.options,
      levels: explainLevelSchema.options,
      /** clips the interface can trigger by itself for study events, without asking the AI */
      reactions: REACTION_FOR_EVENT,
      sourceKinds: sourceKindSchema.options,
      upload: { maxFileMb: 15, extensions: [".pdf", ".txt", ".md", ".docx", ".pptx", ".xlsx", ".csv", ".png", ".jpg", ".jpeg", ".webp", ".mp3", ".m4a", ".mp4", ".wav", ".aac", ".ogg", ".webm"], plannedExtensions: [] },
    }),
  );
});

companionPublicRoutes.get("/demo", (req, res) => {
  res.json(ok(demoPerformance(req.query.scenario === "notfound" ? "notfound" : "explain")));
});

/** The real thing: an explanation as a performance the mascot plays. */
export const companionRoutes = Router({ mergeParams: true });
companionRoutes.use(requireAuth);

const aiLimit = rateLimit({ windowMs: 10 * 60_000, max: 40, key: (req) => `ai:${req.user?.id}` });

companionRoutes.post(
  "/explain",
  notebookAccess("viewer"),
  aiLimit,
  validate("body", explainRequestSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as ReturnType<typeof explainRequestSchema.parse>;
    const performance = await explainAsPerformance(req.member!.notebookId, body);
    const rows = await (await getDb()).query<{ id: string }>(
      "INSERT INTO questions(notebook_id, asked_by, question, grounded, answer, citations, steps) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id",
      [
        req.member!.notebookId,
        req.user!.id,
        body.question,
        performance.grounded,
        performance.beats.map((b) => b.say).join("\n"),
        JSON.stringify(performance.citations),
        JSON.stringify(performance.beats),
      ],
    );
    await logActivity(req.member!.notebookId, req.user!.id, "question_asked", rows[0]!.id);
    res.json(ok({ questionId: rows[0]!.id, question: body.question, performance }));
  }),
);
