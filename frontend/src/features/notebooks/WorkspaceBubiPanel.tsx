import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Citation, Performance } from "@deep-notes/shared";
import { type FormEvent, useState } from "react";
import bubiAntusias from "@/assets/brand/bubi-antusias.svg";
import bubiSedih from "@/assets/brand/bubi-sedih.svg";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  CompanionExplainResponse,
  SelectedPreviewTarget,
  WorkspaceQuestionRow,
} from "@/features/notebooks/types";
import { api } from "@/lib/api";

type Props = {
  notebookId: string;
  isSample: boolean;
  readySourceCount: number;
  referenceIds: string[];
  onOpenCitation: (target: SelectedPreviewTarget) => void;
};

const STYLE_LABELS = {
  teacher: "Guru",
  friend: "Teman",
  coach: "Pelatih",
} as const;

const LEVEL_LABELS = {
  simple: "Sederhana",
  normal: "Normal",
  detailed: "Rinci",
} as const;

export function WorkspaceBubiPanel({
  notebookId,
  isSample,
  readySourceCount,
  referenceIds,
  onOpenCitation,
}: Props) {
  const queryClient = useQueryClient();
  const [style, setStyle] = useState<keyof typeof STYLE_LABELS>("teacher");
  const [level, setLevel] = useState<keyof typeof LEVEL_LABELS>("simple");
  const [showSettings, setShowSettings] = useState(false);
  const [questionInput, setQuestionInput] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [activePerformance, setActivePerformance] = useState<{
    question: string;
    performance: Performance;
  } | null>(null);
  const [beatIndex, setBeatIndex] = useState(0);

  const sampleDemoQuery = useQuery({
    queryKey: ["companion-demo", "explain"],
    queryFn: () => api<Performance>("/companion/demo?scenario=explain"),
    enabled: isSample,
  });

  const historyQuery = useQuery({
    queryKey: ["notebook-questions", notebookId],
    queryFn: () => api<WorkspaceQuestionRow[]>(`/notebooks/${notebookId}/questions?limit=15`),
    enabled: !isSample,
    retry: false,
  });

  const explainMutation = useMutation({
    mutationFn: async (q: string) => {
      if (isSample) {
        const scenario = q.toLowerCase().includes("tidak") || q.toLowerCase().includes("mars") ? "notfound" : "explain";
        const demo = await api<Performance>(`/companion/demo?scenario=${scenario}`);
        return { questionId: "sample", question: q, performance: demo };
      }
      return api<CompanionExplainResponse>(`/notebooks/${notebookId}/companion/explain`, {
        method: "POST",
        body: JSON.stringify({
          question: q,
          style,
          level,
          sourceIds: referenceIds.length > 0 ? referenceIds : undefined,
        }),
      });
    },
    onSuccess: async (data) => {
      setActivePerformance({ question: data.question, performance: data.performance });
      setBeatIndex(0);
      setQuestionInput("");
      if (!isSample) {
        await queryClient.invalidateQueries({ queryKey: ["notebook-questions", notebookId] });
      }
    },
    onError: (err) => {
      setFormError(err instanceof Error ? err.message : "Gagal meminta penjelasan ke Bubi.");
    },
  });

  const submitQuestion = (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 3) {
      setFormError("Tulis pertanyaan minimal 3 karakter.");
      return;
    }
    if (!isSample && readySourceCount === 0) {
      setFormError("Unggah dan tunggu minimal satu sumber berstatus Siap sebelum bertanya.");
      return;
    }
    setFormError(null);
    explainMutation.mutate(trimmed);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitQuestion(questionInput);
  };

  const handleCitationClick = (cit: Citation) => {
    onOpenCitation({
      sourceId: isSample ? "s1" : cit.sourceId,
      sourceTitle: cit.sourceTitle,
      page: cit.page ?? 1,
      highlightQuote: cit.quote,
    });
  };

  const displayedPerformance = activePerformance?.performance ?? (isSample ? sampleDemoQuery.data : undefined);
  const displayedHeading =
    activePerformance?.question ?? (isSample ? "Apa cara kerja topologi bintang?" : "Siap menjawab dari sumbermu");
  const beats = displayedPerformance?.beats ?? [];
  const currentBeat = beats[Math.min(beatIndex, Math.max(beats.length - 1, 0))];

  return (
    <section
      aria-labelledby="bubi-study-heading"
      className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 id="bubi-study-heading" className="text-xl font-bold text-card-foreground sm:text-2xl">
              Belajar bersama Bubi
            </h2>
            <p className="text-xs text-muted-foreground sm:text-sm">
              {STYLE_LABELS[style]} · {LEVEL_LABELS[level]}
              {referenceIds.length > 0 ? ` · ${referenceIds.length} sumber acuan dipilih` : " · Semua sumber siap"}
            </p>
          </div>
          {isSample && <Badge variant="outline">Data contoh</Badge>}
        </div>

        {showSettings && (
          <div className="grid gap-3 rounded-xl bg-muted p-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="bubi-style" className="text-xs font-bold">
                Gaya pendamping
              </Label>
              <select
                id="bubi-style"
                value={style}
                onChange={(e) => setStyle(e.target.value as keyof typeof STYLE_LABELS)}
                className="min-h-11 w-full rounded-lg border border-input bg-card px-3 text-sm font-medium text-card-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <option value="teacher">Guru (terstruktur)</option>
                <option value="friend">Teman (santai)</option>
                <option value="coach">Pelatih (fokus latihan)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bubi-level" className="text-xs font-bold">
                Kedalaman penjelasan
              </Label>
              <select
                id="bubi-level"
                value={level}
                onChange={(e) => setLevel(e.target.value as keyof typeof LEVEL_LABELS)}
                className="min-h-11 w-full rounded-lg border border-input bg-card px-3 text-sm font-medium text-card-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <option value="simple">Sederhana</option>
                <option value="normal">Normal</option>
                <option value="detailed">Rinci</option>
              </select>
            </div>
          </div>
        )}

        {/* Bubi explanation stage (Figma node 175:10362) */}
        {explainMutation.isPending ? (
          <div role="status" className="space-y-3 rounded-2xl bg-secondary p-5 text-secondary-foreground">
            <p className="text-base font-bold">Bubi sedang memeriksa potongan halaman sumber...</p>
            <p className="text-sm text-muted-foreground">
              Jawaban hanya disusun dari materi yang ada di workspace ini.
            </p>
          </div>
        ) : displayedPerformance ? (
          displayedPerformance.grounded ? (
            <div className="space-y-3.5 rounded-2xl bg-secondary p-4 text-secondary-foreground sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-base font-bold sm:text-lg">{displayedHeading}</p>
                <img
                  src={bubiAntusias}
                  alt="Bubi menjelaskan materi dengan sitasi"
                  width={104}
                  height={112}
                  className="h-auto w-[92px] sm:w-[104px]"
                />
              </div>

              {currentBeat && (
                <div className="space-y-3 rounded-xl bg-card p-4 text-card-foreground">
                  <p className="text-sm leading-relaxed sm:text-base">{currentBeat.say}</p>
                  {currentBeat.citation !== null && displayedPerformance.citations[currentBeat.citation] && (
                    <div>
                      <button
                        type="button"
                        onClick={() => handleCitationClick(displayedPerformance.citations[currentBeat.citation!]!)}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-cite/35 bg-muted px-3 py-1.5 text-left text-xs font-bold text-cite transition-colors hover:bg-secondary hover:text-secondary-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                      >
                        <span>
                          Sitasi: {displayedPerformance.citations[currentBeat.citation!]!.sourceTitle}
                          {displayedPerformance.citations[currentBeat.citation!]!.page !== null
                            ? ` · hal. ${displayedPerformance.citations[currentBeat.citation!]!.page}`
                            : ""}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Full citation chips list */}
              {displayedPerformance.citations.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {displayedPerformance.citations.map((cit, i) => (
                    <button
                      key={`${cit.sourceId}-${cit.page ?? 0}-${i}`}
                      type="button"
                      onClick={() => handleCitationClick(cit)}
                      className="min-h-11 rounded-lg bg-card px-3 py-1.5 text-xs font-bold text-cite transition-colors hover:bg-card/85 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      [{i + 1}] {cit.sourceTitle}
                      {cit.page !== null ? ` · hal. ${cit.page}` : ""}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <p className="text-xs font-bold">
                  Langkah {beatIndex + 1} dari {beats.length}
                </p>
                {beats.length > 1 && (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={beatIndex === 0}
                      onClick={() => setBeatIndex((idx) => Math.max(0, idx - 1))}
                    >
                      Sebelumnya
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={beatIndex >= beats.length - 1}
                      onClick={() => setBeatIndex((idx) => Math.min(beats.length - 1, idx + 1))}
                    >
                      Berikutnya
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Ungrounded answer state: warning tone and zero fake citations (AGENTS.md §8) */
            <div role="status" className="space-y-3 rounded-2xl bg-warning p-4 text-warning-foreground sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <Badge variant="outline" className="border-warning-foreground/40 text-warning-foreground">
                    Tidak ditemukan di sumber
                  </Badge>
                  <p className="text-base font-bold">{displayedHeading}</p>
                </div>
                <img
                  src={bubiSedih}
                  alt="Bubi memberi tahu jawaban tidak ada pada sumber"
                  width={76}
                  height={81}
                  className="h-auto w-[76px]"
                />
              </div>
              <p className="rounded-xl bg-card p-3.5 text-sm text-card-foreground">
                {currentBeat?.say ?? "Jawaban untuk pertanyaan ini tidak ditemukan di sumber ruang belajar."}
              </p>
            </div>
          )
        ) : (
          <div className="space-y-3 rounded-2xl bg-secondary p-5 text-secondary-foreground">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-base font-bold">Tanyakan materi apa saja dari sumber ruang ini</p>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Bubi hanya menjawab berdasarkan dokumen yang sudah diunggah dan menyertakan halaman rujukan.
                </p>
              </div>
              <img src={bubiAntusias} alt="" aria-hidden="true" width={88} height={94} className="h-auto w-[84px]" />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          <Button
            type="button"
            disabled={!isSample && readySourceCount === 0}
            onClick={() => submitQuestion("Jelaskan konsep inti dari materi ini secara bertahap.")}
          >
            Mulai Belajar
          </Button>
          <Button type="button" variant="secondary" onClick={() => setShowSettings((v) => !v)}>
            {showSettings ? "Tutup Pengaturan" : "Atur Bubi"}
          </Button>
        </div>

        {displayedPerformance?.followUps && displayedPerformance.followUps.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-muted-foreground">Pertanyaan lanjutan:</p>
            <div className="flex flex-wrap gap-2">
              {displayedPerformance.followUps.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => submitQuestion(f)}
                  className="min-h-11 rounded-lg bg-muted px-3 py-1.5 text-left text-xs font-bold text-foreground hover:bg-secondary hover:text-secondary-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Ask Bubi form (Figma node 175:10392) */}
      <form onSubmit={handleSubmit} className="space-y-2.5 pt-2" noValidate>
        <Label htmlFor="ask-bubi-input" className="text-sm font-bold">
          Tanya Bubi
        </Label>
        <Input
          id="ask-bubi-input"
          value={questionInput}
          onChange={(e) => setQuestionInput(e.target.value)}
          placeholder="Contoh: Apa beda topologi bintang dan bus?"
          aria-invalid={!!formError}
        />
        {formError && (
          <p role="alert" className="text-xs font-bold text-destructive">
            {formError}
          </p>
        )}
        <Button type="submit" variant="secondary" className="w-full" disabled={explainMutation.isPending}>
          {explainMutation.isPending ? "Meminta jawaban..." : "Kirim Pertanyaan"}
        </Button>
      </form>

      {/* Recent group questions history */}
      {!isSample && historyQuery.data && historyQuery.data.length > 0 && (
        <div className="space-y-2 border-t border-border pt-3">
          <h3 className="text-xs font-bold text-muted-foreground">Riwayat tanya jawab kelompok</h3>
          <ul className="max-h-48 space-y-2 overflow-y-auto">
            {historyQuery.data.slice(0, 5).map((item) => (
              <li key={item.id} className="rounded-xl bg-muted p-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-foreground">{item.question}</span>
                  <Badge variant={item.grounded ? "secondary" : "outline"}>
                    {item.grounded ? `${item.citations.length} sitasi` : "Tidak di sumber"}
                  </Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-muted-foreground">{item.answer}</p>
                {item.citations.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {item.citations.map((cit, i) => (
                      <button
                        key={`${item.id}-${i}`}
                        type="button"
                        onClick={() => handleCitationClick(cit)}
                        className="min-h-9 rounded-md bg-card px-2.5 py-1 font-bold text-cite hover:bg-secondary focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                      >
                        {cit.sourceTitle}
                        {cit.page !== null ? ` · hal. ${cit.page}` : ""}
                      </button>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
