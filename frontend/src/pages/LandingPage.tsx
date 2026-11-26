import { ArrowRight, BookOpenText, Brain, Upload } from "lucide-react";
import { Link, Navigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/shared/Brand";
import { useAuthMe } from "@/features/auth/useAuth";

const benefits = [
  { icon: Upload, title: "Kumpulkan bahan", description: "Satukan PDF, slide, catatan, dan tautan dalam satu workspace." },
  { icon: BookOpenText, title: "Belajar dari sumber", description: "Tanyakan konsep dan buka bagian materi yang menjadi acuan." },
  { icon: Brain, title: "Uji pemahaman", description: "Buat latihan pilihan ganda dari bahan yang sudah siap." },
];

export function LandingPage() {
  const auth = useAuthMe();
  if (auth.data) return <Navigate replace to="/home" />;

  return (
    <main className="min-h-dvh overflow-hidden bg-background">
      <header className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <Brand />
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost"><Link to="/login">Masuk</Link></Button>
          <Button asChild><Link to="/register">Mulai belajar<ArrowRight aria-hidden="true" /></Link></Button>
        </div>
      </header>
      <section className="mx-auto grid max-w-[1440px] items-center gap-8 px-5 pb-14 pt-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.9fr)] lg:px-12 lg:pb-20 lg:pt-16">
        <div className="relative z-10">
          <span className="inline-flex items-center rounded-full border border-primary/15 bg-secondary px-3 py-1.5 text-xs font-semibold text-navy">Ruang belajar untuk kelompokmu</span>
          <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight text-navy sm:text-5xl lg:text-6xl">Pahami materi kuliah <span className="text-teal">bareng Bubi.</span></h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">Unggah bahan kuliah, pelajari konsep langkah demi langkah, dan uji pemahamanmu lewat kuis dari sumber kelompok.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link to="/register">Mulai belajar<ArrowRight aria-hidden="true" /></Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/login">Saya sudah punya akun</Link></Button>
          </div>
        </div>
        <div className="relative rounded-[2rem] bg-secondary p-5 sm:p-8 lg:min-h-[430px]">
          <div className="absolute -right-8 -top-8 size-36 rounded-full bg-mint/70 blur-2xl" />
          <div className="relative rounded-3xl border border-white/70 bg-white/90 p-5 shadow-sm sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Sesi belajar · Jaringan Komputer</p>
            <h2 className="mt-2 text-xl font-bold text-navy">Topologi bintang</h2>
            <img alt="Bubi menjelaskan materi" className="mx-auto h-40 w-auto sm:h-48" src="/assets/bubi-antusias.svg" />
            <p className="rounded-2xl bg-secondary/70 p-4 text-sm leading-6 text-foreground">Semua perangkat terhubung ke switch pusat. Setiap jawaban menampilkan bagian sumber yang dirujuk.</p>
            <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-muted-foreground"><BookOpenText aria-hidden="true" className="size-4 text-cite" />Bab 1 · Topologi · halaman 3</div>
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-[1440px] gap-4 px-5 pb-14 sm:grid-cols-3 sm:px-8 lg:px-12">
        {benefits.map(({ icon: Icon, title, description }) => (
          <article className="rounded-3xl border bg-card p-5 sm:p-6" key={title}>
            <span className="grid size-11 place-items-center rounded-2xl bg-secondary text-primary"><Icon aria-hidden="true" className="size-5" /></span>
            <h2 className="mt-4 font-bold text-navy">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
          </article>
        ))}
      </section>
      <footer className="border-t px-5 py-5 text-center text-xs text-muted-foreground">Deep Notes · Belajar bersama dari sumber kelompok.</footer>
    </main>
  );
}
