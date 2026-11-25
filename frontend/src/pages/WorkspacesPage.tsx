import { ArrowRight, Plus } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState, PageTitle } from "@/components/shared/PageStates";
import { useNotebooks } from "@/features/notebooks/queries";

export function WorkspacesPage() {
  const notebooks = useNotebooks();
  return (
    <div className="space-y-6">
      <PageTitle action={<Button asChild><Link to="/workspaces/new"><Plus aria-hidden="true" />Buat workspace</Link></Button>} description="Materi belajar kelompok yang hanya bisa diakses sesuai peranmu." eyebrow="Workspace saya" title="Semua workspace" />
      {notebooks.isPending ? <LoadingState label="Memuat workspace…" /> : notebooks.isError ? <ErrorState message={notebooks.error.message} onRetry={() => void notebooks.refetch()} /> : notebooks.data.length === 0 ? (
        <EmptyState action={<Button asChild><Link to="/workspaces/new"><Plus aria-hidden="true" />Buat workspace</Link></Button>} description="Buat ruang belajar untuk satu mata kuliah dan mulai kumpulkan sumber bersama kelompokmu." title="Workspace belum dibuat" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {notebooks.data.map((notebook) => (
            <Card className="overflow-hidden rounded-3xl border-border/70 bg-card p-0 shadow-sm" key={notebook.id}>
              <div className="h-28 bg-secondary p-4"><span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-navy">{notebook.category || "Workspace"}</span></div>
              <div className="p-5">
                <h2 className="text-lg font-bold text-navy">{notebook.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{notebook.course || "Mata kuliah belum diisi"}</p>
                <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">{notebook.description || "Belajar bersama dari sumber kelompok."}</p>
                <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span className="rounded-full bg-muted px-2.5 py-1">{notebook.memberCount} anggota</span><span className="rounded-full bg-muted px-2.5 py-1">{notebook.sourceCount} sumber</span><span className="rounded-full bg-secondary/70 px-2.5 py-1">{notebook.role}</span></div>
                <Button asChild className="mt-5 w-full" variant="outline"><Link to={`/workspaces/${notebook.id}`}>Buka workspace<ArrowRight aria-hidden="true" /></Link></Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
