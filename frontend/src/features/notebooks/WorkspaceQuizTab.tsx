import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  SelectedPreviewTarget,
  WorkspaceAttemptResponse,
  WorkspaceQuizDetail,
  WorkspaceQuizSummary,
} from "@/features/notebooks/types";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type Props = {
  notebookId: string;
  isSample: boolean;
  canEdit: boolean;
  readySourceCount: number;
  referenceIds: string[];
  onJumpToCitation: (target: SelectedPreviewTarget) => void;
};

const OPTION_LETTERS = ["A", "B", "C", "D"] as const;

const SAMPLE_QUIZ: WorkspaceQuizDetail = {
  id: "sample-quiz",
  title: "Latihan Topologi Jaringan (contoh)",
  kind: "practice",
  timeLimitSec: null,
  perQuestionSec: null,
  dueAt: null,
  questions: [
    {
      question: "Perangkat apa yang menjadi titik pusat pada topologi bintang?",
      options: ["Switch pusat", "Kabel koaksial ujung", "Terminator bus", "Antena satelit"],
      topic: "Topologi bintang",
    },
    {
      question: "Apa dampak jika satu kabel host putus pada topologi bintang?",
      options: [
        "Seluruh jaringan langsung mati",
        "Perangkat lain tetap terhubung melalui switch pusat",
        "Switch berubah menjadi router",
        "Semua paket dikirim ulang lewat cincin",
      ],
      topic: "Ketahanan jaringan",
    },
  ],
};

export function WorkspaceQuizTab({
  notebookId,
  isSample,
  canEdit,
  readySourceCount,
  referenceIds,
  onJumpToCitation,
}: Props) {
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<"practice" | "weekly" | "exam">("practice");
  const [count, setCount] = useState(5);
  const [topic, setTopic] = useState("");
  const [activeQuizId, setActiveQuizId] = useState<string | null>(isSample ? "sample-quiz" : null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Array<number | null>>([]);
  const [startedAtMs, setStartedAtMs] = useState<number>(() => Date.now());
  const [graded, setGraded] = useState<WorkspaceAttemptResponse | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ["notebook-quizzes", notebookId],
    queryFn: () => api<WorkspaceQuizSummary[]>(`/notebooks/${notebookId}/quizzes`),
    enabled: !isSample,
  });

  const detailQuery = useQuery({
    queryKey: ["notebook-quiz", notebookId, activeQuizId],
    queryFn: async () => {
      if (isSample) return SAMPLE_QUIZ;
      const detail = await api<WorkspaceQuizDetail>(`/notebooks/${notebookId}/quizzes/${activeQuizId}`);
      if (detail.kind === "exam") {
        await api(`/notebooks/${notebookId}/quizzes/${activeQuizId}/start`, { method: "POST" });
      }
      return detail;
    },
    enabled: Boolean(activeQuizId),
  });

  const scoreboardQuery = useQuery({
    queryKey: ["notebook-quiz-scoreboard", notebookId, activeQuizId],
    queryFn: () =>
      api<{ ranking: Array<{ rank: number; name: string; score: number; total: number }> }>(
        `/notebooks/${notebookId}/quizzes/${activeQuizId}/scoreboard`,
      ),
    enabled: Boolean(!isSample && activeQuizId && graded),
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        kind,
        count,
        topic: topic.trim() || undefined,
        sourceIds: referenceIds.length > 0 ? referenceIds : undefined,
      };
      if (kind === "exam") payload.timeLimitSec = count * 60;
      if (kind === "weekly") payload.dueAt = new Date(Date.now() + 7 * 86_400_000).toISOString();
      return api<{ id: string }>(`/notebooks/${notebookId}/quizzes`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: async (created) => {
      setErrorText(null);
      setGraded(null);
      setAnswers([]);
      setCurrentIndex(0);
      setStartedAtMs(Date.now());
      setActiveQuizId(created.id);
      await queryClient.invalidateQueries({ queryKey: ["notebook-quizzes", notebookId] });
    },
    onError: (err) => {
      setErrorText(err instanceof Error ? err.message : "Gagal menyusun soal kuis dari sumber.");
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (submittedAnswers: Array<number | null>) => {
      if (isSample) {
        const correctIdx = [0, 1];
        const results = SAMPLE_QUIZ.questions.map((q, idx) => ({
          correct: submittedAnswers[idx] === correctIdx[idx],
          correctIndex: correctIdx[idx]!,
          explanation: "Switch pusat menghubungkan setiap node secara independen pada halaman 3.",
          topic: q.topic,
          sourceId: "s1",
          sourceTitle: "Bab 1 Topologi.pdf (contoh)",
          page: 3,
        }));
        const score = results.filter((r) => r.correct).length;
        return {
          attemptId: "sample-attempt",
          score,
          total: results.length,
          durationMs: Date.now() - startedAtMs,
          results,
        } satisfies WorkspaceAttemptResponse;
      }
      return api<WorkspaceAttemptResponse>(`/notebooks/${notebookId}/quizzes/${activeQuizId}/attempts`, {
        method: "POST",
        body: JSON.stringify({
          answers: submittedAnswers,
          durationMs: Date.now() - startedAtMs,
        }),
      });
    },
    onSuccess: async (res) => {
      setGraded(res);
      if (!isSample) {
        await queryClient.invalidateQueries({ queryKey: ["notebook-quizzes", notebookId] });
        await queryClient.invalidateQueries({ queryKey: ["notebook-contributions", notebookId] });
        await queryClient.invalidateQueries({ queryKey: ["notebook-gaps", notebookId] });
      }
    },
    onError: (err) => {
      setErrorText(err instanceof Error ? err.message : "Gagal mengirim jawaban kuis.");
    },
  });

  const handleGenerate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isSample && readySourceCount === 0) {
      setErrorText("Unggah minimal satu sumber berstatus Siap sebelum membuat kuis.");
      return;
    }
    createMutation.mutate();
  };

  const openQuiz = (id: string) => {
    setActiveQuizId(id);
    setCurrentIndex(0);
    setAnswers([]);
    setGraded(null);
    setErrorText(null);
    setStartedAtMs(Date.now());
  };

  const activeQuiz = detailQuery.data;
  const totalQuestions = activeQuiz?.questions.length ?? 0;
  const activeQuestion = activeQuiz?.questions[currentIndex];
  const normalizedAnswers =
    totalQuestions > 0 ? Array.from({ length: totalQuestions }, (_, i) => answers[i] ?? null) : [];

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* Left column: quiz generator and list */}
      <div className="space-y-4 lg:col-span-5">
        {!isSample && canEdit && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold">Susun kuis dari sumber</CardTitle>
              <CardDescription>
                Soal dan pembahasan dibuat otomatis hanya dari sumber ruang ini.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGenerate} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="quiz-kind" className="text-xs font-bold">
                      Mode kuis
                    </Label>
                    <select
                      id="quiz-kind"
                      value={kind}
                      onChange={(e) => setKind(e.target.value as "practice" | "weekly" | "exam")}
                      className="min-h-11 w-full rounded-lg border border-input bg-card px-3 text-sm font-medium text-card-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      <option value="practice">Latihan</option>
                      <option value="weekly">Mingguan kelompok</option>
                      <option value="exam">Ujian berwaktu</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="quiz-count" className="text-xs font-bold">
                      Jumlah soal
                    </Label>
                    <select
                      id="quiz-count"
                      value={count}
                      onChange={(e) => setCount(Number(e.target.value))}
                      className="min-h-11 w-full rounded-lg border border-input bg-card px-3 text-sm font-medium text-card-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      <option value={3}>3 soal</option>
                      <option value={5}>5 soal</option>
                      <option value={8}>8 soal</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="quiz-topic" className="text-xs font-bold">
                    Fokus topik (opsional)
                  </Label>
                  <Input
                    id="quiz-topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Contoh: Subnetting atau Lapisan Transport"
                  />
                </div>

                {errorText && (
                  <p role="alert" className="text-xs font-bold text-destructive">
                    {errorText}
                  </p>
                )}

                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Menyusun soal dari sumber..." : "Buat dan Mulai Kuis"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold">Daftar kuis ruang ini</CardTitle>
            <CardDescription>Pilih kuis untuk berlatih atau melihat skor terbaikmu.</CardDescription>
          </CardHeader>
          <CardContent>
            {isSample ? (
              <div className="rounded-xl bg-secondary p-3.5 text-sm font-bold text-secondary-foreground">
                Latihan Topologi Jaringan (contoh) · 2 soal
              </div>
            ) : listQuery.isPending ? (
              <p className="text-sm text-muted-foreground">Memuat daftar kuis...</p>
            ) : listQuery.data && listQuery.data.length > 0 ? (
              <ul className="space-y-2.5">
                {listQuery.data.map((q) => (
                  <li key={q.id}>
                    <button
                      type="button"
                      onClick={() => openQuiz(q.id)}
                      className={cn(
                        "flex min-h-12 w-full items-center justify-between gap-2 rounded-xl p-3 text-left transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                        q.id === activeQuizId
                          ? "bg-secondary font-bold text-secondary-foreground"
                          : "bg-muted text-foreground hover:bg-secondary/60",
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold">{q.title}</span>
                        <span className="block text-xs text-muted-foreground">
                          {q.questionCount} soal · {q.kind}
                          {q.myBest !== null ? ` · skor terbaik ${q.myBest}/${q.questionCount}` : ""}
                        </span>
                      </span>
                      <Badge variant="outline">Mulai</Badge>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Belum ada kuis di ruang ini. Buat kuis pertama dari sumber materi di atas.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right column: interactive quiz card and graded results */}
      <div className="lg:col-span-7">
        {!activeQuizId ? (
          <Card>
            <CardContent className="py-10">
              <p className="text-sm text-muted-foreground">
                Pilih salah satu kuis di sebelah kiri atau buat kuis baru untuk mulai menjawab soal satu per satu.
              </p>
            </CardContent>
          </Card>
        ) : detailQuery.isPending ? (
          <Card>
            <CardContent className="py-10">
              <p role="status" className="text-sm text-muted-foreground">
                Memuat soal kuis...
              </p>
            </CardContent>
          </Card>
        ) : graded && activeQuiz ? (
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-xl font-bold">
                  Hasil Kuis: {graded.score} dari {graded.total} benar
                </CardTitle>
                <Badge variant="secondary">{Math.round((graded.score / Math.max(graded.total, 1)) * 100)}%</Badge>
              </div>
              <CardDescription>
                Setiap pembahasan ditautkan ke halaman sumber agar bisa kamu periksa ulang.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                {graded.results.map((r, idx) => (
                  <li key={idx} className="space-y-2 rounded-xl border border-border bg-muted p-4 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-foreground">
                        Soal {idx + 1}: {activeQuiz.questions[idx]?.question}
                      </span>
                      <Badge variant={r.correct ? "secondary" : "destructive"}>
                        {r.correct ? "Benar" : `Belum tepat (Kunci: ${OPTION_LETTERS[r.correctIndex]})`}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">{r.explanation}</p>
                    <button
                      type="button"
                      onClick={() =>
                        onJumpToCitation({
                          sourceId: r.sourceId,
                          sourceTitle: r.sourceTitle,
                          page: r.page ?? 1,
                        })
                      }
                      className="min-h-11 rounded-lg bg-card px-3 py-1.5 text-xs font-bold text-cite hover:bg-secondary hover:text-secondary-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      Baca sumber: {r.sourceTitle}
                      {r.page !== null ? ` · halaman ${r.page}` : ""}
                    </button>
                  </li>
                ))}
              </ul>

              {scoreboardQuery.data && scoreboardQuery.data.ranking.length > 0 && (
                <div className="space-y-2 rounded-xl bg-secondary/45 p-4">
                  <h3 className="text-sm font-bold text-foreground">Papan skor kelompok</h3>
                  <ol className="space-y-1 text-xs text-foreground">
                    {scoreboardQuery.data.ranking.map((entry) => (
                      <li key={`${entry.rank}-${entry.name}`} className="flex justify-between font-medium">
                        <span>
                          #{entry.rank} {entry.name}
                        </span>
                        <span className="font-bold">
                          {entry.score}/{entry.total}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <Button type="button" variant="secondary" onClick={() => openQuiz(activeQuiz.id)}>
                Ulangi Kuis
              </Button>
            </CardContent>
          </Card>
        ) : activeQuiz && activeQuestion ? (
          <Card className="border-primary/20">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardDescription className="font-bold text-foreground">
                  Soal {currentIndex + 1} dari {totalQuestions} · {activeQuestion.topic}
                </CardDescription>
                {activeQuiz.timeLimitSec && (
                  <Badge variant="outline">Batas waktu: {Math.round(activeQuiz.timeLimitSec / 60)} menit</Badge>
                )}
              </div>
              <CardTitle className="pt-1 text-xl leading-snug font-bold">{activeQuestion.question}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div role="radiogroup" aria-label={`Pilihan jawaban soal ${currentIndex + 1}`} className="grid gap-3 sm:grid-cols-2">
                {activeQuestion.options.map((opt, optIdx) => {
                  const selected = normalizedAnswers[currentIndex] === optIdx;
                  return (
                    <button
                      key={optIdx}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => {
                        const next = [...normalizedAnswers];
                        next[currentIndex] = optIdx;
                        setAnswers(next);
                      }}
                      className={cn(
                        "flex min-h-14 items-center gap-3 rounded-xl border p-3.5 text-left text-sm font-bold transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-muted text-foreground hover:bg-secondary hover:text-secondary-foreground",
                      )}
                    >
                      <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-card text-xs font-bold text-card-foreground">
                        {OPTION_LETTERS[optIdx]}
                      </span>
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                >
                  Soal Sebelumnya
                </Button>

                {currentIndex < totalQuestions - 1 ? (
                  <Button type="button" onClick={() => setCurrentIndex((i) => Math.min(totalQuestions - 1, i + 1))}>
                    Soal Berikutnya
                  </Button>
                ) : (
                  <Button
                    type="button"
                    disabled={submitMutation.isPending}
                    onClick={() => submitMutation.mutate(normalizedAnswers)}
                  >
                    {submitMutation.isPending ? "Menilai jawaban..." : "Kirim Jawaban Kuis"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
