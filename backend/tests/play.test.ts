import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "../src/db/index.js";
import { gradeItem } from "../src/modules/play/items.js";
import { chooseTypes } from "../src/modules/play/planner.js";
import { closeApp, createNotebookWithSources, freshApp, signUp, OSI_TEXT, STAR_TEXT, SUBNET_TEXT } from "./helpers.js";

type GradeArg = Parameters<typeof gradeItem>[0];
let app: Awaited<ReturnType<typeof freshApp>>["app"];
let db: Db;
beforeAll(async () => {
  ({ app, db } = await freshApp());
}, 60_000);
afterAll(() => closeApp(db));

type Plan = Array<{ type: string; items: Array<Record<string, unknown>> }>;
async function planOf(sid: string): Promise<Plan> {
  return (await db.query<{ plan: Plan }>("SELECT plan FROM game_sessions WHERE id = $1", [sid]))[0]!.plan;
}
/** The correct answer for every item of a round, read from the stored plan (players never see it). */
function perfect(round: Plan[number]): unknown[] {
  return round.items.map((it) => {
    switch (it.type) {
      case "fill": return (it.accept as string[])[0];
      case "tf": return it.answer;
      case "order": return it.answerOrder;
      case "match": return it.answerRights;
      case "teach": {
        const sourceTitle = (it.ref as { sourceTitle: string }).sourceTitle;
        return sourceTitle === "Jaringan 2" ? OSI_TEXT : sourceTitle === "Jaringan 3" ? SUBNET_TEXT : STAR_TEXT;
      }
      default: return it.answerIndex;
    }
  });
}

describe("session planning (automatic game choice)", () => {
  it("chooses game types by rule: solo ends with teach-back, social modes stay tap-based, picks are respected", () => {
    expect(chooseTypes(6, "solo")).toEqual(["mcq", "fill", "order", "match", "tf", "teach"]);
    expect(chooseTypes(6, "duel").every((t) => ["mcq", "tf", "guess_page", "fill"].includes(t))).toBe(true);
    expect(chooseTypes(4, "solo", ["tf", "fill"]).every((t) => ["tf", "fill", "teach"].includes(t))).toBe(true);
    expect(chooseTypes(3, "solo")).toHaveLength(3);
  });

  it("builds a six-round session with six game types and shows players no answers", async () => {
    const u = await signUp(app, "Player");
    const nb = await createNotebookWithSources(u.agent);
    const r = await u.agent.post(`/api/v1/notebooks/${nb}/sessions`).send({});
    expect(r.status).toBe(201);
    const s = r.body.data;
    expect(s.status).toBe("running");
    expect(s.rounds.map((x: { type: string }) => x.type)).toEqual(["mcq", "fill", "order", "match", "tf", "teach"]);
    expect(s.rounds[0].cue).toMatchObject({ introAnimation: "wave" });
    const json = JSON.stringify(s.rounds);
    expect(json).not.toMatch(/answerIndex|answerOrder|answerRights|"accept"|"answer"|explanation/);
    const fill = s.rounds[1].items[0];
    expect(fill.prompt).toContain("____");
    expect(fill.firstLetter.length).toBe(1);
    const order = s.rounds[2].items[0];
    expect(order.steps).toHaveLength(3);
    expect(s.rounds[3].items[0].lefts).toHaveLength(4);
    expect(s.rounds[3].items[0].scoring).toBe("proportional");
  });

  it("picks only the requested game types when the player chooses (manual mode)", async () => {
    const u = await signUp(app, "Picker");
    const nb = await createNotebookWithSources(u.agent);
    const r = await u.agent.post(`/api/v1/notebooks/${nb}/sessions`).send({ gameTypes: ["tf"], rounds: 3 });
    expect(r.body.data.rounds.every((x: { type: string }) => x.type === "tf")).toBe(true);
  });

  it("restricts questions to reference sources and refuses when the material is too thin", async () => {
    const u = await signUp(app, "Ref");
    const nb = await createNotebookWithSources(u.agent);
    const list = (await u.agent.get(`/api/v1/notebooks/${nb}/sources`)).body.data;
    const one = list.find((s: { title: string }) => s.title === "Jaringan 1").id;
    const r = await u.agent.post(`/api/v1/notebooks/${nb}/sessions`).send({ sourceIds: [one], gameTypes: ["fill"], rounds: 3 });
    // only one source: fill still works, and every item points at that source
    expect(r.status).toBe(201);
    const plan = await planOf(r.body.data.id);
    expect(plan.every((rd) => rd.items.every((it) => (it.ref as { sourceId: string }).sourceId === one))).toBe(true);
    const empty = (await u.agent.post("/api/v1/notebooks").send({ title: "Kosong" })).body.data.id;
    expect((await u.agent.post(`/api/v1/notebooks/${empty}/sessions`).send({})).status).toBe(409);
  });

  it("answers with the reference filter and gets not-found for a source that lacks the topic", async () => {
    const u = await signUp(app, "Ref2");
    const nb = await createNotebookWithSources(u.agent);
    const list = (await u.agent.get(`/api/v1/notebooks/${nb}/sources`)).body.data;
    const osi = list.find((s: { title: string }) => s.title === "Jaringan 2").id;
    const q = "Apa keunggulan topologi bintang ketika satu kabel rusak?";
    expect((await u.agent.post(`/api/v1/notebooks/${nb}/ask`).send({ question: q })).body.data.grounded).toBe(true);
    expect((await u.agent.post(`/api/v1/notebooks/${nb}/ask`).send({ question: q, sourceIds: [osi] })).body.data.grounded).toBe(false);
  });
});

describe("playing a session: grading, points, streak, badges", () => {
  it("grades every game type, awards points and a streak, and returns the mascot reaction", async () => {
    const u = await signUp(app, "Winner");
    const nb = await createNotebookWithSources(u.agent);
    const s = (await u.agent.post(`/api/v1/notebooks/${nb}/sessions`).send({})).body.data;
    const plan = await planOf(s.id);
    let total = 0;
    for (const [i, round] of plan.entries()) {
      const r = await u.agent.post(`/api/v1/notebooks/${nb}/sessions/${s.id}/rounds/${i}/answer`).send({ answers: perfect(round), elapsedMs: 10_000 });
      expect(r.status, round.type).toBe(201);
      expect(r.body.data.correctCount, `${round.type}: ${JSON.stringify(r.body.data.results)}`).toBe(round.items.length);
      expect(r.body.data.reaction).toEqual({ animation: "celebrate", emotion: "semangat" });
      expect(r.body.data.results[0]).toHaveProperty("explanation");
      total += r.body.data.points;
    }
    expect(total).toBeGreaterThan(600);
    const fin = (await u.agent.post(`/api/v1/notebooks/${nb}/sessions/${s.id}/finish`)).body.data;
    expect(fin).toMatchObject({ accuracyPercent: 100, streak: 1, rank: 1 });
    expect(fin.badgesEarned.map((b: { id: string }) => b.id)).toEqual(expect.arrayContaining(["first_session", "perfect", "speedster"]));
    const stats = (await u.agent.get("/api/v1/me/stats")).body.data;
    expect(stats).toMatchObject({ streak: 1, sessionsPlayed: 1, playedToday: true });
    expect(stats.points).toBe(fin.points);
    expect(stats.badges.length).toBeGreaterThanOrEqual(3);
    // finishing twice does not double count
    await u.agent.post(`/api/v1/notebooks/${nb}/sessions/${s.id}/finish`);
    expect((await u.agent.get("/api/v1/me/stats")).body.data.sessionsPlayed).toBe(1);
  });

  it("awards proportional points for new matching rounds and keeps the full-correct count all-or-nothing", async () => {
    const u = await signUp(app, "PartialMatcher");
    const nb = await createNotebookWithSources(u.agent);
    const s = (await u.agent.post(`/api/v1/notebooks/${nb}/sessions`).send({ gameTypes: ["match"], rounds: 3 })).body.data;
    const plan = await planOf(s.id);
    const round = plan[0]!;
    const item = round.items[0]!;
    expect(item.type).toBe("match");
    expect(item.scoring).toBe("proportional");
    const matchIndex = round.items.findIndex((candidate) => candidate.type === "match");
    expect(matchIndex).toBeGreaterThanOrEqual(0);
    const correct = perfect(round)[matchIndex] as number[];
    expect(correct.length).toBeGreaterThan(1);
    const partial = [...correct];
    partial[partial.length - 1] = -1;
    const url = `/api/v1/notebooks/${nb}/sessions/${s.id}/rounds/0/answer`;
    const duplicate = [...correct];
    duplicate[1] = duplicate[0]!;
    const duplicateAnswers = perfect(round);
    duplicateAnswers[matchIndex] = duplicate;
    expect((await u.agent.post(url).send({ answers: duplicateAnswers })).status).toBe(400);
    const submittedAnswers = perfect(round);
    submittedAnswers[matchIndex] = partial;
    const played = await u.agent.post(url).send({ answers: submittedAnswers, elapsedMs: 3_600_000 });
    expect(played.status).toBe(201);
    const matched = correct.length - 1;
    const fraction = matched / correct.length;
    const expectedCorrectCount = round.items.length - 1;
    const expectedPoints = expectedCorrectCount * 100 + Math.round(100 * fraction);
    expect(played.body.data).toMatchObject({ correctCount: expectedCorrectCount, total: round.items.length, points: expectedPoints, speedBonusPoints: 0 });
    expect(played.body.data.results[matchIndex]).toMatchObject({ correct: false, fraction, chosenAnswer: partial, correctAnswer: correct });
    const result = (await u.agent.post(`/api/v1/notebooks/${nb}/sessions/${s.id}/finish`)).body.data;
    const expectedAccuracy = (expectedCorrectCount + fraction) / round.items.length;
    expect(result).toMatchObject({ correct: expectedCorrectCount, total: round.items.length, accuracyPercent: Math.round(expectedAccuracy * 100), points: expectedPoints });
  });

  it("marks wrong answers, reports weak topics with the page to review, and rejects repeats and bad shapes", async () => {
    const u = await signUp(app, "Misser");
    const nb = await createNotebookWithSources(u.agent);
    const s = (await u.agent.post(`/api/v1/notebooks/${nb}/sessions`).send({ gameTypes: ["tf"], rounds: 3 })).body.data;
    const plan = await planOf(s.id);
    const wrong = plan[0]!.items.map((it) => !(it.answer as boolean));
    const base = `/api/v1/notebooks/${nb}/sessions/${s.id}`;
    expect((await u.agent.post(`${base}/rounds/0/answer`).send({ answers: [true] })).status).toBe(400); // wrong count
    const r = await u.agent.post(`${base}/rounds/0/answer`).send({ answers: wrong });
    expect(r.body.data.correctCount).toBe(0);
    expect(r.body.data.reaction).toEqual({ animation: "sad", emotion: "semangat" });
    expect((await u.agent.post(`${base}/rounds/0/answer`).send({ answers: wrong })).status).toBe(409);
    expect((await u.agent.post(`${base}/rounds/9/answer`).send({ answers: [true] })).status).toBe(404);
    const fin = (await u.agent.post(`${base}/finish`)).body.data;
    expect(fin.accuracyPercent).toBe(0);
    expect(fin.weakTopics.length).toBeGreaterThan(0);
    expect(fin.weakTopics[0].reviewAt[0]).toMatch(/Jaringan/);
    expect(fin.recoveryTopics).toEqual(fin.weakTopics.map((w: { topic: string }) => w.topic));
  });

  it("starts a recovery mission on a weak topic", async () => {
    const u = await signUp(app, "Mission");
    const nb = await createNotebookWithSources(u.agent);
    const r = await u.agent.post(`/api/v1/notebooks/${nb}/sessions`).send({ focusTopic: "topologi bintang", gameTypes: ["fill"], rounds: 3 });
    expect(r.status).toBe(201);
    expect(r.body.data.focusTopic).toBe("topologi bintang");
  });

  it("keeps a streak across days and resets it after a gap", async () => {
    const u = await signUp(app, "Streaker");
    const nb = await createNotebookWithSources(u.agent);
    const play = async () => {
      const s = (await u.agent.post(`/api/v1/notebooks/${nb}/sessions`).send({ gameTypes: ["tf"], rounds: 3 })).body.data;
      const plan = await planOf(s.id);
      await u.agent.post(`/api/v1/notebooks/${nb}/sessions/${s.id}/rounds/0/answer`).send({ answers: perfect(plan[0]!) });
      return (await u.agent.post(`/api/v1/notebooks/${nb}/sessions/${s.id}/finish`)).body.data;
    };
    expect((await play()).streak).toBe(1);
    await db.query("UPDATE user_stats SET last_play_date = current_date - 1 WHERE user_id = $1", [u.id]);
    const second = await play();
    expect(second.streak).toBe(2);
    await db.query("UPDATE user_stats SET last_play_date = current_date - 5 WHERE user_id = $1", [u.id]);
    expect((await u.agent.get("/api/v1/me/stats")).body.data.streak).toBe(0); // broken streak shows as zero
    expect((await play()).streak).toBe(1);
  });
});

describe("duel and group sessions", () => {
  it("waits for players, hides items until the creator starts, limits players, and ranks live", async () => {
    const a = await signUp(app, "Alpha");
    const b = await signUp(app, "Bravo");
    const c = await signUp(app, "Charlie");
    const nb = await createNotebookWithSources(a.agent);
    for (const m of [b, c]) await a.agent.post(`/api/v1/notebooks/${nb}/members`).send({ email: m.email });
    const s = (await a.agent.post(`/api/v1/notebooks/${nb}/sessions`).send({ mode: "duel", rounds: 3 })).body.data;
    expect(s.status).toBe("waiting");
    expect(s.hostId).toBe(a.id);
    expect(s.rounds).toEqual([]);
    const base = `/api/v1/notebooks/${nb}/sessions/${s.id}`;
    expect((await a.agent.post(`${base}/start`)).status).toBe(409); // host alone cannot start
    expect((await b.agent.post(`${base}/rounds/0/answer`).send({ answers: [1] })).status).toBe(409); // not running
    expect((await b.agent.post(`${base}/join`)).status).toBe(200);
    expect((await c.agent.post(`${base}/join`)).status).toBe(409); // duel holds two players
    expect((await b.agent.post(`${base}/start`)).status).toBe(403);
    expect((await a.agent.post(`${base}/start`)).body.data.status).toBe("running");
    const plan = await planOf(s.id);
    expect((await c.agent.get(base)).status).toBe(403);
    const good = perfect(plan[0]!);
    const bad = plan[0]!.items.map(() => 99);
    await a.agent.post(`${base}/rounds/0/answer`).send({ answers: good, elapsedMs: 5000 });
    await b.agent.post(`${base}/rounds/0/answer`).send({ answers: bad });
    const board = (await b.agent.get(`${base}/scoreboard`)).body.data;
    expect(board.ranking.map((r: { name: string }) => r.name)).toEqual(["Alpha", "Bravo"]);
    expect(board.ranking[0].score).toBeGreaterThan(board.ranking[1].score);
    await a.agent.post(`${base}/finish`);
    expect((await a.agent.get(base)).body.data.status).toBe("running"); // Bravo has not finished
    const fin = (await b.agent.post(`${base}/finish`)).body.data;
    expect(fin).toMatchObject({ rank: 2, players: 2 });
    expect((await b.agent.get(base)).body.data.status).toBe("finished");
    expect((await a.agent.get("/api/v1/me/stats")).body.data.badges.map((x: { id: string }) => x.id)).toContain("teammate");
  });

  it("starts a group only after another member joins and caps it at twelve players", async () => {
    const host = await signUp(app, "GroupHost");
    const players = await Promise.all(Array.from({ length: 12 }, (_, i) => signUp(app, `GroupPlayer${i + 1}`)));
    const nb = await createNotebookWithSources(host.agent);
    for (const player of players) {
      const added = await host.agent.post(`/api/v1/notebooks/${nb}/members`).send({ email: player.email, role: "viewer" });
      expect(added.status).toBe(201);
    }
    const session = (await host.agent.post(`/api/v1/notebooks/${nb}/sessions`).send({ mode: "group", rounds: 3 })).body.data;
    expect(session).toMatchObject({ status: "waiting", hostId: host.id, participants: [{ userId: host.id }] });
    const base = `/api/v1/notebooks/${nb}/sessions/${session.id}`;
    expect((await host.agent.post(`${base}/start`)).status).toBe(409);

    for (const player of players.slice(0, 11)) expect((await player.agent.post(`${base}/join`)).status).toBe(200);
    expect((await players[11]!.agent.post(`${base}/join`)).status).toBe(409);
    expect((await players[0]!.agent.post(`${base}/start`)).status).toBe(403);
    const started = await host.agent.post(`${base}/start`);
    expect(started.status).toBe(200);
    expect(started.body.data).toMatchObject({ status: "running", hostId: host.id, participants: expect.arrayContaining([{ userId: players[0]!.id, name: players[0]!.name, score: 0, finished: false, roundsAnswered: 0 }]) });
  });

  it("does not let outsiders touch sessions of another group", async () => {
    const a = await signUp(app, "Owner");
    const x = await signUp(app, "Outsider");
    const nb = await createNotebookWithSources(a.agent);
    const s = (await a.agent.post(`/api/v1/notebooks/${nb}/sessions`).send({})).body.data;
    for (const p of [`/sessions/${s.id}`, `/sessions/${s.id}/scoreboard`, "/sessions"]) expect((await x.agent.get(`/api/v1/notebooks/${nb}${p}`)).status).toBe(404);
    expect((await x.agent.post(`/api/v1/notebooks/${nb}/sessions`).send({})).status).toBe(404);
  });
});

describe("grading rules", () => {
  it("accepts fill answers case-insensitively and without punctuation or accents, and requires exact order and matches", () => {
    const fill = { type: "fill", prompt: "x ____", accept: ["Switch pusat", "hub"], explanation: "", topic: "t", ref: { sourceId: "s", sourceTitle: "S", page: null } } as const;
    expect(gradeItem(fill as unknown as GradeArg, "  switch   PUSAT! ").correct).toBe(true);
    expect(gradeItem(fill as unknown as GradeArg, "hub").correct).toBe(true);
    expect(gradeItem(fill as unknown as GradeArg, "router").correct).toBe(false);
    expect(gradeItem(fill as unknown as GradeArg, 5).correct).toBe(false);
    const order = { type: "order", prompt: "x", steps: [], answerOrder: [2, 0, 1], explanation: "", topic: "t", ref: { sourceId: "s", sourceTitle: "S", page: null } } as const;
    expect(gradeItem(order as unknown as GradeArg, [2, 0, 1]).correct).toBe(true);
    expect(gradeItem(order as unknown as GradeArg, [0, 1, 2]).correct).toBe(false);
    expect(gradeItem(order as unknown as GradeArg, [2, 0]).correct).toBe(false);
    const match = { type: "match", prompt: "x", lefts: ["a", "b"], rights: ["y", "x"], answerRights: [1, 0], explanation: "", topic: "t", ref: { sourceId: "s", sourceTitle: "S", page: null } } as const;
    expect(gradeItem(match as unknown as GradeArg, [1, 0]).correct).toBe(true);
    expect(gradeItem(match as unknown as GradeArg, [0, 1]).correct).toBe(false);
    const proportional = { ...match, scoring: "proportional" as const };
    expect(gradeItem(proportional as unknown as GradeArg, [1, -1])).toMatchObject({ correct: false, fraction: 0.5 });
    expect(gradeItem(proportional as unknown as GradeArg, [-1, -1])).toMatchObject({ correct: false, fraction: 0 });
    expect(gradeItem(match as unknown as GradeArg, [1, -1])).toMatchObject({ correct: false, fraction: 0 });
  });
});

describe("teach-back and visualisation", () => {
  it("lets the player teach the mascot: grounded feedback, reactions by score, nothing invented", async () => {
    const u = await signUp(app, "Teacher");
    const nb = await createNotebookWithSources(u.agent);
    const url = `/api/v1/notebooks/${nb}/companion/teach-back`;
    const good = await u.agent.post(url).send({ topic: "Topologi bintang", explanation: STAR_TEXT });
    expect(good.status).toBe(200);
    expect(good.body.data.evaluation).toMatchObject({ checkable: true, understood: "yes" });
    expect(good.body.data.performance.beats[0]).toMatchObject({ animation: "nod", emotion: "senang" });
    const weak = await u.agent.post(url).send({ topic: "Topologi bintang", explanation: "Topologi bintang menghubungkan semua perangkat ke satu switch pusat. kemudian lalu setelah itu dan seterusnya begitulah" });
    expect(weak.body.data.evaluation.understood).not.toBe("yes");
    expect(weak.body.data.performance.beats.length).toBe(2); // reply plus what is missing
    const off = await u.agent.post(url).send({ topic: "Resep rendang", explanation: "Santan dan rempah dimasak berjam-jam sampai kering dan hitam." });
    expect(off.body.data.evaluation.checkable).toBe(false);
    expect(off.body.data.performance.grounded).toBe(false);
    expect(off.body.data.performance.beats[0].animation).toBe("shrug");
    expect((await u.agent.post(url).send({ topic: "x", explanation: "pendek" })).status).toBe(400);
  });

  it("builds a mind map for a source, drops edges to unknown nodes and made-up pages, and caches it", async () => {
    const u = await signUp(app, "Mapper");
    const nb = await createNotebookWithSources(u.agent);
    const src = (await u.agent.get(`/api/v1/notebooks/${nb}/sources`)).body.data[0].id;
    const r = await u.agent.get(`/api/v1/notebooks/${nb}/sources/${src}/visual?kind=mindmap`);
    expect(r.status).toBe(200);
    expect(r.body.data.nodes).toHaveLength(3);
    expect(r.body.data.nodes.find((n: { id: string }) => n.id === "b").page).toBeNull(); // page 99 does not exist
    expect(r.body.data.edges).toHaveLength(2);
    expect(r.body.data.cached).toBe(false);
    expect((await u.agent.get(`/api/v1/notebooks/${nb}/sources/${src}/visual`)).body.data.cached).toBe(true);
    expect((await u.agent.get(`/api/v1/notebooks/${nb}/sources/${src}/visual?kind=timeline`)).status).toBe(400);
  });
});
