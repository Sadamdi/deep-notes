import { ERROR_CODES } from "@deep-notes/shared";
import { z } from "zod";
import { ENDPOINTS, type Endpoint } from "./endpoints.js";

const toSchema = (s: unknown) => {
  try {
    return z.toJSONSchema(s as z.ZodType, { io: "input", unrepresentable: "any", target: "draft-7" });
  } catch {
    return { type: "object" };
  }
};

const openApiPath = (p: string) => p.replace(/:(\w+)/g, "{$1}");

function operation(e: Endpoint) {
  const params = [...e.path.matchAll(/:(\w+)/g)].map((m) => ({ name: m[1]!, in: "path", required: true, schema: { type: "string" } }));
  const requestBody = e.upload
    ? { required: true, content: { "multipart/form-data": { schema: { type: "object", required: ["file"], properties: { file: { type: "string", format: "binary" }, title: { type: "string" } } } } } }
    : e.body
      ? { required: true, content: { "application/json": { schema: toSchema(e.body) } } }
      : undefined;
  return {
    tags: [e.tag],
    summary: e.summary,
    description: [e.feature ? `Feature ${e.feature}.` : "", e.role ? `Needs notebook role ${e.role} or higher.` : "", e.notes ?? ""].filter(Boolean).join(" "),
    ...(e.auth === false ? { security: [] } : { security: [{ sessionCookie: [] }] }),
    parameters: params,
    ...(requestBody ? { requestBody } : {}),
    responses: {
      "200": {
        description: "Success envelope `{ success: true, data }`",
        ...(e.response ? { content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean", enum: [true] }, data: toSchema(e.response) } } } } } : {}),
      },
      "400": { description: "VALIDATION" },
      ...(e.auth === false ? {} : { "401": { description: "UNAUTHORIZED: sign in first" } }),
      ...(e.role ? { "403": { description: "FORBIDDEN: role too low" }, "404": { description: "NOT_FOUND: also returned to non-members" } } : {}),
      "429": { description: "RATE_LIMITED" },
    },
  };
}

/** Builds the OpenAPI 3 document from the endpoint registry. */
export function buildOpenApi() {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const e of ENDPOINTS) (paths[openApiPath(e.path)] ??= {})[e.method] = operation(e);
  return {
    openapi: "3.0.3",
    info: {
      title: "Deep Notes API",
      version: "1.0.0",
      description:
        "Backend of Deep Notes, a shared AI study notebook that answers only from the group's own sources. All paths are under /api/v1. Responses use the envelope `{ success, data }` or `{ success: false, error: { code, message } }`. Error codes: " +
        ERROR_CODES.join(", ") +
        ". Human-readable contract: docs/API_CONTRACT.md and docs/COMPANION_CONTRACT.md.",
    },
    servers: [{ url: "/api/v1" }],
    tags: [...new Set(ENDPOINTS.map((e) => e.tag))].map((name) => ({ name })),
    components: { securitySchemes: { sessionCookie: { type: "apiKey", in: "cookie", name: "dn_session" } } },
    paths,
  };
}
