import { expect, test, type Page, type Route } from "@playwright/test";

const userId = "a9d101e4-4410-45bb-8256-ff31a18a47fb";
const notebookId = "d1c7d4c7-cb6c-4bd3-a775-1d72c0107c71";
const spreadsheetId = "bc3ff9f5-c1a2-45af-b18e-6acd74d97294";
const slidesId = "574bf0a2-b20f-46f7-92a5-96f47e2c502a";
const audioId = "7a0129a7-d38c-41aa-a1d5-a31241d80c45";

function envelope(data: unknown, status = 200) {
  return { status, contentType: "application/json", body: JSON.stringify({ success: true, data }) };
}

async function mockSharedPageApi(page: Page) {
  await page.route("**/api/v1/**", async (route: Route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname === "/api/v1/auth/me") return route.fulfill(envelope({ id: userId, email: "maul@example.com", name: "Maul", course: "Informatika", lookingForPartners: false }));
    if (pathname === "/api/v1/me/notifications") return route.fulfill(envelope({ items: [], unreadCount: 0 }));
    if (pathname === "/api/v1/me/stats") return route.fulfill(envelope({ points: 2332, streak: 25, bestStreak: 25, lastPlayDate: new Date().toISOString(), sessionsPlayed: 4, playedToday: true, badges: [], allBadges: [] }));
    if (pathname === "/api/v1/notebooks") return route.fulfill(envelope([]));
    if (pathname === "/api/v1/feed") return route.fulfill(envelope({ posts: [], nextBefore: null }));
    if (pathname === `/api/v1/notebooks/${notebookId}`) return route.fulfill(envelope({ id: notebookId, title: "Belajar Data", course: "Informatika", description: null, category: null, visibility: "private", ownerId: userId, role: "owner", createdAt: new Date().toISOString() }));
    if (pathname === `/api/v1/notebooks/${notebookId}/sources`) return route.fulfill(envelope([
      { id: spreadsheetId, title: "Nilai praktikum", kind: "xlsx", status: "ready", error: null, pageCount: 1, origin: null, createdAt: new Date().toISOString(), uploadedBy: userId, uploadedByName: "Maul", chunkCount: 1 },
      { id: slidesId, title: "Pengantar materi", kind: "pptx", status: "ready", error: null, pageCount: 2, origin: null, createdAt: new Date().toISOString(), uploadedBy: userId, uploadedByName: "Maul", chunkCount: 2 },
      { id: audioId, title: "Diskusi kelas", kind: "audio", status: "ready", error: null, pageCount: null, origin: null, createdAt: new Date().toISOString(), uploadedBy: userId, uploadedByName: "Maul", chunkCount: 1 },
    ]));
    if (pathname === `/api/v1/notebooks/${notebookId}/sources/${spreadsheetId}/visual`) return route.fulfill(envelope({ sourceId: spreadsheetId, kind: "chart", cached: true, tables: [{ name: "Nilai praktikum", categoryColumn: "Kelompok", series: [{ name: "Nilai", points: [{ label: "Kelompok A", value: 12.5 }, { label: "Kelompok B", value: 18 }] }] }] }));
    if (pathname === `/api/v1/notebooks/${notebookId}/sources/${slidesId}/visual`) return route.fulfill(envelope({ sourceId: slidesId, kind: "timeline", cached: true, slides: [{ slide: 1, text: "Tujuan pembelajaran" }, { slide: 2, text: "Struktur data dan algoritma" }] }));
    if (pathname === `/api/v1/notebooks/${notebookId}/sources/${audioId}/transcript`) return route.fulfill(envelope({ sourceId: audioId, segments: [{ startSec: 12, endSec: 18, text: "Pertama, kita susun data berdasarkan nilainya." }] }));
    return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ success: false, error: { code: "NOT_FOUND", message: `No mock for ${request.method()} ${pathname}` } }) });
  });
}

test("streak card shows the Figma tier and day count on Profile and Home", async ({ page }) => {
  await mockSharedPageApi(page);
  await page.goto("/profile");
  const profileStreak = page.getByRole("region", { name: "Streak belajar 25 hari" });
  await expect(profileStreak).toBeVisible();
  await expect(profileStreak).toContainText("25 hari");
  await expect(profileStreak.locator('img[src="/assets/streak-25-bubi.svg"]')).toBeAttached();

  await page.goto("/home");
  const homeStreak = page.getByRole("region", { name: "Streak belajar 25 hari" });
  await expect(homeStreak).toBeVisible();
  await expect(homeStreak).toContainText("25 hari");
});

test("workspace visualizations show spreadsheet values, ordered slides, and transcript timing", async ({ page }) => {
  await mockSharedPageApi(page);
  await page.goto(`/workspaces/${notebookId}/visualization`);
  await expect(page.getByRole("heading", { name: "Visualisasi materi" })).toBeVisible();

  await page.getByRole("button", { name: "Grafik data" }).click();
  await expect(page.getByRole("heading", { name: "Grafik dari tabel" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Nilai praktikum" })).toBeVisible();
  await expect(page.locator('data[value="12.5"]')).toBeVisible();

  await page.getByLabel("Pilih sumber untuk visualisasi").selectOption(slidesId);
  await page.getByRole("button", { name: "Linimasa slide" }).click();
  await expect(page.getByRole("heading", { name: "Slide 2" })).toBeVisible();
  await expect(page.getByText("Struktur data dan algoritma")).toBeVisible();

  await page.getByLabel("Pilih sumber untuk visualisasi").selectOption(audioId);
  await expect(page.getByRole("heading", { name: "Transkrip audio" })).toBeVisible();
  await expect(page.getByText("0:12–0:18")).toBeVisible();
  await expect(page.getByText("Pertama, kita susun data berdasarkan nilainya.")).toBeVisible();
});

test("Studio preview opens the real publication flow with its draft selected", async ({ page }) => {
  const draftId = "2ec605fe-b87a-46be-89b6-74b5834e7b4d";
  const draft = { id: draftId, title: "Algoritma pencarian", summary: "Ringkasan algoritma", body: "Pencarian biner membagi rentang data menjadi dua.", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  await page.route("**/api/v1/**", async (route: Route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname === "/api/v1/auth/me") return route.fulfill(envelope({ id: userId, email: "maul@example.com", name: "Maul", course: "Informatika", lookingForPartners: false }));
    if (pathname === "/api/v1/me/notifications") return route.fulfill(envelope({ items: [], unreadCount: 0 }));
    if (pathname === "/api/v1/me/drafts") return route.fulfill(envelope([draft]));
    if (pathname === "/api/v1/notebooks") return route.fulfill(envelope([]));
    if (pathname === "/api/v1/publications") return route.fulfill(envelope({ items: [], nextCursor: null }));
    if (pathname === `/api/v1/authors/${userId}/publications`) return route.fulfill(envelope({ items: [], nextCursor: null }));
    return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ success: false, error: { code: "NOT_FOUND", message: `No mock for ${request.method()} ${pathname}` } }) });
  });

  await page.goto(`/studio/preview/${draftId}`);
  await expect(page.getByRole("heading", { name: "Algoritma pencarian" })).toBeVisible();
  await page.getByRole("link", { name: "Atur audiens" }).click();
  await expect(page).toHaveURL(new RegExp(`/publications\\?draft=${draftId}`));
  await expect(page.getByLabel("Draft Studio")).toHaveValue(draftId);
  await expect(page.getByRole("button", { name: "Terbitkan artikel" })).toBeEnabled();
});
