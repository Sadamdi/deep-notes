import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, Gamepad2, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState, LoadingState } from "@/components/shared/PageStates";
import { AskPanel } from "@/features/answers/AskPanel";
import { CitationPreviewPanel } from "@/features/answers/CitationPreviewPanel";
import { useNotebook, useSources } from "@/features/notebooks/queries";
import { SourceList } from "@/features/sources/SourceList";
import { SourcePreviewPanel } from "@/features/sources/SourcePreviewPanel";
import { SourceUploader } from "@/features/sources/SourceUploader";
import { useAuthMe } from "@/features/auth/useAuth";
import { ApiRequestError } from "@/lib/api";
import { REACTION_FOR_EVENT, type Citation, type SourceResponse } from "@deep-notes/shared";
import { BubiMascot } from "@/components/shared/BubiMascot";
import { InviteWorkspaceDialog } from "@/features/notebooks/InviteWorkspaceDialog";
import { WorkspaceTabs } from "@/components/shared/WorkspaceTabs";

export function WorkspacePage() {
  const { notebookId = "" } = useParams();
  const notebook = useNotebook(notebookId);
  const sources = useSources(notebookId);
  const currentUser = useAuthMe();
  const [selectedSourceId, setSelectedSourceId] = useState<string>();
  const [citation, setCitation] = useState<Citation | null>(null);
  const previousSourceStatuses = useRef(new Map<string, SourceResponse["status"]>());
  const [readySourceNotice, setReadySourceNotice] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    if (!sources.data) return;
    const justReady = sources.data.find((source) => previousSourceStatuses.current.get(source.id) === "processing" && source.status === "ready");
    previousSourceStatuses.current = new Map(sources.data.map((source) => [source.id, source.status]));
    if (justReady) setReadySourceNotice({ id: justReady.id, title: justReady.title });
  }, [sources.data]);

  useEffect(() => {
    if (!readySourceNotice) return;
    const timeout = window.setTimeout(() => setReadySourceNotice(null), 3_200);
    return () => window.clearTimeout(timeout);
  }, [readySourceNotice]);

  if (notebook.isPending) return <LoadingState label="Membuka workspace…" />;
  if (notebook.isError) return <ErrorState message={notebook.error instanceof ApiRequestError ? notebook.error.message : "Workspace belum berhasil dibuka."} onRetry={() => void notebook.refetch()} />;
  if (sources.isError) return <ErrorState message={sources.error instanceof ApiRequestError ? sources.error.message : "Daftar sumber belum berhasil dimuat."} onRetry={() => void sources.refetch()} />;
  if (sources.isPending) return <LoadingState label="Memuat sumber workspace…" />;

  const currentNotebook = notebook.data;
  const currentSources = sources.data;
  const selectedSource = currentSources.find((source) => source.id === selectedSourceId) ?? currentSources.find((source) => source.status === "ready");
  const canUpload = currentNotebook.role === "owner" || currentNotebook.role === "editor";

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <Link className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground" to="/workspaces"><ArrowLeft aria-hidden="true" className="size-3.5" />Workspace saya</Link>
          <h1 className="mt-2 truncate text-2xl font-bold tracking-tight text-navy sm:text-3xl">{currentNotebook.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{currentNotebook.course || "Ruang belajar kelompok"} · {currentSources.length} sumber</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {currentNotebook.role === "owner" && <InviteWorkspaceDialog notebookId={notebookId} />}
          <Button asChild><Link to={`/game/${notebookId}`}><Gamepad2 aria-hidden="true" />Mulai game</Link></Button>
        </div>
      </div>
      <WorkspaceTabs notebookId={notebookId} />

      {readySourceNotice && <div className="flex items-center gap-3 rounded-2xl bg-secondary/70 p-3" role="status">
        <BubiMascot {...REACTION_FOR_EVENT.new_source_ready} animationKey={readySourceNotice.id} className="h-14 w-auto" decorative />
        <p className="text-sm leading-6 text-navy"><span className="font-semibold">{readySourceNotice.title}</span> siap dibaca. Bubi bisa merujuk materi ini untuk jawaban dan kuis.</p>
      </div>}

      <div className="grid gap-4 xl:grid-cols-[minmax(245px,0.72fr)_minmax(390px,1.35fr)_minmax(240px,0.78fr)]">
        <section className="space-y-4 rounded-3xl border bg-card p-4 sm:p-5" aria-labelledby="workspace-sources-title">
          <div className="flex items-center justify-between gap-2"><h2 className="font-bold text-navy" id="workspace-sources-title">Sumber</h2><span className="text-xs text-muted-foreground">{currentSources.length}/40</span></div>
          <SourceUploader canUpload={canUpload} notebookId={notebookId} />
          <SourceList canDeleteSource={(source) => currentNotebook.role === "owner" || source.uploadedBy === currentUser.data?.id} notebookId={notebookId} onSelect={(source) => setSelectedSourceId(source.id)} selectedId={selectedSource?.id} sources={currentSources} />
          {selectedSource?.status === "ready" && <Button asChild className="w-full" variant="outline"><Link to={`/workspaces/${notebookId}/sources/${selectedSource.id}/map`}><Network aria-hidden="true"/>Peta konsep sumber ini</Link></Button>}
        </section>
        <section className="min-w-0 rounded-3xl border bg-card p-4 sm:p-6" aria-label="Panel belajar">
          <AskPanel notebookId={notebookId} onCitationSelect={setCitation} sources={currentSources} />
        </section>
        {citation ? <CitationPreviewPanel citation={citation} notebookId={notebookId} /> : <SourcePreviewPanel notebookId={notebookId} source={selectedSource} />}
      </div>
    </div>
  );
}
