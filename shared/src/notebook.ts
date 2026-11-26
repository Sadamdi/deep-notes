import { z } from "zod";

/**
 * Domain contracts for the study-group notebook. These are the single source of truth for
 * request/response shapes: the API validates with them, the web builds forms from them.
 */

export const notebookRoleSchema = z.enum(["owner", "editor", "viewer"]);
export type NotebookRole = z.infer<typeof notebookRoleSchema>;

export const createNotebookSchema = z.object({
  title: z.string().trim().min(3).max(120),
  course: z.string().trim().max(120).optional(),
  description: z.string().trim().max(500).optional(),
  category: z.string().trim().max(60).optional(),
  visibility: z.enum(["private", "public"]).optional(),
});
export type CreateNotebookInput = z.infer<typeof createNotebookSchema>;

export const sourceKindSchema = z.enum(["pdf", "text", "docx", "pptx", "xlsx", "csv", "image", "audio", "link"]);
export type SourceKind = z.infer<typeof sourceKindSchema>;

/** One piece of evidence behind an answer: which source, which page, which passage. */
export const citationSchema = z.object({
  sourceId: z.string(),
  sourceTitle: z.string(),
  page: z.number().int().positive().nullable(),
  quote: z.string(),
});
export type Citation = z.infer<typeof citationSchema>;

export const askQuestionSchema = z.object({
  question: z.string().trim().min(3).max(1000),
  /** limit the answer to these sources (the "reference" picker); omit for all sources */
  sourceIds: z.array(z.string().uuid()).min(1).max(40).optional(),
});
export type AskQuestionInput = z.infer<typeof askQuestionSchema>;

export const workspaceAiTaskSchema = z.enum(["suggest_questions", "summarize", "draft", "practice_guide"]);
export type WorkspaceAiTask = z.infer<typeof workspaceAiTaskSchema>;
const assistSourceScopeSchema = { sourceIds: z.array(z.string().uuid()).min(1).max(40).optional() };
export const workspaceAiAssistSchema = z.discriminatedUnion("task", [
  z.object({
    task: z.literal("suggest_questions"),
    /** Empty context asks for questions directly from the selected source passages. */
    input: z.string().trim().max(4000),
    ...assistSourceScopeSchema,
  }),
  z.object({
    task: z.enum(["summarize", "draft", "practice_guide"]),
    /** User text is task context only; factual claims still have to come from notebook sources. */
    input: z.string().trim().min(3).max(4000),
    ...assistSourceScopeSchema,
  }),
]);
export type WorkspaceAiAssistInput = z.infer<typeof workspaceAiAssistSchema>;

/** An answer is either grounded (has citations) or an explicit "not found in the sources". */
export const answerSchema = z.discriminatedUnion("grounded", [
  z.object({ grounded: z.literal(true), text: z.string(), citations: z.array(citationSchema).min(1) }),
  z.object({ grounded: z.literal(false), text: z.string() }),
]);
export type Answer = z.infer<typeof answerSchema>;
