import { z } from "zod";

/** Error codes shared by API and web. Keep in sync with docs/API_CONTRACT.md. */
export const ERROR_CODES = [
  "VALIDATION",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "RATE_LIMITED",
  "INTERNAL",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export const apiErrorSchema = z.object({
  code: z.enum(ERROR_CODES),
  message: z.string(),
  details: z.unknown().optional(),
});

export type ApiError = z.infer<typeof apiErrorSchema>;

export type ApiSuccess<T> = { success: true; data: T; meta?: { nextCursor?: string | null } };
export type ApiFailure = { success: false; error: ApiError };
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

/** Cursor pagination for every list endpoint. */
export const cursorQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CursorQuery = z.infer<typeof cursorQuerySchema>;

export const healthSchema = z.object({
  status: z.literal("ok"),
  service: z.string(),
  time: z.string(),
});

export type Health = z.infer<typeof healthSchema>;
