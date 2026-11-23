/**
 * Creates the demo notebook from the synthetic material plus three demo accounts. Safe to repeat.
 * Refuses to touch a non-local database unless ALLOW_REMOTE_SEED=1 is set on purpose.
 * Generated passwords go to docs/local/TESTING_ACCOUNTS.local.md (gitignored), never to the console or git.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { env } from "../src/config/env.js";
import { getDb } from "../src/db/index.js";
import { hashPassword } from "../src/lib/password.js";
import { startIngestion, waitForIngestion } from "../src/modules/sources/ingest.js";
import { assertLocalDatabase } from "./guard.js";

if (env.DATABASE_URL && process.env.ALLOW_REMOTE_SEED !== "1") assertLocalDatabase(env.DATABASE_URL);

const db = await getDb();
const demo = [
  { email: "demo1@example.com", name: "Demo Satu" },
  { email: "demo2@example.com", name: "Demo Dua" },
  { email: "demo3@example.com", name: "Demo Tiga" },
];
const accounts: string[] = [];
const ids: string[] = [];
for (const u of demo) {
  const existing = await db.query<{ id: string }>("SELECT id FROM users WHERE email = $1", [u.email]);
  if (existing[0]) {
    ids.push(existing[0].id);
    continue;
  }
  const password = crypto.randomBytes(9).toString("base64url");
  const rows = await db.query<{ id: string }>(
    "INSERT INTO users(email, name, password_hash, course) VALUES ($1,$2,$3,'Jaringan Komputer') RETURNING id",
    [u.email, u.name, await hashPassword(password)],
  );
  ids.push(rows[0]!.id);
  accounts.push(`${u.email} | ${password}`);
}
const has = await db.query("SELECT 1 FROM notebooks WHERE title = 'Jaringan Komputer (demo)'");
if (!has.length) {
  const nb = (
    await db.query<{ id: string }>(
      "INSERT INTO notebooks(title, course, description, category, visibility, owner_id) VALUES ('Jaringan Komputer (demo)','Jaringan Komputer','Catatan sintetis untuk demo','Informatika','public',$1) RETURNING id",
      [ids[0]],
    )
  )[0]!;
  for (const [i, id] of ids.entries()) {
    await db.query("INSERT INTO notebook_members(notebook_id, user_id, role) VALUES ($1,$2,$3)", [nb.id, id, i === 0 ? "owner" : "editor"]);
  }
  const src = (
    await db.query<{ id: string }>(
      "INSERT INTO sources(notebook_id, uploaded_by, title, kind) VALUES ($1,$2,'Catatan Jaringan Komputer (sintetis)','text') RETURNING id",
      [nb.id, ids[0]],
    )
  )[0]!;
  const material = fs.readFileSync("eval/demo-material.md", "utf8");
  const pages = [...material.matchAll(/=== Halaman (\d+) ===\n([\s\S]*?)(?=\n=== Halaman|\s*$)/g)].map((m) => ({ page: Number(m[1]), text: m[2]!.trim() }));
  startIngestion(src.id, nb.id, pages);
  await waitForIngestion();
}
if (accounts.length) {
  const file = path.resolve("../docs/local/TESTING_ACCOUNTS.local.md");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `\n## Demo accounts (${new Date().toISOString().slice(0, 10)})\nemail | password\n${accounts.join("\n")}\n`);
  console.info(`Created ${accounts.length} demo accounts. Passwords are in docs/local/TESTING_ACCOUNTS.local.md (gitignored).`);
}
console.info("Seed done.");
await db.close();
