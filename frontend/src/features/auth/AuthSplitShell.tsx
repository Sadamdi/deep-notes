import type { ReactNode } from "react";
import { Link } from "react-router";
import bubiAntusias from "@/assets/brand/bubi-antusias.svg";
import brandMark from "@/assets/brand/deep-notes-mark.svg";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ApiStatus } from "@/features/health/ApiStatus";

type AuthSplitShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

/**
 * Split Bubi auth shell matching Figma frames 175:166 (Masuk), 175:193 (Daftar), and 175:5303 (Mobile).
 */
export function AuthSplitShell({ title, subtitle, children }: AuthSplitShellProps) {
  return (
    <div className="min-h-dvh bg-card text-foreground lg:grid lg:grid-cols-12">
      <a
        href="#auth-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2.5 focus:text-sm focus:font-bold focus:text-primary-foreground focus:ring-[3px] focus:ring-ring/60"
      >
        Lewati ke formulir
      </a>

      {/* Left visual Bubi panel on desktop */}
      <aside
        aria-label="Pengantar Deep Notes"
        className="hidden flex-col justify-between bg-background p-10 lg:col-span-6 lg:flex xl:p-14"
      >
        <div className="space-y-12">
          <Link
            to="/pembuka"
            className="inline-flex min-h-11 items-center gap-3 rounded-md px-1 text-[23px] font-bold tracking-tight text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <img src={brandMark} alt="" aria-hidden="true" width={32} height={32} fetchPriority="high" />
            <span>Deep Notes</span>
          </Link>

          <div className="space-y-2">
            <p className="text-4xl leading-tight font-bold tracking-tight text-foreground xl:text-5xl">
              Pahami materi kuliah
            </p>
            <p className="text-4xl leading-tight font-bold tracking-tight text-brand-teal xl:text-5xl">
              bareng Bubi.
            </p>
          </div>
        </div>

        <div className="my-6 flex justify-center">
          <img
            src={bubiAntusias}
            alt="Maskot Bubi menyambut sesi belajar"
            width={278}
            height={298}
            fetchPriority="high"
            className="h-auto w-[230px] xl:w-[278px]"
          />
        </div>

        <p className="text-lg text-muted-foreground xl:text-xl">
          Sumber, penjelasan, dan kuis dalam satu ruang.
        </p>
      </aside>

      {/* Right form column (full screen on mobile) */}
      <div className="flex min-h-dvh flex-col justify-between px-5 py-6 sm:px-10 lg:col-span-6 lg:px-12 xl:px-20">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/pembuka"
            className="inline-flex min-h-11 items-center gap-2.5 rounded-md px-1 text-xl font-bold tracking-tight text-foreground lg:invisible focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <img src={brandMark} alt="" aria-hidden="true" width={29} height={29} />
            <span>Deep Notes</span>
          </Link>
          <div className="flex items-center gap-2">
            <ApiStatus />
            <ThemeToggle />
          </div>
        </header>

        <main id="auth-main" className="mx-auto my-8 w-full max-w-[465px] space-y-6">
          <div className="space-y-2">
            <h1 className="text-[32px] leading-tight font-bold tracking-tight text-foreground sm:text-[43px]">
              {title}
            </h1>
            <p className="text-[15px] text-muted-foreground">{subtitle}</p>
          </div>
          {children}
        </main>

        <footer className="mx-auto w-full max-w-[465px] pt-2 text-xs text-muted-foreground">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center font-bold text-foreground underline underline-offset-4 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            Lanjut meninjau aplikasi tanpa masuk
          </Link>
        </footer>
      </div>
    </div>
  );
}
