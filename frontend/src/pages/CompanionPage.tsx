import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams } from "react-router";
import { BookOpen, Volume2 } from "lucide-react";
import { REACTION_FOR_EVENT, explainRequestSchema, type Emotion, type ExplainRequest } from "@deep-notes/shared";
import type { CompanionCatalog, ExplainPerformanceResponse } from "@deep-notes/shared";
import { BubiMascot } from "@/components/shared/BubiMascot";
import { ErrorState, LoadingState, PageTitle } from "@/components/shared/PageStates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSources } from "@/features/notebooks/queries";
import { SourceScopePicker } from "@/features/sources/SourceScopePicker";
import { SourcePageDialog } from "@/features/sources/SourcePageDialog";
import { useSourceScope } from "@/features/sources/useSourceScope";
import { api, jsonBody } from "@/lib/api";

const styleNames = { teacher: "Guru bertahap", friend: "Teman santai", coach: "Pelatih" } as const;
const levelNames = { simple: "Sederhana", normal: "Seimbang", detailed: "Rinci" } as const;
const emotionNames: Record<Emotion, string> = {
  idle: "Menjelaskan",
  senang: "Senang",
  sedih: "Sedih",
  marah: "Marah",
  antusias: "Antusias",
  semangat: "Menyemangati",
};

export function CompanionPage() {
  const { notebookId = "" } = useParams();
  const sources = useSources(notebookId);
  const catalog = useQuery({ queryKey: ["companion", "catalog"], queryFn: () => api<CompanionCatalog>("/companion/catalog") });
  const [question, setQuestion] = useState("");
  const [style, setStyle] = useState<ExplainRequest["style"]>("teacher");
  const [level, setLevel] = useState<ExplainRequest["level"]>("normal");
  const [mascotId, setMascotId] = useState("");
  const { sourceIds, selectedSourceIds, setSourceIds } = useSourceScope(notebookId, sources.data ?? []);
  const [activeBeatIndex, setActiveBeatIndex] = useState(0);
  const [validation, setValidation] = useState("");
  const explain = useMutation({ mutationFn: (request: ExplainRequest) => api<ExplainPerformanceResponse>(`/notebooks/${notebookId}/companion/explain`, jsonBody("POST", request)) });

  if (sources.isPending || catalog.isPending) return <LoadingState label="Menyiapkan teman belajar…" />;
  if (sources.isError) return <ErrorState message={sources.error.message} onRetry={() => void sources.refetch()} />;
  if (catalog.isError) return <ErrorState message={catalog.error.message} onRetry={() => void catalog.refetch()} />;

  const readySources = sources.data.filter((source) => source.status === "ready");
  const mascots = catalog.data.mascots;
  const submitQuestion = (nextQuestion = question) => {
    const parsed = explainRequestSchema.safeParse({ question: nextQuestion, style, level, ...(mascotId ? { mascotId } : {}), ...(sourceIds === null ? {} : { sourceIds: selectedSourceIds }) });
    if (!parsed.success) {
      setValidation(parsed.error.issues[0]?.message ?? "Periksa pertanyaanmu.");
      return;
    }
    setValidation("");
    setActiveBeatIndex(0);
    explain.mutate(parsed.data);
  };

  const performance = explain.data?.performance;
  const activeBeat = performance?.beats[activeBeatIndex] ?? performance?.beats[0];
  const selectedMascot = mascots.find((mascot) => mascot.id === (mascotId || mascots.find((item) => item.role === style)?.id));
  const sayAloud = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageTitle eyebrow="Teman belajar" title="Belajar bareng Bubi" description="Minta penjelasan dari materi workspace. Setiap bagian dan rujukan berasal dari sumber yang dipilih." />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <section className="h-fit space-y-4 rounded-3xl border bg-card p-5 sm:p-6">
          <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); submitQuestion(); }}>
            <div className="space-y-2">
              <Label htmlFor="companion-question">Apa yang ingin kamu pahami?</Label>
              <Input id="companion-question" maxLength={1000} minLength={3} onChange={(event) => setQuestion(event.target.value)} placeholder="Contoh: Jelaskan cara kerja topologi star." value={question} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="companion-style">Gaya mengajar</Label>
                <select className="h-10 w-full rounded-xl border bg-background px-3 text-sm" id="companion-style" onChange={(event) => setStyle(event.target.value as ExplainRequest["style"])} value={style}>
                  {catalog.data.styles.map((item) => <option key={item} value={item}>{styleNames[item]}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="companion-level">Kedalaman</Label>
                <select className="h-10 w-full rounded-xl border bg-background px-3 text-sm" id="companion-level" onChange={(event) => setLevel(event.target.value as ExplainRequest["level"])} value={level}>
                  {catalog.data.levels.map((item) => <option key={item} value={item}>{levelNames[item]}</option>)}
                </select>
              </div>
            </div>
            {mascots.length > 0 && <div className="space-y-2">
              <Label htmlFor="companion-mascot">Teman belajar</Label>
              <select className="h-10 w-full rounded-xl border bg-background px-3 text-sm" id="companion-mascot" onChange={(event) => setMascotId(event.target.value)} value={mascotId}>
                {mascots.map((mascot) => <option key={mascot.id} value={mascot.id}>{mascot.name} · {styleNames[mascot.role]}</option>)}
              </select>
              {selectedMascot && <p className="text-xs text-muted-foreground">{selectedMascot.tagline}</p>}
            </div>}
            {readySources.length > 0 && <SourceScopePicker onChange={setSourceIds} sourceIds={sourceIds} sources={sources.data}/>}
            {validation && <p className="text-sm text-destructive" role="alert">{validation}</p>}
            {explain.isError && <ErrorState message={explain.error.message} />}
            <Button className="w-full" disabled={explain.isPending || readySources.length === 0} type="submit">{explain.isPending ? "Bubi sedang membaca sumber…" : "Minta penjelasan"}</Button>
            {readySources.length === 0 && <p className="text-xs leading-5 text-muted-foreground">Tambahkan sumber dan tunggu hingga statusnya siap dibaca.</p>}
          </form>
        </section>

        <section className="space-y-4">
          {explain.isPending ? <div className="rounded-3xl bg-secondary p-6">
            <BubiMascot {...REACTION_FOR_EVENT.waiting_for_ai} className="mx-auto h-28 w-auto" decorative label="Bubi sedang memeriksa materi workspace" />
            <p className="mt-3 text-center text-sm font-semibold text-navy" role="status">Bubi sedang memeriksa materi workspace…</p>
          </div> : performance ? <>
            <div className={`rounded-3xl p-5 sm:p-6 ${performance.grounded ? "bg-secondary/70" : "bg-warning/30"}`}>
              <div className="flex items-center gap-4">
                <BubiMascot animationKey={activeBeat ? `${performance.id}:${activeBeat.index}` : performance.id} emotion={activeBeat?.emotion} animation={activeBeat?.animation} availableAnimations={selectedMascot?.animations ?? []} className="h-24 w-auto" decorative />
                <div>
                  <h2 className="font-bold text-navy">{performance.grounded ? "Penjelasan dari materi" : "Topik belum ditemukan"}</h2>
                  <p className="text-xs text-muted-foreground">{performance.grounded ? `${performance.beats.length} bagian penjelasan` : "Tambahkan sumber yang membahas topik ini."}</p>
                  {activeBeat && <p aria-live="polite" className="mt-1 text-xs font-semibold text-navy">Bubi sedang {emotionNames[activeBeat.emotion]} · langkah {activeBeatIndex + 1} dari {performance.beats.length}</p>}
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {performance.beats.map((beat, index) => {
                  const active = activeBeatIndex === index;
                  return <article className={`rounded-2xl border bg-white/80 p-4 transition-colors ${active ? "border-primary/50" : "border-white/70"}`} key={beat.index}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <Button aria-pressed={active} onClick={() => setActiveBeatIndex(index)} size="sm" variant={active ? "secondary" : "ghost"}>Langkah {index + 1}</Button>
                      <Button aria-label={`Bacakan langkah ${index + 1} dengan suara perangkat`} onClick={() => sayAloud(beat.say)} size="icon-sm" variant="ghost"><Volume2 aria-hidden="true" /></Button>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-7">{beat.say}</p>
                    <p className="mt-2 text-[11px] text-muted-foreground">{emotionNames[beat.emotion]}</p>
                  </article>;
                })}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Pembacaan suara memakai fitur di perangkat ini; jawaban tetap tersedia sebagai teks.</p>
            </div>
            {performance.grounded && performance.citations.length > 0 && <div className="rounded-3xl border bg-card p-5">
              <h3 className="font-bold text-navy">Rujukan materi</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {performance.citations.map((citation, index) => <div className="w-full rounded-2xl bg-muted/60 p-3" key={`${citation.sourceId}-${citation.page}-${index}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2 text-xs font-semibold"><BookOpen aria-hidden="true" className="size-4 text-teal" />{citation.sourceTitle}{citation.page ? ` · hlm. ${citation.page}` : ""}</span>
                    <SourcePageDialog notebookId={notebookId} page={citation.page} sourceId={citation.sourceId} sourceTitle={citation.sourceTitle} />
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">“{citation.quote}”</p>
                </div>)}
              </div>
            </div>}
            {performance.followUps.length > 0 && <div className="rounded-3xl border bg-card p-5">
              <h3 className="font-bold text-navy">Lanjutkan dari sini</h3>
              <div className="mt-3 flex flex-wrap gap-2">{performance.followUps.map((followUp) => <Button key={followUp} onClick={() => { setQuestion(followUp); submitQuestion(followUp); }} size="sm" variant="outline">{followUp}</Button>)}</div>
            </div>}
          </> : <div className="rounded-3xl border border-dashed bg-card p-8 text-center">
            <BubiMascot emotion="idle" className="mx-auto h-32 w-auto" decorative />
            <h2 className="mt-4 font-bold text-navy">Tanyakan satu topik</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">Bubi akan mengambil penjelasan dan sitasi hanya dari sumber yang bisa dibaca di workspace.</p>
          </div>}
        </section>
      </div>
    </div>
  );
}
