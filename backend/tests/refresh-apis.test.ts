import crypto from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "../src/db/index.js";
import { hashToken } from "../src/middleware/auth.js";
import { closeApp, freshApp, signUp } from "./helpers.js";

let app: Awaited<ReturnType<typeof freshApp>>["app"];
let db: Db;
beforeAll(async () => { ({ app, db } = await freshApp()); }, 60_000);
afterAll(() => closeApp(db));

describe("account, notification, presence and publication APIs", () => {
  it("uses a one-time hashed reset token and revokes existing sessions", async () => {
    const user = await signUp(app, "Reset User");
    const rawToken = crypto.randomBytes(32).toString("base64url");
    await db.query("INSERT INTO password_reset_tokens(user_id, token_hash, expires_at) VALUES ($1,$2,now() + interval '30 minutes')", [user.id, hashToken(rawToken)]);
    const confirm = await user.agent.post("/api/v1/auth/password-reset/confirm").send({ token: rawToken, newPassword: "new-password-123" });
    expect(confirm.status).toBe(200);
    expect((await user.agent.get("/api/v1/auth/me")).status).toBe(401);
    const login = await request.agent(app).post("/api/v1/auth/login").send({ email: user.email, password: "new-password-123" });
    expect(login.status).toBe(200);
    expect((await request.agent(app).post("/api/v1/auth/password-reset/confirm").send({ token: rawToken, newPassword: "another-password-123" })).status).toBe(400);
    expect((await request(app).post("/api/v1/auth/password-reset/confirm").send({ token: "x".repeat(40), newPassword: "new-password-123" })).status).toBe(400);
  });

  it("creates account-scoped friend notifications and supports individual and bulk read", async () => {
    const alice = await signUp(app, "Alice");
    const bob = await signUp(app, "Bob");
    await alice.agent.post("/api/v1/me/friend-requests").send({ email: bob.email });
    const incoming = await bob.agent.get("/api/v1/me/friends");
    expect(incoming.body.data.requests).toMatchObject([{ name: "Alice", direction: "incoming" }]);
    const before = await bob.agent.get("/api/v1/me/notifications");
    expect(before.body.data).toMatchObject({ unreadCount: 1, items: [{ kind: "friend_request", actor: { id: alice.id, name: "Alice" }, href: "/friends" }] });
    const notificationId = before.body.data.items[0].id as string;
    expect((await bob.agent.patch(`/api/v1/me/notifications/${notificationId}`)).status).toBe(200);
    expect((await bob.agent.get("/api/v1/me/notifications")).body.data.unreadCount).toBe(0);
    const friendshipId = incoming.body.data.requests[0].id as string;
    await bob.agent.post(`/api/v1/me/friend-requests/${friendshipId}/accept`);
    const accepted = await alice.agent.get("/api/v1/me/notifications");
    expect(accepted.body.data.items).toMatchObject([{ kind: "friend_accepted", actor: { id: bob.id, name: "Bob" } }]);
    await alice.agent.post("/api/v1/me/notifications/read-all");
    expect((await alice.agent.get("/api/v1/me/notifications")).body.data.unreadCount).toBe(0);
    expect((await request(app).get("/api/v1/me/notifications")).status).toBe(401);
  });

  it("expires classroom presence, refreshes its heartbeat and hides it from nonmembers", async () => {
    const owner = await signUp(app, "Room Owner");
    const member = await signUp(app, "Room Member");
    const stranger = await signUp(app, "Visitor");
    const room = (await owner.agent.post("/api/v1/notebooks").send({ title: "Presence room" })).body.data.id as string;
    await owner.agent.post(`/api/v1/notebooks/${room}/members`).send({ email: member.email });
    const joined = await member.agent.put(`/api/v1/notebooks/${room}/classroom/presence`).send({});
    expect(joined.body.data).toMatchObject({ expiresAfterSec: 45, heartbeatEverySec: 15, members: [{ userId: member.id, name: "Room Member" }] });
    expect((await owner.agent.get(`/api/v1/notebooks/${room}/classroom/presence`)).body.data.members).toHaveLength(1);
    await db.query("UPDATE classroom_presence SET last_seen_at = now() - interval '1 minute' WHERE notebook_id = $1 AND user_id = $2", [room, member.id]);
    expect((await owner.agent.get(`/api/v1/notebooks/${room}/classroom/presence`)).body.data.members).toEqual([]);
    expect((await stranger.agent.put(`/api/v1/notebooks/${room}/classroom/presence`).send({})).status).toBe(404);
    await member.agent.put(`/api/v1/notebooks/${room}/classroom/presence`).send({});
    expect((await member.agent.delete(`/api/v1/notebooks/${room}/classroom/presence`)).body.data).toEqual({ present: false });
  });

  it("publishes versioned snapshots, enforces workspace access, and supports comments and replies", async () => {
    const author = await signUp(app, "Author");
    const member = await signUp(app, "Member");
    const stranger = await signUp(app, "Stranger");
    const workspace = (await author.agent.post("/api/v1/notebooks").send({ title: "Article room" })).body.data.id as string;
    await author.agent.post(`/api/v1/notebooks/${workspace}/members`).send({ email: member.email });
    const draft = await author.agent.post("/api/v1/me/drafts").send({ title: "Grounded article", summary: "First version", body: "A published snapshot from the saved writing draft." });
    const first = await author.agent.post("/api/v1/publications").send({ draftId: draft.body.data.id, visibility: "workspace", notebookId: workspace });
    expect(first.status, JSON.stringify(first.body)).toBe(201);
    expect((await stranger.agent.get(`/api/v1/publications/${first.body.data.id}`)).status).toBe(404);
    expect((await member.agent.get(`/api/v1/publications/${first.body.data.id}`)).body.data.article).toMatchObject({ title: "Grounded article", version: 1 });
    const comment = await member.agent.post(`/api/v1/publications/${first.body.data.id}/comments`).send({ body: "Helpful explanation" });
    const reply = await author.agent.post(`/api/v1/publications/${first.body.data.id}/comments`).send({ body: "Thanks for reading", parentId: comment.body.data.id });
    expect(reply.status).toBe(201);

    await author.agent.patch(`/api/v1/me/drafts/${draft.body.data.id}`).send({ title: "Edited draft", body: "The draft is updated but readers still see the prior published snapshot." });
    const unchanged = await member.agent.get(`/api/v1/publications/${first.body.data.id}`);
    expect(unchanged.body.data.article).toMatchObject({ title: "Grounded article", version: 1 });
    const second = await author.agent.patch(`/api/v1/publications/${first.body.data.id}`).send({ draftId: draft.body.data.id, visibility: "workspace", notebookId: workspace });
    expect(second.body.data).toMatchObject({ title: "Edited draft", version: 2 });
    expect(second.body.data.commentCount).toBe(2);
    expect((await author.agent.get("/api/v1/authors/not-a-uuid/publications")).status).toBe(400);
    expect((await author.agent.get(`/api/v1/authors/${author.id}/publications`)).body.data.items).toHaveLength(1);
    expect((await author.agent.delete(`/api/v1/publications/${first.body.data.id}`)).body.data).toEqual({ withdrawn: true });
    expect((await member.agent.get("/api/v1/publications")).body.data.items).toEqual([]);
  });
});
