import { useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, AudioLines, BarChart3, ExternalLink, FileImage, FileText, Presentation, Table2, Globe2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState, PageTitle } from "@/components/shared/PageStates";
import { useNotebook, useSources } from "@/features/notebooks/queries";

const formats = [
  { key: "documents", title: "PDF dan Word", icon: FileText, available: "Peta konsep dengan rujukan halaman tersedia untuk sumber yang siap." },
  { key: "slides", title: "PowerPoint", icon: Presentation, available: "Teks slide dapat dipakai untuk membuat peta konsep sumber." },
  { key: "tables", title: "Excel dan CSV", icon: Table2, available: "Teks tabel dapat dipakai untuk peta konsep; grafik kolom belum memiliki API." },
  { key: "images", title: "Gambar dan papan tulis", icon: FileImage, available: "Teks gambar diproses melalui OCR bila layanan AI tersedia." },
  { key: "audio", title: "Audio dan rekaman", icon: AudioLines, available: "Belum didukung oleh kontrak unggah sumber." },
  { key: "links", title: "Tautan web", icon: Globe2, available: "Teks halaman yang berhasil dibaca dapat dijadikan peta konsep." },
];

export function WorkspaceVisualizationPage() {
  const { notebookId = "" } = useParams();
  const notebook = useNotebook(notebookId);
  const sources = useSources(notebookId);
  const [selectedId, setSelectedId] = useState("");
  if (notebook.isPending || sources.isPending) return <LoadingState label="Memuat visualisasi sumber…"/>;
  if (notebook.isError) return <ErrorState message={notebook.error.message} onRetry={() => void notebook.refetch()}/>;
  if (sources.isError) return <ErrorState message={sources.error.message} onRetry={() => void sources.refetch()}/>;
  const readySources = sources.data.filter((source) => source.status === "ready");
  const source = readySources.find((item) => item.id === selectedId) ?? readySources[0];
  return <div className="space-y-6"><PageTitle eyebrow={notebook.data.title} title="Visualisasi materi" description="Pilih sumber untuk membuka peta konsep yang dibuat dari teks materi dan rujukan halamannya." action={<Button asChild variant="outline"><Link to={`/workspaces/${notebookId}`}><ArrowLeft aria-hidden="true"/>Kembali ke workspace</Link></Button>}/>
    <nav aria-label="Bagian workspace" className="flex gap-2 overflow-x-auto pb-1"><Link className="rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-navy" to={`/workspaces/${notebookId}`}>Belajar</Link><Link className="rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted" to={`/workspaces/${notebookId}/game`}>Game</Link><Link className="rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted" to={`/workspaces/${notebookId}/team`}>Papan kelompok</Link><Link className="rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted" to={`/workspaces/${notebookId}/discussion`}>Diskusi</Link><Link className="rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted" to={`/workspaces/${notebookId}/notes`}>Catatan</Link><Link className="rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted" to={`/workspaces/${notebookId}/class`}>Kelas 3D</Link><span aria-current="page" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Visualisasi materi</span></nav>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{formats.map(({ key, title, icon: Icon, available }) => <Card className="rounded-3xl p-4 sm:p-5" key={key}><div className={`grid h-32 place-items-center rounded-2xl ${key === "images" ? "bg-coral/80" : key === "tables" || key === "audio" ? "bg-warning/70" : "bg-secondary"}`}><Icon aria-hidden="true" className="size-12 text-navy"/></div><h2 className="mt-4 font-bold text-navy">{title}</h2><p className="mt-2 min-h-12 text-xs leading-5 text-muted-foreground">{available}</p>{(key === "tables" || key === "audio") && <span className="mt-3 inline-flex rounded-full bg-warning/30 px-3 py-1 text-[11px] font-semibold text-navy">Fitur terbatas</span>}</Card>)}</div>
    {readySources.length ? <section className="space-y-4 rounded-3xl border bg-card p-5 sm:p-6"><div><h2 className="font-bold text-navy">Buat peta konsep</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Endpoint visual yang tersedia saat ini menghasilkan peta konsep dengan sumber dan nomor halaman.</p></div><div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"><select className="h-11 min-w-0 rounded-xl border bg-background px-3 text-sm" aria-label="Pilih sumber untuk visualisasi" onChange={(event) => setSelectedId(event.target.value)} value={source?.id ?? ""}>{readySources.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select><Button asChild disabled={!source}><Link to={source ? `/workspaces/${notebookId}/sources/${source.id}/map` : "#"}><BarChart3 aria-hidden="true"/>Buka peta konsep<ExternalLink aria-hidden="true"/></Link></Button></div></section> : <EmptyState title="Belum ada sumber siap" description="Unggah PDF, slide, spreadsheet, gambar, teks, atau tautan yang dapat dibaca." action={<Button asChild><Link to={`/workspaces/${notebookId}`}>Buka workspace</Link></Button>}/>}
    <p className="text-xs leading-5 text-muted-foreground">Visual khusus seperti grafik spreadsheet dan transkripsi audio belum tersedia; halaman ini hanya menampilkan kemampuan yang tercantum dalam kontrak API saat ini.</p>
  </div>;
}
