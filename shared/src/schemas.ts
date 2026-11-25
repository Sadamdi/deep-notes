import { z } from "zod";

/** Request contracts for accounts, groups, sources, quizzes and assignments. Feature docs: docs/features/. */

const email = z.string().trim().toLowerCase().pipe(z.email().max(200));

export const registerSchema = z.object({
  email,
  name: z.string().trim().min(2).max(80),
  password: z.string().min(8).max(128),
  course: z.string().trim().max(120).optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({ email, password: z.string().min(1).max(128) });
export type LoginInput = z.infer<typeof loginSchema>;

export const visibilitySchema = z.enum(["private", "public"]);

export const updateNotebookSchema = z.object({
  title: z.string().trim().min(3).max(120).optional(),
  course: z.string().trim().max(120).nullable().optional(),
  description: z.string().trim().max(500).nullable().optional(),
  category: z.string().trim().max(60).nullable().optional(),
  visibility: visibilitySchema.optional(),
});
export type UpdateNotebookInput = z.infer<typeof updateNotebookSchema>;

export const addMemberSchema = z.object({ email, role: z.enum(["editor", "viewer"]).default("editor") });
export const changeRoleSchema = z.object({ role: z.enum(["editor", "viewer"]) });

export const createInviteSchema = z.object({
  role: z.enum(["editor", "viewer"]).default("editor"),
  expiresInDays: z.number().int().min(1).max(30).default(7),
  maxUses: z.number().int().min(1).max(100).default(20),
});

export const joinRequestSchema = z.object({ message: z.string().trim().max(300).optional() });

export const addTextSourceSchema = z.object({
  title: z.string().trim().min(1).max(160),
  text: z.string().trim().min(20).max(400_000),
});
export const addLinkSourceSchema = z.object({
  url: z.string().trim().url().max(2000),
  title: z.string().trim().max(160).optional(),
});

export const quizKindSchema = z.enum(["practice", "weekly", "exam"]);
export type QuizKind = z.infer<typeof quizKindSchema>;
export const generateQuizSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  kind: quizKindSchema.default("practice"),
  count: z.number().int().min(3).max(20).default(5),
  topic: z.string().trim().max(120).optional(),
  sourceId: z.string().uuid().optional(),
  sourceIds: z.array(z.string().uuid()).min(1).max(40).optional(),
  timeLimitSec: z.number().int().min(30).max(7200).optional(),
  perQuestionSec: z.number().int().min(5).max(600).optional(),
  dueAt: z.string().datetime().optional(),
});
export type GenerateQuizInput = z.infer<typeof generateQuizSchema>;

export const submitAttemptSchema = z.object({
  answers: z.array(z.number().int().min(0).max(3).nullable()).min(1).max(50),
  durationMs: z.number().int().min(0).max(7_200_000).optional(),
});
export type SubmitAttemptInput = z.infer<typeof submitAttemptSchema>;

export const createAssignmentSchema = z.object({
  assigneeId: z.string().uuid(),
  topic: z.string().trim().min(2).max(160),
  sourceId: z.string().uuid().optional(),
  dueAt: z.string().datetime().optional(),
});
export const updateAssignmentSchema = z.object({ status: z.enum(["todo", "doing", "done"]) });

export const profileSchema = z.object({
  course: z.string().trim().max(120).nullable().optional(),
  lookingForPartners: z.boolean().optional(),
});
export type ProfileInput = z.infer<typeof profileSchema>;

/** One generated quiz item as stored. The answer fields are removed before a quiz is shown to a taker. */
export const quizItemSchema = z.object({
  question: z.string().min(5),
  options: z.array(z.string().min(1)).length(4),
  answerIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(1),
  topic: z.string().min(1),
  sourceId: z.string(),
  sourceTitle: z.string(),
  page: z.number().int().positive().nullable(),
});
export type QuizItem = z.infer<typeof quizItemSchema>;

/** Figma-backed Bubi expressions used by new AI responses. */
export const BUBI_EMOTIONS = ["idle", "senang", "sedih", "marah", "antusias", "semangat"] as const;
const bubiEmotionSchema = z.enum(BUBI_EMOTIONS);

/** Older saved answers and performances may still contain these labels; normalize them when read. */
const legacyEmotionSchema = z.enum(["neutral", "curious", "happy", "thinking", "encouraging", "concerned"]);
const legacyEmotionMap: Record<z.infer<typeof legacyEmotionSchema>, z.infer<typeof bubiEmotionSchema>> = {
  neutral: "idle",
  curious: "antusias",
  happy: "senang",
  thinking: "idle",
  encouraging: "semangat",
  concerned: "sedih",
};

/** Explanation in short steps. `emotion` selects a real Bubi SVG; the text is always shown too. */
export const emotionSchema = z.union([bubiEmotionSchema, legacyEmotionSchema]).transform((emotion): z.infer<typeof bubiEmotionSchema> =>
  emotion in legacyEmotionMap ? legacyEmotionMap[emotion as keyof typeof legacyEmotionMap] : (emotion as z.infer<typeof bubiEmotionSchema>),
);
export type Emotion = z.output<typeof emotionSchema>;
export const explanationStepSchema = z.object({ text: z.string().min(1), emotion: emotionSchema });
export type ExplanationStep = z.infer<typeof explanationStepSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128),
});
export const deleteAccountSchema = z.object({ password: z.string().min(1).max(128) });
