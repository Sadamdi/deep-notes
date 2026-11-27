import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Sparkles } from "lucide-react";
import { workspaceAiAssistSchema, type SourceResponse, type WorkspaceAiTask } from "@deep-notes/shared";
import type { WorkspaceAiAssistResponse } from "@deep-notes/shared";
import { Button } from "@/components/ui/button";
import { BubiLoading, ErrorState } from "@/components/shared/PageStates";
import { SourcePageDialog } from "@/features/sources/SourcePageDialog";
import { SourceScopePicker } from "@/features/sources/SourceScopePicker";
import { useSourceScope } from "@/features/sources/useSourceScope";
import { ApiRequestError, api, jsonBody } from "@/lib/api";

const tasks: Array<{ task: WorkspaceAiTask; label: string }> = [
  { task: "summarize", label: "Ringkas" },
  { task: "suggest_questions", label: "Buat pertanyaan" },
  { task: "practice_guide", label: "Panduan latihan" },
  { task: "draft", label: "Bantu draf" },
];

export function AiAssistPanel({ notebookId, sources, input, onApply, title = "Minta bantuan Bubi", description = "Bubi menghubungkan masukanmu dengan sumber siap. Hasilnya bisa kamu tinjau sebelum dipakai.", availableTasks = tasks.map(({ task }) => task), showSourcePicker = true, applyLabel = "Gunakan hasil" }: {
  notebookId: string;
  sources: SourceResponse[];
  input: string;
  onApply?: (text: string, items: string[], task: WorkspaceAiTask) => void;
  title?: string;
  description?: string;
  availableTasks?: WorkspaceAiTask[];
  showSourcePicker?: boolean;
  applyLabel?: string;
}) {
  const [validation, setValidation] = useState("");
  const scope = useSourceScope(notebookId, sources);
  const queryClient = useQueryClient();
  const sourceVersion = sources.filter((source) => source.status === "ready").map((source) => `${source.id}:${source.chunkCount}`).sort().join("|");
  const scopeKey = scope.sourceIds === null ? "all" : scope.selectedSourceIds.slice().sort().join(",");
  const suggestionKey = ["notebooks", notebookId, "ai-suggestions", scopeKey, sourceVersion, input.trim()] as const;
  const assist = useMutation({
    mutationFn: async (body: ReturnType<typeof workspaceAiAssistSchema.parse>) => {
      if (body.task === "suggest_questions") {
        const cached = queryClient.getQueryData<WorkspaceAiAssistResponse>(suggestionKey);
        if (cached) return cached;
      }
      return api<WorkspaceAiAssistResponse>(`/notebooks/${notebookId}/ai/assist`, jsonBody("POST", body));
    },
    onSuccess: (result, body) => { if (body.task === "suggest_questions") queryClient.setQueryData(suggestionKey, result); },
  });
  const readySources = sources.some((source) => source.status === "ready");

  function run(task: WorkspaceAiTask) {
    const parsed = workspaceAiAssistSchema.safeParse({ task, input, ...(scope.sourceIds === null ? {} : { sourceIds: scope.selectedSourceIds }) });
    if (!parsed.success) {
      setValidation(parsed.error.issues[0]?.message ?? "Tambahkan teks sebelum meminta bantuan.");
      return;
    }
    if (!readySources || (scope.sourceIds !== null && scope.selectedSourceIds.length === 0)) {
      setValidation("Pilih setidaknya satu sumber yang siap dibaca.");
      return;
    }
    setValidation("");
    assist.mutate(parsed.data);
  }

  const variables = assist.variables;
  const sameScope = variables && (variables.sourceIds === undefined ? scope.sourceIds === null : variables.sourceIds.slice().sort().join(",") === scope.selectedSourceIds.slice().sort().join(","));
  const result = variables?.input === input.trim() && sameScope ? assist.data : undefined;
  const applyText = result?.grounded ? [result.text, ...result.items].join("\n\n") : "";

  return <section className="space-y-3 rounded-2xl bg-muted/50 p-4" aria-label={title}>
    <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-navy">{title}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p></div><Sparkles aria-hidden="true" className="mt-1 size-4 shrink-0 text-teal"/></div>
    {showSourcePicker && <SourceScopePicker onChange={scope.setSourceIds} sourceIds={scope.sourceIds} sources={sources}/>}
    <div className="flex flex-wrap gap-2">
      {tasks.filter(({ task }) => availableTasks.includes(task)).map(({ task, label }) => <Button aria-busy={assist.isPending} disabled={assist.isPending || !readySources || input.trim().length < 3} key={task} onClick={() => run(task)} size="sm" type="button" variant="outline">{assist.isPending ? <BubiLoading label="Bubi sedang membaca…" variant="compact"/> : label}</Button>)}
    </div>
    {validation && <p className="text-sm text-destructive" role="alert">{validation}</p>}
    {assist.isError && <ErrorState message={assist.error instanceof ApiRequestError ? assist.error.message : "Bubi belum berhasil membaca acuan ini."}/>}
    {result && <article aria-live="polite" className={`space-y-3 rounded-xl border p-4 ${result.grounded ? "border-cite/30 bg-card" : "border-warning/50 bg-warning/15"}`}>
      <p className="text-sm font-semibold text-navy">{result.grounded ? "Hasil dari sumber terpilih" : "Belum ditemukan di sumber"}</p>
      <p className="whitespace-pre-wrap text-sm leading-6">{result.text}</p>
      {result.items.length > 0 && <ul className="list-disc space-y-1 pl-5 text-sm leading-6">{result.items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul>}
      {result.grounded && <div className="grid gap-2 sm:grid-cols-2">{result.citations.map((citation, index) => <div className="rounded-xl bg-secondary/40 p-3" key={index}><div className="flex items-center justify-between gap-2"><p className="flex min-w-0 items-center gap-1 text-xs font-semibold text-navy"><BookOpen aria-hidden="true" className="size-3.5 shrink-0"/><span className="truncate">{citation.sourceTitle}{citation.page ? " · hlm. " + citation.page : ""}</span></p>{citation.page && <SourcePageDialog notebookId={notebookId} page={citation.page} sourceId={citation.sourceId} sourceTitle={citation.sourceTitle}/>}</div><p className="mt-2 text-xs leading-5 text-muted-foreground">“{citation.quote}”</p></div>)}</div>}
      {result.grounded && onApply && <Button onClick={() => onApply(applyText, result.items, variables!.task)} size="sm" type="button"><Sparkles aria-hidden="true"/>{applyLabel}</Button>}
    </article>}
  </section>;
}
