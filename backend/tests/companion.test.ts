import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ANIMATIONS, performanceSchema } from "@deep-notes/shared";
import { env } from "../src/config/env.js";
import type { Db } from "../src/db/index.js";
import { waitForIngestion } from "../src/modules/sources/ingest.js";
import { parseCsv } from "../src/modules/sources/extract.js";
import { closeApp, createNotebookWithSources, freshApp, makeXlsx, signUp } from "./helpers.js";

let app: Awaited<ReturnType<typeof freshApp>>["app"];
let db: Db;
beforeAll(async () => {
  ({ app, db } = await freshApp());
}, 60_000);
afterAll(() => closeApp(db));

describe("companion catalog and demo (no login, for the frontend)", () => {
  it("lists mascots, the closed animation vocabulary, reactions and upload limits", async () => {
    const r = await request(app).get("/api/v1/companion/catalog");
    expect(r.status).toBe(200);
    const d = r.body.data;
    expect(d.animations).toEqual([...ANIMATIONS]);
    expect(d.mascots.map((m: { role: string }) => m.role).sort()).toEqual(["coach", "friend", "teacher"]);
    expect(d.mascots[0].animations.length).toBe(ANIMATIONS.length);
    expect(d.reactions.quiz_perfect).toEqual({ animation: "celebrate", emotion: "happy" });
    expect(d.upload.extensions).toEqual(expect.arrayContaining([".pdf", ".pptx", ".docx", ".xlsx", ".csv", ".png"]));
    // every reaction must use a clip that exists in the vocabulary
    for (const v of Object.values(d.reactions) as Array<{ animation: string }>) expect(ANIMATIONS).toContain(v.animation);
  });

  it("serves sample performances that match the contract schema", async () => {
    for (const scenario of ["explain", "notfound"]) {
      const r = await request(app).get(`/api/v1/companion/demo?scenario=${scenario}`);
      expect(performanceSchema.safeParse(r.body.data).success, scenario).toBe(true);
    }
  });
});

describe("POST /notebooks/:id/companion/explain", () => {
  it("returns a validated performance: unknown animations replaced, citation indexes resolved, text always present", async () => {
    const u = await signUp(app, "Learner");
    const nb = await createNotebookWithSources(u.agent);
    const r = await u.agent.post(`/api/v1/notebooks/${nb}/companion/explain`).send({ question: "Jelaskan topologi bintang dan kerusakan satu kabel", style: "friend", level: "simple" });
    expect(r.status).toBe(200);
    const p = r.body.data.performance;
    expect(performanceSchema.safeParse(p).success).toBe(true);
    expect(p).toMatchObject({ grounded: true, style: "friend", level: "simple", mascotId: "mimi" });
    expect(p.beats[1].animation).toBe("write_on_board"); // "moonwalk" is not in the vocabulary: default for emotion neutral
    expect(p.beats[1].citation).toBe(0);
    expect(p.beats[2].citation).toBeNull(); // the model cited source 99, which does not exist
    expect(p.beats.every((b: { say: string }) => b.say.length > 0)).toBe(true);
    expect(p.followUps).toHaveLength(1);
    expect(p.citations[0]).toHaveProperty("sourceTitle");
  });

  it("answers 'not found' as a single shrug beat, and uses defaults for style and level", async () => {
    const u = await signUp(app, "Learner");
    const nb = await createNotebookWithSources(u.agent);
    const r = await u.agent.post(`/api/v1/notebooks/${nb}/companion/explain`).send({ question: "Jelaskan resep rendang tradisional Minang" });
    const p = r.body.data.performance;
    expect(p).toMatchObject({ grounded: false, style: "teacher", level: "normal", mascotId: "kiko" });
    expect(p.beats).toHaveLength(1);
    expect(p.beats[0]).toMatchObject({ animation: "shrug", emotion: "concerned" });
  });

  it("validates input, requires login and membership, and counts as a contribution", async () => {
    const u = await signUp(app, "Learner");
    const stranger = await signUp(app, "Stranger");
    const nb = await createNotebookWithSources(u.agent);
    expect((await u.agent.post(`/api/v1/notebooks/${nb}/companion/explain`).send({ question: "?" })).status).toBe(400);
    expect((await u.agent.post(`/api/v1/notebooks/${nb}/companion/explain`).send({ question: "Apa itu topologi", style: "wizard" })).status).toBe(400);
    expect((await stranger.agent.post(`/api/v1/notebooks/${nb}/companion/explain`).send({ question: "Apa itu topologi bintang" })).status).toBe(404);
    expect((await request(app).post(`/api/v1/notebooks/${nb}/companion/explain`).send({ question: "Apa itu topologi bintang" })).status).toBe(401);
    await u.agent.post(`/api/v1/notebooks/${nb}/companion/explain`).send({ question: "Jelaskan topologi bintang dan kabel" });
    const c = (await u.agent.get(`/api/v1/notebooks/${nb}/contributions`)).body.data.members[0];
    expect(c.questionsAsked).toBe(1);
  });
});

describe("spreadsheets and images as sources", () => {
  it("reads CSV with quotes, semicolons and BOM, turning rows into header: value text", async () => {
    expect(parseCsv('nama,nilai\n"Budi, S.",90\r\nAni,"8""5"')).toEqual([["nama", "nilai"], ["Budi, S.", "90"], ["Ani", '8"5']]);
    expect(parseCsv("a;b\n1;2")).toEqual([["a", "b"], ["1", "2"]]);
    const u = await signUp(app, "Sheeter");
    const nb = (await u.agent.post("/api/v1/notebooks").send({ title: "Tabel" })).body.data.id;
    const csv = Buffer.from("﻿perangkat,fungsi\nrouter,menentukan jalur antar jaringan\nswitch,menghubungkan perangkat dalam satu jaringan lokal\n", "utf8");
    expect((await u.agent.post(`/api/v1/notebooks/${nb}/sources/file`).attach("file", csv, "perangkat.csv")).status).toBe(202);
    await waitForIngestion();
    const src = (await u.agent.get(`/api/v1/notebooks/${nb}/sources`)).body.data[0];
    expect(src).toMatchObject({ kind: "csv", status: "ready" });
  });

  it("reads XLSX sheets as numbered pages", async () => {
    const u = await signUp(app, "Sheeter");
    const nb = (await u.agent.post("/api/v1/notebooks").send({ title: "Excel" })).body.data.id;
    const xlsx = await makeXlsx([["protokol", "port"], ["HTTPS", "443"], ["SSH", "22"]]);
    expect((await u.agent.post(`/api/v1/notebooks/${nb}/sources/file`).attach("file", xlsx, "port.xlsx")).status).toBe(202);
    await waitForIngestion();
    const src = (await u.agent.get(`/api/v1/notebooks/${nb}/sources`)).body.data[0];
    expect(src).toMatchObject({ kind: "xlsx", status: "ready", pageCount: 1 });
    const page = await u.agent.get(`/api/v1/notebooks/${nb}/sources/${src.id}/pages/1`);
    expect(page.body.data.text).toContain("protokol: HTTPS; port: 443");
  });

  it("accepts real images through text recognition and rejects fake ones", async () => {
    const u = await signUp(app, "Imager");
    const nb = (await u.agent.post("/api/v1/notebooks").send({ title: "Gambar" })).body.data.id;
    const png = Buffer.concat([Buffer.from("\x89PNG\r\n\x1a\n", "latin1"), Buffer.alloc(64)]);
    expect((await u.agent.post(`/api/v1/notebooks/${nb}/sources/file`).attach("file", Buffer.from("bukan gambar"), "x.png")).status).toBe(400);
    const prev = [...env.GEMINI_API_KEYS];
    env.GEMINI_API_KEYS.push("test-key");
    try {
      expect((await u.agent.post(`/api/v1/notebooks/${nb}/sources/file`).attach("file", png, "papan-tulis.png")).status).toBe(202);
      await waitForIngestion();
      const src = (await u.agent.get(`/api/v1/notebooks/${nb}/sources`)).body.data[0];
      expect(src).toMatchObject({ kind: "image", status: "ready" });
    } finally {
      env.GEMINI_API_KEYS.splice(0, env.GEMINI_API_KEYS.length, ...prev);
    }
  });
});
