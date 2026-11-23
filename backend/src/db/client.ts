import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { env } from "../config/env.js";
import * as schema from "./schema.js";

if (!env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to use the database");
}

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  // TODO: pin the hosting provider's CA certificate and verify it instead of skipping verification
  ssl: env.DATABASE_SSL === "require" ? { rejectUnauthorized: false } : undefined,
  max: 10,
});

export const db = drizzle(pool, { schema });
