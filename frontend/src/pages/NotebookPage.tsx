import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/features/auth/useAuth";
import { WorkspaceBubiPanel } from "@/features/notebooks/WorkspaceBubiPanel";
import { WorkspaceGroupTab } from "@/features/notebooks/WorkspaceGroupTab";
import { WorkspaceQuizTab } from "@/features/notebooks/WorkspaceQuizTab";
import { WorkspaceSourcePreview } from "@/features/notebooks/WorkspaceSourcePreview";
import { WorkspaceSourcesColumn } from "@/features/notebooks/WorkspaceSourcesColumn";
import type { SelectedPreviewTarget, WorkspaceDetail, WorkspaceSource } from "@/features/notebooks/types";
import { ApiRequestError, api } from "@/lib/api";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { cn } from "@/lib/utils";

/** Labeled sample sources used only on `/notebooks/sample` for unauthenticated layout inspection. */
const SAMPLE_SOURCES: WorkspaceSource[] = [
  {
    id: "s1",
    title: "Bab 1 Topologi.pdf (contoh)",
    kind: "pdf",
    status: "ready",
    error: null,
    pageCount: 8,
    chunkCount: 8,
    origin: null,
    uploadedBy: "u1",
    uploadedByName: "Contoh anggota",
  },
  {
    id: "s2",
    title: "Slide Lapisan OSI.pptx (contoh)",
    kind: "pptx",
    status: "ready",
    error: null,
    pageCount: 12,
    chunkCount: 12,
    origin: null,
    uploadedBy: "u1",
    uploadedByName: "Contoh anggota",
  },
  {
    id: "s3",
    title: "Catatan Praktikum.md (contoh)",
    kind: "text",
    status: "processing",
    error: null,
    pageCount: null,
    chunkCount: 0,
    origin: null,
    uploadedBy: "u2",
    uploadedByName: "Contoh anggota",
  },
];

type TabKey = "belajar" | "kuis" | "kelompok";

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "belajar", label: "Belajar" },
  { key: "kuis", label: "Sesi dan Kuis" },
  { key: "kelompok", label: "Papan Kelompok" },
];

export function NotebookPage() {
  const { notebookId = "sample" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const isSample = notebookId === "sample";

  const rawTab = searchParams.get("tab");
  const activeTab: TabKey = rawTab === "kuis" || rawTab === "kelompok" ? rawTab : "belajar";

  const [referenceIds, setReferenceIds] = useState<string[]>([]);
  const [previewTarget, setPreviewTarget] = useState<SelectedPreviewTarget | null>(
    isSample ? { sourceId: "s1", sourceTitle: "Bab 1 Topologi.pdf (contoh)", page: 3 } : null,
  );

  const detailQuery = useQuery({
    queryKey: ["notebook", notebookId],
    queryFn: () => api<WorkspaceDetail>(`/notebooks/${notebookId}`),
    enabled: !isSample,
    retry: false,
  });

  const sourcesQuery = useQuery({
    queryKey: ["notebook-sources", notebookId],
    queryFn: () => api<WorkspaceSource[]>(`/notebooks/${notebookId}/sources`),
    enabled: !isSample,
    retry: false,
    refetchInterval: (query) =>
      query.state.data?.some((s) => s.status === "processing") ? 2500 : false,
  });

  const heading = isSample ? "Jaringan Komputer UTS" : (detailQuery.data?.title ?? "Workspace");
  useDocumentTitle(heading);

  if (!isSample && (detailQuery.isPending || sourcesQuery.isPending)) {
    return (
      <Card>
        <CardContent className="py-10">
          <p role="status" className="text-sm text-muted-foreground">
            Memuat ruang belajar dan daftar sumber...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!isSample && (detailQuery.isError || sourcesQuery.isError)) {
    const err = detailQuery.error ?? sourcesQuery.error;
    const isUnauthorized = err instanceof ApiRequestError && err.code === "UNAUTHORIZED";
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold text-destructive">
            {isUnauthorized ? "Masuk untuk membuka workspace ini" : "Workspace tidak dapat diakses"}
          </CardTitle>
          <CardDescription>
            {isUnauthorized
              ? "Ruang belajar kelompok bersifat tertutup bagi anggotanya."
              : "Ruang ini tidak ditemukan atau akun kamu bukan anggota workspace tersebut."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2.5">
          {isUnauthorized ? (
            <Button asChild>
              <Link to={`/masuk?next=${encodeURIComponent(`/notebooks/${notebookId}`)}`}>Masuk ke Akun</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link to="/workspace">Ke Workspace Saya</Link>
            </Button>
          )}
          <Button asChild variant="secondary">
            <Link to="/notebooks/sample">Buka Contoh Workspace</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const sources = isSample ? SAMPLE_SOURCES : (sourcesQuery.data ?? []);
  const readySources = sources.filter((s) => s.status === "ready");
  const effectivePreview =
    previewTarget ??
    (readySources[0]
      ? { sourceId: readySources[0].id, sourceTitle: readySources[0].title, page: 1 }
      : null);

  const role = isSample ? "viewer" : (detailQuery.data?.role ?? "viewer");
  const isOwner = !isSample && role === "owner";
  const canEdit = !isSample && (role === "owner" || role === "editor");

  const setTab = (tab: TabKey) => {
    setSearchParams(tab === "belajar" ? {} : { tab });
  };

  const handleOpenCitation = (target: SelectedPreviewTarget) => {
    setPreviewTarget(target);
    if (activeTab !== "belajar") {
      setTab("belajar");
    }
  };

  const toggleReference = (sourceId: string) => {
    setReferenceIds((prev) => (prev.includes(sourceId) ? prev.filter((id) => id !== sourceId) : [...prev, sourceId]));
  };

  return (
    <div className="space-y-5">
      <header className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-[34px]">{heading}</h1>
              {isSample ? (
                <Badge variant="secondary">Data contoh</Badge>
              ) : (
                <>
                  <Badge variant="secondary">Peran: {role}</Badge>
                  {detailQuery.data?.visibility === "public" && <Badge variant="outline">Publik</Badge>}
                </>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {isSample
                ? "Ruang contoh interaktif. Seluruh materi dan kuis di halaman ini adalah data contoh."
                : `${detailQuery.data?.course ? `${detailQuery.data.course} · ` : ""}Ruang belajar kelompok`}
            </p>
          </div>

          <Button asChild variant="outline" size="sm">
            <Link to="/workspace">Semua Workspace</Link>
          </Button>
        </div>

        {/* Workspace sub-navigation pills (Figma node 179:3048) */}
        <div role="tablist" aria-label="Bagian workspace" className="flex flex-wrap gap-2.5">
          {TABS.map((t) => {
            const selected = activeTab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setTab(t.key)}
                className={cn(
                  "min-h-11 rounded-lg px-4 py-2 text-sm font-bold transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                  selected
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </header>

      {activeTab === "belajar" && (
        <div className="grid items-start gap-5 lg:grid-cols-12">
          <div className="lg:col-span-3">
            <WorkspaceSourcesColumn
              notebookId={notebookId}
              isSample={isSample}
              canEdit={canEdit}
              currentUserId={user?.id ?? null}
              isOwner={isOwner}
              sources={sources}
              activeSourceId={effectivePreview?.sourceId ?? null}
              referenceIds={referenceIds}
              onToggleReference={toggleReference}
              onClearReferences={() => setReferenceIds([])}
              onSelectPreview={(t) => setPreviewTarget(t)}
            />
          </div>

          <div className="lg:col-span-5">
            <WorkspaceBubiPanel
              notebookId={notebookId}
              isSample={isSample}
              readySourceCount={readySources.length}
              referenceIds={referenceIds}
              onOpenCitation={handleOpenCitation}
            />
          </div>

          <div className="lg:col-span-4">
            <WorkspaceSourcePreview
              notebookId={notebookId}
              isSample={isSample}
              sources={sources}
              target={effectivePreview}
              onChangePage={(nextPage) => {
                if (effectivePreview) {
                  setPreviewTarget({ ...effectivePreview, page: nextPage, highlightQuote: undefined });
                }
              }}
            />
          </div>
        </div>
      )}

      {activeTab === "kuis" && (
        <WorkspaceQuizTab
          notebookId={notebookId}
          isSample={isSample}
          canEdit={canEdit}
          readySourceCount={readySources.length}
          referenceIds={referenceIds}
          onJumpToCitation={handleOpenCitation}
        />
      )}

      {activeTab === "kelompok" && (
        <WorkspaceGroupTab
          notebookId={notebookId}
          isSample={isSample}
          isOwner={isOwner}
          onJumpToCitation={handleOpenCitation}
        />
      )}
    </div>
  );
}
