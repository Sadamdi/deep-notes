import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "../src/db/index.js";
import { closeApp, createNotebookWithSources, freshApp, signUp } from "./helpers.js";

let app: Awaited<ReturnType<typeof freshApp>>["app"];
let db: Db;
beforeAll(async () => {
  ({ app, db } = await freshApp());
}, 60_000);
afterAll(() => closeApp(db));

async function group() {
  const owner = await signUp(app, "Owner");
  const member = await signUp(app, "Member");
  const id = await createNotebookWithSources(owner.agent);
  await owner.agent.post(`/api/v1/notebooks/${id}/members`).send({ email: member.email, role: "editor" });
  return { owner, member, id };
}

type A = Awaited<ReturnType<typeof signUp>>["agent"];
async function takeQuiz(agent: A, nb: string, quizId: string, correctCount: number) {
  const quiz = (await agent.get(`/api/v1/notebooks/${nb}/quizzes/${quizId}`)).body.data;
  // answers are hidden from the taker, so use the stored items to know the right ones
  const stored = (await db.query<{ items: Array<{ answerIndex: number }> }>("SELECT items FROM quizzes WHERE id = $1", [quizId]))[0]!.items;
  const answers = stored.map((it, i) => (i < correctCount ? it.answerIndex : (it.answerIndex + 1) % 4));
  expect(quiz.questions).toHaveLength(stored.length);
  return agent.post(`/api/v1/notebooks/${nb}/quizzes/${quizId}/attempts`).send({ answers, durationMs: 1000 * (correctCount + 1) });
}

describe("F-05 quizzes", () => {
  it("generates a quiz without leaking answers, grades attempts, and explains with a source page", async () => {
    const { owner, id } = await group();
    const created = await owner.agent.post(`/api/v1/notebooks/${id}/quizzes`).send({ count: 3 });
    expect(created.status).toBe(201);
    const quiz = (await owner.agent.get(`/api/v1/notebooks/${id}/quizzes/${created.body.data.id}`)).body.data;
    expect(JSON.stringify(quiz)).not.toMatch(/answerIndex|explanation/);
    expect(quiz.questions[0].options).toHaveLength(4);
    const res = await takeQuiz(owner.agent, id, created.body.data.id, 2);
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ score: 2, total: 3 });
    expect(res.body.data.results[0]).toHaveProperty("explanation");
    expect(res.body.data.results[0]).toHaveProperty("sourceTitle");
  });

  it("needs enough sources and validates the answer count", async () => {
    const u = await signUp(app, "Lonely");
    const nb = (await u.agent.post("/api/v1/notebooks").send({ title: "Kosong" })).body.data.id;
    expect((await u.agent.post(`/api/v1/notebooks/${nb}/quizzes`).send({ count: 5 })).status).toBe(409);
    const { owner, id } = await group();
    const q = (await owner.agent.post(`/api/v1/notebooks/${id}/quizzes`).send({ count: 3 })).body.data.id;
    expect((await owner.agent.post(`/api/v1/notebooks/${id}/quizzes/${q}/attempts`).send({ answers: [0] })).status).toBe(400);
    expect((await owner.agent.post(`/api/v1/notebooks/${id}/quizzes/${q}/attempts`).send({ answers: [0, 1, 9] })).status).toBe(400);
  });
});

describe("F-15 weekly group quiz with scoreboard", () => {
  it("lets each member take it once, ranks by score then speed, and lists who has not taken it", async () => {
    const { owner, member, id } = await group();
    const due = new Date(Date.now() + 7 * 86_400_000).toISOString();
    const q = (await owner.agent.post(`/api/v1/notebooks/${id}/quizzes`).send({ kind: "weekly", count: 3, dueAt: due })).body.data.id;
    expect((await takeQuiz(member.agent, id, q, 2)).status).toBe(201);
    expect((await takeQuiz(member.agent, id, q, 3)).status).toBe(409);
    let board = (await owner.agent.get(`/api/v1/notebooks/${id}/quizzes/${q}/scoreboard`)).body.data;
    expect(board.ranking).toHaveLength(1);
    expect(board.notYetTaken.map((m: { name: string }) => m.name)).toEqual(["Owner"]);
    await takeQuiz(owner.agent, id, q, 3);
    board = (await owner.agent.get(`/api/v1/notebooks/${id}/quizzes/${q}/scoreboard`)).body.data;
    expect(board.ranking.map((r: { name: string }) => r.name)).toEqual(["Owner", "Member"]);
    expect(board.ranking[0].rank).toBe(1);
    expect(board.notYetTaken).toEqual([]);
  });

  it("requires a due date and closes after it", async () => {
    const { owner, id } = await group();
    expect((await owner.agent.post(`/api/v1/notebooks/${id}/quizzes`).send({ kind: "weekly", count: 3 })).status).toBe(400);
    const q = (await owner.agent.post(`/api/v1/notebooks/${id}/quizzes`).send({ kind: "weekly", count: 3, dueAt: new Date(Date.now() + 86_400_000).toISOString() })).body.data.id;
    await db.query("UPDATE quizzes SET due_at = now() - interval '1 hour' WHERE id = $1", [q]);
    expect((await takeQuiz(owner.agent, id, q, 3)).status).toBe(409);
  });
});

describe("F-09 exam mode", () => {
  it("needs a start, enforces the limit on the server, and records server-measured time", async () => {
    const { owner, id } = await group();
    expect((await owner.agent.post(`/api/v1/notebooks/${id}/quizzes`).send({ kind: "exam", count: 3 })).status).toBe(400);
    const q = (await owner.agent.post(`/api/v1/notebooks/${id}/quizzes`).send({ kind: "exam", count: 3, timeLimitSec: 60, perQuestionSec: 20 })).body.data.id;
    expect((await takeQuiz(owner.agent, id, q, 3)).status).toBe(409); // not started
    await owner.agent.post(`/api/v1/notebooks/${id}/quizzes/${q}/start`);
    const ok = await takeQuiz(owner.agent, id, q, 3);
    expect(ok.status).toBe(201);
    expect(ok.body.data.durationMs).toBeLessThan(5000); // measured by the server, not the claimed 4000 ms
    await owner.agent.post(`/api/v1/notebooks/${id}/quizzes/${q}/start`);
    await db.query("UPDATE quiz_starts SET started_at = now() - interval '5 minutes' WHERE quiz_id = $1", [q]);
    const late = await takeQuiz(owner.agent, id, q, 3);
    expect(late.status).toBe(409);
    expect(late.body.error.message).toMatch(/Time is up/);
  });
});

describe("F-06 contributions, F-08 progress, F-16 gap map", () => {
  it("counts who added sources, asked questions and took quizzes", async () => {
    const { owner, member, id } = await group();
    await member.agent.post(`/api/v1/notebooks/${id}/sources/text`).send({ title: "Tambahan", text: "Tambahan materi tentang protokol routing dan switching untuk jaringan kampus yang luas." });
    await member.agent.post(`/api/v1/notebooks/${id}/ask`).send({ question: "Apa fungsi lapisan transport pada model OSI?" });
    const q = (await owner.agent.post(`/api/v1/notebooks/${id}/quizzes`).send({ count: 3 })).body.data.id;
    await takeQuiz(owner.agent, id, q, 3);
    const data = (await owner.agent.get(`/api/v1/notebooks/${id}/contributions`)).body.data;
    const byName = Object.fromEntries(data.members.map((m: { name: string }) => [m.name, m]));
    expect(byName.Owner).toMatchObject({ sourcesAdded: 3, quizzesTaken: 1, questionsAsked: 0 });
    expect(byName.Member).toMatchObject({ sourcesAdded: 1, questionsAsked: 1, quizzesTaken: 0 });
    expect(data.recent.length).toBeGreaterThan(4);
  });

  it("compares quiz results across members and maps missed topics to source pages", async () => {
    const { owner, member, id } = await group();
    const q = (await owner.agent.post(`/api/v1/notebooks/${id}/quizzes`).send({ count: 3 })).body.data.id;
    await takeQuiz(owner.agent, id, q, 3);
    await takeQuiz(member.agent, id, q, 1);
    const p = (await owner.agent.get(`/api/v1/notebooks/${id}/progress`)).body.data;
    const byName = Object.fromEntries(p.members.map((m: { name: string }) => [m.name, m]));
    expect(byName.Owner.averagePercent).toBe(100);
    expect(byName.Member.averagePercent).toBe(33);
    expect(p.group.attempts).toBe(2);
    const gaps = (await owner.agent.get(`/api/v1/notebooks/${id}/gaps`)).body.data.gaps;
    expect(gaps.length).toBeGreaterThan(0);
    expect(gaps[0]).toMatchObject({ missed: expect.any(Number), membersMissed: 1 });
    expect(gaps[0].reviewPages[0]).toHaveProperty("sourceTitle");
    expect(gaps[0].missRatePercent).toBeGreaterThan(0);
  });

  it("shows no gaps before anyone took a quiz", async () => {
    const { owner, id } = await group();
    expect((await owner.agent.get(`/api/v1/notebooks/${id}/gaps`)).body.data.gaps).toEqual([]);
  });
});

describe("F-17 study assignments", () => {
  it("owner assigns, assignee updates status, and per-member progress is visible to the group", async () => {
    const { owner, member, id } = await group();
    const src = (await owner.agent.get(`/api/v1/notebooks/${id}/sources`)).body.data[0].id;
    const a = await owner.agent.post(`/api/v1/notebooks/${id}/assignments`).send({ assigneeId: member.id, topic: "Bab 2: Model OSI", sourceId: src });
    expect(a.status).toBe(201);
    expect((await member.agent.patch(`/api/v1/notebooks/${id}/assignments/${a.body.data.id}`).send({ status: "done" })).status).toBe(200);
    const board = (await owner.agent.get(`/api/v1/notebooks/${id}/assignments`)).body.data;
    expect(board.items[0]).toMatchObject({ topic: "Bab 2: Model OSI", status: "done", assigneeName: "Member" });
    expect(board.perMember.find((m: { name: string }) => m.name === "Member")).toMatchObject({ total: 1, done: 1 });
    const contrib = (await owner.agent.get(`/api/v1/notebooks/${id}/contributions`)).body.data.members;
    expect(contrib.find((m: { name: string }) => m.name === "Member").assignmentsDone).toBe(1);
  });

  it("enforces who may assign and update, and rejects outsiders and foreign sources", async () => {
    const { owner, member, id } = await group();
    const other = await signUp(app, "Other");
    expect((await member.agent.post(`/api/v1/notebooks/${id}/assignments`).send({ assigneeId: owner.id, topic: "Coba" })).status).toBe(403);
    expect((await owner.agent.post(`/api/v1/notebooks/${id}/assignments`).send({ assigneeId: other.id, topic: "Orang luar" })).status).toBe(400);
    const otherNb = await createNotebookWithSources(other.agent);
    const foreign = (await other.agent.get(`/api/v1/notebooks/${otherNb}/sources`)).body.data[0].id;
    expect((await owner.agent.post(`/api/v1/notebooks/${id}/assignments`).send({ assigneeId: member.id, topic: "X sumber asing", sourceId: foreign })).status).toBe(400);
    const a = (await owner.agent.post(`/api/v1/notebooks/${id}/assignments`).send({ assigneeId: owner.id, topic: "Milik owner" })).body.data.id;
    expect((await member.agent.patch(`/api/v1/notebooks/${id}/assignments/${a}`).send({ status: "done" })).status).toBe(403);
  });
});

describe("F-11 public notebooks and join requests, F-14 study partners", () => {
  it("lists public notebooks, searches by text and category, and handles join requests", async () => {
    const owner = await signUp(app, "Owner");
    const guest = await signUp(app, "Guest");
    const pub = (await owner.agent.post("/api/v1/notebooks").send({ title: "Algoritma Dasar", category: "Informatika", visibility: "public", description: "Catatan sorting dan searching" })).body.data.id;
    await owner.agent.post("/api/v1/notebooks").send({ title: "Rahasia Pribadi", visibility: "private" });
    const list = (await guest.agent.get("/api/v1/public/notebooks")).body.data;
    expect(list.map((n: { title: string }) => n.title)).toContain("Algoritma Dasar");
    expect(list.map((n: { title: string }) => n.title)).not.toContain("Rahasia Pribadi");
    expect((await guest.agent.get("/api/v1/public/notebooks?q=sorting")).body.data).toHaveLength(1);
    expect((await guest.agent.get("/api/v1/public/notebooks?category=Kimia")).body.data).toHaveLength(0);
    expect((await guest.agent.get(`/api/v1/notebooks/${pub}`)).status).toBe(404); // public means discoverable, not readable
    expect((await guest.agent.post(`/api/v1/public/notebooks/${pub}/join-requests`).send({ message: "Boleh gabung?" })).status).toBe(201);
    const pending = (await owner.agent.get(`/api/v1/notebooks/${pub}/join-requests`)).body.data;
    expect(pending).toHaveLength(1);
    expect((await owner.agent.post(`/api/v1/notebooks/${pub}/join-requests/${guest.id}/approve`)).status).toBe(200);
    expect((await guest.agent.get(`/api/v1/notebooks/${pub}`)).body.data.role).toBe("viewer");
  });

  it("cannot request to join a private notebook", async () => {
    const owner = await signUp(app, "Owner");
    const guest = await signUp(app, "Guest");
    const priv = (await owner.agent.post("/api/v1/notebooks").send({ title: "Privat Saja" })).body.data.id;
    expect((await guest.agent.post(`/api/v1/public/notebooks/${priv}/join-requests`).send({})).status).toBe(404);
  });

  it("study partners are opt-in, same course only, and never expose email", async () => {
    const a = await signUp(app, "Partner A");
    const b = await signUp(app, "Partner B");
    const c = await signUp(app, "Partner C");
    await a.agent.patch("/api/v1/me/profile").send({ course: "Jaringan Komputer" });
    await b.agent.patch("/api/v1/me/profile").send({ course: "jaringan komputer", lookingForPartners: true });
    await c.agent.patch("/api/v1/me/profile").send({ course: "Kalkulus", lookingForPartners: true });
    const res = (await a.agent.get("/api/v1/me/partners")).body.data;
    expect(res.partners.map((p: { name: string }) => p.name)).toEqual(["Partner B"]);
    expect(JSON.stringify(res)).not.toContain("@");
  });
});
