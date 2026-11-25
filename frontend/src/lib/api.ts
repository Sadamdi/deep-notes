import type { ApiResponse } from "@deep-notes/shared";

export class ApiRequestError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

/** Thin fetch wrapper: unwraps `{ success, data | error }`, supports JSON and FormData bodies. */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;
  const headers: HeadersInit = isFormData
    ? { ...init?.headers }
    : { "Content-Type": "application/json", ...init?.headers };

  const res = await fetch(`/api/v1${path}`, {
    credentials: "include",
    ...init,
    headers,
  });
  const body = (await res.json()) as ApiResponse<T>;
  if (!body.success) {
    throw new ApiRequestError(body.error.code, body.error.message, body.error.details);
  }
  return body.data;
}
