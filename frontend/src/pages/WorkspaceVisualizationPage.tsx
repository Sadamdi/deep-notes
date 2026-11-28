import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { ArrowLeft, BarChart3, ExternalLink } from "lucide-react";
import type { SourceResponse, SourceTimeline, SourceTranscript, SourceVisualResponse } from "@deep-notes/shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState, PageTitle } from "@/components/shared/PageStates";
import { useNotebook, useSources } from "@/features/notebooks/queries";
import { FormatPreview } from "@/features/visualization/FormatPreview";
import { SourcePageDialog } from "@/features/sources/SourcePageDialog";
import { api } from "@/lib/api";
import { WorkspaceTabs } from "@/components/shared/WorkspaceTabs";

type View = "mindmap" | "timeline" | "chart" | "transcript";

function viewsFor(source: SourceResponse): View[] {
  if (source.kind === "audio") return ["transcript"];
  if (source.kind === "pptx") return ["mindmap", "timeline"];
  if (source.kind === "csv" || source.kind === "xlsx") return ["mindmap", "chart"];
  return ["mindmap"];
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${rest}`;
}

function Transcript({ data }: { data: SourceTranscript }) {
  return data.segments.length ? <ol className="space-y-3">{data.segments.map((segment, index) => <li className="grid gap-2 rounded-2xl bg-muted/50 p-4 sm:grid-cols-[110px_minmax(0,1fr)]" key={`${segment.startSec}-${index}`}><time className="text-xs font-semibold text-teal">{formatTime(segment.startSec)}–{formatTime(segment.endSec)}</time><p className="whitespace-pre-wrap text-sm leading-6">{segment.text}</p></li>)}</ol> : <EmptyState title="Tidak ada ucapan yang terbaca" description="Audio berhasil diproses, tetapi tidak ada bagian percakapan yang dapat ditampilkan."/>;
}

function Timeline({ source, data, notebookId }: { source: SourceResponse; data: SourceTimeline; notebookId: string }) {
  return <ol className="space-y-3">{data.slides.map((slide) => <li className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-start" key={slide.slide}><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-sm font-bold text-navy">{slide.slide}</span><div className="min-w-0 flex-1"><h3 className="font-semibold text-navy">Slide {slide.slide}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{slide.text || "Tidak ada teks yang berhasil dibaca pada slide ini."}</p></div><SourcePageDialog notebookId={notebookId} page={slide.slide} sourceId={source.id} sourceTitle={source.title}/></li>)}</ol>;
}

function ChartTables({ data }: { data: Extract<SourceVisualResponse, { kind: "chart" }> }) {
  return <div className="space-y-5">{data.tables.map((table) => <Card className="rounded-2xl p-4 sm:p-5" key={table.name}><h3 className="font-semibold text-navy">{table.name}</h3><p className="mt-1 text-xs text-muted-foreground">Kategori: {table.categoryColumn}</p><div className="mt-4 space-y-5">{table.series.map((series) => {
    const max = Math.max(1, ...series.points.map((point) => Math.abs(point.value)));
    return <section aria-label={series.name} className="space-y-2" key={series.name}><h4 className="text-sm font-semibold">{series.name}</h4><ul className="space-y-2">{series.points.map((point, index) => <li className="grid grid-cols-[minmax(70px,0.7fr)_minmax(0,2fr)_auto] items-center gap-3 text-xs" key={`${point.label}-${index}`}><span className="truncate" title={point.label}>{point.label}</span><span aria-label={`${series.name} ${point.label}: ${point.value}`} className="h-3 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-teal" style={{ width: `${Math.max(2, Math.abs(point.value) / max * 100)}%` }}/></span><data className="min-w-12 text-right font-medium tabular-nums" value={point.value}>{point.value.toLocaleString("id-ID")}</data></li>)}</ul></section>;
  })}</div></Card>)}</div>;
}

export function WorkspaceVisualizationPage() {
  const { notebookId = "" } = useParams();
  const notebook = useNotebook(notebookId);
  const sources = useSources(notebookId);
  const [selectedId, setSelectedId] = useState("");
  const [selectedView, setSelectedView] = useState<View>("mindmap");
  const readySources = sources.data?.filter((source) => source.status === "ready") ?? [];
  const source = readySources.find((item) => item.id === selectedId) ?? readySources[0];
  const availableViews = source ? viewsFor(source) : [];
  const view = availableViews.includes(selectedView) ? selectedView : availableViews[0];
  const visual = useQuery({
    queryKey: ["notebooks", notebookId, "sources", source?.id, "visual", view],
    queryFn: () => api<SourceVisualResponse>(`/notebooks/${notebookId}/sources/${source!.id}/visual?kind=${view}`),
    enabled: Boolean(source && view && view !== "transcript"),
  });
  const transcript = useQuery({
    queryKey: ["notebooks", notebookId, "sources", source?.id, "transcript"],
    queryFn: () => api<SourceTranscript>(`/notebooks/${notebookId}/sources/${source!.id}/transcript`),
    enabled: Boolean(source?.kind === "audio"),
  });
  if (notebook.isPending || sources.isPending) return <LoadingState label="Memuat visualisasi sumber…"/>;
  if (notebook.isError) return <ErrorState message={notebook.error.message} onRetry={() => void notebook.refetch()}/>;
  if (sources.isError) return <ErrorState message={sources.error.message} onRetry={() => void sources.refetch()}/>;
  const formats = [
    { key: "documents", title: "PDF dan Word", available: "Peta konsep dibuat dari teks sumber." },
    { key: "slides", title: "PowerPoint", available: "Teks ditampilkan berurutan per slide dengan nomor slide asli." },
    { key: "tables", title: "Excel dan CSV", available: "Grafik menggunakan nilai numerik hasil ekstraksi tabel." },
    { key: "images", title: "Gambar dan papan tulis", available: "Teks gambar diproses melalui OCR jika AI backend tersedia." },
    { key: "audio", title: "Audio dan rekaman", available: "Transkrip menyertakan waktu ucapan jika AI backend tersedia." },
    { key: "links", title: "Tautan web", available: "Peta konsep memakai teks halaman yang berhasil dibaca." },
  ];

  return <div className="space-y-6"><PageTitle eyebrow={notebook.data.title} title="Visualisasi materi" description="Buka transkrip audio, urutan slide, grafik spreadsheet, atau peta konsep dari sumber siap." action={<Button asChild variant="outline"><Link to={`/workspaces/${notebookId}`}><ArrowLeft aria-hidden="true"/>Kembali ke workspace</Link></Button>}/>
    <WorkspaceTabs notebookId={notebookId} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{formats.map(({ key, title, available }) => <Card className="rounded-3xl p-4 sm:p-5" key={key}><div className={`grid h-32 place-items-center rounded-2xl ${key === "images" ? "bg-coral/80" : key === "tables" || key === "audio" ? "bg-warning/70" : "bg-secondary"}`}><FormatPreview kind={key}/></div><h2 className="mt-4 font-bold text-navy">{title}</h2><p className="mt-2 min-h-12 text-xs leading-5 text-muted-foreground">{available}</p></Card>)}</div>
    {readySources.length ? <section className="space-y-4 rounded-3xl border bg-card p-5 sm:p-6"><div><h2 className="font-bold text-navy">Jelajahi sumber</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Pilih sumber untuk membuka visualisasi atau transkrip yang tersedia.</p></div><div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"><select className="h-11 min-w-0 rounded-xl border bg-background px-3 text-sm" aria-label="Pilih sumber untuk visualisasi" onChange={(event) => { const next = readySources.find((item) => item.id === event.target.value); setSelectedId(event.target.value); setSelectedView(next ? viewsFor(next)[0]! : "mindmap"); }} value={source?.id ?? ""}>{readySources.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select><span className="self-center text-sm text-muted-foreground">{source?.kind === "audio" ? "Audio" : source?.kind.toUpperCase()}</span></div>{source && <div className="flex flex-wrap gap-2" aria-label="Pilih tampilan sumber">{availableViews.map((item) => <Button aria-pressed={view === item} key={item} onClick={() => setSelectedView(item)} size="sm" variant={view === item ? "default" : "outline"}>{item === "mindmap" ? "Peta konsep" : item === "timeline" ? "Linimasa slide" : item === "chart" ? "Grafik data" : "Transkrip audio"}</Button>)}</div>}</section> : <EmptyState title="Belum ada sumber siap" description="Unggah PDF, slide, spreadsheet, gambar, audio, teks, atau tautan yang dapat dibaca." action={<Button asChild><Link to={`/workspaces/${notebookId}`}>Buka workspace</Link></Button>}/>}
    {source && view === "mindmap" && <Card className="rounded-3xl p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold text-navy">Peta konsep sumber</h2><p className="mt-1 text-sm text-muted-foreground">Hubungan antar topik dibentuk dari isi materi.</p></div><Button asChild variant="outline"><Link to={`/workspaces/${notebookId}/sources/${source.id}/map`}>Buka peta konsep<BarChart3 aria-hidden="true"/><ExternalLink aria-hidden="true"/></Link></Button></div></Card>}
    {source && view === "timeline" && <section className="space-y-3"><div><h2 className="font-bold text-navy">Linimasa slide</h2><p className="mt-1 text-sm text-muted-foreground">Urutan dan nomor mengikuti slide yang diekstrak dari file PowerPoint.</p></div>{visual.isPending ? <LoadingState label="Membaca urutan slide…"/> : visual.isError ? <ErrorState message={visual.error.message} onRetry={() => void visual.refetch()}/> : visual.data.kind === "timeline" ? <Timeline data={visual.data} notebookId={notebookId} source={source}/> : <ErrorState message="Respons linimasa tidak cocok dengan sumber ini."/>}</section>}
    {source && view === "chart" && <section className="space-y-3"><div><h2 className="font-bold text-navy">Grafik dari tabel</h2><p className="mt-1 text-sm text-muted-foreground">Kolom teks pertama menjadi label; setiap kolom numerik ditampilkan sebagai seri.</p></div>{visual.isPending ? <LoadingState label="Menyusun grafik dari data tabel…"/> : visual.isError ? <ErrorState message={visual.error.message} onRetry={() => void visual.refetch()}/> : visual.data.kind === "chart" ? <ChartTables data={visual.data}/> : <ErrorState message="Respons grafik tidak cocok dengan sumber ini."/>}</section>}
    {source && view === "transcript" && <section className="space-y-3"><div><h2 className="font-bold text-navy">Transkrip audio</h2><p className="mt-1 text-sm text-muted-foreground">Waktu mengarah ke segmen ucapan yang diekstrak dari rekaman.</p></div>{transcript.isPending ? <LoadingState label="Memuat transkrip audio…"/> : transcript.isError ? <ErrorState message={transcript.error.message} onRetry={() => void transcript.refetch()}/> : <Transcript data={transcript.data}/>}</section>}
  </div>;
}
