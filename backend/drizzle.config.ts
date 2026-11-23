import { defineConfig } from "drizzle-kit";

// drizzle-kit does not read .env by itself; load it when present (Node 22+). ENV_FILE overrides the path.
try {
  process.loadEnvFile(process.env.ENV_FILE);
} catch {
  // no .env file: rely on the real environment
}

const url = process.env.DATABASE_URL ?? "postgres://localhost:5432/deepnotes";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url, ssl: process.env.DATABASE_SSL === "require" ? { rejectUnauthorized: false } : false },
});
