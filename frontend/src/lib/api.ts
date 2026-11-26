import type { ApiResponse } from "@deep-notes/shared";

export class ApiRequestError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

/** Keeps the API envelope and browser session handling in one place. */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
  if (init.body !== undefined && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`/api/v1${path}`, {
    ...init,
    credentials: init.credentials ?? "include",
    headers,
  });
  const responseText = await response.text();
  let body: ApiResponse<T> | undefined;

  if (responseText) {
    try {
      body = JSON.parse(responseText) as ApiResponse<T>;
    } catch {
      throw new ApiRequestError("INTERNAL", "Server mengirim respons yang tidak dapat dibaca.", response.status);
    }
  }

  if (!response.ok) {
    if (body && !body.success) {
      throw new ApiRequestError(body.error.code, body.error.message, response.status);
    }
    throw new ApiRequestError("INTERNAL", "Permintaan belum berhasil. Coba lagi sebentar.", response.status);
  }

  if (!body?.success) {
    throw new ApiRequestError("INTERNAL", "Respons server belum lengkap.", response.status);
  }

  return body.data;
}

export function jsonBody<T>(method: "POST" | "PATCH" | "DELETE", value?: T): RequestInit {
  return {
    method,
    ...(value === undefined ? {} : { body: JSON.stringify(value) }),
  };
}
