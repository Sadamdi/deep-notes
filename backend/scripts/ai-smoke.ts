/** Live smoke test of the AI layer: embeddings, quiz generation and an explanation, on the synthetic demo material. */
import fs from "node:fs";
import { migrate, pgliteDb, setDb } from "../src/db/index.js";
import { explainQuestion } from "../src/modules/answers/answers.service.js";
import { generateItems } from "../src/modules/quizzes/quizzes.service.js";
import { startIngestion, waitForIngestion } from "../src/modules/sources/ingest.js";

const material = fs.readFileSync("eval/demo-material.md", "utf8");
const pages = [...material.matchAll(/=== Halaman (\d+) ===\n([\s\S]*?)(?=\n=== Halaman|\s*$)/g)].map((m) => ({ page: Number(m[1]), text: m[2]!.trim() }));
const db = await pgliteDb();
await migrate(db);
setDb(db);
const u = (await db.query<{ id: string }>("INSERT INTO users(email,name,password_hash) VALUES ('s@example.com','S','x') RETURNING id"))[0]!;
const nb = (await db.query<{ id: string }>("INSERT INTO notebooks(title, owner_id) VALUES ('Smoke', $1) RETURNING id", [u.id]))[0]!;
const s = (await db.query<{ id: string }>("INSERT INTO sources(notebook_id, uploaded_by, title, kind) VALUES ($1,$2,'Jaringan','text') RETURNING id", [nb.id, u.id]))[0]!;
startIngestion(s.id, nb.id, pages);
await waitForIngestion();
const chunks = await db.query("SELECT count(*)::int AS n FROM source_chunks WHERE embedding IS NOT NULL");
console.info("embedded chunks:", chunks[0].n);
const items = await generateItems(nb.id, 5, {});
console.info("quiz items:", items.length);
for (const it of items.slice(0, 2)) console.info(JSON.stringify({ q: it.question, topic: it.topic, page: it.page, answer: it.options[it.answerIndex] }));
const ex = await explainQuestion(nb.id, "Jelaskan cara kerja DHCP langkah demi langkah");
console.info("explain grounded:", ex.grounded);
for (const st of ex.steps) console.info(`  [${st.emotion}] ${st.text.slice(0, 100)}`);
setDb(undefined);
await db.close();
