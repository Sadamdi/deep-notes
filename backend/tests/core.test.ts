import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "../src/db/index.js";
import { closeApp, createNotebookWithSources, freshApp, makeDocx, makePdf, makePptx, signUp, STAR_TEXT } from "./helpers.js";
import { waitForIngestion } from "../src/modules/sources/ingest.js";

let app: Awaited<ReturnType<typeof freshApp>>["app"];
let db: Db;
beforeAll(async () => {
  ({ app, db } = await freshApp());
}, 60_000);
afterAll(() => closeApp(db));

describe("F-01 accounts and sessions", () => {
  it("registers, keeps the session cookie, reads /me and logs out", async () => {
    const a = request.agent(app);
    const r = await a.post("/api/v1/auth/register").send({ email: "Ann@Example.com", name: "Ann", password: "password-123" });
    expect(r.status).toBe(201);
    expect(r.body.data.email).toBe("ann@example.com");
    expect(r.headers["set-cookie"]?.[0]).toMatch(/dn_session=.*HttpOnly/i);
    expect(JSON.stringify(r.body)).not.toMatch(/password|hash/i);
    expect((await a.get("/api/v1/auth/me")).body.data.name).toBe("Ann");
    await a.post("/api/v1/auth/logout");
    expect((await a.get("/api/v1/auth/me")).status).toBe(401);
  });

  it("rejects duplicate emails, short passwords and wrong credentials with the same message", async () => {
    await request(app).post("/api/v1/auth/register").send({ email: "dup@example.com", name: "Dup", password: "password-123" });
    expect((await request(app).post("/api/v1/auth/register").send({ email: "dup@example.com", name: "Dup", password: "password-123" })).status).toBe(409);
    expect((await request(app).post("/api/v1/auth/register").send({ email: "x@example.com", name: "X", password: "short" })).status).toBe(400);
    const wrong = await request(app).post("/api/v1/auth/login").send({ email: "dup@example.com", password: "wrong-password" });
    const unknown = await request(app).post("/api/v1/auth/login").send({ email: "nobody@example.com", password: "wrong-password" });
    expect(wrong.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
  });

  it("stores only a hashed session token and a salted password hash", async () => {
    const rows = await db.query<{ password_hash: string }>("SELECT password_hash FROM users WHERE email = 'dup@example.com'");
    expect(rows[0]!.password_hash).toMatch(/^scrypt\$/);
    expect(rows[0]!.password_hash).not.toContain("password-123");
    const s = await db.query<{ token_hash: string }>("SELECT token_hash FROM sessions LIMIT 1");
    expect(s[0]!.token_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("requires login for protected routes and handles malformed JSON", async () => {
    expect((await request(app).get("/api/v1/notebooks")).status).toBe(401);
    const bad = await request(app).post("/api/v1/auth/login").set("content-type", "application/json").send("{oops");
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe("VALIDATION");
  });
});

describe("F-02 notebooks, members, invites and isolation", () => {
  it("creates a notebook with the creator as owner and lists only own notebooks", async () => {
    const a = await signUp(app, "Alice");
    const b = await signUp(app, "Bobby");
    const nb = await a.agent.post("/api/v1/notebooks").send({ title: "Jaringan" });
    expect(nb.status).toBe(201);
    expect(nb.body.data.role).toBe("owner");
    expect((await a.agent.get("/api/v1/notebooks")).body.data).toHaveLength(1);
    expect((await b.agent.get("/api/v1/notebooks")).body.data).toHaveLength(0);
  });

  it("hides other groups' notebooks completely (404, never 403) on every nested route", async () => {
    const a = await signUp(app, "Owner");
    const intruder = await signUp(app, "Intruder");
    const id = await createNotebookWithSources(a.agent);
    const paths: Array<[string, string]> = [
      ["get", ""], ["get", "/members"], ["get", "/sources"], ["get", "/questions"], ["get", "/quizzes"], ["get", "/contributions"],
      ["get", "/progress"], ["get", "/gaps"], ["get", "/assignments"], ["post", "/ask"], ["post", "/explain"], ["post", "/quizzes"], ["post", "/invites"],
    ];
    for (const [method, p] of paths) {
      const res = await (intruder.agent as never as Record<string, (u: string) => request.Test>)[method]!(`/api/v1/notebooks/${id}${p}`);
      expect(res.status, `${method} ${p}`).toBe(404);
    }
    expect((await intruder.agent.patch(`/api/v1/notebooks/${id}`).send({ title: "hijack" })).status).toBe(404);
    expect((await intruder.agent.delete(`/api/v1/notebooks/${id}`)).status).toBe(404);
    expect((await intruder.agent.get("/api/v1/notebooks/not-a-uuid")).status).toBe(404);
  });

  it("invite link adds a member with the invited role; viewers cannot write", async () => {
    const owner = await signUp(app, "Owner");
    const guest = await signUp(app, "Guest");
    const nb = (await owner.agent.post("/api/v1/notebooks").send({ title: "Grup Belajar" })).body.data.id;
    const inv = await owner.agent.post(`/api/v1/notebooks/${nb}/invites`).send({ role: "viewer" });
    expect(inv.status).toBe(201);
    expect((await guest.agent.post(`/api/v1/invites/${inv.body.data.token}/accept`)).body.data.role).toBe("viewer");
    expect((await guest.agent.get(`/api/v1/notebooks/${nb}`)).status).toBe(200);
    const up = await guest.agent.post(`/api/v1/notebooks/${nb}/sources/text`).send({ title: "x", text: STAR_TEXT });
    expect(up.status).toBe(403);
    expect((await guest.agent.post(`/api/v1/notebooks/${nb}/invites`).send({})).status).toBe(403);
    expect((await guest.agent.post("/api/v1/invites/bogus/accept")).status).toBe(404);
  });

  it("owner adds a member by email, changes the role, and cannot demote or remove the owner", async () => {
    const owner = await signUp(app, "Owner");
    const m = await signUp(app, "Member");
    const nb = (await owner.agent.post("/api/v1/notebooks").send({ title: "Grup Dua" })).body.data.id;
    expect((await owner.agent.post(`/api/v1/notebooks/${nb}/members`).send({ email: m.email, role: "editor" })).status).toBe(201);
    expect((await owner.agent.post(`/api/v1/notebooks/${nb}/members`).send({ email: m.email })).status).toBe(409);
    expect((await owner.agent.patch(`/api/v1/notebooks/${nb}/members/${m.id}`).send({ role: "viewer" })).status).toBe(200);
    expect((await owner.agent.patch(`/api/v1/notebooks/${nb}/members/${owner.id}`).send({ role: "viewer" })).status).toBe(403);
    expect((await m.agent.delete(`/api/v1/notebooks/${nb}/members/${owner.id}`)).status).toBe(403);
    expect((await m.agent.delete(`/api/v1/notebooks/${nb}/members/${m.id}`)).status).toBe(200);
    expect((await m.agent.get(`/api/v1/notebooks/${nb}`)).status).toBe(404);
  });
});

describe("F-03 sources and ingestion", () => {
  it("ingests text, tracks status, and stores page-less chunks with embeddings", async () => {
    const u = await signUp(app);
    const id = await createNotebookWithSources(u.agent, [["Bintang", STAR_TEXT]]);
    const list = (await u.agent.get(`/api/v1/notebooks/${id}/sources`)).body.data;
    expect(list[0]).toMatchObject({ title: "Bintang", status: "ready", kind: "text" });
    expect(list[0].chunkCount).toBeGreaterThan(0);
  });

  it("ingests a PDF page by page so citations can name the page", async () => {
    const u = await signUp(app);
    const nb = (await u.agent.post("/api/v1/notebooks").send({ title: "PDF Test" })).body.data.id;
    const pdf = makePdf(["Halaman satu membahas topologi bintang pada jaringan komputer kantor.", "Halaman dua membahas protokol transport TCP dan UDP secara rinci."]);
    const r = await u.agent.post(`/api/v1/notebooks/${nb}/sources/file`).attach("file", pdf, "materi.pdf");
    expect(r.status).toBe(202);
    await waitForIngestion();
    const src = (await u.agent.get(`/api/v1/notebooks/${nb}/sources`)).body.data[0];
    expect(src.status).toBe("ready");
    expect(src.pageCount).toBe(2);
    const page2 = await u.agent.get(`/api/v1/notebooks/${nb}/sources/${src.id}/pages/2`);
    expect(page2.body.data.text).toMatch(/TCP/);
  });

  it("reads DOCX and PPTX, and rejects fake or unsupported files", async () => {
    const u = await signUp(app);
    const nb = (await u.agent.post("/api/v1/notebooks").send({ title: "Format Test" })).body.data.id;
    const docx = await makeDocx(["Paragraf pertama tentang enkapsulasi data pada model OSI.", "Paragraf kedua tentang lapisan jaringan."]);
    const pptx = await makePptx(["Slide satu tentang DNS dan resolver", "Slide dua tentang cache dan TTL"]);
    expect((await u.agent.post(`/api/v1/notebooks/${nb}/sources/file`).attach("file", docx, "a.docx")).status).toBe(202);
    expect((await u.agent.post(`/api/v1/notebooks/${nb}/sources/file`).attach("file", pptx, "b.pptx")).status).toBe(202);
    await waitForIngestion();
    const list = (await u.agent.get(`/api/v1/notebooks/${nb}/sources`)).body.data;
    expect(list.every((s: { status: string }) => s.status === "ready")).toBe(true);
    expect(list.find((s: { kind: string }) => s.kind === "pptx").pageCount).toBe(2);
    expect((await u.agent.post(`/api/v1/notebooks/${nb}/sources/file`).attach("file", Buffer.from("not a pdf"), "fake.pdf")).status).toBe(400);
    expect((await u.agent.post(`/api/v1/notebooks/${nb}/sources/file`).attach("file", Buffer.from("MZ binary"), "virus.exe")).status).toBe(400);
    expect((await u.agent.post(`/api/v1/notebooks/${nb}/sources/file`)).status).toBe(400);
  });

  it("blocks links to private addresses (SSRF)", async () => {
    const u = await signUp(app);
    const nb = (await u.agent.post("/api/v1/notebooks").send({ title: "SSRF Test" })).body.data.id;
    for (const url of ["http://127.0.0.1:4000/api/v1/health", "http://localhost/", "http://169.254.169.254/latest/meta-data", "http://10.0.0.5/", "http://[::1]/", "file:///etc/passwd", "ftp://example.com/x"]) {
      const r = await u.agent.post(`/api/v1/notebooks/${nb}/sources/link`).send({ url });
      expect(r.status, url).toBe(400);
    }
  });

  it("only the uploader or owner can delete a source", async () => {
    const owner = await signUp(app);
    const editor = await signUp(app);
    const nb = (await owner.agent.post("/api/v1/notebooks").send({ title: "Hapus Test" })).body.data.id;
    await owner.agent.post(`/api/v1/notebooks/${nb}/members`).send({ email: editor.email, role: "editor" });
    const s = await owner.agent.post(`/api/v1/notebooks/${nb}/sources/text`).send({ title: "milik owner", text: STAR_TEXT });
    await waitForIngestion();
    expect((await editor.agent.delete(`/api/v1/notebooks/${nb}/sources/${s.body.data.id}`)).status).toBe(403);
    expect((await owner.agent.delete(`/api/v1/notebooks/${nb}/sources/${s.body.data.id}`)).status).toBe(200);
  });
});
