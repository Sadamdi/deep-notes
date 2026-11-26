import crypto from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "../src/db/index.js";
import { closeApp, createNotebookWithSources, freshApp, signUp } from "./helpers.js";

let app: Awaited<ReturnType<typeof freshApp>>["app"];
let db: Db;
beforeAll(async () => { ({ app, db } = await freshApp()); }, 60_000);
afterAll(() => closeApp(db));

describe("server-backed frontend inputs", () => {
  it("keeps notes private to their owner and validates source anchors", async () => {
    const owner = await signUp(app, "Owner");
    const member = await signUp(app, "Member");
    const notebookId = (await owner.agent.post("/api/v1/notebooks").send({ title: "Notes room" })).body.data.id as string;
    const otherNotebookId = await createNotebookWithSources(member.agent);
    const foreignSourceId = (await member.agent.get(`/api/v1/notebooks/${otherNotebookId}/sources`)).body.data[0].id as string;
    await owner.agent.post(`/api/v1/notebooks/${notebookId}/members`).send({ email: member.email });

    const legacyNoteId = crypto.randomUUID();
    const note = await owner.agent.post(`/api/v1/notebooks/${notebookId}/notes`).send({ id: legacyNoteId, title: "Ringkasan", body: "Catatan server", sourceId: null, page: null });
    expect(note.status).toBe(201);
    expect((await owner.agent.post(`/api/v1/notebooks/${notebookId}/notes`).send({ id: legacyNoteId, title: "Must not replace", body: "Retry import" })).body.data.title).toBe("Ringkasan");
    expect((await owner.agent.get(`/api/v1/notebooks/${notebookId}/notes`)).body.data).toMatchObject([{ id: note.body.data.id, title: "Ringkasan" }]);
    expect((await member.agent.get(`/api/v1/notebooks/${notebookId}/notes`)).body.data).toEqual([]);
    expect((await member.agent.patch(`/api/v1/notebooks/${notebookId}/notes/${note.body.data.id}`).send({ title: "Read other" })).status).toBe(404);
    expect((await owner.agent.patch(`/api/v1/notebooks/${notebookId}/notes/${note.body.data.id}`).send({ body: "Sudah diperbarui" })).body.data.body).toBe("Sudah diperbarui");
    expect((await owner.agent.post(`/api/v1/notebooks/${notebookId}/notes`).send({ title: "Invalid source", body: "Tidak boleh", sourceId: foreignSourceId })).status).toBe(400);
    expect((await owner.agent.post(`/api/v1/notebooks/${notebookId}/notes`).send({ title: "Invalid page", body: "Tidak boleh", page: 3 })).status).toBe(400);
    expect((await owner.agent.delete(`/api/v1/notebooks/${notebookId}/notes/${note.body.data.id}`)).body.data).toEqual({ deleted: true });
    expect((await request(app).get(`/api/v1/notebooks/${notebookId}/notes`)).status).toBe(401);
  });

  it("shares discussion messages with members, pages history, and deduplicates imports", async () => {
    const owner = await signUp(app, "Owner");
    const member = await signUp(app, "Member");
    const stranger = await signUp(app, "Stranger");
    const notebookId = (await owner.agent.post("/api/v1/notebooks").send({ title: "Discussion room" })).body.data.id as string;
    await owner.agent.post(`/api/v1/notebooks/${notebookId}/members`).send({ email: member.email });
    const foreignNotebookId = await createNotebookWithSources(stranger.agent);
    const foreignSourceId = (await stranger.agent.get(`/api/v1/notebooks/${foreignNotebookId}/sources`)).body.data[0].id as string;

    const legacyId = crypto.randomUUID();
    const first = await member.agent.post(`/api/v1/notebooks/${notebookId}/discussion`).send({ id: legacyId, body: "Pesan lama" });
    expect(first.status).toBe(201);
    expect(first.body.data).toMatchObject({ authorId: member.id, authorName: "Member" });
    expect((await member.agent.post(`/api/v1/notebooks/${notebookId}/discussion`).send({ id: legacyId, body: "Teks ulang yang tidak menimpa" })).body.data.body).toBe("Pesan lama");
    await owner.agent.post(`/api/v1/notebooks/${notebookId}/discussion`).send({ body: "Pesan baru" });
    expect((await owner.agent.get(`/api/v1/notebooks/${notebookId}/discussion?limit=1`)).body.data).toMatchObject({ messages: [{ body: "Pesan baru" }], nextBefore: expect.any(String) });
    const firstPage = (await owner.agent.get(`/api/v1/notebooks/${notebookId}/discussion?limit=1`)).body.data;
    const older = (await owner.agent.get(`/api/v1/notebooks/${notebookId}/discussion?limit=1&before=${encodeURIComponent(firstPage.nextBefore)}`)).body.data;
    expect(older.messages[0].body).toBe("Pesan lama");
    expect((await stranger.agent.get(`/api/v1/notebooks/${notebookId}/discussion`)).status).toBe(404);
    expect((await owner.agent.get(`/api/v1/notebooks/${notebookId}/discussion?before=not-a-cursor`)).status).toBe(400);
    expect((await member.agent.post(`/api/v1/notebooks/${notebookId}/discussion`).send({ body: "Sumber asing", sourceId: foreignSourceId })).status).toBe(400);
    expect((await owner.agent.post(`/api/v1/notebooks/${notebookId}/discussion`).send({ body: "x".repeat(2001) })).status).toBe(400);
  });

  it("scopes writer drafts to the signed-in account and returns server updates", async () => {
    const a = await signUp(app, "Writer A");
    const b = await signUp(app, "Writer B");
    const legacyDraftId = crypto.randomUUID();
    const draft = await a.agent.post("/api/v1/me/drafts").send({ id: legacyDraftId, title: "Draft", summary: "Short", body: "First draft" });
    expect(draft.status).toBe(201);
    expect((await a.agent.post("/api/v1/me/drafts").send({ id: legacyDraftId, title: "Must not replace" })).body.data.title).toBe("Draft");
    expect((await a.agent.get("/api/v1/me/drafts")).body.data).toHaveLength(1);
    expect((await b.agent.get("/api/v1/me/drafts")).body.data).toEqual([]);
    expect((await b.agent.patch(`/api/v1/me/drafts/${draft.body.data.id}`).send({ title: "No access" })).status).toBe(404);
    expect((await a.agent.patch(`/api/v1/me/drafts/${draft.body.data.id}`).send({ body: "Saved by server" })).body.data.body).toBe("Saved by server");
    expect((await a.agent.post("/api/v1/me/drafts").send({ title: "" })).status).toBe(400);
    expect((await a.agent.delete(`/api/v1/me/drafts/${draft.body.data.id}`)).body.data).toEqual({ deleted: true });
  });

  it("saves feed posts per account and includes save state in server responses", async () => {
    const author = await signUp(app, "Author");
    const reader = await signUp(app, "Reader");
    const post = (await author.agent.post("/api/v1/posts").send({ body: "A useful note" })).body.data;
    expect(post.savedByMe).toBe(false);
    expect((await reader.agent.get("/api/v1/saved-posts")).body.data.posts).toEqual([]);
    expect((await reader.agent.post(`/api/v1/posts/${post.id}/save`)).body.data).toEqual({ saved: true });
    await reader.agent.post(`/api/v1/posts/${post.id}/save`);
    const saved = await reader.agent.get("/api/v1/saved-posts");
    expect(saved.body.data.posts).toMatchObject([{ id: post.id, savedByMe: true }]);
    expect((await reader.agent.get("/api/v1/feed")).body.data.posts.find((item: { id: string }) => item.id === post.id).savedByMe).toBe(true);
    expect((await author.agent.get("/api/v1/saved-posts")).body.data.posts).toEqual([]);
    expect((await reader.agent.delete(`/api/v1/posts/${post.id}/save`)).body.data).toEqual({ saved: false });
    expect((await reader.agent.get("/api/v1/saved-posts")).body.data.posts).toEqual([]);
    expect((await reader.agent.delete("/api/v1/posts/not-a-uuid/save")).status).toBe(400);
  });
});
