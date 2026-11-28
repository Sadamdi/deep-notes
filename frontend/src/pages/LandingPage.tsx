import { ArrowRight, BookOpenText, Brain, Upload } from "lucide-react";
import { Link, Navigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/shared/Brand";
import { BubiMascot } from "@/components/shared/BubiMascot";
import { useAuthMe } from "@/features/auth/useAuth";

const benefits = [
  { icon: Upload, title: "Kumpulkan bahan", description: "Satukan PDF, slide, catatan, dan tautan dalam satu workspace." },
  { icon: BookOpenText, title: "Belajar dari sumber", description: "Tanyakan konsep dan buka bagian materi yang menjadi acuan." },
  { icon: Brain, title: "Uji pemahaman", description: "Buat latihan dari bahan yang sudah siap." },
];

export function LandingPage() {
  const auth = useAuthMe();
  if (auth.data) return <Navigate replace to="/home" />;

  return (
    <main className="min-h-dvh overflow-hidden bg-background">
      <header className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 sm:px-8 lg:px-12">
        <Brand />
        <div className="hidden items-center gap-2 sm:flex"><Button asChild variant="ghost"><Link to="/login">Masuk</Link></Button><Button asChild><Link to="/register">Mulai belajar<ArrowRight aria-hidden="true" /></Link></Button></div>
      </header>
      <section className="landing-hero relative isolate overflow-hidden px-5 py-14 text-primary-foreground sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <div className="relative mx-auto grid min-h-[520px] max-w-[1320px] items-center pb-40 sm:min-h-[560px] sm:pb-44 lg:min-h-[420px] lg:pb-0 lg:grid-cols-[1fr_0.95fr]">
          <div className="relative z-10 max-w-2xl">
            <p className="text-sm font-semibold tracking-wide text-primary-foreground/80">Ruang belajar untuk kelompokmu</p>
            <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">Pahami materi kuliah <span className="text-secondary">bareng Bubi.</span></h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-primary-foreground/85 sm:text-lg">Unggah bahan kuliah, pelajari konsep langkah demi langkah, dan uji pemahamanmu lewat kuis dari sumber kelompok.</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap"><Button asChild className="w-full bg-primary-foreground text-navy hover:bg-primary-foreground/90 sm:w-auto" size="lg"><Link to="/register">Mulai belajar<ArrowRight aria-hidden="true" /></Link></Button><Button asChild className="w-full border-primary-foreground/60 text-primary-foreground hover:bg-primary-foreground/10 sm:w-auto" size="lg" variant="outline"><Link to="/login">Saya sudah punya akun</Link></Button></div>
          </div>
          <div aria-hidden="true" className="pointer-events-none relative hidden h-full min-h-[420px] lg:block">
            <div className="absolute -bottom-24 -right-20 size-[36rem] rounded-full bg-secondary/90" />
            <BubiMascot animation="wave" animationKey="landing-hero" className="landing-bubi" decorative emotion="antusias" />
          </div>
          <div aria-hidden="true" className="landing-mobile-bubi pointer-events-none absolute bottom-0 right-0 lg:hidden"><BubiMascot animation="wave" animationKey="landing-mobile" className="h-28 w-auto sm:h-36" decorative emotion="antusias" /></div>
        </div>
      </section>
      <section className="mx-auto grid max-w-[1440px] gap-4 px-5 py-8 sm:grid-cols-3 sm:px-8 sm:py-10 lg:px-12">
        {benefits.map(({ icon: Icon, title, description }) => <article className="rounded-3xl border bg-card p-5 sm:p-6" key={title}><span className="grid size-11 place-items-center rounded-2xl bg-secondary text-primary"><Icon aria-hidden="true" className="size-5" /></span><h2 className="mt-4 font-bold text-navy">{title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p></article>)}
      </section>
      <footer className="border-t px-5 py-5 text-center text-xs text-muted-foreground">Deep Notes · Belajar bersama dari sumber kelompok.</footer>
    </main>
  );
}
