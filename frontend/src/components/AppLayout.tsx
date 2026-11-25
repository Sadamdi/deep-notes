import { Link, Outlet, useLocation } from "react-router";
import bubiIdle from "@/assets/brand/bubi-idle.svg";
import brandMark from "@/assets/brand/deep-notes-mark.svg";
import {
  DESKTOP_PRIMARY_NAV,
  MOBILE_PRIMARY_NAV,
  isDesktopNavActive,
  isMobileNavActive,
} from "@/components/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/features/auth/useAuth";
import { ApiStatus } from "@/features/health/ApiStatus";
import { cn } from "@/lib/utils";

export function AppLayout() {
  const { pathname } = useLocation();
  const { user, isAuthenticated, logout, isLoggingOut } = useAuth();
  const isNotebookDetail = pathname.startsWith("/notebooks/");

  return (
    <div className="min-h-dvh bg-background text-foreground md:flex">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2.5 focus:text-sm focus:font-bold focus:text-primary-foreground focus:ring-[3px] focus:ring-ring/60"
      >
        Lewati ke konten utama
      </a>

      {/* Desktop and tablet sidebar (Figma node 175:295) */}
      <aside
        aria-label="Bilah sisi Deep Notes"
        className="hidden shrink-0 flex-col justify-between border-r border-border bg-card md:sticky md:top-0 md:flex md:h-dvh md:w-[200px] md:overflow-y-auto lg:w-[220px]"
      >
        <div className="space-y-4 px-3 pt-6">
          <Link
            to="/"
            className="flex min-h-11 items-center gap-2.5 rounded-md px-2 py-1 text-lg font-bold tracking-tight text-foreground transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <img src={brandMark} alt="" aria-hidden="true" width={27} height={27} fetchPriority="high" />
            <span>Deep Notes</span>
          </Link>

          <nav aria-label="Navigasi utama" className="space-y-2">
            {DESKTOP_PRIMARY_NAV.map((item) => {
              const active = isDesktopNavActive(pathname, item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-[46px] items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none active:opacity-90",
                    active
                      ? "bg-secondary font-bold text-secondary-foreground"
                      : "bg-card font-normal text-foreground hover:bg-muted",
                  )}
                >
                  <img
                    src={item.icon}
                    alt=""
                    aria-hidden="true"
                    width={21}
                    height={21}
                    className="shrink-0 dark:brightness-0 dark:invert"
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <nav
            aria-label={isNotebookDetail ? "Pintasan ruang belajar" : "Pintasan tambahan"}
            className="space-y-1.5 pt-2"
          >
            {isNotebookDetail ? (
              <>
                <Link
                  to={pathname}
                  className="flex min-h-11 items-center rounded-md bg-muted px-3 py-2 text-[13px] font-bold text-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  Mulai Belajar
                </Link>
                <Link
                  to={`${pathname}?tab=kuis`}
                  className="flex min-h-11 items-center rounded-md bg-muted px-3 py-2 text-[13px] font-bold text-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  Sesi dan Kuis
                </Link>
                <Link
                  to={`${pathname}?tab=kelompok`}
                  className="flex min-h-11 items-center rounded-md bg-muted px-3 py-2 text-[13px] font-bold text-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  Papan Kelompok
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/mengikuti"
                  aria-current={pathname === "/mengikuti" ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center rounded-md px-3 py-2 text-[13px] font-bold transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                    pathname === "/mengikuti"
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-muted text-foreground hover:bg-secondary/70",
                  )}
                >
                  Mengikuti
                </Link>
                <Link
                  to="/pengaturan"
                  aria-current={pathname === "/pengaturan" ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center rounded-md px-3 py-2 text-[13px] font-bold transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                    pathname === "/pengaturan"
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-muted text-foreground hover:bg-secondary/70",
                  )}
                >
                  Pengaturan
                </Link>
              </>
            )}
          </nav>
        </div>

        <div className="mt-6 flex flex-col gap-2.5 px-3 pb-3">
          {isAuthenticated && user ? (
            <div className="space-y-2 rounded-lg bg-muted p-2.5 text-xs">
              <p className="truncate font-bold text-foreground">{user.name}</p>
              <p className="truncate text-muted-foreground">{user.email}</p>
              <button
                type="button"
                disabled={isLoggingOut}
                onClick={() => void logout()}
                className="min-h-9 w-full rounded-md bg-card px-2.5 py-1.5 text-left text-xs font-bold text-foreground hover:bg-secondary hover:text-secondary-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                {isLoggingOut ? "Keluar..." : "Keluar"}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              <Link
                to="/masuk"
                className="flex min-h-11 items-center justify-center rounded-md bg-primary px-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                Masuk
              </Link>
              <Link
                to="/daftar"
                className="flex min-h-11 items-center justify-center rounded-md bg-secondary px-2 text-xs font-bold text-secondary-foreground hover:bg-secondary/80 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                Daftar
              </Link>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <ApiStatus />
            <ThemeToggle className="w-full" />
          </div>

          <div className="pointer-events-none flex justify-end pt-1 select-none">
            <img
              src={bubiIdle}
              alt=""
              aria-hidden="true"
              width={150}
              height={160}
              className="h-auto w-[124px] lg:w-[146px]"
            />
          </div>
        </div>
      </aside>

      {/* Main viewport column */}
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        {/* Mobile top brand bar (Figma nodes 175:5363, 175:7228) */}
        <header className="flex items-center justify-between gap-3 px-[18px] pt-5 pb-2 md:hidden">
          <Link
            to="/"
            className="flex min-h-11 items-center gap-2.5 rounded-md px-1 text-lg font-bold tracking-tight text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <img src={brandMark} alt="" aria-hidden="true" width={25} height={25} fetchPriority="high" />
            <span>Deep Notes</span>
          </Link>
          <div className="flex items-center gap-2">
            <ApiStatus />
            {!isAuthenticated && (
              <Link
                to="/masuk"
                className="inline-flex min-h-11 items-center rounded-lg bg-secondary px-3 text-xs font-bold text-secondary-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                Masuk
              </Link>
            )}
          </div>
        </header>

        <main
          id="main-content"
          className="mx-auto w-full max-w-[1180px] flex-1 px-[18px] pt-3 pb-28 md:px-7 md:py-8 lg:px-10 lg:py-9"
        >
          <Outlet />
        </main>

        {/* Mobile bottom navigation bar (Figma node 175:5364) */}
        <nav
          aria-label="Navigasi utama mobile"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
        >
          <div className="mx-auto grid max-w-md grid-cols-5 gap-1.5 px-2 py-2">
            {MOBILE_PRIMARY_NAV.map((item) => {
              const active = isMobileNavActive(pathname, item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-[59px] flex-col items-center justify-center gap-1.5 rounded-lg px-1 py-1.5 text-[11px] font-bold transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none active:opacity-90",
                    active
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-card text-foreground hover:bg-muted",
                  )}
                >
                  <img
                    src={item.icon}
                    alt=""
                    aria-hidden="true"
                    width={20}
                    height={20}
                    className="shrink-0 dark:brightness-0 dark:invert"
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
