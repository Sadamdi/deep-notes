import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { ArrowRight, Brain, Sparkles } from "lucide-react";
import { REACTION_FOR_EVENT, generateQuizSchema, type GenerateQuizInput, type QuizCreated, type QuizKind, type SourceResponse } from "@deep-notes/shared";
import { BubiMascot } from "@/components/shared/BubiMascot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BubiLoading, ErrorState } from "@/components/shared/PageStates";
import { ApiRequestError, api, jsonBody } from "@/lib/api";
import { SourceScopePicker } from "@/features/sources/SourceScopePicker";
import { useSourceScope } from "@/features/sources/useSourceScope";

function localDateTimeMin() {
  const localDate = new Date();
  localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
  return localDate.toISOString().slice(0, 16);
}

export function QuizLauncher({ notebookId, sources }: { notebookId: string; sources: SourceResponse[] }) {
  const navigate = useNavigate();
  const [count, setCount] = useState("6");
  const [topic, setTopic] = useState("");
  const [kind, setKind] = useState<QuizKind>("practice");
  const [dueAt, setDueAt] = useState("");
  const [timeLimitMinutes, setTimeLimitMinutes] = useState("30");
  const [validationError, setValidationError] = useState("");
  const readySources = sources.filter((source) => source.status === "ready");
  const scope = useSourceScope(notebookId, sources);
  const sourceScopeEmpty = scope.sourceIds !== null && scope.selectedSourceIds.length === 0;
  const activeSources = readySources.filter((source) => scope.selectedSourceIds.includes(source.id));
  const topicHint = readySources.length === 0
    ? "Tambahkan sumber dan tunggu sampai siap dibaca."
    : sourceScopeEmpty
      ? "Pilih setidaknya satu sumber siap sebagai acuan kuis."
      : topic.trim()
        ? `Topik ini akan dicari di ${activeSources.length} sumber terpilih.`
        : `Kosongkan untuk membuat soal dari seluruh materi di ${activeSources.length} sumber terpilih.`;
  const topicPlaceholder = readySources.length === 0
    ? "Tambahkan sumber siap terlebih dahulu"
    : sourceScopeEmpty
      ? "Pilih sumber siap terlebih dahulu"
      : activeSources.length === 1
        ? `Topik dari ${activeSources[0]!.title}`
        : "Contoh topik dari sumber terpilih";
  const createQuiz = useMutation({
    mutationFn: (body: GenerateQuizInput) =>
      api<QuizCreated>(`/notebooks/${notebookId}/quizzes`, jsonBody("POST", body)),
    onSuccess: (quiz) => navigate(`/game/${notebookId}/quizzes/${quiz.id}`),
  });

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (kind === "weekly" && !dueAt) {
      setValidationError("Tentukan batas waktu untuk kuis mingguan.");
      return;
    }
    const parsed = generateQuizSchema.safeParse({
      kind,
      count: Number(count),
      ...(topic.trim() ? { topic: topic.trim() } : {}),
      ...(scope.sourceIds === null ? {} : { sourceIds: scope.selectedSourceIds }),
      ...(kind === "weekly" && dueAt ? { dueAt: new Date(dueAt).toISOString() } : {}),
      ...(kind === "exam" ? { timeLimitSec: Number(timeLimitMinutes) * 60 } : {}),
    });
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? "Jumlah soal belum sesuai.");
      return;
    }
    if (readySources.length === 0 || sourceScopeEmpty) {
      setValidationError("Tambahkan sumber dan tunggu sampai statusnya siap sebelum membuat kuis.");
      return;
    }
    setValidationError("");
    createQuiz.mutate(parsed.data);
  }

  return (
    <section className="space-y-5" aria-labelledby="quiz-launcher-title">
      <div className="overflow-hidden rounded-3xl bg-navy p-6 text-white sm:p-8">
        <div className="grid items-center gap-6 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-mint"><Sparkles aria-hidden="true" className="size-3.5" />Latihan dari sumber workspace</span>
            <h2 className="mt-4 max-w-xl text-2xl font-bold tracking-tight sm:text-3xl" id="quiz-launcher-title">Siap menguji pemahamanmu?</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/75">Bubi menyusun pilihan ganda dari materi yang sudah siap. Jawaban dan penjelasan baru muncul setelah latihan dikumpulkan.</p>
          </div>
          <BubiMascot {...REACTION_FOR_EVENT.greeting} className="mx-auto h-32 w-auto sm:h-36" decorative />
        </div>
      </div>

      <form className="space-y-4 rounded-3xl border bg-card p-5 sm:p-6" onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(130px,.65fr)] xl:items-start">
        <div className="space-y-2"><Label htmlFor="quiz-kind">Jenis latihan</Label><select className="h-10 w-full rounded-xl border bg-background px-3 text-sm" id="quiz-kind" onChange={(event) => { setKind(event.target.value as QuizKind); setValidationError(""); }} value={kind}><option value="practice">Latihan bebas</option><option value="weekly">Kuis mingguan</option><option value="exam">Ujian bertimer</option></select></div>
        <div className="space-y-2">
          <Label htmlFor="quiz-topic">Topik (opsional)</Label>
          <Input aria-describedby="quiz-topic-hint" id="quiz-topic" maxLength={120} onChange={(event) => setTopic(event.target.value)} placeholder={topicPlaceholder} value={topic} />
          <p className="text-xs leading-5 text-muted-foreground" id="quiz-topic-hint">{topicHint}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="quiz-count">Jumlah soal</Label>
          <Input id="quiz-count" max={20} min={3} onChange={(event) => setCount(event.target.value)} type="number" value={count} />
        </div>
        {kind === "weekly" && <div className="space-y-2"><Label htmlFor="quiz-due">Batas pengerjaan</Label><Input id="quiz-due" min={localDateTimeMin()} onChange={(event) => setDueAt(event.target.value)} required type="datetime-local" value={dueAt}/></div>}
        {kind === "exam" && <div className="space-y-2"><Label htmlFor="quiz-time-limit">Durasi ujian (menit)</Label><Input id="quiz-time-limit" max={120} min={1} onChange={(event) => setTimeLimitMinutes(event.target.value)} required type="number" value={timeLimitMinutes}/></div>}
        </div>
        <SourceScopePicker onChange={scope.setSourceIds} sourceIds={scope.sourceIds} sources={sources}/>
        <div className="grid gap-3 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)] md:items-center">
        <Button aria-busy={createQuiz.isPending} className="w-full" disabled={createQuiz.isPending || readySources.length === 0 || sourceScopeEmpty} type="submit">
          {createQuiz.isPending
            ? <BubiLoading label="Bubi sedang menyusun kuis…" variant="compact" />
            : <><Brain aria-hidden="true" />Mulai latihan<ArrowRight aria-hidden="true" /></>}
        </Button>
        <p className="text-xs leading-5 text-muted-foreground">{scope.selectedSourceIds.length} sumber dari acuan terpilih siap digunakan. Kuis memerlukan setidaknya tiga bagian materi yang dapat dibaca.</p>
        </div>
        {validationError && <p className="text-sm text-destructive" role="alert">{validationError}</p>}
        {createQuiz.isError && <ErrorState message={createQuiz.error instanceof ApiRequestError ? createQuiz.error.message : "Kuis belum berhasil dibuat."} />}
      </form>
    </section>
  );
}
