/** Applies pending SQL migrations to DATABASE_URL (or the local PGlite dev database when it is not set). */
import { getDb, migrate } from "../src/db/index.js";

const db = await getDb(); // getDb already migrates; run again to report anything still pending
const applied = await migrate(db);
console.info(applied.length ? `Applied: ${applied.join(", ")}` : "Database is up to date.");
await db.close();
