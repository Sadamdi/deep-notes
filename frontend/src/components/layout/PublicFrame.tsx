import type { ReactNode } from "react";
import { Brand } from "@/components/shared/Brand";

export function PublicFrame({ children, eyebrow, title, description, sideAction }: {
  children: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  sideAction?: ReactNode;
}) {
  return (
    <main className="min-h-dvh bg-background">
      <div className="mx-auto grid min-h-dvh max-w-[1440px] lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)]">
        <section className="relative hidden overflow-hidden bg-secondary px-10 py-12 lg:flex lg:flex-col lg:justify-between xl:px-16">
          <Brand />
          <div className="relative z-10 max-w-xl pb-16">
            <p className="text-sm font-semibold uppercase tracking-[0.15em] text-primary">Belajar bareng Bubi</p>
            <h2 className="mt-4 text-5xl font-bold leading-[1.08] tracking-tight text-navy">Pahami materi kuliah, <span className="text-teal">bareng Bubi.</span></h2>
            <p className="mt-5 max-w-lg text-lg leading-8 text-muted-foreground">Sumber, penjelasan, dan kuis dalam satu ruang belajar kelompok.</p>
          </div>
          <img alt="Bubi siap menemani sesi belajar" className="pointer-events-none absolute bottom-12 right-12 h-64 w-auto xl:right-20" src="/assets/bubi-antusias.svg" />
          <p className="relative z-10 text-sm text-muted-foreground">Belajar dengan sumber yang kelompokmu kumpulkan sendiri.</p>
        </section>
        <section className="flex min-w-0 flex-col px-5 py-6 sm:px-10 lg:px-12 xl:px-20">
          <div className="flex items-center justify-between gap-4">
            <div className="lg:hidden"><Brand /></div>
            {sideAction}
          </div>
          <div className="mx-auto my-auto w-full max-w-[460px] py-10">
            <p className="text-sm font-semibold text-teal">{eyebrow}</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-navy">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
            <div className="mt-8">{children}</div>
          </div>
          <p className="text-center text-xs text-muted-foreground">Jawaban Bubi hanya mengacu pada sumber workspace.</p>
        </section>
      </div>
    </main>
  );
}
