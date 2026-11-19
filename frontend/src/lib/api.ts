import type { ApiResponse } from "@deep-notes/shared";

export class ApiRequestError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

/** Thin fetch wrapper: unwraps the { success, data | error } envelope and throws on failure. */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  const body = (await res.json()) as ApiResponse<T>;
  if (!body.success) throw new ApiRequestError(body.error.code, body.error.message);
  return body.data;
}
