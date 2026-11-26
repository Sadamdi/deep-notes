import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { BookOpen, LoaderCircle, Sparkles } from "lucide-react";
import type { AskResponse, Citation, SourceResponse } from "@deep-notes/shared";
import { REACTION_FOR_EVENT } from "@deep-notes/shared";
import { BubiMascot } from "@/components/shared/BubiMascot";
import { ErrorState } from "@/components/shared/PageStates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiRequestError, api, jsonBody } from "@/lib/api";
import { askQuestionSchema } from "@deep-notes/shared";
import { SourceScopePicker } from "@/features/sources/SourceScopePicker";
import { useSourceScope } from "@/features/sources/useSourceScope";
import { AiAssistPanel } from "@/features/answers/AiAssistPanel";

export function AskPanel({ notebookId, sources, onCitationSelect }: { notebookId: string; sources: SourceResponse[]; onCitationSelect?: (citation: Citation) => void }) {
  const readySources = sources.filter((source) => source.status === "ready");
  const [question, setQuestion] = useState("");
  const { sourceIds: selectedIds, selectedSourceIds, setSourceIds: setSelectedIds } = useSourceScope(notebookId, sources);
  const [answer, setAnswer] = useState<AskResponse | null>(null);
  const [answerAnimationKey, setAnswerAnimationKey] = useState(0);
  const [validationError, setValidationError] = useState("");
  const ask = useMutation({
    mutationFn: (body: { question: string; sourceIds?: string[] }) => api<AskResponse>(`/notebooks/${notebookId}/ask`, jsonBody("POST", body)),
    onSuccess: (response) => {
      setAnswer(response);
      setAnswerAnimationKey((current) => current + 1);
    },
  });

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = askQuestionSchema.safeParse({
      question,
      ...(selectedIds === null ? {} : { sourceIds: selectedSourceIds }),
    });
    if (!input.success) {
      setValidationError(input.error.issues[0]?.message ?? "Periksa pertanyaan dan acuanmu.");
      return;
    }
    setValidationError("");
    setAnswer(null);
    ask.mutate(input.data);
  }

  return (
    <section className="space-y-4" aria-labelledby="ask-heading">
      <div className="flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-xl bg-secondary text-primary"><Sparkles aria-hidden="true" className="size-5" /></span>
        <div>
          <h2 className="font-bold text-navy" id="ask-heading">Belajar bersama Bubi</h2>
          <p className="text-xs text-muted-foreground">Jawaban memakai materi workspace ini.</p>
        </div>
      </div>

      {readySources.length > 0 && <SourceScopePicker onChange={setSelectedIds} sourceIds={selectedIds} sources={sources}/>}

      <form className="space-y-2" onSubmit={submit}>
        <Label htmlFor="ask-question">Tanyakan sesuatu</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            autoComplete="off"
            disabled={ask.isPending || readySources.length === 0}
            id="ask-question"
            maxLength={1000}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder={readySources.length ? "Contoh: Apa fungsi switch pada topologi bintang?" : "Tambahkan materi yang siap dibaca dulu"}
            value={question}
          />
          <Button disabled={ask.isPending || readySources.length === 0} type="submit">
            {ask.isPending ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Sparkles aria-hidden="true" />}
            Tanyakan
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Jika jawabannya tidak ada di sumber, Bubi akan mengatakannya dengan jelas.</p>
        {validationError && <p className="text-sm text-destructive" role="alert">{validationError}</p>}
      </form>

      {readySources.length > 0 && <AiAssistPanel availableTasks={["suggest_questions"]} applyLabel="Pakai pertanyaan pertama" input="Buat pertanyaan belajar tentang topik penting dalam materi ini." notebookId={notebookId} onApply={(_, items) => setQuestion(items[0] ?? "")} showSourcePicker={false} sources={sources} title="Belum tahu harus bertanya apa?"/>}
      {ask.isPending && <div className="flex items-center gap-3 rounded-2xl bg-secondary/70 p-3" role="status">
        <BubiMascot {...REACTION_FOR_EVENT.waiting_for_ai} className="h-12 w-auto" decorative />
        <p className="text-sm font-semibold text-navy">Bubi sedang mencari jawaban di materi workspace…</p>
      </div>}
      {ask.isError && <ErrorState message={ask.error instanceof ApiRequestError ? ask.error.message : "Pertanyaan belum berhasil dikirim."} />}
      {answer && (
        <article className={`rounded-2xl border p-4 sm:p-5 ${answer.grounded ? "border-cite/30 bg-secondary/45" : "border-warning/50 bg-warning/15"}`} aria-live="polite">
          <div className="flex items-center gap-2">
            <BubiMascot animation={answer.grounded ? "idle" : REACTION_FOR_EVENT.answer_not_found.animation} animationKey={answerAnimationKey} className="h-9 w-auto" decorative emotion={answer.grounded ? "idle" : REACTION_FOR_EVENT.answer_not_found.emotion} />
            <div>
              <p className="font-semibold text-navy">{answer.grounded ? "Bubi menemukan jawabannya" : "Belum ditemukan di sumber"}</p>
              <p className="text-xs text-muted-foreground">{answer.grounded ? "Jawaban berikut terhubung ke materi yang dipilih." : "Coba tambahkan sumber yang membahas topik ini."}</p>
            </div>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-foreground">{answer.text}</p>
          {answer.grounded && answer.citations.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2" aria-label="Sumber jawaban">
              {answer.citations.map((citation, index) => (
                  <Button key={`${citation.sourceId}-${citation.page}-${index}`} onClick={() => onCitationSelect?.(citation)} size="sm" variant="outline">
                  <BookOpen aria-hidden="true" className="size-3.5" />{citation.sourceTitle}{citation.page ? ` · hlm. ${citation.page}` : ""}
                </Button>
              ))}
            </div>
          )}
        </article>
      )}

    </section>
  );
}
