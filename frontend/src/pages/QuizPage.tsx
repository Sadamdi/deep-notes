import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, ArrowRight, Check, Clock3, LoaderCircle, X } from "lucide-react";
import { REACTION_FOR_EVENT, submitAttemptSchema, type ExamStarted, type QuizAttemptResponse, type QuizResponse } from "@deep-notes/shared";
import { BubiMascot } from "@/components/shared/BubiMascot";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/shared/PageStates";
import { ErrorState, LoadingState } from "@/components/shared/PageStates";
import { SourcePageDialog } from "@/features/sources/SourcePageDialog";
import { QuizScoreboardDialog } from "@/features/quizzes/QuizList";
import { ApiRequestError, api, jsonBody } from "@/lib/api";

export function QuizPage() {
  const { notebookId = "", quizId = "" } = useParams();
  const navigate = useNavigate();
  const quizQuery = useQuery({ queryKey: ["notebooks", notebookId, "quizzes", quizId], queryFn: () => api<QuizResponse>(`/notebooks/${notebookId}/quizzes/${quizId}`), enabled: Boolean(notebookId && quizId) });
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Array<number | null>>([]);
  const [now, setNow] = useState(Date.now());
  const [result, setResult] = useState<QuizAttemptResponse | null>(null);
  const [validationError, setValidationError] = useState("");
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
        <div className="rounded-3xl bg-navy p-6 text-white sm:flex sm:items-center sm:gap-6 sm:p-8">
          <BubiMascot animation={resultReaction.animation} animationKey={result.attemptId} className="mx-auto h-28 w-auto sm:mx-0" decorative emotion={resultReaction.emotion} />
          <div className="mt-4 sm:mt-0"><p className="text-sm text-white/70">Nilai latihan</p><p className="mt-1 text-4xl font-bold">{Math.round((result.score / result.total) * 100)}%</p><p className="mt-2 text-sm text-white/75">Kuis hanya memakai sumber workspace ini.</p></div>
        </div>
        <ol className="space-y-3">
          {result.results.map((item, index) => (
            <li className="rounded-2xl border bg-card p-4 sm:p-5" key={`${item.index}-${item.topic}`}>
              <div className="flex items-start gap-3">
                <span className={`grid size-8 shrink-0 place-items-center rounded-full ${item.correct ? "bg-secondary text-primary" : "bg-destructive/10 text-destructive"}`}>{item.correct ? <Check aria-hidden="true" className="size-4" /> : <X aria-hidden="true" className="size-4" />}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{index + 1}. {quiz.questions[index]?.question}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.explanation}</p>
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
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground" to={`/game/${notebookId}`}><ArrowLeft aria-hidden="true" className="size-4" />Kembali ke sesi</Link>
        <div className="flex items-center gap-4 text-sm font-semibold text-muted-foreground">
          <span>Soal {questionIndex + 1} dari {quiz.questions.length}</span>
          {remainingSeconds !== null && <span aria-live="polite" className={remainingSeconds < 30 ? "inline-flex items-center gap-2 text-destructive" : "inline-flex items-center gap-2"}><Clock3 aria-hidden="true" className="size-4" />{Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, "0")}</span>}
        </div>
      </div>
      <div aria-label={`Progres ${completeCount} dari ${quiz.questions.length} soal dijawab`} className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(completeCount / quiz.questions.length) * 100}%` }} /></div>
      <section className="rounded-3xl border bg-card p-5 shadow-sm sm:p-8" aria-labelledby="quiz-question">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{quiz.title} · {currentQuestion.topic}</p>
        <h1 className="mt-4 text-xl font-bold leading-8 text-navy sm:text-2xl" id="quiz-question">{currentQuestion.question}</h1>
        <fieldset className="mt-6 space-y-3">
          <legend className="sr-only">Pilih jawaban</legend>
          {currentQuestion.options.map((option, index) => (
            <label className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition hover:border-primary/50 hover:bg-secondary/30 ${answers[questionIndex] === index ? "border-primary bg-secondary/50" : "bg-white"}`} key={option}>
              <input checked={answers[questionIndex] === index} className="size-4 accent-primary" name={`question-${questionIndex}`} onChange={() => setAnswers((current) => {
                const next = current.length === quiz.questions.length ? [...current] : Array.from({ length: quiz.questions.length }, () => null);
                next[questionIndex] = index;
                return next;
              })} type="radio" value={index} />
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-muted text-xs font-bold text-navy">{String.fromCharCode(65 + index)}</span>
              <span className="text-sm leading-6">{option}</span>
            </label>
          ))}
        </fieldset>
        {validationError && <p className="mt-4 text-sm text-destructive" role="alert">{validationError}</p>}
        {submitQuiz.isError && <div className="mt-4"><ErrorState message={submitQuiz.error instanceof ApiRequestError ? submitQuiz.error.message : "Jawaban belum berhasil dikirim."} onRetry={() => void finish(true)} /></div>}
        <div className="mt-6 flex flex-wrap justify-between gap-3 border-t pt-5">
          <Button disabled={questionIndex === 0} onClick={() => setQuestionIndex((index) => Math.max(0, index - 1))} variant="outline"><ArrowLeft aria-hidden="true" />Sebelumnya</Button>
          {questionIndex < quiz.questions.length - 1 ? (
            <Button onClick={() => { setValidationError(""); setQuestionIndex((index) => Math.min(quiz.questions.length - 1, index + 1)); }} variant="default">Selanjutnya<ArrowRight aria-hidden="true" /></Button>
          ) : (
            <Button disabled={submitQuiz.isPending} onClick={() => void finish()}>
              {submitQuiz.isPending ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Check aria-hidden="true" />}
              Kumpulkan latihan
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
