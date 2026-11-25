import { useQuery } from "@tanstack/react-query";
import type { Performance } from "@deep-notes/shared";
import { useState } from "react";
import { Link } from "react-router";
import bubiAntusias from "@/assets/brand/bubi-antusias.svg";
import brandMark from "@/assets/brand/deep-notes-mark.svg";
import completeIcon from "@/assets/icons/complete.svg";
import gameIcon from "@/assets/icons/game.svg";
import quoteIcon from "@/assets/icons/quote.svg";
import uploadIcon from "@/assets/icons/upload.svg";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/useAuth";
import { ApiStatus } from "@/features/health/ApiStatus";
import { api } from "@/lib/api";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

/** Implements Figma frame "Halaman Pembuka" (node 175:135). */
export function LandingPage() {
  useDocumentTitle("Halaman Pembuka");
  const { isAuthenticated } = useAuth();
  const [beatIndex, setBeatIndex] = useState(0);

  const demoQuery = useQuery({
    queryKey: ["companion-demo", "explain"],
    queryFn: () => api<Performance>("/companion/demo?scenario=explain"),
  });

  const beats = demoQuery.data?.beats ?? [];
  const activeBeat = beats[Math.min(beatIndex, Math.max(beats.length - 1, 0))];
  const activeCitation =
    activeBeat && activeBeat.citation !== null ? demoQuery.data?.citations[activeBeat.citation] : undefined;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <a
        href="#landing-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2.5 focus:text-sm focus:font-bold focus:text-primary-foreground focus:ring-[3px] focus:ring-ring/60"
      >
        Lewati ke konten utama
      </a>

      <header className="mx-auto flex max-w-[1380px] flex-wrap items-center justify-between gap-3 px-5 py-6 sm:px-10 lg:px-14">
        <Link
          to="/"
          className="inline-flex min-h-11 items-center gap-2.5 rounded-md px-1 text-[21px] font-bold tracking-tight text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <img src={brandMark} alt="" aria-hidden="true" width={28} height={28} fetchPriority="high" />
          <span>Deep Notes</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2.5">
          <ApiStatus />
          <ThemeToggle />
          {isAuthenticated ? (
            <Button asChild variant="secondary">
              <Link to="/workspace">Workspace Saya</Link>
            </Button>
          ) : (
            <Button asChild variant="secondary">
              <Link to="/masuk">Masuk</Link>
            </Button>
          )}
        </div>
      </header>

      <main id="landing-main" className="mx-auto max-w-[1380px] space-y-12 px-5 pt-4 pb-16 sm:px-10 lg:space-y-16 lg:px-14">
        <section className="grid items-center gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="space-y-6 lg:col-span-6">
            <h1 className="text-4xl leading-[1.12] font-bold tracking-tight text-foreground sm:text-5xl xl:text-[62px]">
              Pahami materi kuliah{" "}
              <span className="block text-brand-teal">bareng Bubi.</span>
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-xl">
              Unggah bahan kuliah, pelajari konsep langkah demi langkah, dan uji pemahamanmu lewat kuis.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button asChild size="lg">
                <Link to={isAuthenticated ? "/workspace" : "/daftar"}>Mulai Belajar</Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link to="/">Buka Beranda</Link>
              </Button>
            </div>
          </div>

          {/* Right Bubi demonstration stage (Figma node 175:145) */}
          <div className="space-y-4 rounded-3xl bg-secondary p-5 text-secondary-foreground sm:p-7 lg:col-span-6">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold sm:text-2xl">Jaringan Komputer</h2>
                <p className="text-sm text-muted-foreground">
                  Topologi bintang · Langkah {beats.length ? beatIndex + 1 : 1} dari {beats.length || 5}
                </p>
              </div>
              <Badge variant="outline" className="border-foreground/25 bg-card text-foreground">
                Data contoh API
              </Badge>
            </div>

            <div className="flex justify-center py-2">
              <img
                src={bubiAntusias}
                alt="Maskot Bubi menjelaskan materi topologi bintang"
                width={163}
                height={174}
                fetchPriority="high"
                className="h-auto w-[140px] sm:w-[163px]"
              />
            </div>

            {demoQuery.isPending && (
              <div role="status" className="rounded-xl bg-card p-4 text-sm text-muted-foreground">
                Memuat contoh penjelasan...
              </div>
            )}

            {demoQuery.isError && (
              <div role="alert" className="rounded-xl bg-card p-4 text-sm text-destructive">
                Contoh penjelasan belum dapat dimuat dari server.
              </div>
            )}

            {activeBeat && (
              <div className="rounded-xl bg-card p-4 text-card-foreground sm:p-5">
                <p className="text-base leading-relaxed">{activeBeat.say}</p>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2.5 text-sm font-bold text-secondary-foreground">
                <img
                  src={quoteIcon}
                  alt=""
                  aria-hidden="true"
                  width={22}
                  height={22}
                  className="dark:brightness-0 dark:invert"
                />
                <span>
                  {activeCitation
                    ? `${activeCitation.sourceTitle}${activeCitation.page !== null ? ` · halaman ${activeCitation.page}` : ""}`
                    : "Bab 1 Topologi.pdf · halaman 3"}
                </span>
              </div>

              {beats.length > 1 && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={beatIndex === 0}
                    onClick={() => setBeatIndex((idx) => Math.max(0, idx - 1))}
                  >
                    Sebelumnya
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={beatIndex >= beats.length - 1}
                    onClick={() => setBeatIndex((idx) => Math.min(beats.length - 1, idx + 1))}
                  >
                    Berikutnya
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Feature pillars with flagship emphasis on cited group learning */}
        <section aria-label="Keunggulan utama Deep Notes" className="grid gap-5 md:grid-cols-12">
          <article className="space-y-3 rounded-2xl border border-border bg-card p-6 md:col-span-4">
            <img
              src={uploadIcon}
              alt=""
              aria-hidden="true"
              width={26}
              height={26}
              className="dark:brightness-0 dark:invert"
            />
            <h2 className="text-xl font-bold text-card-foreground">Kumpulkan bahan kuliah</h2>
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              Unggah dokumen PDF, slide, catatan, dan tautan kelompok ke dalam satu ruang bersama.
            </p>
          </article>

          <article className="space-y-3 rounded-2xl border-2 border-brand-teal/40 bg-card p-6 md:col-span-5">
            <img
              src={gameIcon}
              alt=""
              aria-hidden="true"
              width={26}
              height={26}
              className="dark:brightness-0 dark:invert"
            />
            <h2 className="text-xl font-bold text-card-foreground">Belajar dari sumbermu</h2>
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              Tanya Bubi dan buka langsung halaman sumber yang dirujuk. Bila jawaban tidak ada di materi, Bubi menolak
              mengarang.
            </p>
          </article>

          <article className="space-y-3 rounded-2xl border border-border bg-card p-6 md:col-span-3">
            <img
              src={completeIcon}
              alt=""
              aria-hidden="true"
              width={26}
              height={26}
              className="dark:brightness-0 dark:invert"
            />
            <h2 className="text-xl font-bold text-card-foreground">Uji pemahamanmu</h2>
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              Mainkan kuis latihan, pantau celah topik, dan lihat kontribusi tiap anggota kelompok.
            </p>
          </article>
        </section>
      </main>
    </div>
  );
}
