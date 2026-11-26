import { Gamepad2, ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router";
import { REACTION_FOR_EVENT } from "@deep-notes/shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BubiMascot } from "@/components/shared/BubiMascot";
import { EmptyState, ErrorState, LoadingState, PageTitle } from "@/components/shared/PageStates";
import { useNotebooks } from "@/features/notebooks/queries";

export function GamePage() {
  const notebooks = useNotebooks();
  return (
    <div className="space-y-6">
      <PageTitle description="Pilih workspace dengan setidaknya tiga bagian materi yang siap dibaca." eyebrow="Sesi dan game" title="Belajar sambil bermain" />
      <section className="grid gap-5 rounded-3xl bg-navy p-6 text-white sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-8">
        <div><span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-mint"><Sparkles aria-hidden="true" className="size-4" />Pilihan ganda dari sumbermu</span><h2 className="mt-4 max-w-xl text-2xl font-bold leading-8">Latihan yang tetap terhubung ke materi.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-white/70">Setiap hasil menyimpan penjelasan dan rujukan agar kelompok bisa meninjau kembali topik yang sulit.</p></div>
        <BubiMascot {...REACTION_FOR_EVENT.greeting} className="mx-auto h-32 w-auto" decorative />
      </section>
      {notebooks.isPending ? <LoadingState label="Memuat workspace…" /> : notebooks.isError ? <ErrorState message={notebooks.error.message} onRetry={() => void notebooks.refetch()} /> : notebooks.data.length === 0 ? <EmptyState action={<Button asChild><Link to="/workspaces/new">Buat workspace</Link></Button>} description="Tambahkan materi dalam workspace sebelum membuat game belajar." title="Belum ada workspace" /> : (
        <div className="grid gap-3 md:grid-cols-2">
          {notebooks.data.map((notebook) => (
            <Card className="flex flex-col gap-4 rounded-3xl p-5 sm:flex-row sm:items-center sm:justify-between" key={notebook.id}>
              <div className="flex min-w-0 items-center gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-secondary text-primary"><Gamepad2 aria-hidden="true" /></span><div className="min-w-0"><h2 className="truncate font-bold text-navy">{notebook.title}</h2><p className="mt-1 text-sm text-muted-foreground">{notebook.sourceCount} sumber · {notebook.memberCount} anggota</p></div></div>
              <Button asChild variant="outline"><Link to={`/workspaces/${notebook.id}/game`}>Pilih workspace<ArrowRight aria-hidden="true" /></Link></Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
