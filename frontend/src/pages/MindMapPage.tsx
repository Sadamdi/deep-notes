import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { ArrowLeft, Network } from "lucide-react";
import type { MindMapResponse, NotebookResponse, SourceResponse } from "@deep-notes/shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState, PageTitle } from "@/components/shared/PageStates";
import { SourcePageDialog } from "@/features/sources/SourcePageDialog";
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
  const grouped = new Map<number, typeof graph.nodes>();
  for (const node of graph.nodes) grouped.set(node.level, [...(grouped.get(node.level) ?? []), node]);
  const positions = new Map<string, { x: number; y: number }>();
  for (const [level, nodes] of grouped) nodes.forEach((node, index) => positions.set(node.id, { x: 110 + level * 230, y: 75 + index * Math.max(90, 500 / Math.max(nodes.length, 1)) }));
  const height = Math.max(440, ...[...positions.values()].map((position) => position.y + 80));
  return <div className="space-y-6"><PageTitle action={<Button asChild variant="outline"><Link to={`/workspaces/${notebookId}`}><ArrowLeft aria-hidden="true"/>Kembali ke workspace</Link></Button>} description={`${notebook.data.title} · ${source.title}`} eyebrow="Peta konsep" title="Hubungan antar topik"/><div className="flex items-center gap-2 rounded-2xl bg-secondary/60 p-4 text-sm leading-6"><Network aria-hidden="true" className="size-5 shrink-0 text-teal"/><p>Visualisasi dibentuk dari isi sumber ini dan dapat dibuka ulang dari workspace. {graph.cached ? "Peta konsep ini dimuat dari hasil tersimpan." : "Peta konsep baru saja dibuat."}</p></div><Card className="overflow-hidden rounded-3xl p-3 sm:p-5"><div className="overflow-x-auto"><svg aria-label={`Peta konsep sumber ${source.title}`} className="min-w-[780px]" height={height} role="img" viewBox={`0 0 900 ${height}`} width="100%"><defs><marker id="map-arrow" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4"><path d="M0,0 L8,4 L0,8 z" fill="currentColor" className="text-teal"/></marker></defs>{graph.edges.map((edge, index) => { const from = positions.get(edge.from); const to = positions.get(edge.to); if (!from || !to) return null; const x1 = from.x + 120; const y1 = from.y + 28; const x2 = to.x; const y2 = to.y + 28; return <g key={`${edge.from}-${edge.to}-${index}`}><path d={`M ${x1} ${y1} C ${x1 + 50} ${y1}, ${x2 - 50} ${y2}, ${x2} ${y2}`} fill="none" markerEnd="url(#map-arrow)" stroke="currentColor" strokeWidth="2" className="text-teal/45"/>{edge.label && <text fill="currentColor" fontSize="11" textAnchor="middle" x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 7} className="text-muted-foreground">{edge.label}</text>}</g>; })}{graph.nodes.map((node) => { const point = positions.get(node.id)!; return <g key={node.id}><rect fill={node.level === 0 ? "var(--color-navy)" : "var(--color-secondary)"} height="56" rx="14" stroke="var(--color-border)" width="150" x={point.x} y={point.y}/><text fill={node.level === 0 ? "white" : "var(--color-navy)"} fontSize="13" fontWeight="600" textAnchor="middle" x={point.x + 75} y={point.y + 25}>{node.label.length > 22 ? `${node.label.slice(0, 21)}…` : node.label}</text>{node.page && <text fill={node.level === 0 ? "white" : "var(--color-muted-foreground)"} fontSize="10" textAnchor="middle" x={point.x + 75} y={point.y + 42}>Halaman {node.page}</text>}</g>; })}</svg></div></Card><section className="rounded-3xl border bg-card p-5"><h2 className="font-bold text-navy">Daftar topik</h2><ol className="mt-3 grid gap-2 sm:grid-cols-2">{graph.nodes.map((node) => <li className="flex items-center justify-between gap-2 rounded-xl bg-muted/60 p-3 text-sm" key={node.id}><span className="font-medium">{node.label}</span>{node.page && <SourcePageDialog notebookId={notebookId} page={node.page} sourceId={source.id} sourceTitle={source.title}/>}</li>)}</ol></section></div>;
}
