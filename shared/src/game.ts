import { z } from "zod";
import { animationSchema } from "./companion.js";
import { emotionSchema } from "./schemas.js";

/**
 * Game sessions: the server plans a sequence of rounds, each of one game type, from the notebook's sources.
 * The player (frontend) only plays rounds and sends answers; answers to items are never sent before submitting.
 */
export const GAME_TYPES = ["mcq", "fill", "tf", "order", "match", "guess_page", "teach"] as const;
export const gameTypeSchema = z.enum(GAME_TYPES);
export type GameType = z.infer<typeof gameTypeSchema>;

export const sessionModeSchema = z.enum(["solo", "duel", "group"]);

export const createSessionSchema = z.object({
  mode: sessionModeSchema.default("solo"),
  /** 3 to 10; default 6 */
  rounds: z.number().int().min(3).max(10).default(6),
  /** recovery mission: practise this topic (usually from the gap map) */
  focusTopic: z.string().trim().min(2).max(120).optional(),
  /** "pick yourself": only these game types; omit to let the server choose automatically */
  gameTypes: z.array(gameTypeSchema).min(1).max(7).optional(),
  /** limit to these reference sources; omit for all sources */
  sourceIds: z.array(z.string().uuid()).min(1).max(40).optional(),
});
export type CreateSessionInput = z.infer<typeof createSessionSchema>;

/** One answer per item in the round. Shape depends on the game type, see docs/GAME_CONTRACT.md. */
export const answerRoundSchema = z.object({
  answers: z.array(z.union([z.number(), z.string().max(4000), z.boolean(), z.array(z.union([z.number(), z.string()])), z.null()])).min(1).max(12),
  /** time the player took for the whole round, in milliseconds */
  elapsedMs: z.number().int().min(0).max(3_600_000).optional(),
});
export type AnswerRoundInput = z.infer<typeof answerRoundSchema>;

export const itemRefSchema = z.object({ sourceId: z.string(), sourceTitle: z.string(), page: z.number().int().positive().nullable() });
export type ItemRef = z.infer<typeof itemRefSchema>;

/** What the player sees for one item (no answers). */
export const publicItemSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("mcq"), prompt: z.string(), options: z.array(z.string()).length(4), topic: z.string() }),
  z.object({ type: z.literal("fill"), prompt: z.string(), firstLetter: z.string(), length: z.number(), topic: z.string() }),
  z.object({ type: z.literal("tf"), prompt: z.string(), topic: z.string() }),
  z.object({ type: z.literal("order"), prompt: z.string(), steps: z.array(z.object({ id: z.number(), text: z.string() })), topic: z.string() }),
  z.object({ type: z.literal("match"), prompt: z.string(), lefts: z.array(z.string()), rights: z.array(z.string()), topic: z.string() }),
  z.object({ type: z.literal("guess_page"), prompt: z.string(), options: z.array(z.object({ sourceTitle: z.string(), page: z.number().nullable() })).length(4), topic: z.string() }),
  z.object({ type: z.literal("teach"), prompt: z.string(), topic: z.string() }),
]);
export type PublicItem = z.infer<typeof publicItemSchema>;

export const roundCueSchema = z.object({
  /** line the mascot says when the round opens */
  intro: z.string(),
  introAnimation: animationSchema,
  introEmotion: emotionSchema,
});

export const publicRoundSchema = z.object({
  index: z.number().int().min(0),
  type: gameTypeSchema,
  topic: z.string().nullable(),
  /** suggested time for the whole round */
  timeLimitSec: z.number().int(),
  items: z.array(publicItemSchema),
  cue: roundCueSchema,
});
export type PublicRound = z.infer<typeof publicRoundSchema>;

export const BADGES = {
  first_session: "Sesi pertama",
  perfect: "Skor sempurna",
  speedster: "Cepat tanggap",
  streak_3: "Streak 3 hari",
  streak_7: "Streak 7 hari",
  gap_guardian: "Penjaga celah",
  teammate: "Teman belajar",
} as const;
export type BadgeId = keyof typeof BADGES;

export const teachBackSchema = z.object({
  topic: z.string().trim().min(2).max(120),
  explanation: z.string().trim().min(10).max(4000),
  sourceIds: z.array(z.string().uuid()).min(1).max(40).optional(),
});

export const createPostSchema = z.object({
  body: z.string().trim().min(1).max(500),
  attach: z
    .discriminatedUnion("type", [z.object({ type: z.literal("notebook"), notebookId: z.string().uuid() }), z.object({ type: z.literal("result"), sessionId: z.string().uuid() })])
    .optional(),
});
export type CreatePostInput = z.infer<typeof createPostSchema>;
export const createCommentSchema = z.object({ body: z.string().trim().min(1).max(300) });
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
