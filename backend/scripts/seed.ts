/**
 * Inserts the shared test accounts. Safe to repeat: it only inserts missing rows (upsert),
 * never deletes. Accounts are listed in docs/local/TESTING_ACCOUNTS.local.md (gitignored).
 *
 * TODO: replace the placeholder hash with the real password hashing once auth is implemented.
 */
import { assertLocalDatabase } from "./guard.js";

assertLocalDatabase(process.env.DATABASE_URL);

const { db, pool } = await import("../src/db/client.js");
const { users } = await import("../src/db/schema.js");

const testUsers = [
  { email: "member1@example.com", name: "Test Member One" },
  { email: "member2@example.com", name: "Test Member Two" },
];

for (const u of testUsers) {
  await db
    .insert(users)
    .values({ ...u, passwordHash: "placeholder-until-auth" })
    .onConflictDoNothing({ target: users.email });
}

await pool.end();
console.log(`Seeded ${testUsers.length} test users (existing ones were left untouched).`);
