import { expect, test, type Page, type Route } from "@playwright/test";

const notebookId = "d1c7d4c7-cb6c-4bd3-a775-1d72c0107c71";
const sessionId = "82d2a741-e44c-4316-aad4-3f55fd876844";
const quizId = "b0c9701e-22bb-46b0-8eab-0d4c5d65257b";
const hostId = "a9d101e4-4410-45bb-8256-ff31a18a47fb";
const friendId = "bc3ff9f5-c1a2-45af-b18e-6acd74d97294";
const memberId = "574bf0a2-b20f-46f7-92a5-96f47e2c502a";
const base = `/api/v1/notebooks/${notebookId}/sessions/${sessionId}`;

function waitingSession(mode: "duel" | "group" = "duel", playerCount = 2) {
  return {
    id: sessionId,
    hostId,
    mode,
    status: "waiting",
    focusTopic: "Topologi",
    roundCount: 1,
    rounds: [],
    answeredRounds: [],
    participants: Array.from({ length: playerCount }, (_, index) => ({
      userId: index === 0 ? hostId : index === 1 ? memberId : `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      name: index === 0 ? "Maul" : index === 1 ? "Alya" : `Pemain ${index + 1}`,
      score: 0,
      finished: false,
      roundsAnswered: 0,
    })),
    reactions: { greeting: { animation: "wave", emotion: "senang" } },
  };
}

function runningSession(mode: "duel" | "group" = "duel", playerCount = 2) {
  return {
    ...waitingSession(mode, playerCount),
    status: "running",
    rounds: [{
      index: 0,
      type: "mcq",
      topic: "Topologi",
      timeLimitSec: 60,
      items: [{ type: "mcq", prompt: "Apa perangkat pusat pada topologi bintang?", options: ["Switch pusat", "Kabel koaksial", "Modem dial-up", "Repeater"], topic: "Topologi bintang" }],
      cue: { intro: "Ayo mulai!", introAnimation: "wave", introEmotion: "senang" },
    }],
  };
}

function envelope(data: unknown, status = 200) {
  return { status, contentType: "application/json", body: JSON.stringify({ success: true, data }) };
}

async function mockApi(page: Page, calls: { memberBody?: unknown; inviteBody?: unknown; answerBody?: unknown; delayStart?: boolean }, mode: "duel" | "group" = "duel", playerCount = 2) {
  let started = false;
  let answered = false;
  await page.route("**/api/v1/**", async (route: Route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    const method = request.method();
    if (pathname === "/api/v1/auth/me") {
      return route.fulfill(envelope({ id: hostId, email: "maul@example.com", name: "Maul", course: "Informatika" }));
    }
    if (pathname === `/api/v1/notebooks/${notebookId}`) {
      return route.fulfill(envelope({ id: notebookId, title: "Belajar Jaringan", course: "Informatika", description: null, category: null, visibility: "private", ownerId: hostId, role: "owner", createdAt: new Date().toISOString() }));
    }
    if (pathname === `/api/v1/me/friends`) {
      return route.fulfill(envelope({ friends: [{ id: friendId, name: "Nara", course: "Informatika", since: new Date().toISOString() }], requests: [] }));
    }
    if (pathname === `/api/v1/notebooks/${notebookId}/members` && method === "GET") {
      return route.fulfill(envelope([{ id: hostId, name: "Maul", email: "maul@example.com", role: "owner", joinedAt: new Date().toISOString() }, { id: memberId, name: "Alya", email: "alya@example.com", role: "editor", joinedAt: new Date().toISOString() }]));
    }
    if (pathname === `/api/v1/notebooks/${notebookId}/members` && method === "POST") {
      calls.memberBody = request.postDataJSON();
      return route.fulfill(envelope({ userId: friendId, role: "viewer" }, 201));
    }
    if (pathname === `/api/v1/notebooks/${notebookId}/invites` && method === "POST") {
      calls.inviteBody = request.postDataJSON();
      return route.fulfill(envelope({ token: "invite-token", role: "viewer", expiresInDays: 7, maxUses: 20 }, 201));
    }
    if (pathname === `${base}/start` && method === "POST") {
      if (calls.delayStart) await new Promise((resolve) => setTimeout(resolve, 500));
      started = true;
      return route.fulfill(envelope(runningSession(mode, playerCount)));
    }
    if (pathname === base && method === "GET") return route.fulfill(envelope(started ? { ...runningSession(mode, playerCount), answeredRounds: answered ? [0] : [] } : waitingSession(mode, playerCount)));
    if (pathname === `${base}/rounds/0/answer` && method === "POST") {
      calls.answerBody = request.postDataJSON();
      answered = true;
      return route.fulfill(envelope({
        roundIndex: 0,
        results: [{ index: 0, type: "mcq", correct: true, fraction: 1, correctAnswer: 0, explanation: "Sumber menyebut switch sebagai pusat topologi bintang.", topic: "Topologi bintang", ref: { sourceId: "7a0129a7-d38c-41aa-a1d5-a31241d80c45", sourceTitle: "Modul Jaringan", page: 1 } }],
        correctCount: 1, total: 1, points: 100,
        reaction: { animation: "celebrate", emotion: "semangat" },
      scoreboard: runningSession(mode, playerCount).participants.map((participant, index) => ({ ...participant, score: index === 0 ? 100 : 0, roundsAnswered: 1 })),
      }, 201));
    }
    if (pathname === `${base}/finish` && method === "POST") return route.fulfill(envelope({
      sessionId, points: 100, accuracyPercent: 100, correct: 1, total: 1, streak: 1,
      badgesEarned: [{ id: "first_session", name: "Sesi pertama" }], weakTopics: [], recoveryTopics: [], rank: 1, players: playerCount,
      reaction: { animation: "celebrate", emotion: "semangat" },
    }));
    if (pathname === "/api/v1/me/stats") return route.fulfill(envelope({ points: 100, streak: 1, bestStreak: 1, lastPlayDate: new Date().toISOString(), sessionsPlayed: 1, playedToday: true, badges: [], allBadges: [] }));
    return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ success: false, error: { code: "NOT_FOUND", message: `No mock for ${method} ${pathname}` } }) });
  });
}

test("workspace owner invites a friend with a viewer role and finishes a duel round", async ({ page }) => {
  test.setTimeout(90_000);
  const calls: { memberBody?: unknown; inviteBody?: unknown; answerBody?: unknown; delayStart?: boolean } = { delayStart: true };
  await mockApi(page, calls);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`/workspaces/${notebookId}/sessions/${sessionId}`);

  await expect(page.getByRole("heading", { name: "Menunggu pemain" })).toBeVisible();
  const bubiPose = page.locator(".bubi-mascot-motion__pose").first();
  await expect(bubiPose).toHaveAttribute("data-motion", "wave");
  await expect(bubiPose.locator("..")).toHaveAttribute("data-emotion", "senang");
  await expect.poll(() => bubiPose.evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
  await page.getByRole("button", { name: "Undang ke workspace" }).click();
  await page.getByLabel("Peran teman").selectOption("viewer");
  await page.getByRole("button", { name: "Tambahkan", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Anggota berhasil ditambahkan");
  await page.getByRole("button", { name: "Buat tautan undangan" }).click();
  await expect(page.locator("#workspace-invite-link")).toHaveValue(/join\/invite-token/);
  expect(calls.memberBody).toEqual({ friendId, role: "viewer" });
  expect(calls.inviteBody).toEqual({ role: "viewer", expiresInDays: 7, maxUses: 20 });
  await page.getByRole("button", { name: "Tutup dialog" }).click();

  await page.getByRole("button", { name: "Mulai sesi" }).click();
  const loadingStatus = page.getByRole("status").filter({ hasText: "Bubi sedang memulai sesi…" });
  await expect(loadingStatus).toBeVisible();
  await expect.poll(() => loadingStatus.locator(".bubi-mascot-motion__pose").evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
  await expect(page.getByRole("heading", { name: "Apa perangkat pusat pada topologi bintang?" })).toBeVisible();
  const correctChoice = page.getByRole("radio", { name: "Switch pusat" });
  await correctChoice.focus();
  await correctChoice.press("Space");
  await expect(correctChoice).toBeChecked();
  await page.getByRole("button", { name: "Kirim jawaban" }).click();
  await expect(page.getByRole("heading", { name: "1 dari 1 benar" })).toBeVisible();
  expect(calls.answerBody).toMatchObject({ answers: [0] });
  await page.getByRole("button", { name: "Lihat hasil sesi" }).click();
  await expect(page.getByRole("heading", { name: "Sesi selesai" })).toBeVisible();
  await expect(page.locator("main").last()).toContainText("Peringkat 1 dari 2");
});

test("group session shows its 12 player capacity and live scoreboard", async ({ page }) => {
  test.setTimeout(90_000);
  await mockApi(page, {}, "group", 12);
  await page.goto(`/workspaces/${notebookId}/sessions/${sessionId}`);

  await expect(page.getByRole("heading", { name: "Menunggu pemain" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pemain (12/12)" })).toBeVisible();
  await page.getByRole("button", { name: "Mulai sesi" }).click();
  await expect(page.getByRole("heading", { name: "Apa perangkat pusat pada topologi bintang?" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Papan skor" })).toBeVisible();
  const twelfthPlayer = page.getByRole("listitem").filter({ hasText: "Pemain 12" });
  await expect(twelfthPlayer).toContainText("0");
});

test("quiz creation keeps Bubi loading inside the action button", async ({ page }) => {
  const source = { id: "7a0129a7-d38c-41aa-a1d5-a31241d80c45", title: "Modul Struktur Data", kind: "pdf", status: "ready", error: null, pageCount: 8, origin: null, createdAt: new Date().toISOString(), uploadedBy: hostId, uploadedByName: "Maul", chunkCount: 8 };
  await page.route("**/api/v1/**", async (route: Route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname === "/api/v1/auth/me") return route.fulfill(envelope({ id: hostId, email: "maul@example.com", name: "Maul", course: "Informatika" }));
    if (pathname === `/api/v1/notebooks/${notebookId}`) return route.fulfill(envelope({ id: notebookId, title: "Belajar Struktur Data", course: "Informatika", description: null, category: null, visibility: "private", ownerId: hostId, role: "owner", createdAt: new Date().toISOString() }));
    if (pathname === `/api/v1/notebooks/${notebookId}/sources`) return route.fulfill(envelope([source]));
    if (pathname === `/api/v1/notebooks/${notebookId}/sessions`) return route.fulfill(envelope([]));
    if (pathname === `/api/v1/notebooks/${notebookId}/quizzes` && request.method() === "GET") return route.fulfill(envelope([]));
    if (pathname === `/api/v1/notebooks/${notebookId}/quizzes` && request.method() === "POST") {
      await new Promise((resolve) => setTimeout(resolve, 800));
      return route.fulfill(envelope({ id: quizId }, 201));
    }
    return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ success: false, error: { code: "NOT_FOUND", message: `No mock for ${request.method()} ${pathname}` } }) });
  });

  await page.goto(`/game/${notebookId}`);
  await expect(page.getByRole("heading", { name: "Pilih cara berlatih" })).toBeVisible();
  const form = page.locator("form").filter({ has: page.getByLabel("Jumlah soal") });
  const button = form.locator('button[type="submit"]');
  await button.click();
  const loadingStatus = form.getByRole("status").filter({ hasText: "Bubi sedang menyusun kuis…" });
  await expect(loadingStatus).toBeVisible();
  await expect(button).toHaveAttribute("aria-busy", "true");
  await expect(form.getByText("Menyiapkan…")).toHaveCount(0);
  await expect.poll(async () => {
    const buttonBox = await button.boundingBox();
    const loadingBox = await loadingStatus.boundingBox();
    return Boolean(buttonBox && loadingBox && loadingBox.y >= buttonBox.y && loadingBox.y + loadingBox.height <= buttonBox.y + buttonBox.height);
  }).toBe(true);
  await expect(page).toHaveURL(new RegExp(`/game/${notebookId}/quizzes/${quizId}`));
});

test("student can send a friend request from the friends page", async ({ page }) => {
  test.setTimeout(90_000);
  const sent: { email?: string } = {};
  await page.route("**/api/v1/**", async (route: Route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname === "/api/v1/auth/me") return route.fulfill(envelope({ id: hostId, email: "maul@example.com", name: "Maul", course: "Informatika" }));
    if (pathname === "/api/v1/me/friends") return route.fulfill(envelope({ friends: [], requests: [] }));
    if (pathname === "/api/v1/me/friend-requests" && request.method() === "POST") {
      sent.email = request.postDataJSON().email;
      return route.fulfill(envelope({ sent: true, message: "Jika akun tersedia, permintaan teman akan dikirim." }, 202));
    }
    return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ success: false, error: { code: "NOT_FOUND", message: `No mock for ${request.method()} ${pathname}` } }) });
  });
  await page.goto("/friends");
  await expect(page.getByRole("heading", { name: "Teman belajar" })).toBeVisible();
  await page.getByLabel("Email akun teman").fill("alya@example.com");
  await page.getByRole("button", { name: "Kirim permintaan" }).click();
  await expect(page.getByRole("status")).toContainText("Jika akun tersedia");
  expect(sent.email).toBe("alya@example.com");
});

test("advances through every game type while a stale session poll is pending", async ({ page }) => {
  test.setTimeout(90_000);
  const rounds = [
    { index: 0, type: "mcq", topic: "String", timeLimitSec: 60, items: [{ type: "mcq", prompt: "Ronde pertama, pilih pusat jaringan.", options: ["Switch pusat", "Kabel", "Modem", "Repeater"], topic: "Jaringan" }], cue: { intro: "Ronde pertama", introAnimation: "wave", introEmotion: "senang" } },
    { index: 1, type: "fill", topic: "String", timeLimitSec: 60, items: [{ type: "fill", prompt: "Sebuah ____ menyimpan teks.", firstLetter: "s", length: 6, topic: "String" }], cue: { intro: "Ronde kedua", introAnimation: "think", introEmotion: "idle" } },
    { index: 2, type: "tf", topic: "Boolean", timeLimitSec: 60, items: [{ type: "tf", prompt: "Nilai boolean hanya memiliki dua keadaan.", topic: "Boolean" }], cue: { intro: "Ronde ketiga", introAnimation: "think", introEmotion: "idle" } },
    { index: 3, type: "order", topic: "Proses", timeLimitSec: 60, items: [{ type: "order", prompt: "Susun langkahnya.", steps: [{ id: 1, text: "Mulai" }, { id: 2, text: "Proses" }, { id: 3, text: "Selesai" }], topic: "Proses" }], cue: { intro: "Ronde keempat", introAnimation: "point_up", introEmotion: "idle" } },
    { index: 4, type: "match", topic: "Konsep", timeLimitSec: 60, items: [{ type: "match", prompt: "Pasangkan konsep.", lefts: ["Stack"], rights: ["LIFO"], topic: "Konsep" }], cue: { intro: "Ronde kelima", introAnimation: "hold_magnifier", introEmotion: "antusias" } },
    { index: 5, type: "guess_page", topic: "Sumber", timeLimitSec: 60, items: [{ type: "guess_page", prompt: "Kutipan dari modul Java.", options: [{ sourceTitle: "Modul Java", page: 3 }, { sourceTitle: "Modul Jaringan", page: 2 }], topic: "Sumber" }], cue: { intro: "Ronde keenam", introAnimation: "read_book", introEmotion: "antusias" } },
    { index: 6, type: "teach", topic: "String", timeLimitSec: 60, items: [{ type: "teach", prompt: "Jelaskan cara kerja String.", topic: "String" }], cue: { intro: "Ronde ketujuh", introAnimation: "raise_hand", introEmotion: "antusias" } },
  ];
  const session = (answeredRounds: number[]) => ({ id: sessionId, hostId, mode: "solo", status: "running", focusTopic: null, roundCount: rounds.length, rounds, answeredRounds, participants: [{ userId: hostId, name: "Maul", score: 0, finished: false, roundsAnswered: answeredRounds.length }], reactions: {} });
  let answeredRounds: number[] = [];
  let answerIndices: number[] = [];
  let stalePollDelivered = false;
  let conflictedRound = false;
  let releaseStalePoll!: () => void;
  let markStalePollStarted!: () => void;
  const stalePollReleased = new Promise<void>((resolve) => { releaseStalePoll = resolve; });
  const stalePollStarted = new Promise<void>((resolve) => { markStalePollStarted = resolve; });

  await page.route("**/api/v1/**", async (route: Route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    const method = request.method();
    if (pathname === "/api/v1/auth/me") return route.fulfill(envelope({ id: hostId, email: "maul@example.com", name: "Maul", course: "Informatika" }));
    if (pathname === `/api/v1/notebooks/${notebookId}`) return route.fulfill(envelope({ id: notebookId, title: "Belajar Jaringan", course: "Informatika", description: null, category: null, visibility: "private", ownerId: hostId, role: "owner", createdAt: new Date().toISOString() }));
    if (pathname === base && method === "GET") {
      if (answeredRounds.includes(0) && !stalePollDelivered) {
        stalePollDelivered = true;
        markStalePollStarted();
        await stalePollReleased;
        return route.fulfill(envelope(session([])));
      }
      return route.fulfill(envelope(session(answeredRounds)));
    }
    const answerMatch = pathname.match(new RegExp(`^${base}/rounds/(\\d+)/answer$`));
    if (answerMatch && method === "POST") {
      const roundIndex = Number(answerMatch[1]);
      answerIndices.push(roundIndex);
      answeredRounds = [...new Set([...answeredRounds, roundIndex])];
      if (roundIndex === 2 && !conflictedRound) {
        conflictedRound = true;
        return route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ success: false, error: { code: "CONFLICT", message: "You already answered this round" } }) });
      }
      const round = rounds[roundIndex]!;
      return route.fulfill(envelope({
        roundIndex,
        results: [{ index: 0, type: round.type, correct: true, fraction: 1, correctAnswer: null, explanation: "Dijelaskan oleh sumber.", topic: round.topic, ref: { sourceId: "7a0129a7-d38c-41aa-a1d5-a31241d80c45", sourceTitle: "Modul Jaringan", page: 1 } }],
        correctCount: 1,
        total: 1,
        points: 100,
        reaction: { animation: "nod", emotion: "senang" },
        scoreboard: [],
      }, 201));
    }
    if (pathname === `${base}/finish` && method === "POST") return route.fulfill(envelope({ sessionId, points: 700, accuracyPercent: 100, correct: 7, total: 7, streak: 1, badgesEarned: [], weakTopics: [], recoveryTopics: [], rank: 1, players: 1, reaction: { animation: "celebrate", emotion: "semangat" } }));
    return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ success: false, error: { code: "NOT_FOUND", message: `No mock for ${method} ${pathname}` } }) });
  });

  await page.goto(`/workspaces/${notebookId}/sessions/${sessionId}`);
  for (const round of rounds) {
    await expect(page.getByRole("heading", { name: round.items[0]!.prompt })).toBeVisible();
    if (round.type === "mcq") {
      const choice = page.getByRole("radio", { name: "Switch pusat" });
      await choice.focus();
      await choice.press("Space");
    }
    if (round.type === "fill") await page.getByLabel("Jawabanmu").fill("String");
    if (round.type === "tf") {
      const choice = page.getByRole("radio", { name: "Benar" });
      await choice.focus();
      await choice.press("Space");
    }
    if (round.type === "order") await page.getByRole("button", { name: "Pindahkan langkah 2 ke atas" }).click();
    if (round.type === "match") {
      await page.getByRole("combobox", { name: "Pasangan untuk Stack" }).click();
      await page.getByRole("option", { name: "LIFO" }).click();
    }
    if (round.type === "guess_page") {
      const choice = page.getByRole("radio", { name: /Modul Java/ });
      await choice.focus();
      await choice.press("Space");
    }
    if (round.type === "teach") await page.getByLabel("Jelaskan dengan kata-katamu sendiri").fill("String menyimpan teks sebagai rangkaian karakter.");
    await page.getByRole("button", { name: "Kirim jawaban" }).click();
    if (round.index === 2) {
      await expect(page.getByRole("heading", { name: rounds[3]!.items[0]!.prompt })).toBeVisible();
      continue;
    }
    await expect(page.getByRole("heading", { name: "1 dari 1 benar" })).toBeVisible();
    if (round.index === 0) {
      await stalePollStarted;
      await page.getByRole("button", { name: "Lanjut ronde 2" }).click();
      await expect(page.getByText("Ronde kedua", { exact: true })).toBeVisible();
      releaseStalePoll();
      await page.reload();
      await expect(page.getByRole("heading", { name: rounds[1]!.items[0]!.prompt })).toBeVisible();
      continue;
    }
    const nextButton = round.index === rounds.length - 1 ? "Lihat hasil sesi" : `Lanjut ronde ${round.index + 2}`;
    await page.getByRole("button", { name: nextButton }).click();
  }

  await expect(page.getByRole("heading", { name: "Sesi selesai" })).toBeVisible();
  expect(answerIndices).toEqual([0, 1, 2, 3, 4, 5, 6]);
});

test("quiz navigation changes questions and preserves answers when going back", async ({ page }) => {
  test.setTimeout(90_000);
  let submittedAnswers: unknown;
  const questions = [
    { question: "Soal kuis pertama?", options: ["1A", "1B", "1C", "1D"], topic: "String" },
    { question: "Soal kuis kedua?", options: ["2A", "2B", "2C", "2D"], topic: "String" },
    { question: "Soal kuis ketiga?", options: ["3A", "3B", "3C", "3D"], topic: "String" },
  ];
  await page.route("**/api/v1/**", async (route: Route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    const method = request.method();
    if (pathname === "/api/v1/auth/me") return route.fulfill(envelope({ id: hostId, email: "maul@example.com", name: "Maul", course: "Informatika" }));
    if (pathname === `/api/v1/notebooks/${notebookId}`) return route.fulfill(envelope({ id: notebookId, title: "Belajar Jaringan", course: "Informatika", description: null, category: null, visibility: "private", ownerId: hostId, role: "owner", createdAt: new Date().toISOString() }));
    if (pathname === `/api/v1/notebooks/${notebookId}/quizzes/${quizId}` && method === "GET") return route.fulfill(envelope({ id: quizId, title: "Latihan String", kind: "practice", timeLimitSec: null, perQuestionSec: null, dueAt: null, questions }));
    if (pathname === `/api/v1/notebooks/${notebookId}/quizzes/${quizId}/attempts` && method === "POST") {
      submittedAnswers = request.postDataJSON().answers;
      return route.fulfill(envelope({ attemptId: sessionId, score: 3, total: 3, durationMs: 20_000, results: questions.map((question, index) => ({ index, chosen: index + 1, correct: true, correctIndex: index + 1, explanation: "Sesuai sumber.", topic: question.topic, sourceId: "7a0129a7-d38c-41aa-a1d5-a31241d80c45", sourceTitle: "Modul Jaringan", page: index + 1 })) }, 201));
    }
    return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ success: false, error: { code: "NOT_FOUND", message: `No mock for ${method} ${pathname}` } }) });
  });

  await page.goto(`/workspaces/${notebookId}/quizzes/${quizId}`);
  await expect(page.getByRole("heading", { name: "Soal kuis pertama?" })).toBeVisible();
  await page.getByRole("radio", { name: "1B" }).check();
  await page.getByRole("button", { name: "Selanjutnya" }).click();
  await expect(page.getByRole("heading", { name: "Soal kuis kedua?" })).toBeVisible();
  await page.getByRole("radio", { name: "2C" }).check();
  await page.getByRole("button", { name: "Sebelumnya" }).click();
  await expect(page.getByRole("heading", { name: "Soal kuis pertama?" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "1B" })).toBeChecked();
  await page.getByRole("button", { name: "Selanjutnya" }).click();
  await expect(page.getByRole("heading", { name: "Soal kuis kedua?" })).toBeVisible();
  await page.getByRole("button", { name: "Selanjutnya" }).click();
  await expect(page.getByRole("heading", { name: "Soal kuis ketiga?" })).toBeVisible();
  await expect(page.getByText("Soal 3 dari 3")).toBeVisible();
  await page.getByRole("radio", { name: "3D" }).check();
  await page.getByRole("button", { name: "Kumpulkan latihan" }).click();
  await expect(page.getByRole("heading", { name: "Sesi selesai!" })).toBeVisible();
  expect(submittedAnswers).toEqual([1, 2, 3]);
});

test("game round shows one question at a time and confirms a new streak once", async ({ page }) => {
  test.setTimeout(90_000);
  let submittedAnswers: unknown;
  const questions = [
    { type: "mcq", prompt: "Soal ronde pertama?", options: ["1A", "1B", "1C", "1D"], topic: "String" },
    { type: "mcq", prompt: "Soal ronde kedua?", options: ["2A", "2B", "2C", "2D"], topic: "String" },
  ];
  const round = { index: 0, type: "mcq", topic: "String", timeLimitSec: 120, items: questions, cue: { intro: "Satu soal dulu, lalu lanjut.", introAnimation: "wave", introEmotion: "senang" } };
  const session = { id: sessionId, hostId, mode: "solo", status: "running", focusTopic: null, roundCount: 1, rounds: [round], answeredRounds: [], participants: [{ userId: hostId, name: "Maul", score: 0, finished: false, roundsAnswered: 0 }], reactions: {} };
  let finished = false;
  await page.route("**/api/v1/**", async (route: Route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    const method = request.method();
    if (pathname === "/api/v1/auth/me") return route.fulfill(envelope({ id: hostId, email: "maul@example.com", name: "Maul", course: "Informatika" }));
    if (pathname === `/api/v1/notebooks/${notebookId}`) return route.fulfill(envelope({ id: notebookId, title: "Belajar Jaringan", course: "Informatika", description: null, category: null, visibility: "private", ownerId: hostId, role: "owner", createdAt: new Date().toISOString() }));
    if (pathname === `${base}/rounds/0/answer` && method === "POST") {
      submittedAnswers = request.postDataJSON().answers;
      return route.fulfill(envelope({ roundIndex: 0, results: questions.map((question, index) => ({ index, type: "mcq", correct: true, fraction: 1, correctAnswer: index, explanation: "Sesuai sumber.", topic: question.topic, ref: { sourceId: "7a0129a7-d38c-41aa-a1d5-a31241d80c45", sourceTitle: "Modul String", page: index + 1 } })), correctCount: 2, total: 2, points: 200, reaction: { animation: "celebrate", emotion: "semangat" }, scoreboard: [] }, 201));
    }
    if (pathname === `${base}/finish` && method === "POST") { finished = true; return route.fulfill(envelope({ sessionId, points: 200, accuracyPercent: 100, correct: 2, total: 2, streak: 3, badgesEarned: [], weakTopics: [], recoveryTopics: [], rank: 1, players: 1, reaction: { animation: "celebrate", emotion: "semangat" } })); }
    if (pathname === "/api/v1/me/stats") {
      if (method === "GET") return route.fulfill(envelope({ points: 200, streak: finished ? 3 : 2, bestStreak: finished ? 3 : 2, lastPlayDate: finished ? new Date().toISOString() : new Date(Date.now() - 86_400_000).toISOString(), sessionsPlayed: finished ? 2 : 1, playedToday: finished, badges: [], allBadges: [] }));
    }
    if (pathname === base && method === "GET") return route.fulfill(envelope(session));
    if (pathname === "/api/v1/feed") return route.fulfill(envelope({ posts: [], nextBefore: null }));
    return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ success: false, error: { code: "NOT_FOUND", message: `No mock for ${method} ${pathname}` } }) });
  });

  await page.goto(`/workspaces/${notebookId}/sessions/${sessionId}`);
  await expect(page.getByRole("heading", { name: "Soal ronde pertama?" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Soal ronde kedua?" })).toHaveCount(0);
  await page.getByRole("button", { name: "Soal berikutnya" }).click();
  await expect(page.getByRole("heading", { name: "Soal ronde kedua?" })).toBeVisible();
  await page.getByRole("button", { name: "Kirim jawaban ronde" }).click();
  await expect(page.getByRole("heading", { name: "Soal ronde pertama?" })).toBeFocused();
  await expect(page.getByRole("alert")).toContainText("Soal 1 belum dijawab");
  const firstChoice = page.getByRole("radio", { name: "1A" });
  await firstChoice.focus();
  await firstChoice.press("Space");
  await page.getByRole("button", { name: "Soal berikutnya" }).click();
  await expect(page.getByRole("heading", { name: "Soal ronde kedua?" })).toBeVisible();
  const secondChoice = page.getByRole("radio", { name: "2B" });
  await secondChoice.focus();
  await secondChoice.press("Space");
  await page.getByRole("button", { name: /Buka soal 1/ }).click();
  await expect(page.getByRole("radio", { name: "1A" })).toBeChecked();
  await page.getByRole("button", { name: /Buka soal 2/ }).click();
  await expect(page.getByRole("radio", { name: "2B" })).toBeChecked();
  await page.getByRole("button", { name: "Kirim jawaban ronde" }).click();
  await expect(page.getByRole("heading", { name: "2 dari 2 benar" })).toBeVisible();
  expect(submittedAnswers).toEqual([0, 1]);
  await page.getByRole("button", { name: "Lihat hasil sesi" }).click();
  await expect(page.getByRole("heading", { name: "Sesi selesai" })).toBeVisible();
  await page.goto("/home");
  const streakCard = page.getByLabel("Streak belajar 3 hari");
  await expect(streakCard).toHaveAttribute("data-celebrating", "true");
  await expect(streakCard.getByRole("status")).toContainText("Streak bertambah menjadi 3 hari");
  await expect(streakCard.locator(".streak-card__mascot")).toHaveCSS("animation-name", "streak-bubi-pop");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(streakCard.locator(".streak-card__mascot")).toHaveCSS("animation-name", "none");
  await expect(streakCard.getByRole("status")).toContainText("Streak bertambah menjadi 3 hari");
});

test("match game submits partial pairs and explains the proportional score", async ({ page }) => {
  test.setTimeout(90_000);
  let submitted: unknown;
  const item = { type: "match", prompt: "Pasangkan struktur data dengan urutan pengambilannya.", lefts: ["Queue", "Stack", "Graph", "Tree"], rights: ["FIFO", "LIFO", "Edges", "Root"], topic: "Struktur data", scoring: "proportional" };
  const round = { index: 0, type: "match", topic: "Struktur data", timeLimitSec: 90, items: [item], cue: { intro: "Coba pasangkan yang kamu tahu.", introAnimation: "think", introEmotion: "idle" } };
  const session = { id: sessionId, hostId, mode: "solo", status: "running", focusTopic: null, roundCount: 1, rounds: [round], answeredRounds: [], participants: [{ userId: hostId, name: "Maul", score: 0, finished: false, roundsAnswered: 0 }], reactions: {} };
  await page.route("**/api/v1/**", async (route: Route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname === "/api/v1/auth/me") return route.fulfill(envelope({ id: hostId, email: "maul@example.com", name: "Maul", course: "Informatika" }));
    if (pathname === `/api/v1/notebooks/${notebookId}`) return route.fulfill(envelope({ id: notebookId, title: "Belajar Data", course: "Informatika", description: null, category: null, visibility: "private", ownerId: hostId, role: "owner", createdAt: new Date().toISOString() }));
    if (pathname === base && request.method() === "GET") return route.fulfill(envelope(session));
    if (pathname === `${base}/rounds/0/answer` && request.method() === "POST") {
      submitted = request.postDataJSON();
      return route.fulfill(envelope({
        roundIndex: 0,
        results: [{ index: 0, type: "match", correct: false, fraction: 0.5, correctAnswer: [0, 1, 2, 3], chosenAnswer: [0, 1, -1, -1], explanation: "Queue memakai FIFO; stack memakai LIFO.", topic: "Struktur data", ref: { sourceId: "7a0129a7-d38c-41aa-a1d5-a31241d80c45", sourceTitle: "Modul Struktur Data", page: 2 } }],
        correctCount: 0, total: 1, points: 50, speedBonusPoints: 0,
        reaction: { animation: "nod", emotion: "senang" }, scoreboard: [],
      }, 201));
    }
    return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ success: false, error: { code: "NOT_FOUND", message: `No mock for ${request.method()} ${pathname}` } }) });
  });

  await page.goto(`/workspaces/${notebookId}/sessions/${sessionId}`);
  await expect(page.getByRole("heading", { name: item.prompt })).toBeVisible();
  for (const [term, definition] of [["Queue", "FIFO"], ["Stack", "LIFO"]]) {
    await page.getByRole("combobox", { name: `Pasangan untuk ${term}` }).click();
    await page.getByRole("option", { name: definition }).click();
  }
  await expect(page.getByText("2 dari 4", { exact: false }).first()).toBeVisible();
  await page.getByRole("button", { name: "Kirim jawaban" }).click();
  await expect(page.getByRole("heading", { name: "0 dari 1 benar" })).toBeVisible();
  await expect(page.getByText("2 dari 4 pasangan tepat")).toBeVisible();
  await expect(page.getByText("50 poin")).toBeVisible();
  await expect(page.getByText("Pilihanmu: Belum dipilih").first()).toBeVisible();
  expect(submitted).toMatchObject({ answers: [[0, 1, -1, -1]] });
});

test("step ordering supports pointer drag and keyboard controls", async ({ page }) => {
  test.setTimeout(90_000);
  let submitted: unknown;
  const item = { type: "order", prompt: "Susun langkah membuat program.", steps: [{ id: 10, text: "Mulai" }, { id: 20, text: "Proses data" }, { id: 30, text: "Tampilkan hasil" }], topic: "Algoritma" };
  const round = { index: 0, type: "order", topic: "Algoritma", timeLimitSec: 90, items: [item], cue: { intro: "Urutkan langkahnya.", introAnimation: "think", introEmotion: "idle" } };
  const session = { id: sessionId, hostId, mode: "solo", status: "running", focusTopic: null, roundCount: 1, rounds: [round], answeredRounds: [], participants: [{ userId: hostId, name: "Maul", score: 0, finished: false, roundsAnswered: 0 }], reactions: {} };
  await page.route("**/api/v1/**", async (route: Route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname === "/api/v1/auth/me") return route.fulfill(envelope({ id: hostId, email: "maul@example.com", name: "Maul", course: "Informatika" }));
    if (pathname === `/api/v1/notebooks/${notebookId}`) return route.fulfill(envelope({ id: notebookId, title: "Belajar Algoritma", course: "Informatika", description: null, category: null, visibility: "private", ownerId: hostId, role: "owner", createdAt: new Date().toISOString() }));
    if (pathname === base && request.method() === "GET") return route.fulfill(envelope(session));
    if (pathname === `${base}/rounds/0/answer` && request.method() === "POST") {
      submitted = request.postDataJSON();
      return route.fulfill(envelope({ roundIndex: 0, results: [{ index: 0, type: "order", correct: true, fraction: 1, correctAnswer: [20, 30, 10], chosenAnswer: [20, 30, 10], explanation: "Urutan proses sesuai materi.", topic: "Algoritma", ref: { sourceId: "7a0129a7-d38c-41aa-a1d5-a31241d80c45", sourceTitle: "Modul Algoritma", page: 1 } }], correctCount: 1, total: 1, points: 100, speedBonusPoints: 0, reaction: { animation: "nod", emotion: "senang" }, scoreboard: [] }, 201));
    }
    return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ success: false, error: { code: "NOT_FOUND", message: `No mock for ${request.method()} ${pathname}` } }) });
  });

  await page.goto(`/workspaces/${notebookId}/sessions/${sessionId}`);
  const firstStep = page.locator("ol li").nth(0);
  const secondStep = page.locator("ol li").nth(1);
  const dragHandle = firstStep.getByRole("button", { name: "Seret langkah 1" });
  const handleBox = await dragHandle.boundingBox();
  const secondBox = await secondStep.boundingBox();
  expect(handleBox).not.toBeNull();
  expect(secondBox).not.toBeNull();
  await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(handleBox!.x + handleBox!.width / 2 + 2, handleBox!.y + handleBox!.height / 2 + 8);
  await page.mouse.move(secondBox!.x + 40, secondBox!.y + secondBox!.height * 0.75, { steps: 12 });
  await page.mouse.up();
  await expect(page.locator("ol li").nth(0)).toContainText("Proses data");
  const steps = await page.locator("ol li").allTextContents();
  expect(steps[0]).toContain("Proses data");
  expect(steps[1]).toContain("Mulai");
  const keyboardDragHandle = page.getByRole("button", { name: "Seret langkah 3" });
  await keyboardDragHandle.focus();
  await keyboardDragHandle.press("Space");
  await keyboardDragHandle.press("ArrowUp");
  await keyboardDragHandle.press("Space");
  const keyboardDragSteps = await page.locator("ol li").allTextContents();
  expect(keyboardDragSteps[1]).toContain("Tampilkan hasil");
  const moveDown = page.getByRole("button", { name: "Pindahkan langkah 2 ke bawah" });
  await moveDown.focus();
  await moveDown.press("Enter");
  const moveUp = page.getByRole("button", { name: "Pindahkan langkah 3 ke atas" });
  await moveUp.focus();
  await moveUp.press("Enter");
  const keyboardSteps = await page.locator("ol li").allTextContents();
  expect(keyboardSteps[1]).toContain("Tampilkan hasil");
  await page.getByRole("button", { name: "Kirim jawaban" }).click();
  await expect(page.getByRole("heading", { name: "1 dari 1 benar" })).toBeVisible();
  expect(submitted).toMatchObject({ answers: [[20, 30, 10]] });
});
