import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, BookOpenText, Network, Users } from "lucide-react";
import type { MindMapResponse, NotebookMember } from "@deep-notes/shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState, PageTitle } from "@/components/shared/PageStates";
import { useNotebook, useSources } from "@/features/notebooks/queries";
import { ClassroomScene } from "@/features/visualization/ClassroomScene";
import { SourcePageDialog } from "@/features/sources/SourcePageDialog";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

export function WorkspaceClassPage() {
  const { notebookId = "" } = useParams();
  const notebook = useNotebook(notebookId);
  const sources = useSources(notebookId);
  const members = useQuery({ queryKey: ["notebooks", notebookId, "members"], queryFn: () => api<NotebookMember[]>(`/notebooks/${notebookId}/members`), enabled: Boolean(notebookId) });
  const [requestedSourceId, setRequestedSourceId] = useState("");
  const source = useMemo(() => sources.data?.find((item) => item.id === requestedSourceId) ?? sources.data?.find((item) => item.status === "ready"), [requestedSourceId, sources.data]);
  const mindMap = useQuery({ queryKey: ["notebooks", notebookId, "sources", source?.id, "mindmap"], queryFn: () => api<MindMapResponse>(`/notebooks/${notebookId}/sources/${source!.id}/visual?kind=mindmap`), enabled: Boolean(source?.id && source.status === "ready") });

  if (notebook.isPending || sources.isPending || members.isPending) return <LoadingState label="Menyiapkan kelas belajar…"/>;
  if (notebook.isError) return <ErrorState message={notebook.error.message} onRetry={() => void notebook.refetch()}/>;
  if (sources.isError) return <ErrorState message={sources.error.message} onRetry={() => void sources.refetch()}/>;
  if (members.isError) return <ErrorState message={members.error.message} onRetry={() => void members.refetch()}/>;
  const readySources = sources.data.filter((item) => item.status === "ready");
  const graph = mindMap.data;

  return <div className="space-y-6"><PageTitle eyebrow={notebook.data.title} title="Kelas bersama Bubi" description="Pilih topik di papan tulis, Bubi menunjukkan hubungannya dan halaman rujukannya." action={<Button asChild variant="outline"><Link to={`/workspaces/${notebookId}`}><ArrowLeft aria-hidden="true"/>Kembali ke workspace</Link></Button>}/>
    <nav aria-label="Bagian workspace" className="flex gap-2 overflow-x-auto pb-1"><Link className="rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-navy" to={`/workspaces/${notebookId}`}>Belajar</Link><Link className="rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted" to={`/workspaces/${notebookId}/game`}>Game</Link><Link className="rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted" to={`/workspaces/${notebookId}/team`}>Papan kelompok</Link><Link className="rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted" to={`/workspaces/${notebookId}/discussion`}>Diskusi</Link><Link className="rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted" to={`/workspaces/${notebookId}/notes`}>Catatan</Link><span aria-current="page" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Kelas Bubi</span><Link className="rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted" to={`/workspaces/${notebookId}/visualization`}>Visualisasi materi</Link></nav>
    <section className="space-y-4 rounded-3xl border bg-card p-4 sm:p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="font-bold text-navy">Papan tulis dari sumbermu</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Anggota di bawah adalah anggota workspace, bukan status kehadiran langsung.</p></div><div className="w-full space-y-2 sm:max-w-sm"><label className="text-sm font-semibold" htmlFor="class-source">Pilih sumber</label><select className="h-10 w-full rounded-xl border bg-background px-3 text-sm" id="class-source" onChange={(event) => setRequestedSourceId(event.target.value)} value={source?.id ?? ""}><option value="">Pilih sumber yang siap</option>{readySources.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></div></div>
      {readySources.length === 0 ? <EmptyState title="Belum ada sumber siap" description="Tambahkan sumber yang dapat dibaca agar peta konsep bisa ditampilkan di papan tulis." action={<Button asChild><Link to={`/workspaces/${notebookId}`}>Buka workspace</Link></Button>}/> : mindMap.isPending ? <LoadingState label="Membentuk papan dari isi sumber…"/> : mindMap.isError ? <ErrorState message={mindMap.error.message} onRetry={() => void mindMap.refetch()}/> : graph?.nodes.length ? <><ClassroomScene graph={graph} key={source!.id} members={members.data} notebookId={notebookId} sourceId={source!.id} sourceTitle={source!.title}/><div className="flex items-center gap-2 text-sm text-muted-foreground"><Network aria-hidden="true" className="size-4 text-teal"/><span>{graph.nodes.length} topik dan {graph.edges.length} hubungan dari {source?.title}</span></div></> : <EmptyState title="Papan tulis belum tersedia" description="Sumber ini belum menghasilkan peta konsep."/>}
    </section>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)]"><Card className="rounded-3xl p-5"><div className="flex items-center gap-2"><Users aria-hidden="true" className="size-4 text-teal"/><h2 className="font-bold text-navy">Anggota workspace</h2><span className="text-xs text-muted-foreground">{members.data.length}</span></div><ul className="mt-4 grid gap-2 sm:grid-cols-2">{members.data.map((member) => <li className="flex items-center gap-3 rounded-xl bg-muted/60 p-3" key={member.id}><span aria-hidden="true" className="grid size-9 place-items-center rounded-full bg-secondary text-sm font-bold text-navy">{member.name.trim().slice(0, 1).toUpperCase()}</span><span className="min-w-0"><span className="block truncate text-sm font-semibold">{member.name}</span><span className="text-xs text-muted-foreground">{member.role === "owner" ? "Pemilik" : member.role === "editor" ? "Editor" : "Pembaca"}</span></span></li>)}</ul></Card><Card className="rounded-3xl p-5"><div className="flex items-center gap-2"><BookOpenText aria-hidden="true" className="size-4 text-teal"/><h2 className="font-bold text-navy">Topik dan rujukan</h2></div>{graph?.nodes.length ? <ol className="mt-4 space-y-2">{graph.nodes.slice(0, 8).map((node) => <li className="flex items-center justify-between gap-2 rounded-xl bg-muted/60 p-3 text-sm" key={node.id}><span>{node.label}</span>{source && node.page && <SourcePageDialog notebookId={notebookId} page={node.page} sourceId={source.id} sourceTitle={source.title}/>}</li>)}</ol> : <p className="mt-3 text-sm leading-6 text-muted-foreground">Pilih sumber siap untuk menampilkan topik dan halaman rujukannya.</p>}</Card></div>
    <p className="text-xs leading-5 text-muted-foreground">Ruang ini menampilkan visual konsep dan daftar anggota. Audio langsung dan kehadiran waktu nyata belum tersedia di backend.</p>
  </div>;
}
