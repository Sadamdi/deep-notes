import { getAi } from "../../ai/index.js";
import { getDb, toVector } from "../../db/index.js";
import { chunkPages, type ExtractedPage, type ExtractedTable } from "./extract.js";

export interface AudioSegment {
  startSec: number;
  endSec: number;
  text: string;
}

export interface IngestionContent {
  pages: ExtractedPage[];
  tables?: ExtractedTable[];
  transcript?: AudioSegment[];
}

/** Content may be extracted immediately or loaded in the bounded background worker. */
export type PagesInput = ExtractedPage[] | IngestionContent | (() => Promise<ExtractedPage[] | IngestionContent>);

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

async function run(sourceId: string, notebookId: string, input: PagesInput): Promise<void> {
  const db = await getDb();
  try {
    const extracted = typeof input === "function" ? await input() : input;
    const content: IngestionContent = Array.isArray(extracted) ? { pages: extracted } : extracted;
    const { pages } = content;
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
    for (const [index, table] of (content.tables ?? []).entries()) {
      await db.query("INSERT INTO source_tables(source_id, table_index, name, headers, rows) VALUES ($1,$2,$3,$4::jsonb,$5::jsonb)", [sourceId, index, table.name, JSON.stringify(table.headers), JSON.stringify(table.rows)]);
    }
    if (content.transcript?.length) {
      await db.query("INSERT INTO source_transcripts(source_id, segments) VALUES ($1,$2::jsonb)", [sourceId, JSON.stringify(content.transcript)]);
    }
    const pageCount = pages.some((p) => p.page !== null) ? Math.max(...pages.map((p) => p.page ?? 0)) : null;
    await db.query("UPDATE sources SET status = 'ready', page_count = $2, error = NULL WHERE id = $1", [sourceId, pageCount]);
  } catch (e) {
    await db.query("DELETE FROM source_chunks WHERE source_id = $1", [sourceId]);
    await db.query("DELETE FROM source_tables WHERE source_id = $1", [sourceId]);
    await db.query("DELETE FROM source_transcripts WHERE source_id = $1", [sourceId]);
    await db.query("UPDATE sources SET status = 'failed', error = $2 WHERE id = $1", [sourceId, String((e as Error).message).slice(0, 300)]);
  }
}

/** Starts ingestion in the background (bounded concurrency). Status is visible on the source row. */
export function startIngestion(sourceId: string, notebookId: string, pages: PagesInput): void {
  const p: Promise<void> = slot(() => run(sourceId, notebookId, pages)).finally(() => pending.delete(p));
  pending.add(p);
}

/** Tests and scripts await this to know all ingestion work has settled. */
export async function waitForIngestion(): Promise<void> {
  while (pending.size) await Promise.allSettled([...pending]);
}
