import { z } from "zod";

/** Comma-separated list -> trimmed non-empty strings. */
const csv = (fallback = "") =>
  z
    .string()
    .default(fallback)
    .transform((v) => v.split(",").map((s) => s.trim()).filter(Boolean));

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),

  // Database. Put the password in the URL percent-encoded. Do not add sslmode to the URL; use DATABASE_SSL.
  DATABASE_URL: z.string().url().optional(),
  DATABASE_SSL: z.enum(["disable", "require"]).default("disable"),

  // Sessions (required once auth exists)
  SESSION_SECRET: z.string().min(32).optional(),

  // Uploaded files live on disk, outside the web root
  UPLOAD_DIR: z.string().default("./uploads"),

  // AI provider layer (see docs/ARCHITECTURE.md). Providers are tried in this order for text generation.
  AI_PROVIDER_ORDER: csv("gemini,openai-compat"),
  GEMINI_API_KEYS: csv(),
  OPENAI_COMPAT_BASE_URL: z.string().url().optional(),
  OPENAI_COMPAT_API_KEY: z.string().optional(),
  AI_TEXT_MODEL: z.string().optional(),
  AI_FALLBACK_TEXT_MODEL: z.string().optional(),
  // Embeddings are pinned to one model: vectors from different models are not comparable.
  AI_EMBED_MODEL: z.string().default("gemini-embedding-001"),
  AI_EMBED_DIMENSIONS: z.coerce.number().int().default(768),
});

export type Env = z.infer<typeof envSchema>;

/** Parse once at boot so a bad config fails fast instead of at the first request. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`);
  }
  return parsed.data;
}

export const env = loadEnv();
