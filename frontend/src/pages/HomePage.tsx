import { useQuery } from "@tanstack/react-query";
import type { CreateNotebookInput, Performance } from "@deep-notes/shared";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import bubiIdle from "@/assets/brand/bubi-idle.svg";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateNotebookForm } from "@/features/notebooks/CreateNotebookForm";
import { api } from "@/lib/api";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

export function HomePage() {
  useDocumentTitle("Beranda");
  const navigate = useNavigate();
  const [beatIndex, setBeatIndex] = useState(0);

  const demoQuery = useQuery({
    queryKey: ["companion-demo", "explain"],
    queryFn: () => api<Performance>("/companion/demo?scenario=explain"),
  });

  const handleCreateNotebook = async (input: CreateNotebookInput) => {
    const created = await api<{ id: string }>("/notebooks", {
      method: "POST",
      body: JSON.stringify(input),
    });
    await navigate(`/notebooks/${created.id}`);
  };

  const beats = demoQuery.data?.beats ?? [];
  const activeBeat = beats[Math.min(beatIndex, Math.max(beats.length - 1, 0))];
  const activeCitation =
    activeBeat && activeBeat.citation !== null ? demoQuery.data?.citations[activeBeat.citation] : undefined;

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-[34px]">
            Ruang belajar kelompok bersama <span className="text-brand-teal">Bubi</span>
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
            Kumpulkan materi kuliah satu kelompok, ajukan pertanyaan yang dijawab hanya dari sumber kelompok dengan
            sitasi halaman, lalu uji pemahaman bersama.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button asChild variant="secondary">
            <Link to="/jelajah">Jelajah Publik</Link>
          </Button>
          <Button asChild>
            <Link to="/workspace">Buka Workspace Saya</Link>
          </Button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Bubi grounded explanation preview from GET /api/v1/companion/demo */}
        <section
          aria-labelledby="bubi-preview-heading"
          className="flex flex-col justify-between gap-5 rounded-2xl bg-secondary p-5 text-secondary-foreground sm:p-6 lg:col-span-7"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="space-y-1">
              <h2 id="bubi-preview-heading" className="text-xl font-bold text-secondary-foreground sm:text-2xl">
                Pratinjau belajar bersama Bubi
              </h2>
              <p className="text-sm text-muted-foreground">
                Setiap penjelasan selalu berupa teks lengkap dan merujuk ke halaman sumber.
              </p>
            </div>
            <Badge variant="outline" className="border-foreground/25 bg-card text-foreground">
              Data contoh API
            </Badge>
          </div>

          {demoQuery.isPending && (
            <div
              role="status"
              className="rounded-xl bg-card p-5 text-sm font-medium text-muted-foreground"
            >
              Memuat contoh langkah penjelasan dari server...
            </div>
          )}

          {demoQuery.isError && (
            <div
              role="alert"
              className="space-y-3 rounded-xl bg-card p-5 text-sm text-foreground"
            >
              <p className="font-bold text-destructive">Contoh penjelasan belum dapat dimuat dari server.</p>
              <p className="text-muted-foreground">
                Pastikan server API berjalan, atau lanjutkan membuka contoh tata letak workspace.
              </p>
              <Button type="button" variant="outline" onClick={() => void demoQuery.refetch()}>
                Muat Ulang Contoh
              </Button>
            </div>
          )}

          {demoQuery.isSuccess && activeBeat && (
            <>
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-end sm:justify-between">
                <p className="text-xs font-bold text-secondary-foreground">
                  Langkah {beatIndex + 1} dari {beats.length} · ekspresi: {activeBeat.emotion}
                </p>
                <img
                  src={bubiIdle}
                  alt="Maskot Bubi mendampingi sesi belajar"
                  width={120}
                  height={128}
                  className="h-auto w-[108px] sm:w-[120px]"
                />
              </div>

              <div className="space-y-3 rounded-xl bg-card p-4 text-card-foreground sm:p-5">
                <p className="text-sm leading-relaxed sm:text-base">{activeBeat.say}</p>
                {activeCitation && (
                  <p className="inline-flex flex-wrap items-center gap-1.5 rounded-md bg-muted px-2.5 py-1.5 text-xs font-bold text-cite">
                    <span>Sitasi: {activeCitation.sourceTitle}</span>
                    {activeCitation.page !== null && <span>· halaman {activeCitation.page}</span>}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={beatIndex === 0}
                    onClick={() => setBeatIndex((idx) => Math.max(0, idx - 1))}
                  >
                    Sebelumnya
                  </Button>
                  <Button
                    type="button"
                    disabled={beatIndex >= beats.length - 1}
                    onClick={() => setBeatIndex((idx) => Math.min(beats.length - 1, idx + 1))}
                  >
                    Langkah Berikutnya
                  </Button>
                </div>
                <Link
                  to="/notebooks/sample"
                  className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-bold text-secondary-foreground underline underline-offset-4 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  Lihat contoh ruang belajar
                </Link>
              </div>
            </>
          )}
        </section>

        {/* Quick create workspace card */}
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Buat workspace mata kuliah</CardTitle>
            <CardDescription>
              Satu ruang bersama untuk materi PDF, catatan, tanya jawab bersitasi, dan kuis latihan kelompok.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <CreateNotebookForm onSubmit={handleCreateNotebook} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
