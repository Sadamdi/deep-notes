import { expect, test, type Page, type Route } from "@playwright/test";

const userId = "a9d101e4-4410-45bb-8256-ff31a18a47fb";
const notebookId = "d1c7d4c7-cb6c-4bd3-a775-1d72c0107c71";
const sourceId = "bc3ff9f5-c1a2-45af-b18e-6acd74d97294";

function success(data: unknown) {
  return { status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data }) };
}

function failure(code: string, message: string, status: number) {
  return { status, contentType: "application/json", body: JSON.stringify({ success: false, error: { code, message } }) };
}

async function mockWorkspace(page: Page, onRequest?: (pathname: string) => boolean) {
  await page.route("**/api/v1/**", async (route: Route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (onRequest?.(pathname)) return route.fulfill(failure("VALIDATION", "Invalid request", 400));
    if (pathname === "/api/v1/auth/me") return route.fulfill(success({ id: userId, email: "maul@example.com", name: "Maul", course: "Informatika", lookingForPartners: false }));
    if (pathname === "/api/v1/me/notifications") return route.fulfill(success({ items: [], unreadCount: 0 }));
    if (pathname === `/api/v1/notebooks/${notebookId}`) return route.fulfill(success({ id: notebookId, title: "Belajar Data", course: "Informatika", description: null, category: null, visibility: "private", ownerId: userId, role: "owner", createdAt: new Date().toISOString() }));
    if (pathname === `/api/v1/notebooks/${notebookId}/sources`) return route.fulfill(success([
      { id: sourceId, title: "Modul Struktur Data", kind: "pdf", status: "ready", error: null, pageCount: 3, origin: null, createdAt: new Date().toISOString(), uploadedBy: userId, uploadedByName: "Maul", chunkCount: 3 },
    ]));
    if (pathname === `/api/v1/notebooks/${notebookId}/discussion` || pathname === `/api/v1/notebooks/${notebookId}/notes`) return route.fulfill(failure("NOT_FOUND", "Route not found", 404));
    if (pathname === `/api/v1/notebooks/${notebookId}/ai/assist`) return route.fulfill(failure("VALIDATION", "Invalid request", 400));
    return route.fulfill(failure("NOT_FOUND", `No mock for ${request.method()} ${pathname}`, 404));
  });
}

test("discussion and notes keep a route back to learning when the API fails", async ({ page }) => {
  await mockWorkspace(page);

  for (const section of ["discussion", "notes"]) {
    await page.goto(`/workspaces/${notebookId}/${section}`);
    await expect(page.getByRole("alert")).toContainText("Server belum menyediakan API");
    const back = page.getByRole("link", { name: "Kembali ke belajar" });
    await expect(back).toBeVisible();
    await expect(back).toHaveAttribute("href", `/workspaces/${notebookId}`);
  }
});

test("suggestion API validation error explains the backend contract and leaves manual ask available", async ({ page }) => {
  let suggestionRequested = false;
  await mockWorkspace(page, (pathname) => {
    if (pathname !== `/api/v1/notebooks/${notebookId}/ai/assist`) return false;
    suggestionRequested = true;
    return true;
  });

  await page.goto(`/workspaces/${notebookId}`);
  await expect(page.getByText(/Backend menolak format permintaan saran/)).toBeVisible();
  expect(suggestionRequested).toBe(true);
  await expect(page.getByLabel("Tanyakan sesuatu")).toBeEnabled();
  await page.getByLabel("Tanyakan sesuatu").fill("Apa isi materi ini?");
  await expect(page.getByRole("button", { name: "Tanyakan" })).toBeEnabled();
});
