import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createRealAi } from "../src/ai/index.js";
import { env } from "../src/config/env.js";
import type { Db } from "../src/db/index.js";
import { cleanupExpired } from "../src/lib/maintenance.js";
import { MAX_MEMBERS_PER_NOTEBOOK, MAX_NOTEBOOKS_PER_USER } from "../src/modules/notebooks/notebooks.routes.js";
import { waitForIngestion } from "../src/modules/sources/ingest.js";
import { closeApp, createNotebookWithSources, freshApp, makePdf, signUp } from "./helpers.js";

let app: Awaited<ReturnType<typeof freshApp>>["app"];
let db: Db;
beforeAll(async () => {
  ({ app, db } = await freshApp());
}, 60_000);
afterAll(() => closeApp(db));

describe("scanned PDFs (OCR)", () => {
  it("reads a PDF without a text layer through the vision model and keeps page numbers", async () => {
    const u = await signUp(app, "Scanner");
    const nb = (await u.agent.post("/api/v1/notebooks").send({ title: "Scan" })).body.data.id;
    const prev = [...env.GEMINI_API_KEYS];
    env.GEMINI_API_KEYS.push("test-key"); // the OCR path is only offered when AI keys exist
    try {
      const r = await u.agent.post(`/api/v1/notebooks/${nb}/sources/file`).attach("file", makePdf([""]), "scan.pdf");
      expect(r.status).toBe(202);
      await waitForIngestion();
      const src = (await u.agent.get(`/api/v1/notebooks/${nb}/sources`)).body.data[0];
      expect(src.status).toBe("ready");
      const page = await u.agent.get(`/api/v1/notebooks/${nb}/sources/${src.id}/pages/1`);
      expect(page.body.data.text).toMatch(/topologi bintang/);
    } finally {
      env.GEMINI_API_KEYS.splice(0, env.GEMINI_API_KEYS.length, ...prev);
    }
  });

  it("without AI keys, a text-less file is rejected clearly", async () => {
    const u = await signUp(app, "Scanner");
    const nb = (await u.agent.post("/api/v1/notebooks").send({ title: "Scan" })).body.data.id;
    const r = await u.agent.post(`/api/v1/notebooks/${nb}/sources/file`).attach("file", makePdf([""]), "scan.pdf");
    expect(r.status).toBe(400);
  });
});

describe("account management", () => {
  it("changes the password, ends other sessions, and rejects a wrong current password", async () => {
    const u = await signUp(app, "Changer");
    const other = (await import("supertest")).default.agent(app);
    await other.post("/api/v1/auth/login").send({ email: u.email, password: "password-123" });
    expect((await other.get("/api/v1/auth/me")).status).toBe(200);
    expect((await u.agent.post("/api/v1/me/password").send({ currentPassword: "salah-total", newPassword: "password-456" })).status).toBe(401);
    expect((await u.agent.post("/api/v1/me/password").send({ currentPassword: "password-123", newPassword: "password-456" })).status).toBe(200);
    expect((await u.agent.get("/api/v1/auth/me")).status).toBe(200); // this device stays signed in
    expect((await other.get("/api/v1/auth/me")).status).toBe(401); // the other one is signed out
    const login = (await import("supertest")).default(app);
    expect((await login.post("/api/v1/auth/login").send({ email: u.email, password: "password-123" })).status).toBe(401);
    expect((await login.post("/api/v1/auth/login").send({ email: u.email, password: "password-456" })).status).toBe(200);
  });

  it("signs out everywhere", async () => {
    const u = await signUp(app, "Everywhere");
    expect((await u.agent.post("/api/v1/me/logout-all")).status).toBe(200);
    expect((await u.agent.get("/api/v1/auth/me")).status).toBe(401);
  });

  it("exports the user's own data only", async () => {
    const a = await signUp(app, "Exporter");
    const b = await signUp(app, "Neighbor");
    const id = await createNotebookWithSources(a.agent);
    await a.agent.post(`/api/v1/notebooks/${id}/ask`).send({ question: "Apa keunggulan topologi bintang saat kabel rusak?" });
    await createNotebookWithSources(b.agent);
    const data = (await a.agent.get("/api/v1/me/export")).body.data;
    expect(data.profile.email).toBe(a.email);
    expect(data.questions).toHaveLength(1);
    expect(data.sourcesUploaded).toHaveLength(3);
    expect(JSON.stringify(data)).not.toContain(b.email);
    expect(JSON.stringify(data)).not.toMatch(/password/i);
  });

  it("deletes an account only with the password and only after owned notebooks are gone, taking their data with it", async () => {
    const owner = await signUp(app, "Leaver");
    const mate = await signUp(app, "Stayer");
    const nb = await createNotebookWithSources(owner.agent);
    await owner.agent.post(`/api/v1/notebooks/${nb}/members`).send({ email: mate.email });
    expect((await mate.agent.delete("/api/v1/me").send({ password: "wrong-password" })).status).toBe(401);
    const blocked = await owner.agent.delete("/api/v1/me").send({ password: "password-123" });
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.details.notebooks).toEqual(["Jaringan Komputer"]);
    // the member can leave and delete; their contributions disappear
    await mate.agent.post(`/api/v1/notebooks/${nb}/sources/text`).send({ title: "Milik Stayer", text: "Materi tambahan tentang protokol routing dinamis dan statis pada jaringan kampus besar." });
    await waitForIngestion();
    expect((await mate.agent.delete("/api/v1/me").send({ password: "password-123" })).status).toBe(200);
    const left = await db.query("SELECT 1 FROM sources WHERE title = 'Milik Stayer'");
    expect(left).toHaveLength(0);
    expect((await mate.agent.get("/api/v1/auth/me")).status).toBe(401);
    await owner.agent.delete(`/api/v1/notebooks/${nb}`);
    expect((await owner.agent.delete("/api/v1/me").send({ password: "password-123" })).status).toBe(200);
  });
});

describe("housekeeping routes", () => {
  it("lists and revokes invites (owner only)", async () => {
    const owner = await signUp(app, "Owner");
    const guest = await signUp(app, "Guest");
    const nb = (await owner.agent.post("/api/v1/notebooks").send({ title: "Undangan" })).body.data.id;
    const inv = (await owner.agent.post(`/api/v1/notebooks/${nb}/invites`).send({})).body.data.token;
    expect((await owner.agent.get(`/api/v1/notebooks/${nb}/invites`)).body.data[0]).toMatchObject({ token: inv, uses: 0, inactive: false });
    expect((await guest.agent.get(`/api/v1/notebooks/${nb}/invites`)).status).toBe(404);
    expect((await owner.agent.delete(`/api/v1/notebooks/${nb}/invites/${inv}`)).status).toBe(200);
    expect((await guest.agent.post(`/api/v1/invites/${inv}/accept`)).status).toBe(404);
  });

  it("deletes quizzes and questions only by their author or the owner", async () => {
    const owner = await signUp(app, "Owner");
    const editor = await signUp(app, "Editor");
    const nb = await createNotebookWithSources(owner.agent);
    await owner.agent.post(`/api/v1/notebooks/${nb}/members`).send({ email: editor.email, role: "editor" });
    const quiz = (await owner.agent.post(`/api/v1/notebooks/${nb}/quizzes`).send({ count: 3 })).body.data.id;
    expect((await editor.agent.delete(`/api/v1/notebooks/${nb}/quizzes/${quiz}`)).status).toBe(403);
    expect((await owner.agent.delete(`/api/v1/notebooks/${nb}/quizzes/${quiz}`)).status).toBe(200);
    expect((await owner.agent.get(`/api/v1/notebooks/${nb}/quizzes/${quiz}`)).status).toBe(404);
    const q = (await editor.agent.post(`/api/v1/notebooks/${nb}/ask`).send({ question: "Apa fungsi lapisan transport?" })).body.data.id;
    expect((await owner.agent.delete(`/api/v1/notebooks/${nb}/questions/${q}`)).status).toBe(200);
    const q2 = (await owner.agent.post(`/api/v1/notebooks/${nb}/ask`).send({ question: "Apa fungsi lapisan transport?" })).body.data.id;
    expect((await editor.agent.delete(`/api/v1/notebooks/${nb}/questions/${q2}`)).status).toBe(403);
  });

  it("enforces quotas on notebooks per user and members per notebook", async () => {
    const u = await signUp(app, "Quota");
    for (let i = 0; i < MAX_NOTEBOOKS_PER_USER; i++) {
      expect((await u.agent.post("/api/v1/notebooks").send({ title: `Notebook ${i}` })).status).toBe(201);
    }
    expect((await u.agent.post("/api/v1/notebooks").send({ title: "Terlalu banyak" })).status).toBe(409);

    const owner = await signUp(app, "Full");
    const nb = (await owner.agent.post("/api/v1/notebooks").send({ title: "Penuh" })).body.data.id;
    for (let i = 1; i < MAX_MEMBERS_PER_NOTEBOOK; i++) {
      const row = await db.query<{ id: string }>("INSERT INTO users(email, name, password_hash) VALUES ($1,'Filler','x') RETURNING id", [`filler${i}@example.com`]);
      await db.query("INSERT INTO notebook_members(notebook_id, user_id, role) VALUES ($1,$2,'viewer')", [nb, row[0]!.id]);
    }
    const extra = await signUp(app, "Extra");
    expect((await owner.agent.post(`/api/v1/notebooks/${nb}/members`).send({ email: extra.email })).status).toBe(409);
    const inv = (await owner.agent.post(`/api/v1/notebooks/${nb}/invites`).send({})).body.data.token;
    expect((await extra.agent.post(`/api/v1/invites/${inv}/accept`)).status).toBe(409);
  });

  it("cleans up expired sessions", async () => {
    const u = await signUp(app, "Stale");
    await db.query("UPDATE sessions SET expires_at = now() - interval '1 day' WHERE user_id = $1", [u.id]);
    expect((await u.agent.get("/api/v1/auth/me")).status).toBe(401);
    expect((await cleanupExpired()).sessions).toBeGreaterThanOrEqual(1);
  });
});

describe("AI provider layer (HTTP stubbed)", () => {
  const original = { keys: [...env.GEMINI_API_KEYS], order: [...env.AI_PROVIDER_ORDER], base: env.OPENAI_COMPAT_BASE_URL, key: env.OPENAI_COMPAT_API_KEY };
  afterEach(() => {
    vi.unstubAllGlobals();
    env.GEMINI_API_KEYS.splice(0, env.GEMINI_API_KEYS.length, ...original.keys);
    env.AI_PROVIDER_ORDER.splice(0, env.AI_PROVIDER_ORDER.length, ...original.order);
    env.OPENAI_COMPAT_BASE_URL = original.base;
    env.OPENAI_COMPAT_API_KEY = original.key;
  });
  const geminiReply = (text: string) => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), { status: 200 });
  const schema = z.object({ ok: z.boolean() });
  const call = (ai: ReturnType<typeof createRealAi>) => ai.generateJson({ system: "s", user: "u", schema, purpose: "other" });

  it("rotates to the next key when one is rate limited and rests the bad key", async () => {
    env.GEMINI_API_KEYS.splice(0, env.GEMINI_API_KEYS.length, "bad", "good");
    const seen: string[] = [];
    vi.stubGlobal("fetch", async (_u: string, init: RequestInit) => {
      const key = (init.headers as Record<string, string>)["x-goog-api-key"]!;
      seen.push(key);
      return key === "bad" ? new Response("quota", { status: 429 }) : geminiReply('{"ok": true}');
    });
    const ai = createRealAi();
    expect(await call(ai)).toEqual({ ok: true });
    expect(await call(ai)).toEqual({ ok: true });
    expect(seen).toEqual(["bad", "good", "good"]); // the bad key is skipped while resting
  });

  it("falls back to the OpenAI-compatible endpoint when every Gemini key fails", async () => {
    env.GEMINI_API_KEYS.splice(0, env.GEMINI_API_KEYS.length, "k1");
    env.OPENAI_COMPAT_BASE_URL = "https://proxy.test/v1";
    env.OPENAI_COMPAT_API_KEY = "fixture-proxy";
    vi.stubGlobal("fetch", async (url: string) =>
      String(url).includes("generativelanguage")
        ? new Response("down", { status: 503 })
        : new Response(JSON.stringify({ choices: [{ message: { content: '```json\n{"ok": true}\n```' } }] }), { status: 200 }),
    );
    expect(await call(createRealAi())).toEqual({ ok: true });
  });

  it("retries once on invalid JSON, then fails with a clear error instead of returning garbage", async () => {
    env.GEMINI_API_KEYS.splice(0, env.GEMINI_API_KEYS.length, "k1");
    env.AI_PROVIDER_ORDER.splice(0, env.AI_PROVIDER_ORDER.length, "gemini");
    let calls = 0;
    vi.stubGlobal("fetch", async () => (++calls === 1 ? geminiReply("not json at all") : geminiReply('{"ok": true}')));
    expect(await call(createRealAi())).toEqual({ ok: true });
    expect(calls).toBe(2);
    calls = -10;
    vi.stubGlobal("fetch", async () => geminiReply('{"wrong": 1}'));
    await expect(call(createRealAi())).rejects.toThrow(/AI generation failed/);
  });

  it("does not leak the key in errors and embeds with normalised vectors", async () => {
    env.GEMINI_API_KEYS.splice(0, env.GEMINI_API_KEYS.length, "fixture-key-one");
    vi.stubGlobal("fetch", async (_u: string, init: RequestInit) => {
      expect(String(_u)).not.toContain("fixture-key-one"); // sent in a header, never in the URL
      expect(init.headers).toHaveProperty("x-goog-api-key");
      return new Response(JSON.stringify({ embeddings: [{ values: [3, 4] }] }), { status: 200 });
    });
    const [v] = await createRealAi().embed(["halo"], "RETRIEVAL_QUERY");
    expect(v![0]).toBeCloseTo(0.6);
    expect(v![1]).toBeCloseTo(0.8);
  });
});
