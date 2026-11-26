import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "../src/db/index.js";
import { closeApp, createNotebookWithSources, freshApp, signUp } from "./helpers.js";

let app: Awaited<ReturnType<typeof freshApp>>["app"];
let db: Db;

beforeAll(async () => {
  ({ app, db } = await freshApp());
}, 60_000);
afterAll(() => closeApp(db));

describe("server-backed friend requests", () => {
  it("keeps email private, accepts a request, and removes an accepted friend", async () => {
    const requester = await signUp(app, "Requester");
    const recipient = await signUp(app, "Recipient");
    const outsider = await signUp(app, "Outsider");

    const sent = await requester.agent.post("/api/v1/me/friend-requests").send({ email: recipient.email.toUpperCase() });
    expect(sent.status).toBe(202);
    expect(sent.body.data.sent).toBe(true);

    const outgoing = await requester.agent.get("/api/v1/me/friends");
    const incoming = await recipient.agent.get("/api/v1/me/friends");
    expect(outgoing.body.data.requests).toMatchObject([{ userId: recipient.id, direction: "outgoing" }]);
    expect(incoming.body.data.requests).toMatchObject([{ userId: requester.id, direction: "incoming" }]);
    expect(JSON.stringify(incoming.body.data)).not.toContain(recipient.email);
    expect(JSON.stringify(incoming.body.data)).not.toContain(requester.email);

    const requestId = incoming.body.data.requests[0].id as string;
    expect((await recipient.agent.post(`/api/v1/me/friend-requests/${requestId}/accept`)).status).toBe(200);
    expect((await recipient.agent.post(`/api/v1/me/friend-requests/${requestId}/accept`)).status).toBe(200);
    expect((await requester.agent.get("/api/v1/me/friends")).body.data.friends).toMatchObject([{ id: recipient.id, name: recipient.name }]);
    expect((await requester.agent.get(`/api/v1/users/${recipient.id}`)).body.data.friendshipStatus).toBe("friends");
    expect((await outsider.agent.post(`/api/v1/me/friend-requests/${requestId}/accept`)).status).toBe(404);

    expect((await requester.agent.delete(`/api/v1/me/friends/${recipient.id}`)).body.data.removed).toBe(true);
    expect((await recipient.agent.get("/api/v1/me/friends")).body.data.friends).toHaveLength(0);
  });

  it("supports neutral unknown email replies, cancellation and rejection", async () => {
    const sender = await signUp(app, "Sender");
    const target = await signUp(app, "Target");
    const unknown = await sender.agent.post("/api/v1/me/friend-requests").send({ email: "unknown@example.com" });
    const known = await sender.agent.post("/api/v1/me/friend-requests").send({ email: target.email });
    expect(unknown.status).toBe(202);
    expect(unknown.body.data.message).toBe(known.body.data.message);

    let pending = await sender.agent.get("/api/v1/me/friends");
    const firstId = pending.body.data.requests[0].id as string;
    expect((await sender.agent.delete(`/api/v1/me/friend-requests/${firstId}`)).body.data.removed).toBe(true);
    expect((await target.agent.get("/api/v1/me/friends")).body.data.requests).toHaveLength(0);

    await sender.agent.post("/api/v1/me/friend-requests").send({ userId: target.id });
    pending = await target.agent.get("/api/v1/me/friends");
    const secondId = pending.body.data.requests[0].id as string;
    expect((await target.agent.delete(`/api/v1/me/friend-requests/${secondId}`)).body.data.removed).toBe(true);
    expect((await sender.agent.get("/api/v1/me/friends")).body.data.requests).toHaveLength(0);
    expect((await sender.agent.post("/api/v1/me/friend-requests").send({ userId: sender.id })).status).toBe(202);
    expect((await sender.agent.get("/api/v1/me/friends")).body.data.requests).toHaveLength(0);
  });

  it("adds only accepted friends to a workspace with the chosen role", async () => {
    const owner = await signUp(app, "Owner");
    const friend = await signUp(app, "Friend");
    const outsider = await signUp(app, "NotFriend");
    const notebookId = await createNotebookWithSources(owner.agent);

    expect((await owner.agent.post(`/api/v1/notebooks/${notebookId}/members`).send({ friendId: outsider.id, role: "viewer" })).status).toBe(404);
    await owner.agent.post("/api/v1/me/friend-requests").send({ userId: friend.id });
    const request = (await friend.agent.get("/api/v1/me/friends")).body.data.requests[0];
    await friend.agent.post(`/api/v1/me/friend-requests/${request.id}/accept`);

    const added = await owner.agent.post(`/api/v1/notebooks/${notebookId}/members`).send({ friendId: friend.id, role: "viewer" });
    expect(added.status).toBe(201);
    expect(added.body.data).toMatchObject({ userId: friend.id, role: "viewer" });
    expect((await owner.agent.get(`/api/v1/notebooks/${notebookId}/members`)).body.data).toMatchObject([{ id: owner.id, role: "owner" }, { id: friend.id, role: "viewer" }]);
    expect((await owner.agent.post(`/api/v1/notebooks/${notebookId}/members`).send({ email: friend.email, role: "editor" })).status).toBe(409);

    const invite = await owner.agent.post(`/api/v1/notebooks/${notebookId}/invites`).send({ role: "viewer", expiresInDays: 7, maxUses: 20 });
    expect(invite.status).toBe(201);
    expect((await outsider.agent.post(`/api/v1/invites/${invite.body.data.token}/accept`)).body.data).toMatchObject({ notebookId, role: "viewer" });
    expect((await outsider.agent.get(`/api/v1/notebooks/${notebookId}`)).body.data.role).toBe("viewer");
  });
});
