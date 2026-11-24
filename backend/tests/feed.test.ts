import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "../src/db/index.js";
import { closeApp, createNotebookWithSources, freshApp, signUp } from "./helpers.js";

let app: Awaited<ReturnType<typeof freshApp>>["app"];
let db: Db;
beforeAll(async () => {
  ({ app, db } = await freshApp());
}, 60_000);
afterAll(() => closeApp(db));

describe("social feed", () => {
  it("posts, lists newest first, likes and unlikes idempotently, and comments", async () => {
    const a = await signUp(app, "Alya");
    const b = await signUp(app, "Budi");
    const p1 = (await a.agent.post("/api/v1/posts").send({ body: "Catatan UTS sudah lengkap!" })).body.data;
    const p2 = (await a.agent.post("/api/v1/posts").send({ body: "Besok kuis jaringan." })).body.data;
    const feed = (await b.agent.get("/api/v1/feed")).body.data;
    expect(feed.posts.map((p: { id: string }) => p.id)).toEqual([p2.id, p1.id]);
    expect(feed.posts[0]).toMatchObject({ authorName: "Alya", likes: 0, likedByMe: false, comments: 0 });
    expect((await b.agent.post(`/api/v1/posts/${p1.id}/like`)).body.data).toEqual({ liked: true, likes: 1 });
    expect((await b.agent.post(`/api/v1/posts/${p1.id}/like`)).body.data.likes).toBe(1); // no double like
    expect((await b.agent.get(`/api/v1/posts/${p1.id}`)).body.data).toMatchObject({ likes: 1, likedByMe: true });
    expect((await b.agent.delete(`/api/v1/posts/${p1.id}/like`)).body.data).toEqual({ liked: false, likes: 0 });
    const c = await b.agent.post(`/api/v1/posts/${p1.id}/comments`).send({ body: "Mantap, makasih!" });
    expect(c.status).toBe(201);
    const list = (await a.agent.get(`/api/v1/posts/${p1.id}/comments`)).body.data;
    expect(list).toHaveLength(1);
    expect(list[0].authorName).toBe("Budi");
    expect((await b.agent.get("/api/v1/feed")).body.data.posts.find((p: { id: string }) => p.id === p1.id).comments).toBe(1);
  });

  it("validates input and enforces who may delete", async () => {
    const a = await signUp(app, "Alya");
    const b = await signUp(app, "Budi");
    expect((await a.agent.post("/api/v1/posts").send({ body: "" })).status).toBe(400);
    expect((await a.agent.post("/api/v1/posts").send({ body: "x".repeat(501) })).status).toBe(400);
    const p = (await a.agent.post("/api/v1/posts").send({ body: "Halo" })).body.data;
    expect((await b.agent.delete(`/api/v1/posts/${p.id}`)).status).toBe(403);
    const cm = (await b.agent.post(`/api/v1/posts/${p.id}/comments`).send({ body: "komentar" })).body.data.id;
    expect((await a.agent.delete(`/api/v1/posts/${p.id}/comments/${cm}`)).status).toBe(200); // the post author may remove it
    expect((await a.agent.delete(`/api/v1/posts/${p.id}`)).status).toBe(200);
    expect((await b.agent.get(`/api/v1/posts/${p.id}`)).status).toBe(404);
    expect((await b.agent.get("/api/v1/posts/not-a-uuid")).status).toBe(404);
    expect((await request(app).get("/api/v1/feed")).status).toBe(401);
  });

  it("attaches only public workspaces and only results the author finished; private ones never leak", async () => {
    const a = await signUp(app, "Alya");
    const b = await signUp(app, "Budi");
    const priv = (await a.agent.post("/api/v1/notebooks").send({ title: "Rahasia kelompok" })).body.data.id;
    const pub = (await a.agent.post("/api/v1/notebooks").send({ title: "Algoritma Terbuka", visibility: "public", description: "Sorting dan searching" })).body.data.id;
    expect((await a.agent.post("/api/v1/posts").send({ body: "ayo gabung", attach: { type: "notebook", notebookId: priv } })).status).toBe(400);
    const post = (await a.agent.post("/api/v1/posts").send({ body: "ayo gabung", attach: { type: "notebook", notebookId: pub } })).body.data;
    expect(post.card).toMatchObject({ type: "notebook", title: "Algoritma Terbuka", memberCount: 1 });
    // a notebook that turns private later is shown as unavailable, without its details
    await a.agent.patch(`/api/v1/notebooks/${pub}`).send({ visibility: "private" });
    const after = (await b.agent.get(`/api/v1/posts/${post.id}`)).body.data;
    expect(after.card).toEqual({ type: "notebook", unavailable: true });
    expect(JSON.stringify(after)).not.toContain("Algoritma Terbuka");
    expect((await a.agent.post("/api/v1/posts").send({ body: "hasilku", attach: { type: "result", sessionId: "00000000-0000-0000-0000-000000000001" } })).status).toBe(400);
  });

  it("shares a finished session result as a card with score and points", async () => {
    const a = await signUp(app, "Alya");
    const nb = await createNotebookWithSources(a.agent);
    const s = (await a.agent.post(`/api/v1/notebooks/${nb}/sessions`).send({ gameTypes: ["tf"], rounds: 3 })).body.data;
    const plan = (await db.query<{ plan: Array<{ items: Array<{ answer: boolean }> }> }>("SELECT plan FROM game_sessions WHERE id = $1", [s.id]))[0]!.plan;
    await a.agent.post(`/api/v1/notebooks/${nb}/sessions/${s.id}/rounds/0/answer`).send({ answers: plan[0]!.items.map((i) => i.answer) });
    expect((await a.agent.post("/api/v1/posts").send({ body: "belum selesai", attach: { type: "result", sessionId: s.id } })).status).toBe(400);
    await a.agent.post(`/api/v1/notebooks/${nb}/sessions/${s.id}/finish`);
    const post = (await a.agent.post("/api/v1/posts").send({ body: "Skor sempurna!", attach: { type: "result", sessionId: s.id } })).body.data;
    expect(post.card).toMatchObject({ type: "result", mode: "solo", correct: plan[0]!.items.length, total: plan[0]!.items.length });
    expect(post.card.points).toBeGreaterThan(0);
  });

  it("follows people, filters the following feed, and shows a public profile without an email", async () => {
    const a = await signUp(app, "Alya");
    const b = await signUp(app, "Budi");
    const c = await signUp(app, "Citra");
    await a.agent.post("/api/v1/posts").send({ body: "dari Alya" });
    await c.agent.post("/api/v1/posts").send({ body: "dari Citra" });
    expect((await b.agent.post(`/api/v1/users/${a.id}/follow`)).body.data.following).toBe(true);
    expect((await b.agent.post(`/api/v1/users/${b.id}/follow`)).status).toBe(400); // not yourself
    const following = (await b.agent.get("/api/v1/feed?scope=following")).body.data.posts;
    expect(following.map((p: { body: string }) => p.body)).toEqual(["dari Alya"]);
    expect((await b.agent.get("/api/v1/feed")).body.data.posts.filter((p: { authorId: string }) => [a.id, c.id].includes(p.authorId))).toHaveLength(2);
    const profile = (await b.agent.get(`/api/v1/users/${a.id}`)).body.data;
    expect(profile).toMatchObject({ name: "Alya", followers: 1, following: 0, posts: 1, followedByMe: true });
    expect(JSON.stringify(profile)).not.toContain("@");
    await b.agent.delete(`/api/v1/users/${a.id}/follow`);
    expect((await b.agent.get("/api/v1/feed?scope=following")).body.data.posts).toEqual([]);
  });

  it("pages through the feed with a cursor", async () => {
    const a = await signUp(app, "Pager");
    for (let i = 0; i < 5; i++) await a.agent.post("/api/v1/posts").send({ body: `posting ${i}` });
    const first = (await a.agent.get("/api/v1/feed?limit=2&scope=following")).body.data;
    expect(first.posts).toHaveLength(2);
    expect(first.nextBefore).toBeTruthy();
    const second = (await a.agent.get(`/api/v1/feed?limit=2&scope=following&before=${encodeURIComponent(first.nextBefore)}`)).body.data;
    expect(second.posts.map((p: { body: string }) => p.body)).toEqual(["posting 2", "posting 1"]);
  });
});
