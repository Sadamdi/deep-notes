import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite/vector";
import pg from "pg";
import { env } from "../config/env.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = any;

/** Minimal database interface. Implemented by node-postgres (server) and PGlite (dev and tests). */
export interface Db {
  readonly kind: "pg" | "pglite";
  query<T = Row>(sql: string, params?: unknown[]): Promise<T[]>;
  exec(sql: string): Promise<void>;
  close(): Promise<void>;
}

function pgDb(connectionString: string): Db {
  const pool = new pg.Pool({
    connectionString,
    ssl: env.DATABASE_SSL === "require" ? { rejectUnauthorized: false } : undefined,
    max: 10,
  });
  return {
    kind: "pg",
    async query<T>(sql: string, params?: unknown[]) {
      return (await pool.query(sql, params as unknown[])).rows as T[];
    },
    async exec(sql) {
      await pool.query(sql);
    },
    close: () => pool.end(),
  };
}

export async function pgliteDb(dataDir?: string): Promise<Db> {
  const lite = new PGlite({ dataDir, extensions: { vector } });
  await lite.waitReady;
  return {
    kind: "pglite",
    async query<T>(sql: string, params?: unknown[]) {
      return (await lite.query(sql, params as unknown[])).rows as T[];
    },
    async exec(sql) {
      await lite.exec(sql);
    },
    close: () => lite.close(),
  };
}

export async function migrate(db: Db, dir = process.env.MIGRATIONS_DIR ?? "./migrations"): Promise<string[]> {
  await db.exec(
    "CREATE TABLE IF NOT EXISTS _migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
  );
  const done = new Set((await db.query<{ name: string }>("SELECT name FROM _migrations")).map((r) => r.name));
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  const applied: string[] = [];
  for (const f of files) {
    if (done.has(f)) continue;
    await db.exec(fs.readFileSync(path.join(dir, f), "utf8"));
    await db.query("INSERT INTO _migrations(name) VALUES ($1)", [f]);
    applied.push(f);
  }
  return applied;
}

let current: Promise<Db> | undefined;

/** Lazily opens the database: DATABASE_URL when set, otherwise an embedded PGlite under ./.data (dev only). */
export function getDb(): Promise<Db> {
  current ??= (async () => {
    let db: Db;
    if (env.DATABASE_URL) db = pgDb(env.DATABASE_URL);
    else if (env.NODE_ENV === "production" && process.env.ALLOW_PGLITE !== "1") throw new Error("DATABASE_URL is required in production (or set ALLOW_PGLITE=1 for the embedded demo database)");
    else db = await pgliteDb(process.env.PGLITE_DIR ?? "./.data/pglite");
    await migrate(db);
    return db;
  })();
  return current;
}

export function setDb(db: Db | undefined): void {
  current = db ? Promise.resolve(db) : undefined;
}

export const toVector = (v: number[]): string => `[${v.join(",")}]`;
