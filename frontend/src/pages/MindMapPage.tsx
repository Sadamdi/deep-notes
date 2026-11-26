import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { ArrowLeft, Network } from "lucide-react";
import type { MindMapResponse, NotebookResponse, SourceResponse } from "@deep-notes/shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState, PageTitle } from "@/components/shared/PageStates";
import { SourcePageDialog } from "@/features/sources/SourcePageDialog";
import { ConceptTree } from "@/features/visualization/ConceptTree";
import { api } from "@/lib/api";

export function MindMapPage() {
  const { notebookId = "", sourceId = "" } = useParams();
  const notebook = useQuery({ queryKey: ["notebooks", notebookId], queryFn: () => api<NotebookResponse>(`/notebooks/${notebookId}`) });
  const sources = useQuery({ queryKey: ["notebooks", notebookId, "sources"], queryFn: () => api<SourceResponse[]>(`/notebooks/${notebookId}/sources`) });
  const mindMap = useQuery({ queryKey: ["notebooks", notebookId, "sources", sourceId, "mindmap"], queryFn: () => api<MindMapResponse>(`/notebooks/${notebookId}/sources/${sourceId}/visual?kind=mindmap`), enabled: Boolean(notebookId && sourceId) });
  if (notebook.isPending || sources.isPending || mindMap.isPending) return <LoadingState label="Menyusun peta konsep dari sumber…"/>;
  if (notebook.isError) return <ErrorState message={notebook.error.message} onRetry={() => void notebook.refetch()}/>;
  if (sources.isError) return <ErrorState message={sources.error.message} onRetry={() => void sources.refetch()}/>;
  if (mindMap.isError) return <ErrorState message={mindMap.error.message} onRetry={() => void mindMap.refetch()}/>;
  const source = sources.data.find((item) => item.id === sourceId);
  const graph = mindMap.data;
  if (!source || !graph) return <EmptyState title="Sumber tidak ditemukan" description="Pilih sumber dari workspace yang sedang dibuka." action={<Button asChild><Link to={`/workspaces/${notebookId}`}>Kembali ke workspace</Link></Button>}/>;
  if (!graph.nodes.length) return <EmptyState title="Peta konsep belum tersedia" description="Sumber ini belum menghasilkan simpul konsep yang bisa ditampilkan."/>;
  return <div className="space-y-6"><PageTitle action={<Button asChild variant="outline"><Link to={`/workspaces/${notebookId}`}><ArrowLeft aria-hidden="true"/>Kembali ke workspace</Link></Button>} description={`${notebook.data.title} · ${source.title}`} eyebrow="Peta konsep" title="Hubungan antar topik"/><div className="flex items-center gap-2 rounded-2xl bg-secondary/60 p-4 text-sm leading-6"><Network aria-hidden="true" className="size-5 shrink-0 text-teal"/><p>Visualisasi dibentuk dari isi sumber ini dan dapat dibuka ulang dari workspace. {graph.cached ? "Peta konsep ini dimuat dari hasil tersimpan." : "Peta konsep baru saja dibuat."}</p></div><Card className="overflow-hidden rounded-3xl p-3 sm:p-5"><ConceptTree graph={graph} title={source.title}/></Card><section className="rounded-3xl border bg-card p-5"><h2 className="font-bold text-navy">Daftar topik</h2><ol className="mt-3 grid gap-2 sm:grid-cols-2">{graph.nodes.map((node) => <li className="flex items-center justify-between gap-2 rounded-xl bg-muted/60 p-3 text-sm" key={node.id}><span className="font-medium">{node.label}</span>{node.page && <SourcePageDialog notebookId={notebookId} page={node.page} sourceId={source.id} sourceTitle={source.title}/>}</li>)}</ol></section></div>;
}
