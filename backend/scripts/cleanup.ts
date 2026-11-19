/**
 * Deletes ALL application data. Local database only: it exits before touching anything
 * unless DATABASE_URL points at localhost. Run explicitly: pnpm --filter @deep-notes/backend db:cleanup
 * Never import this from seed or test setup.
 */
import { sql } from "drizzle-orm";
import { assertLocalDatabase } from "./guard.js";

assertLocalDatabase(process.env.DATABASE_URL);

const { db, pool } = await import("../src/db/client.js");
await db.execute(
  sql`TRUNCATE quiz_attempts, quizzes, questions, source_chunks, sources, notebook_members, notebooks, users RESTART IDENTITY CASCADE`,
);
await pool.end();
console.log("Local database cleaned.");
