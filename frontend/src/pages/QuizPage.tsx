import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, ArrowRight, Check, Clock3, X } from "lucide-react";
import { REACTION_FOR_EVENT, submitAttemptSchema, type ExamStarted, type QuizAttemptResponse, type QuizResponse } from "@deep-notes/shared";
import { BubiMascot } from "@/components/shared/BubiMascot";
import { InlineCodeText } from "@/components/shared/InlineCodeText";
import { Button } from "@/components/ui/button";
import { BubiLoading, ErrorState, LoadingState, PageTitle } from "@/components/shared/PageStates";
import { SourcePageDialog } from "@/features/sources/SourcePageDialog";
import { QuizScoreboardDialog } from "@/features/quizzes/QuizList";
import { ApiRequestError, api, jsonBody } from "@/lib/api";

const quizChoiceSurfaces = ["border-coral/30 bg-coral/10", "border-game-purple/30 bg-game-purple/10", "border-game-orange/35 bg-game-orange/10", "border-teal/30 bg-teal/10"] as const;

export function QuizPage() {
  const { notebookId = "", quizId = "" } = useParams();
  const navigate = useNavigate();
  const quizQuery = useQuery({ queryKey: ["notebooks", notebookId, "quizzes", quizId], queryFn: () => api<QuizResponse>(`/notebooks/${notebookId}/quizzes/${quizId}`), enabled: Boolean(notebookId && quizId) });
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Array<number | null>>([]);
  const [now, setNow] = useState(Date.now());
  const [result, setResult] = useState<QuizAttemptResponse | null>(null);
  const [validationError, setValidationError] = useState("");
  const questionHeading = useRef<HTMLHeadingElement>(null);
  const startRef = useRef(false);
  const submittedRef = useRef(false);
  const practiceStart = useRef(Date.now());
  const startExam = useMutation({
    mutationFn: () => api<ExamStarted>(`/notebooks/${notebookId}/quizzes/${quizId}/start`, jsonBody("POST")),
  });
  const submitQuiz = useMutation({
    mutationFn: (body: { answers: Array<number | null>; durationMs?: number }) => api<QuizAttemptResponse>(`/notebooks/${notebookId}/quizzes/${quizId}/attempts`, jsonBody("POST", body)),
    onSuccess: (attempt) => {
      submittedRef.current = true;
      setResult(attempt);
    },
  });
  const quiz = quizQuery.data;

  useEffect(() => {
    if (quiz) setAnswers(Array.from({ length: quiz.questions.length }, () => null));
  }, [quiz?.id, quiz?.questions.length]);

  useEffect(() => {
    questionHeading.current?.focus({ preventScroll: true });
  }, [questionIndex]);

  useEffect(() => {
    if (quiz?.kind === "exam" && !startRef.current) {
      startRef.current = true;
      startExam.mutate();
    }
  }, [quiz?.kind, startExam]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const examStartedAt = startExam.data?.startedAt ? Date.parse(startExam.data.startedAt) : null;
  const remainingSeconds = quiz?.timeLimitSec && examStartedAt ? Math.max(0, Math.ceil((examStartedAt + quiz.timeLimitSec * 1000 - now) / 1000)) : null;

  async function finish(allowUnanswered = false) {
    if (!quiz || submittedRef.current || submitQuiz.isPending) return;
    if (!allowUnanswered && answers.some((answer) => answer === null)) {
      setValidationError("Jawab semua soal dulu sebelum mengumpulkan latihan.");
      return;
    }
    const durationMs = quiz.kind === "exam" && examStartedAt ? Math.max(0, Date.now() - examStartedAt) : Math.max(0, Date.now() - practiceStart.current);
    const submittedAnswers = Array.from({ length: quiz.questions.length }, (_, index) => answers[index] ?? null);
    const parsed = submitAttemptSchema.safeParse({ answers: submittedAnswers, durationMs });
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? "Jawaban belum bisa dikumpulkan.");
      return;
    }
    setValidationError("");
    submittedRef.current = true;
    try {
      const attempt = await submitQuiz.mutateAsync(parsed.data);
      setResult(attempt);
    } catch {
      submittedRef.current = false;
    }
  }

  useEffect(() => {
    if (remainingSeconds === 0 && !result && !submittedRef.current) void finish(true);
  }, [remainingSeconds, result]);

  if (quizQuery.isPending) return <LoadingState label="Menyiapkan latihan…" />;
  if (quizQuery.isError) return <ErrorState message={quizQuery.error instanceof ApiRequestError ? quizQuery.error.message : "Kuis belum berhasil dibuka."} onRetry={() => void quizQuery.refetch()} />;
  if (!quiz) return null;

  if (quiz.kind === "exam" && startExam.isError) return <ErrorState message={startExam.error instanceof ApiRequestError ? startExam.error.message : "Waktu ujian belum bisa dimulai."} />;
  if (quiz.kind === "exam" && startExam.isPending) return <LoadingState label="Memulai waktu ujian…" />;

  const currentQuestion = quiz.questions[questionIndex];
  if (!currentQuestion) return null;
  const completeCount = answers.filter((answer) => answer !== null).length;

  if (result) {
    const resultReaction = result.total > 0 && result.score === result.total
      ? REACTION_FOR_EVENT.quiz_perfect
      : result.score > 0
        ? REACTION_FOR_EVENT.quiz_correct
        : REACTION_FOR_EVENT.quiz_wrong;
    return (
      <div className="space-y-6">
        <PageTitle eyebrow="Hasil latihan" title="Sesi selesai!" description={`${result.score} dari ${result.total} jawaban benar. Pelajari kembali penjelasan dan materi yang dirujuk.`} action={<div className="flex flex-wrap gap-2">{quiz.kind !== "practice" && <QuizScoreboardDialog notebookId={notebookId} quizId={quizId}/>}<Button onClick={() => navigate(`/game/${notebookId}`)}><ArrowLeft aria-hidden="true" />Kembali ke game</Button></div>} />
        <section aria-label="Ringkasan hasil kuis" className="overflow-hidden rounded-3xl bg-navy p-5 text-white sm:p-7">
          <div className="grid gap-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
            <BubiMascot animation={resultReaction.animation} animationKey={result.attemptId} className="mx-auto h-28 w-auto sm:mx-0" decorative emotion={resultReaction.emotion} />
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-white/10 p-4 sm:col-span-3"><p className="text-xs font-semibold uppercase tracking-wide text-white/70">Nilai latihan</p><p className="mt-1 text-4xl font-extrabold">{Math.round((result.score / result.total) * 100)}%</p><p className="mt-1 text-sm text-white/75">{result.score} dari {result.total} jawaban tepat · kuis memakai sumber workspace ini.</p></div>
              <div className="rounded-xl bg-white/10 p-3"><p className="text-xs text-white/70">Benar</p><p className="mt-1 text-xl font-bold">{result.score}</p></div>
              <div className="rounded-xl bg-white/10 p-3"><p className="text-xs text-white/70">Perlu ditinjau</p><p className="mt-1 text-xl font-bold">{result.total - result.score}</p></div>
              <div className="rounded-xl bg-white/10 p-3"><p className="text-xs text-white/70">Durasi</p><p className="mt-1 text-xl font-bold">{result.durationMs === null ? "—" : `${Math.ceil(result.durationMs / 60_000)} mnt`}</p></div>
            </div>
          </div>
        </section>
        <ol className="space-y-3">
          {result.results.map((item) => (
            <li className="rounded-2xl border bg-card p-4 sm:p-5" key={`${item.index}-${item.topic}`}>
              <div className="flex items-start gap-3">
                <span className={`grid size-8 shrink-0 place-items-center rounded-full ${item.correct ? "bg-secondary text-primary" : "bg-destructive/10 text-destructive"}`}>{item.correct ? <Check aria-hidden="true" className="size-4" /> : <X aria-hidden="true" className="size-4" />}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{item.index + 1}. <InlineCodeText>{quiz.questions[item.index]?.question ?? ""}</InlineCodeText></p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className={`rounded-xl p-3 ${item.correct ? "bg-secondary/55" : "bg-destructive/5"}`}><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Jawabanmu</p><p className="mt-1 text-sm font-medium leading-5"><InlineCodeText>{item.chosen === null ? "Tidak dijawab" : quiz.questions[item.index]?.options[item.chosen] ?? "Pilihan tidak tersedia"}</InlineCodeText></p></div>
                    <div className="rounded-xl bg-secondary/45 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Jawaban tepat</p><p className="mt-1 text-sm font-medium leading-5"><InlineCodeText>{quiz.questions[item.index]?.options[item.correctIndex] ?? "Belum tersedia"}</InlineCodeText></p></div>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground"><InlineCodeText>{item.explanation}</InlineCodeText></p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full bg-muted px-2.5 py-1">Materi: {item.sourceTitle}{item.page ? ` · hlm. ${item.page}` : ""}</span>
                    <SourcePageDialog notebookId={notebookId} page={item.page} sourceId={item.sourceId} sourceTitle={item.sourceTitle} />
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <section className="space-y-5 rounded-3xl bg-navy p-4 text-white sm:p-6 lg:p-8" aria-label={quiz.kind === "exam" ? "Ujian" : "Latihan kuis"}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-white/75 transition-colors hover:text-white" to={`/game/${notebookId}`}><ArrowLeft aria-hidden="true" className="size-4" />Kembali ke sesi</Link>
          <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-white/85">
            <span className="rounded-full bg-white/10 px-3 py-2">{quiz.kind === "exam" ? "Ujian" : quiz.kind === "weekly" ? "Kuis mingguan" : "Latihan mandiri"}</span>
            <span>Soal {questionIndex + 1} dari {quiz.questions.length}</span>
            {remainingSeconds !== null && <span aria-live="polite" className={remainingSeconds < 30 ? "inline-flex items-center gap-2 rounded-full bg-coral/15 px-3 py-2 text-coral" : "inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2"}><Clock3 aria-hidden="true" className="size-4" />{Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, "0")}</span>}
          </div>
        </div>
        <div aria-label={`Progres ${completeCount} dari ${quiz.questions.length} soal dijawab`} className="h-2 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-mint transition-[width] duration-300" style={{ width: `${(completeCount / quiz.questions.length) * 100}%` }} /></div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Pilih nomor soal">
          {quiz.questions.map((question, index) => <Button aria-current={questionIndex === index ? "step" : undefined} aria-label={`Buka soal ${index + 1}${answers[index] === null ? ", belum dijawab" : ", sudah dijawab"}`} className="min-h-11 min-w-11" disabled={submitQuiz.isPending} key={`${question.topic}-${index}`} onClick={() => { setValidationError(""); setQuestionIndex(index); }} size="sm" variant={questionIndex === index ? "secondary" : answers[index] === null ? "outline" : "default"}>{answers[index] !== null && questionIndex !== index && <Check aria-hidden="true"/>}{index + 1}</Button>)}
        </div>
        <article className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-2 motion-safe:duration-200 rounded-3xl border border-white/20 bg-card p-4 text-foreground sm:p-7" aria-labelledby="quiz-question" key={`${quiz.id}:${questionIndex}`}>
          <div className="flex items-center gap-3 rounded-2xl bg-secondary/50 p-3 sm:p-4">
            <BubiMascot animation={REACTION_FOR_EVENT.greeting.animation} animationKey={`${quiz.id}:${questionIndex}`} className="h-14 w-auto shrink-0" decorative emotion={REACTION_FOR_EVENT.greeting.emotion}/>
            <div><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{quiz.title}</p><p className="mt-1 text-sm font-semibold leading-5 text-navy">Pilih jawaban yang paling sesuai dengan materi.</p></div>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Topik · {currentQuestion.topic}</p>
            <p className="text-xs font-medium text-muted-foreground">{completeCount} soal tersimpan</p>
          </div>
          <h1 className="mt-2 text-xl font-bold leading-8 text-navy outline-none sm:text-2xl" id="quiz-question" ref={questionHeading} tabIndex={-1}><InlineCodeText>{currentQuestion.question}</InlineCodeText></h1>
          <fieldset className="mt-5 grid gap-3 sm:grid-cols-2" disabled={submitQuiz.isPending}>
            <legend className="sr-only">Pilih jawaban</legend>
            {currentQuestion.options.map((option, index) => (
              <label className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border-2 p-4 transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:shadow-sm ${quizChoiceSurfaces[index % quizChoiceSurfaces.length]} ${answers[questionIndex] === index ? "border-primary ring-2 ring-primary ring-offset-2 ring-offset-card" : ""}`} key={option}>
                <input checked={answers[questionIndex] === index} className="size-4 accent-primary" name={`question-${questionIndex}`} onChange={() => setAnswers((current) => {
                  const next = current.length === quiz.questions.length ? [...current] : Array.from({ length: quiz.questions.length }, () => null);
                  next[questionIndex] = index;
                  return next;
                })} type="radio" value={index} />
                <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/80 text-xs font-extrabold text-navy">{String.fromCharCode(65 + index)}</span>
                <span className="text-sm font-medium leading-6"><InlineCodeText>{option}</InlineCodeText></span>
              </label>
            ))}
          </fieldset>
          {validationError && <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">{validationError}</p>}
          {submitQuiz.isError && <div className="mt-4"><ErrorState message={submitQuiz.error instanceof ApiRequestError ? submitQuiz.error.message : "Jawaban belum berhasil dikirim."} onRetry={() => void finish(quiz.kind === "exam")} /></div>}
          <div className="mt-6 flex flex-wrap justify-between gap-3 border-t pt-5">
            <Button disabled={questionIndex === 0 || submitQuiz.isPending} onClick={() => { setValidationError(""); setQuestionIndex((index) => Math.max(0, index - 1)); }} variant="outline"><ArrowLeft aria-hidden="true" />Sebelumnya</Button>
            {questionIndex < quiz.questions.length - 1 ? (
              <Button disabled={submitQuiz.isPending} onClick={() => { setValidationError(""); setQuestionIndex((index) => Math.min(quiz.questions.length - 1, index + 1)); }} variant="default">Selanjutnya<ArrowRight aria-hidden="true" /></Button>
            ) : (
              <Button aria-busy={submitQuiz.isPending} disabled={submitQuiz.isPending} onClick={() => void finish()}>
                {submitQuiz.isPending ? <BubiLoading label="Bubi sedang memeriksa jawaban…" variant="compact" /> : <><Check aria-hidden="true" />{quiz.kind === "exam" ? "Kumpulkan ujian" : "Kumpulkan latihan"}</>}
              </Button>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
