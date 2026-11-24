import { z } from "zod";
import { citationSchema } from "./notebook.js";
import { emotionSchema } from "./schemas.js";

/**
 * The study companion contract. The backend (AI) writes a "performance": an ordered list of beats.
 * Each beat says what the mascot says (always as text), which emotion and animation to play, and
 * optionally which citation to show as a preview. The frontend only plays beats; it never decides content.
 *
 * The animation names are a closed vocabulary: designers build exactly these clips, and the backend
 * rejects anything else (falling back to a default for the emotion). Adding a clip means adding a name
 * here, in docs/COMPANION_CONTRACT.md and in the asset sheet, in the same pull request.
 */
export const ANIMATIONS = [
  "idle", // breathing or blinking while waiting
  "wave", // greeting or goodbye
  "nod", // agreeing, "yes, that is right"
  "shake_head", // disagreeing, "not quite"
  "think", // hand on chin, loading or reasoning
  "point_left", // points at content on the left
  "point_right", // points at content on the right (the preview panel)
  "point_up", // "pay attention to this"
  "lean_in", // curious, comes closer
  "read_book", // reading the source
  "hold_magnifier", // looking closely at a detail
  "write_on_board", // explaining step by step
  "raise_hand", // "I have a question" or "I found something"
  "shrug", // does not know, answer not in the sources
  "thumbs_up", // well done
  "clap", // small celebration
  "celebrate", // big celebration (perfect score, streak)
  "jump", // excited
  "sad", // disappointed, encouraging after a miss
  "facepalm", // playful "oops"
  "sleepy", // idle for a long time
  "dance", // reward
] as const;
export const animationSchema = z.enum(ANIMATIONS);
export type Animation = z.infer<typeof animationSchema>;

/** Default clip per emotion, used when the AI picks no valid animation. */
export const DEFAULT_ANIMATION_FOR_EMOTION: Record<z.infer<typeof emotionSchema>, Animation> = {
  neutral: "write_on_board",
  curious: "lean_in",
  happy: "nod",
  thinking: "think",
  encouraging: "thumbs_up",
  concerned: "shrug",
};

export const mascotRoleSchema = z.enum(["teacher", "friend", "coach"]);
export const explainLevelSchema = z.enum(["simple", "normal", "detailed"]);

export const mascotSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: mascotRoleSchema,
  /** one line the interface can show when picking a companion */
  tagline: z.string(),
  /** animation clips this mascot has; the frontend maps any missing one to `idle` */
  animations: z.array(animationSchema),
});
export type Mascot = z.infer<typeof mascotSchema>;

/** How the user wants to be taught. Sent with an explain request. */
export const explainRequestSchema = z.object({
  question: z.string().trim().min(3).max(1000),
  mascotId: z.string().max(40).optional(),
  style: mascotRoleSchema.default("teacher"),
  level: explainLevelSchema.default("normal"),
});
export type ExplainRequest = z.infer<typeof explainRequestSchema>;

/** One moment of the performance. `say` is always complete text, so sound and animation are optional extras. */
export const beatSchema = z.object({
  index: z.number().int().min(0),
  say: z.string().min(1),
  emotion: emotionSchema,
  animation: animationSchema,
  /** index into `citations`: show that passage in the preview panel while this beat plays */
  citation: z.number().int().min(0).nullable(),
  /** rough playing time for the animation or typing effect; the frontend may ignore it */
  durationMs: z.number().int().min(500).max(30_000),
  /** reserved: id of a generated voice note (planned, see docs/COMPANION_CONTRACT.md); null for now */
  voiceNoteId: z.string().nullable(),
});
export type Beat = z.infer<typeof beatSchema>;

export const performanceSchema = z.object({
  id: z.string(),
  mascotId: z.string(),
  style: mascotRoleSchema,
  level: explainLevelSchema,
  grounded: z.boolean(),
  beats: z.array(beatSchema).min(1),
  citations: z.array(citationSchema),
  /** questions the companion suggests next; may be empty */
  followUps: z.array(z.string()),
});
export type Performance = z.infer<typeof performanceSchema>;

/** What a reaction clip means in the study flow, so the frontend can trigger them without asking the AI. */
export const REACTION_FOR_EVENT = {
  quiz_correct: { animation: "nod", emotion: "happy" },
  quiz_wrong: { animation: "sad", emotion: "encouraging" },
  quiz_perfect: { animation: "celebrate", emotion: "happy" },
  streak_kept: { animation: "clap", emotion: "happy" },
  new_source_ready: { animation: "raise_hand", emotion: "curious" },
  answer_not_found: { animation: "shrug", emotion: "concerned" },
  waiting_for_ai: { animation: "think", emotion: "thinking" },
  long_idle: { animation: "sleepy", emotion: "neutral" },
  greeting: { animation: "wave", emotion: "happy" },
} as const satisfies Record<string, { animation: Animation; emotion: z.infer<typeof emotionSchema> }>;
export type ReactionEvent = keyof typeof REACTION_FOR_EVENT;
