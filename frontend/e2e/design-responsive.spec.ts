import { expect, test, type Page, type Route } from "@playwright/test";

const userId = "a9d101e4-4410-45bb-8256-ff31a18a47fb";
const notebookId = "d1c7d4c7-cb6c-4bd3-a775-1d72c0107c71";

function envelope(data: unknown, status = 200) {
  return { status, contentType: "application/json", body: JSON.stringify({ success: true, data }) };
}

async function expectNoHorizontalOverflow(page: Page) {
  const layout = await page.evaluate(() => ({
    fits: document.documentElement.scrollWidth <= window.innerWidth,
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    offenders: [...document.querySelectorAll("body *")]
      .map((element) => ({ name: element.tagName.toLowerCase(), className: typeof element.className === "string" ? element.className : "", text: element.textContent?.trim().slice(0, 36), right: Math.round(element.getBoundingClientRect().right) }))
      .filter((element) => element.right > window.innerWidth + 1)
      .slice(0, 8),
  }));
  expect(layout.fits, `Unexpected horizontal overflow: ${JSON.stringify(layout)}`).toBe(true);
}

test("landing, auth, workspace preview, tabs, and home fit narrow screens", async ({ page }) => {
  test.setTimeout(90_000);
  let authenticated = false;
  let hasNotebook = true;
  let notebookRequestFails = false;
  const user = { id: userId, email: "maul@example.com", name: "Maul", course: "Informatika", lookingForPartners: false };
  const notebook = { id: notebookId, title: "Workspace uji untuk memastikan judul yang sangat panjang tetap rapi di layar ponsel", course: "Informatika", description: "Materi untuk cek tampilan", category: "Informatika", visibility: "private", ownerId: userId, role: "owner", createdAt: "2026-11-28T00:00:00.000Z" };

  await page.route("**/api/v1/**", async (route: Route) => {
    const { pathname } = new URL(route.request().url());
    if (pathname === "/api/v1/auth/me") {
      return authenticated
        ? route.fulfill(envelope(user))
        : route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ success: false, error: { code: "UNAUTHORIZED", message: "Silakan masuk." } }) });
    }
    if (pathname === "/api/v1/me/notifications") return route.fulfill(envelope({ items: [], unreadCount: 0 }));
    if (pathname === "/api/v1/me/stats") return route.fulfill(envelope({ points: 0, streak: 3, bestStreak: 4, lastPlayDate: "2026-11-28", sessionsPlayed: 1, playedToday: true, badges: [], allBadges: [] }));
    if (pathname === "/api/v1/notebooks") {
      return notebookRequestFails
        ? route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ success: false, error: { code: "UNAVAILABLE", message: "Notebook sementara tidak tersedia." } }) })
        : route.fulfill(envelope(hasNotebook ? [notebook] : []));
    }
    if (pathname === `/api/v1/notebooks/${notebookId}`) return route.fulfill(envelope(notebook));
    if (pathname === `/api/v1/notebooks/${notebookId}/sources`) return route.fulfill(envelope([]));
    if (pathname === "/api/v1/feed") return route.fulfill(envelope({ posts: [], nextBefore: null }));
    return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ success: false, error: { code: "NOT_FOUND", message: `Responsive fixture: ${route.request().method()} ${pathname}` } }) });
  });

  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 850 });
    await page.emulateMedia({ reducedMotion: "no-preference" });

    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Pahami materi kuliah bareng Bubi/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "Mulai belajar" }).last()).toBeVisible();
    await expect(page.locator(".landing-mobile-bubi .bubi-mascot-art")).toBeVisible();
    expect(await page.locator(".landing-mobile-bubi .bubi-mascot-art").evaluate((element) => getComputedStyle(element).animationName)).toBe("bubi-card-emerge");
    const landingControlsAvoidBubi = await page.evaluate(() => {
      const mascot = document.querySelector(".landing-mobile-bubi")?.getBoundingClientRect();
      const signIn = document.querySelector('.landing-hero a[href="/login"]')?.getBoundingClientRect();
      return Boolean(mascot && signIn && (mascot.bottom <= signIn.top || mascot.top >= signIn.bottom || mascot.right <= signIn.left || mascot.left >= signIn.right));
    });
    expect(landingControlsAvoidBubi).toBe(true);
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(await page.locator(".landing-mobile-bubi .bubi-mascot-art").evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
    await expectNoHorizontalOverflow(page);

    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
    await expect(page.locator(".auth-bubi-mobile .bubi-mascot-art")).toBeVisible();
    const authControlsAvoidBubi = await page.evaluate(() => {
      const mascot = document.querySelector(".auth-bubi-mobile")?.getBoundingClientRect();
      const button = document.querySelector(".auth-primary-button")?.getBoundingClientRect();
      return Boolean(mascot && button && (mascot.bottom <= button.top || mascot.top >= button.bottom || mascot.right <= button.left || mascot.left >= button.right));
    });
    expect(authControlsAvoidBubi).toBe(true);
    expect(await page.locator(".auth-bubi-mobile .bubi-mascot-motion").evaluate((element) => getComputedStyle(element).animationName)).toBe("bubi-card-emerge");
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(await page.locator(".auth-bubi-mobile .bubi-mascot-motion").evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
    await expectNoHorizontalOverflow(page);

    await page.goto("/register");
    await expect(page.getByRole("heading", { name: "Sign Up" })).toBeVisible();
    await expect(page.getByLabel("Nama Lengkap")).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.goto("/recover");
    await expect(page.getByRole("heading", { name: "Pulihkan akses akun" })).toBeVisible();
    await expect(page.getByLabel("Email kampus")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }

  authenticated = false;
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await expect(page.locator(".landing-bubi")).toBeVisible();
  await expect(page.locator(".landing-bubi")).toHaveAttribute("data-bubi-artwork", "antusias");
  await page.goto("/login");
  await expect(page.locator(".auth-bubi-desktop .bubi-mascot-art")).toBeVisible();
  expect(await page.locator(".auth-bubi-desktop").evaluate((element) => element.parentElement?.classList.contains("auth-art-panel"))).toBe(true);
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await page.locator(".auth-bubi-desktop").evaluate((element) => getComputedStyle(element).animationName)).toBe("none");

  authenticated = true;
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 850 });
    await page.goto("/workspaces/new");
    await expect(page.getByRole("heading", { name: "Buat workspace baru" })).toBeVisible();
    const longWorkspaceTitle = "Jaringan Komputer UTS dengan materi persiapan ujian semester ini";
    await page.getByLabel("Judul workspace").fill(longWorkspaceTitle);
    await page.getByLabel("Mata kuliah").fill("Jaringan Komputer");
    await page.getByLabel("Kategori").selectOption("Matematika");
    await page.getByLabel("Deskripsi").fill("Catatan dan slide untuk ujian tengah semester.");
    await page.locator('input[type="radio"][value="public"]').check();
    const preview = page.getByRole("complementary", { name: "Pratinjau workspace" });
    await expect(preview).toContainText(longWorkspaceTitle);
    await expect(preview).toContainText("Jaringan Komputer");
    await expect(preview).toContainText("Matematika · Publik");
    await expect(preview).toContainText("Catatan dan slide");
    const previewAfterForm = await page.evaluate(() => {
      const form = document.querySelector("form");
      const aside = document.querySelector('aside[aria-label="Pratinjau workspace"]');
      return Boolean(form && aside && aside.getBoundingClientRect().top >= form.getBoundingClientRect().bottom);
    });
    expect(previewAfterForm).toBe(true);
    await expectNoHorizontalOverflow(page);

    await page.goto(`/workspaces/${notebookId}`);
    const tabs = page.getByRole("navigation", { name: "Bagian workspace" });
    await expect(tabs).toBeVisible();
    await expect(tabs.getByRole("link", { name: "Belajar dengan Bubi" })).toBeVisible();
    const tabHeights = await tabs.locator("a, span").evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().height));
    expect(tabHeights.every((height) => height <= 44)).toBe(true);
    await expectNoHorizontalOverflow(page);

    await page.goto("/home");
    await expect(page.getByText("Lanjutkan belajar", { exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Streak belajar 3 hari" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Workspace saya" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Lanjutkan dengan Bubi" })).toHaveAttribute("href", `/workspaces/${notebookId}/companion`);
    await expectNoHorizontalOverflow(page);
  }

  hasNotebook = false;
  await page.setViewportSize({ width: 390, height: 850 });
  await page.goto("/home");
  await expect(page.getByRole("link", { name: "Buat workspace" })).toHaveAttribute("href", "/workspaces/new");
  notebookRequestFails = true;
  await page.goto("/home");
  await expect(page.getByRole("heading", { name: "Workspace belum termuat" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Coba lagi" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Buat workspace" })).toHaveCount(0);
});

test("login, registration, and password recovery submit the expected server requests", async ({ page }) => {
  const user = { id: userId, email: "maul@example.com", name: "Maul", course: "Informatika", lookingForPartners: false };
  const submitted: Record<string, unknown> = {};

  await page.route("**/api/v1/**", async (route: Route) => {
    const request = route.request();
    const { pathname } = new URL(request.url());
    const method = request.method();
    if (pathname === "/api/v1/auth/me") return route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ success: false, error: { code: "UNAUTHORIZED", message: "Silakan masuk." } }) });
    if (["/api/v1/auth/login", "/api/v1/auth/register", "/api/v1/auth/password-reset/request", "/api/v1/auth/password-reset/confirm"].includes(pathname) && method === "POST") {
      submitted[pathname] = request.postDataJSON();
      if (pathname === "/api/v1/auth/password-reset/request") return route.fulfill(envelope({ requested: true, message: "If the address is registered, a password reset link will be sent." }, 202));
      if (pathname === "/api/v1/auth/password-reset/confirm") return route.fulfill(envelope({ changed: true }));
      return route.fulfill(envelope(user));
    }
    if (pathname === "/api/v1/me/notifications") return route.fulfill(envelope({ items: [], unreadCount: 0 }));
    if (pathname === "/api/v1/me/stats") return route.fulfill(envelope({ points: 0, streak: 0, bestStreak: 0, lastPlayDate: null, sessionsPlayed: 0, playedToday: false, badges: [], allBadges: [] }));
    if (pathname === "/api/v1/notebooks") return route.fulfill(envelope([]));
    if (pathname === "/api/v1/feed") return route.fulfill(envelope({ posts: [], nextBefore: null }));
    return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ success: false, error: { code: "NOT_FOUND", message: `Auth fixture: ${method} ${pathname}` } }) });
  });

  await page.goto("/login");
  await page.getByLabel("Email kampus").fill(user.email);
  await page.locator("#login-password").fill("password-uji-123");
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/\/home$/);
  expect(submitted["/api/v1/auth/login"]).toEqual({ email: user.email, password: "password-uji-123" });

  await page.goto("/register");
  await page.getByLabel("Nama Lengkap").fill(user.name);
  await page.getByLabel("Email kampus").fill("baru@example.com");
  await page.locator("#register-password").fill("password-uji-456");
  await page.getByRole("button", { name: "Sign Up" }).click();
  await expect(page).toHaveURL(/\/home$/);
  expect(submitted["/api/v1/auth/register"]).toEqual({ name: user.name, email: "baru@example.com", password: "password-uji-456" });

  await page.goto("/recover");
  await page.getByLabel("Email kampus").fill(user.email);
  await page.getByRole("button", { name: "Kirim tautan pemulihan" }).click();
  await expect(page.getByRole("status")).toContainText("If the address is registered");
  expect(submitted["/api/v1/auth/password-reset/request"]).toEqual({ email: user.email });

  await page.goto("/recover?token=token-uji");
  await page.locator("#recovery-password").fill("password-baru-123");
  await page.locator("#recovery-confirm").fill("password-baru-123");
  await page.getByRole("button", { name: "Simpan kata sandi baru" }).click();
  await expect(page.getByRole("status")).toContainText("Kata sandi berhasil diubah");
  expect(submitted["/api/v1/auth/password-reset/confirm"]).toEqual({ token: "token-uji", newPassword: "password-baru-123" });
});
