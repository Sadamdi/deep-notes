import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "../src/db/index.js";
import { validateCitations, NOT_FOUND_TEXT, type Retrieved } from "../src/modules/answers/answers.service.js";
import { chunkPages } from "../src/modules/sources/extract.js";
import { assertPublicUrl, htmlToText, isPrivateAddress } from "../src/modules/sources/extract.js";
import { closeApp, createNotebookWithSources, freshApp, signUp } from "./helpers.js";

let app: Awaited<ReturnType<typeof freshApp>>["app"];
let db: Db;
beforeAll(async () => {
  ({ app, db } = await freshApp());
}, 60_000);
afterAll(() => closeApp(db));

describe("F-04 cited answers", () => {
  it("answers from the sources with a valid citation", async () => {
    const u = await signUp(app, "Asker");
    const id = await createNotebookWithSources(u.agent);
    const r = await u.agent.post(`/api/v1/notebooks/${id}/ask`).send({ question: "Apa keunggulan topologi bintang ketika satu kabel rusak?" });
    expect(r.status).toBe(200);
    expect(r.body.data.grounded).toBe(true);
    expect(r.body.data.citations.length).toBeGreaterThan(0);
    expect(r.body.data.citations[0]).toMatchObject({ sourceTitle: "Jaringan 1" });
    expect(r.body.data.citations[0].quote.length).toBeGreaterThan(0);
  });

  it("refuses with the fixed not-found text when the sources do not contain the answer", async () => {
    const u = await signUp(app, "Asker");
    const id = await createNotebookWithSources(u.agent);
    const r = await u.agent.post(`/api/v1/notebooks/${id}/ask`).send({ question: "Siapa pemenang piala dunia sepak bola tahun 2010?" });
    expect(r.body.data.grounded).toBe(false);
    expect(r.body.data.text).toBe(NOT_FOUND_TEXT);
    expect(r.body.data.citations).toEqual([]);
  });

  it("answers from an empty notebook with not-found instead of failing", async () => {
    const u = await signUp(app, "Asker");
    const nb = (await u.agent.post("/api/v1/notebooks").send({ title: "Kosong" })).body.data.id;
    const r = await u.agent.post(`/api/v1/notebooks/${nb}/ask`).send({ question: "Apa itu topologi bintang?" });
    expect(r.status).toBe(200);
    expect(r.body.data.grounded).toBe(false);
  });

  it("never retrieves another group's sources", async () => {
    const a = await signUp(app, "GroupA");
    const b = await signUp(app, "GroupB");
    await createNotebookWithSources(a.agent);
    const nbB = (await b.agent.post("/api/v1/notebooks").send({ title: "Punya B" })).body.data.id;
    const r = await b.agent.post(`/api/v1/notebooks/${nbB}/ask`).send({ question: "Apa keunggulan topologi bintang ketika satu kabel rusak?" });
    expect(r.body.data.grounded).toBe(false);
  });

  it("stores questions and lists them with who asked", async () => {
    const u = await signUp(app, "Lister");
    const id = await createNotebookWithSources(u.agent);
    await u.agent.post(`/api/v1/notebooks/${id}/ask`).send({ question: "Apa fungsi lapisan transport pada model OSI?" });
    const list = (await u.agent.get(`/api/v1/notebooks/${id}/questions`)).body.data;
    expect(list).toHaveLength(1);
    expect(list[0].askedByName).toBe("Lister");
  });

  it("validates input", async () => {
    const u = await signUp(app, "Validator");
    const id = await createNotebookWithSources(u.agent);
    expect((await u.agent.post(`/api/v1/notebooks/${id}/ask`).send({ question: "?" })).status).toBe(400);
    expect((await u.agent.post(`/api/v1/notebooks/${id}/ask`).send({})).status).toBe(400);
  });

  it("drops citations that do not point at a retrieved passage and keeps only real quotes", () => {
    const chunks: Retrieved[] = [{ id: "c1", sourceId: "s1", sourceTitle: "Buku", page: 3, content: "TCP bersifat andal dan menjamin pengiriman.", distance: 0.2 }];
    const c = validateCitations([{ n: 1, quote: "tcp bersifat ANDAL" }, { n: 1, quote: "duplikat" }, { n: 9, quote: "hantu" }, { n: 0, quote: "nol" }], chunks);
    expect(c).toHaveLength(1);
    expect(c[0]).toMatchObject({ sourceId: "s1", page: 3, quote: "tcp bersifat ANDAL" });
    const fabricated = validateCitations([{ n: 1, quote: "kutipan karangan model" }], chunks);
    expect(fabricated[0]!.quote).toBe("TCP bersifat andal dan menjamin pengiriman.");
  });
});

describe("F-10 explanation steps with emotion", () => {
  it("returns steps with an emotion each, plus citations", async () => {
    const u = await signUp(app, "Explainer");
    const id = await createNotebookWithSources(u.agent);
    const r = await u.agent.post(`/api/v1/notebooks/${id}/explain`).send({ question: "Jelaskan topologi bintang dan kerusakan satu kabel" });
    expect(r.body.data.grounded).toBe(true);
    expect(r.body.data.steps.length).toBeGreaterThan(1);
    for (const s of r.body.data.steps) {
      expect(s.text.length).toBeGreaterThan(0);
      expect(["neutral", "curious", "happy", "thinking", "encouraging", "concerned"]).toContain(s.emotion);
    }
    expect(r.body.data.citations.length).toBeGreaterThan(0);
  });

  it("falls back to a single concerned step when nothing is found", async () => {
    const u = await signUp(app, "Explainer");
    const id = await createNotebookWithSources(u.agent);
    const r = await u.agent.post(`/api/v1/notebooks/${id}/explain`).send({ question: "Jelaskan resep rendang tradisional Minang" });
    expect(r.body.data.grounded).toBe(false);
    expect(r.body.data.steps).toEqual([{ text: NOT_FOUND_TEXT, emotion: "concerned" }]);
  });
});

describe("source helpers", () => {
  it("chunks pages on paragraph boundaries and keeps page numbers", () => {
    const long = Array.from({ length: 30 }, (_, i) => `Kalimat nomor ${i} menjelaskan konsep penting dalam jaringan komputer.`).join(" ");
    const chunks = chunkPages([{ page: 1, text: long }, { page: 2, text: "Halaman kedua cukup panjang untuk menjadi satu chunk sendiri." }]);
    expect(chunks.length).toBeGreaterThan(2);
    expect(chunks.every((c) => c.content.length <= 1400)).toBe(true);
    expect(chunks.some((c) => c.page === 2)).toBe(true);
    expect(chunks.filter((c) => c.page === 1).length).toBeGreaterThan(1);
  });

  it("recognises private network ranges", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.1", "192.168.1.1", "169.254.169.254", "0.0.0.0", "100.64.0.1", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1"]) expect(isPrivateAddress(ip), ip).toBe(true);
    for (const ip of ["8.8.8.8", "1.1.1.1", "172.32.0.1", "2606:4700::1111"]) expect(isPrivateAddress(ip), ip).toBe(false);
  });

  it("rejects bad URLs before any request is made", async () => {
    for (const u of ["javascript:alert(1)", "http://user:pass@example.com/", "not a url", "http://127.0.0.1/"]) await expect(assertPublicUrl(u)).rejects.toThrow();
  });

  it("strips scripts and tags from web pages", () => {
    const { title, text } = htmlToText("<html><head><title>Belajar &amp; Maju</title></head><body><script>evil()</script><h1>Halo</h1><p>Isi materi</p></body></html>");
    expect(title).toBe("Belajar & Maju");
    expect(text).toContain("Isi materi");
    expect(text).not.toContain("evil");
  });
});
