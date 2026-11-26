import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BookOpen, LoaderCircle, RefreshCw, Sparkles } from "lucide-react";
import type { AskResponse, Citation, SourceResponse, WorkspaceAiAssistResponse } from "@deep-notes/shared";
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

function suggestionErrorMessage(error: unknown) {
  if (!(error instanceof ApiRequestError)) return "Saran pertanyaan belum berhasil dimuat.";
  if (error.status === 404) return "Server belum menyediakan saran otomatis. Perbarui dan deploy API POST /notebooks/:id/ai/assist.";
  if (error.status === 400 || error.code === "VALIDATION") return "Backend menolak format permintaan saran. Samakan validasi suggest_questions dengan kontrak terbaru agar input kosong dan sourceIds diizinkan. Kamu tetap bisa mengetik pertanyaan sendiri.";
  return error.message;
}

export function AskPanel({ notebookId, sources, onCitationSelect }: { notebookId: string; sources: SourceResponse[]; onCitationSelect?: (citation: Citation) => void }) {
  const readySources = sources.filter((source) => source.status === "ready");
  const [question, setQuestion] = useState("");
  const { sourceIds: selectedIds, selectedSourceIds, setSourceIds: setSelectedIds } = useSourceScope(notebookId, sources);
  const activeSources = readySources.filter((source) => selectedSourceIds.includes(source.id));
  const sourceScopeKey = selectedSourceIds.slice().sort().join(",");
  const sourceVersion = activeSources.map((source) => `${source.id}:${source.chunkCount}`).sort().join("|");
  const canUseSources = activeSources.length > 0;
  const [answer, setAnswer] = useState<AskResponse | null>(null);
  const [answerAnimationKey, setAnswerAnimationKey] = useState(0);
  const [validationError, setValidationError] = useState("");
  const suggestions = useQuery({
    queryKey: ["notebooks", notebookId, "ask-suggestions", sourceScopeKey, sourceVersion],
    queryFn: () => api<WorkspaceAiAssistResponse>(`/notebooks/${notebookId}/ai/assist`, jsonBody("POST", {
      task: "suggest_questions",
      input: "",
      sourceIds: selectedSourceIds,
    })),
    enabled: canUseSources,
    staleTime: 5 * 60_000,
  });
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
            disabled={ask.isPending || !canUseSources}
            id="ask-question"
            maxLength={1000}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder={
              !readySources.length ? "Tambahkan materi yang siap dibaca dulu"
                : activeSources.length === 1 ? `Tanyakan sesuatu tentang ${activeSources[0]!.title}`
                  : canUseSources ? `Tanyakan sesuatu dari ${activeSources.length} sumber terpilih`
                    : "Pilih setidaknya satu sumber yang siap dibaca"
            }
            value={question}
          />
          <Button disabled={ask.isPending || !canUseSources} type="submit">
            {ask.isPending ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Sparkles aria-hidden="true" />}
            Tanyakan
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Jika jawabannya tidak ada di sumber, Bubi akan mengatakannya dengan jelas.</p>
        {validationError && <p className="text-sm text-destructive" role="alert">{validationError}</p>}
      </form>

      {readySources.length > 0 && <section aria-label="Saran pertanyaan dari sumber" className="space-y-3 rounded-2xl bg-muted/50 p-4">
        <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-navy">Belum tahu harus bertanya apa?</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Bubi membuat saran dari materi yang sedang dipilih.</p></div><Sparkles aria-hidden="true" className="mt-1 size-4 shrink-0 text-teal"/></div>
        {!canUseSources && <p className="text-sm text-muted-foreground" role="status">Pilih setidaknya satu sumber yang siap dibaca.</p>}
        {canUseSources && suggestions.isPending && <div className="flex items-center gap-3 rounded-xl bg-card p-3" role="status"><BubiMascot {...REACTION_FOR_EVENT.waiting_for_ai} className="h-10 w-auto" decorative/><p className="text-sm text-muted-foreground">Bubi sedang membaca {activeSources.length === 1 ? activeSources[0]!.title : `${activeSources.length} sumber terpilih`}…</p></div>}
        {canUseSources && suggestions.isError && <div className="space-y-2" role="alert"><p className="text-sm text-destructive">{suggestionErrorMessage(suggestions.error)}</p><Button disabled={suggestions.isFetching} onClick={() => void suggestions.refetch()} size="sm" type="button" variant="outline"><RefreshCw aria-hidden="true" className={suggestions.isFetching ? "animate-spin" : undefined}/>Coba lagi</Button></div>}
        {suggestions.data && !suggestions.data.grounded && <div className="space-y-2"><p className="text-sm text-muted-foreground">{suggestions.data.text}</p><Button disabled={suggestions.isFetching} onClick={() => void suggestions.refetch()} size="sm" type="button" variant="outline"><RefreshCw aria-hidden="true" className={suggestions.isFetching ? "animate-spin" : undefined}/>Buat saran lagi</Button></div>}
        {suggestions.data?.grounded && <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{suggestions.data.text}</p>
          <div className="grid gap-2">
            {suggestions.data.items.map((item, index) => <Button className="h-auto justify-start whitespace-normal py-2.5 text-left" key={`${index}-${item}`} onClick={() => { setQuestion(item); setValidationError(""); }} size="sm" type="button" variant="outline">{item}</Button>)}
          </div>
          {suggestions.data.citations.length > 0 && <p className="text-xs text-muted-foreground">Acuan: {[...new Set(suggestions.data.citations.map((citation) => `${citation.sourceTitle}${citation.page ? ` · hlm. ${citation.page}` : ""}`))].slice(0, 4).join(", ")}</p>}
        </div>}
      </section>}
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
