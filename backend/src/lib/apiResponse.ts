import type { ApiFailure, ApiSuccess, ErrorCode } from "@deep-notes/shared";

export const ok = <T>(data: T, meta?: ApiSuccess<T>["meta"]): ApiSuccess<T> =>
  meta ? { success: true, data, meta } : { success: true, data };

export const fail = (code: ErrorCode, message: string, details?: unknown): ApiFailure => ({
  success: false,
  error: details === undefined ? { code, message } : { code, message, details },
});
