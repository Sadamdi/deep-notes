import { getAi } from "../../ai/index.js";
import { getDb, toVector } from "../../db/index.js";
import { chunkPages, type ExtractedPage } from "./extract.js";

const MAX_CHUNKS = 400;
const CONCURRENCY = 2;

let running = 0;
const queue: Array<() => void> = [];
const pending = new Set<Promise<void>>();

async function slot<T>(fn: () => Promise<T>): Promise<T> {
  if (running >= CONCURRENCY) await new Promise<void>((r) => queue.push(r));
  running++;
  try {
    return await fn();
  } finally {
    running--;
    queue.shift()?.();
  }
}

async function run(sourceId: string, notebookId: string, pages: ExtractedPage[]): Promise<void> {
  const db = await getDb();
  try {
    const chunks = chunkPages(pages).slice(0, MAX_CHUNKS);
    if (chunks.length === 0) throw new Error("No readable text was found in this file");
    const vectors = await getAi().embed(
      chunks.map((c) => c.content),
      "RETRIEVAL_DOCUMENT",
    );
    for (let i = 0; i < chunks.length; i++) {
      await db.query(
        "INSERT INTO source_chunks(source_id, notebook_id, page, idx, content, embedding) VALUES ($1,$2,$3,$4,$5,$6::vector)",
        [sourceId, notebookId, chunks[i]!.page, i, chunks[i]!.content, toVector(vectors[i]!)],
      );
    }
    const pageCount = pages.some((p) => p.page !== null) ? Math.max(...pages.map((p) => p.page ?? 0)) : null;
    await db.query("UPDATE sources SET status = 'ready', page_count = $2, error = NULL WHERE id = $1", [sourceId, pageCount]);
  } catch (e) {
    await db.query("DELETE FROM source_chunks WHERE source_id = $1", [sourceId]);
    await db.query("UPDATE sources SET status = 'failed', error = $2 WHERE id = $1", [sourceId, String((e as Error).message).slice(0, 300)]);
  }
}

/** Starts ingestion in the background (bounded concurrency). Status is visible on the source row. */
export function startIngestion(sourceId: string, notebookId: string, pages: ExtractedPage[]): void {
  const p: Promise<void> = slot(() => run(sourceId, notebookId, pages)).finally(() => pending.delete(p));
  pending.add(p);
}

/** Tests and scripts await this to know all ingestion work has settled. */
export async function waitForIngestion(): Promise<void> {
  while (pending.size) await Promise.allSettled([...pending]);
}
