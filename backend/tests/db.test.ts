import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { pgliteDb } from "../src/db/index.js";

describe("embedded database", () => {
  it("creates missing parent folders on first start", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "deepnotes-db-"));
    const db = await pgliteDb(path.join(root, ".data", "pglite"));
    expect(await db.query("SELECT 1 AS ok")).toEqual([{ ok: 1 }]);
    await db.close();
    fs.rmSync(root, { recursive: true, force: true });
  }, 300_000); // starting the embedded database takes minutes on a busy Windows machine
});
