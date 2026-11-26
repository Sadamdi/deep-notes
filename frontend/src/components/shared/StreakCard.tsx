import { useQuery } from "@tanstack/react-query";
import type { UserStats } from "@deep-notes/shared";
import { Flame } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

const tiers = [
  { min: 100, label: "100+ hari", numberColor: "#f20000", background: "linear-gradient(155deg,#f20000 7%,#f8532e 28%,#ffa55c 64%)", backgroundArt: "/assets/streak-100-bg.svg", mascot: "/assets/streak-100-bubi.svg" },
  { min: 50, label: "50–99 hari", numberColor: "#ffe08a", background: "linear-gradient(155deg,#ef531f,#ffe14c)", backgroundArt: "/assets/streak-50-bg.svg", mascot: "/assets/streak-50-bubi.svg" },
  { min: 25, label: "25–49 hari", numberColor: "#a796f2", background: "linear-gradient(155deg,#a796f2,#bcebdc)", backgroundArt: "/assets/streak-25-bg.svg", mascot: "/assets/streak-25-bubi.svg" },
  { min: 1, label: "1–24 hari", numberColor: "#25b7a7", background: "linear-gradient(155deg,#25b7a7,#bcebdc)", backgroundArt: "/assets/streak-1-bg.svg", mascot: "/assets/streak-1-bubi.svg" },
] as const;

function streakTier(days: number) {
  return tiers.find((tier) => days >= tier.min);
}

export function StreakCard() {
  const stats = useQuery({ queryKey: ["me", "stats"], queryFn: () => api<UserStats>("/me/stats") });

  if (stats.isPending) return <section aria-busy="true" className="rounded-3xl border bg-card p-5"><p className="text-sm text-muted-foreground">Memuat streak belajar…</p></section>;
  if (stats.isError) return <section className="rounded-3xl border border-destructive/30 bg-card p-5" aria-label="Streak belajar"><h2 className="font-bold text-navy">Streak belum berhasil dimuat</h2><p className="mt-1 text-sm text-muted-foreground">{stats.error.message}</p><Button className="mt-3" onClick={() => void stats.refetch()} size="sm" variant="outline">Coba lagi</Button></section>;

  const days = stats.data.streak;
  const tier = streakTier(days);
  return (
    <section aria-label={`Streak belajar ${days} hari`} className="overflow-hidden rounded-3xl border bg-card p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Flame aria-hidden="true" className="size-4 text-warning-foreground"/>Streak belajar</div>
      <div className="relative mx-auto aspect-[4/3] w-full max-w-[340px] overflow-hidden rounded-[28px] border-4 border-white" style={{ background: tier?.background ?? "#bcebdc" }}>
        {tier ? <>
          <img alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" src={tier.backgroundArt}/>
          <span className="absolute inset-x-0 top-[4%] z-10 text-center text-[clamp(3rem,12vw,6rem)] font-black leading-none drop-shadow-[0_4px_4px_rgba(0,0,0,0.25)]" style={{ color: tier.numberColor }}>{days}</span>
          <img alt="" aria-hidden="true" className="absolute bottom-[-8%] left-1/2 h-[84%] w-[96%] -translate-x-1/2 object-contain" src={tier.mascot}/>
        </> : <img alt="Bubi siap menemani streak belajar pertamamu" className="absolute inset-0 h-full w-full object-contain" src="/assets/streak-0.svg"/>}
      </div>
      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="font-bold text-navy">{days} hari</p>
        <p className="text-xs text-muted-foreground">{tier?.label ?? "Mulai streak pertamamu"}</p>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Streak terbaik: {stats.data.bestStreak} hari</p>
    </section>
  );
}
