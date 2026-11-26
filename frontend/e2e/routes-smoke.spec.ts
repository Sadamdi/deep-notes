import { expect, test, type Route } from "@playwright/test";

const userId = "a9d101e4-4410-45bb-8256-ff31a18a47fb";
const notebookId = "d1c7d4c7-cb6c-4bd3-a775-1d72c0107c71";
const sourceId = "7a0129a7-d38c-41aa-a1d5-a31241d80c45";
const sessionId = "82d2a741-e44c-4316-aad4-3f55fd876844";
const quizId = "b0c9701e-22bb-46b0-8eab-0d4c5d65257b";

function envelope(data: unknown, status = 200) {
  return { status, contentType: "application/json", body: JSON.stringify({ success: true, data }) };
}

test("all app routes render without browser exceptions during API loading and failures", async ({ page }) => {
  test.setTimeout(120_000);
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  await page.route("**/api/v1/**", async (route: Route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname === "/api/v1/auth/me") return route.fulfill(envelope({ id: userId, email: "maul@example.com", name: "Maul", course: "Informatika", lookingForPartners: false }));
    if (pathname === "/api/v1/me/notifications") return route.fulfill(envelope({ items: [], unreadCount: 0 }));
    if (pathname === "/api/v1/me/stats") return route.fulfill(envelope({ points: 0, streak: 0, bestStreak: 0, lastPlayDate: null, sessionsPlayed: 0, playedToday: false, badges: [], allBadges: [] }));
    if (pathname === "/api/v1/me/friends") return route.fulfill(envelope({ friends: [], requests: [] }));
    if (pathname === "/api/v1/me/drafts" || pathname === "/api/v1/notebooks" || pathname === "/api/v1/public/notebooks") return route.fulfill(envelope([]));
    if (pathname === "/api/v1/feed") return route.fulfill(envelope({ posts: [], nextBefore: null }));
    if (pathname === "/api/v1/saved-posts") return route.fulfill(envelope({ posts: [] }));
    if (pathname === "/api/v1/publications" || pathname.startsWith("/api/v1/authors/")) return route.fulfill(envelope({ items: [], nextCursor: null }));
    if (pathname === `/api/v1/notebooks/${notebookId}`) return route.fulfill(envelope({ id: notebookId, title: "Workspace uji", course: "Informatika", description: null, category: null, visibility: "private", ownerId: userId, role: "owner", createdAt: new Date().toISOString() }));
    if (pathname === `/api/v1/notebooks/${notebookId}/sources`) return route.fulfill(envelope([]));
    return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ success: false, error: { code: "NOT_FOUND", message: `Route smoke mock: ${request.method()} ${pathname}` } }) });
  });

  const routes = [
    "/", "/login", "/register", "/recover", "/home", "/following", "/saved",
    "/workspaces", "/discover", "/profile", "/friends", "/account", "/studio",
    "/publications", `/articles/${quizId}`, `/authors/${userId}`, `/users/${userId}`,
    "/workspaces/new", `/workspaces/${notebookId}`, `/workspaces/${notebookId}/team`,
    `/workspaces/${notebookId}/companion`, `/workspaces/${notebookId}/notes`,
    `/workspaces/${notebookId}/discussion`, `/workspaces/${notebookId}/class`,
    `/workspaces/${notebookId}/visualization`, `/workspaces/${notebookId}/sources/${sourceId}/map`,
    "/game", `/game/${notebookId}`, `/game/${notebookId}/sessions/${sessionId}`,
    `/game/${notebookId}/quizzes/${quizId}`, `/join/sample-invite-token`,
  ];

  for (const path of routes) {
    await page.goto(path);
    try {
      await expect(page.getByRole("main").first()).toBeVisible({ timeout: 4_000 });
      if (!new Set(["/", "/login", "/register", "/recover"]).has(path)) {
        await expect(page.locator('nav[aria-label="Navigasi utama"]')).toBeAttached({ timeout: 4_000 });
      }
      await expect(page.getByRole("heading", { name: "Unexpected Application Error!" })).toHaveCount(0, { timeout: 1_000 });
    } catch (error) {
      throw new Error(`Route ${path} did not render cleanly: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  expect(browserErrors).toEqual([]);
});
