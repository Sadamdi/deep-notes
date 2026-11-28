import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { Select } from "radix-ui";
import { ArrowLeft, ArrowRight, Check, ChevronDown, Clock3, GripVertical, Medal, Sparkles, Trophy, Users, X } from "lucide-react";
import type { CreateSessionInput, GameFinish, GameRoundResult, GameSession, GameSessionList, NotebookResponse, PublicItem, PublicRound, UserStats } from "@deep-notes/shared";
import { REACTION_FOR_EVENT, createSessionSchema } from "@deep-notes/shared";
import { BubiMascot } from "@/components/shared/BubiMascot";
import { BubiLoading, ErrorState, LoadingState, PageTitle } from "@/components/shared/PageStates";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuthMe } from "@/features/auth/useAuth";
import { useNotebook, useSources } from "@/features/notebooks/queries";
import { QuizLauncher } from "@/features/quizzes/QuizLauncher";
import { QuizList } from "@/features/quizzes/QuizList";
import { SourcePageDialog } from "@/features/sources/SourcePageDialog";
import { SourceScopePicker } from "@/features/sources/SourceScopePicker";
import { useSourceScope } from "@/features/sources/useSourceScope";
import { InviteWorkspaceDialog } from "@/features/notebooks/InviteWorkspaceDialog";
import { ApiRequestError, api, jsonBody } from "@/lib/api";
import { queueStreakCelebration, streakWasExtended } from "@/lib/streakCelebration";

const gameNames = { mcq: "Pilihan ganda", fill: "Isi bagian kosong", tf: "Benar atau salah", order: "Susun langkah", match: "Pasangkan konsep", guess_page: "Tebak halaman", teach: "Jelaskan ke Bubi" } as const;
const choiceSurfaces = ["bg-coral", "bg-game-purple", "bg-game-orange", "bg-teal"] as const;
type AnswerValue = number | string | boolean | Array<number | string> | null;

function isAnswerComplete(value: AnswerValue, item?: PublicItem) {
  if (value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (item?.type === "match") return isMatchAnswerValid(value, item.lefts.length, item.rights.length, item.scoring === "proportional");
  if (Array.isArray(value)) return value.length > 0 && !value.some((item) => item === -1);
  return true;
}

function isMatchAnswerValid(value: AnswerValue, pairCount: number, rightCount: number, allowPartial: boolean) {
  if (!Array.isArray(value) || value.length !== pairCount) return false;
  const assigned = value.filter((rightIndex) => typeof rightIndex === "number" && Number.isInteger(rightIndex) && rightIndex >= 0 && rightIndex < rightCount);
  if (value.some((rightIndex) => typeof rightIndex !== "number" || !Number.isInteger(rightIndex) || rightIndex < -1 || rightIndex >= rightCount)) return false;
  return (allowPartial ? assigned.length > 0 : assigned.length === pairCount) && new Set(assigned).size === assigned.length;
}

function ItemAnswer({ item, value, onChange, index, disabled = false }: { item: PublicItem; value: AnswerValue; onChange: (answer: AnswerValue) => void; index: number; disabled?: boolean }) {
  const radioName = `answer-${index}`;
  if (item.type === "mcq") return <fieldset className="mt-4 grid gap-3 sm:grid-cols-2" disabled={disabled}><legend className="sr-only">Pilih jawaban</legend>{item.options.map((option, optionIndex) => <label className={`flex min-h-16 cursor-pointer items-start gap-3 rounded-2xl border-2 border-transparent p-4 text-sm font-semibold text-navy transition-[transform,box-shadow] duration-200 ${choiceSurfaces[optionIndex]} ${value === optionIndex ? "ring-2 ring-navy ring-offset-2" : "hover:-translate-y-0.5 hover:shadow-md"}`} key={optionIndex}><input checked={value === optionIndex} className="sr-only" name={radioName} onChange={() => onChange(optionIndex)} type="radio"/><span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/70 text-xs font-extrabold">{String.fromCharCode(65 + optionIndex)}</span><span className="leading-6">{option}</span></label>)}</fieldset>;
  if (item.type === "guess_page") return <fieldset className="mt-4 grid gap-3 sm:grid-cols-2" disabled={disabled}><legend className="sr-only">Pilih sumber dan halaman</legend>{item.options.map((option, optionIndex) => <label className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border-2 border-transparent p-4 text-sm font-semibold text-navy ${choiceSurfaces[optionIndex]} ${value === optionIndex ? "ring-2 ring-navy ring-offset-2" : "hover:shadow-md"}`} key={optionIndex}><input checked={value === optionIndex} className="sr-only" name={radioName} onChange={() => onChange(optionIndex)} type="radio"/><span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/70 text-xs font-extrabold">{String.fromCharCode(65 + optionIndex)}</span><span>{option.sourceTitle}{option.page ? ` · halaman ${option.page}` : ""}</span></label>)}</fieldset>;
  if (item.type === "tf") return <fieldset className="mt-4 grid gap-3 sm:grid-cols-2" disabled={disabled}><legend className="sr-only">Pilih benar atau salah</legend>{[[true, "Benar"], [false, "Salah"]].map(([answer, label]) => <label className={`flex min-h-16 flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-transparent p-4 text-base font-bold text-navy ${label === "Benar" ? "bg-mint" : "bg-coral"} ${value === answer ? "ring-2 ring-navy ring-offset-2" : "hover:shadow-md"}`} key={String(answer)}><input checked={value === answer} className="sr-only" name={radioName} onChange={() => onChange(answer as boolean)} type="radio"/>{label}</label>)}</fieldset>;
  if (item.type === "fill") return <div className="mt-3 space-y-2"><Label htmlFor={`answer-fill-${index}`}>Jawabanmu</Label><Input autoComplete="off" disabled={disabled} id={`answer-fill-${index}`} maxLength={4000} onChange={(event) => onChange(event.target.value)} placeholder={`${item.firstLetter ? `Petunjuk huruf: ${item.firstLetter}` : "Tulis jawaban"}${item.length ? ` · ${item.length} karakter` : ""}`} value={typeof value === "string" ? value : ""}/></div>;
  if (item.type === "teach") return <div className="mt-3 space-y-2"><Label htmlFor={`answer-teach-${index}`}>Jelaskan dengan kata-katamu sendiri</Label><Textarea className="min-h-32" disabled={disabled} id={`answer-teach-${index}`} maxLength={4000} minLength={10} onChange={(event) => onChange(event.target.value)} placeholder="Ceritakan kembali berdasarkan materi yang kamu pelajari…" value={typeof value === "string" ? value : ""}/><p className="text-xs text-muted-foreground">Minimal 10 karakter. Bubi akan menilai isi penjelasanmu dari sumber workspace.</p></div>;
  if (item.type === "order") {
    const selected = Array.isArray(value) ? value as number[] : item.steps.map((step) => step.id);
    const move = (at: number, direction: number) => { const next = [...selected]; const to = at + direction; if (to < 0 || to >= next.length) return; [next[at], next[to]] = [next[to]!, next[at]!]; onChange(next); };
    return <div className="mt-3 space-y-2">
      <p className="text-sm text-muted-foreground">Seret kartu ke urutan yang kamu pilih, atau gunakan tombol naik dan turun.</p>
      <DragDropContext onDragEnd={({ source, destination }) => {
        if (!destination || destination.index === source.index) return;
        const next = [...selected];
        const [moved] = next.splice(source.index, 1);
        next.splice(destination.index, 0, moved!);
        onChange(next);
      }}>
        <Droppable droppableId={`order-${index}`} direction="vertical">
          {(dropProvided, snapshot) => <ol className={`space-y-2 rounded-2xl ${snapshot.isDraggingOver ? "bg-secondary/40" : ""}`} ref={dropProvided.innerRef} {...dropProvided.droppableProps}>
            {selected.map((id, position) => {
              const step = item.steps.find((candidate) => candidate.id === id);
              return <Draggable disableInteractiveElementBlocking draggableId={`${index}-${id}`} index={position} isDragDisabled={disabled} key={id}>
                {(dragProvided, dragSnapshot) => <li className={`flex items-center gap-2 rounded-xl border border-game-purple/30 bg-card p-3 transition-shadow ${dragSnapshot.isDragging ? "z-10 shadow-lg" : ""}`} ref={dragProvided.innerRef} style={dragProvided.draggableProps.style} {...dragProvided.draggableProps}>
                  <Button aria-label={`Seret langkah ${position + 1}`} className="touch-none cursor-grab active:cursor-grabbing" disabled={disabled} size="icon-sm" variant="ghost" {...dragProvided.dragHandleProps}><GripVertical aria-hidden="true" className="size-4"/></Button>
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-game-purple/20 text-xs font-bold">{position + 1}</span>
                  <span className="min-w-0 flex-1 text-sm leading-5">{step?.text}</span>
                  <Button aria-label={`Pindahkan langkah ${position + 1} ke atas`} disabled={disabled || position === 0} onClick={() => move(position, -1)} size="icon-sm" variant="ghost"><ArrowLeft aria-hidden="true" className="-rotate-90"/></Button>
                  <Button aria-label={`Pindahkan langkah ${position + 1} ke bawah`} disabled={disabled || position === selected.length - 1} onClick={() => move(position, 1)} size="icon-sm" variant="ghost"><ArrowLeft aria-hidden="true" className="rotate-90"/></Button>
                </li>}
              </Draggable>;
            })}
            {dropProvided.placeholder}
          </ol>}
        </Droppable>
      </DragDropContext>
    </div>;
  }
  const selected = Array.isArray(value) ? value as number[] : item.lefts.map(() => -1);
  const assignedCount = selected.filter((rightIndex) => rightIndex >= 0).length;
  return <div className="mt-3 space-y-3">
    <div className="flex items-center justify-between gap-3 rounded-xl bg-secondary/50 px-3 py-2 text-sm">
      <span className="font-semibold text-navy">Pasangan terisi</span>
      <span aria-live="polite" className="font-bold text-teal">{assignedCount} dari {item.lefts.length}</span>
    </div>
    <div className="space-y-2">
      {item.lefts.map((left, leftIndex) => {
        const usedElsewhere = (rightIndex: number) => selected.some((assigned, assignedIndex) => assignedIndex !== leftIndex && assigned === rightIndex);
        return <div className="grid gap-2 rounded-2xl border border-border/70 bg-card p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] sm:items-center" key={`${left}-${leftIndex}`}>
          <div className="flex items-center gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary text-xs font-bold text-navy">{leftIndex + 1}</span><p className="text-sm font-semibold text-navy">{left}</p></div>
          <Select.Root onValueChange={(selectedValue) => {
            const next = [...selected];
            next[leftIndex] = selectedValue === "__none__" ? -1 : Number(selectedValue);
            onChange(next);
          }} value={(selected[leftIndex] ?? -1) < 0 ? "__none__" : String(selected[leftIndex] ?? -1)}>
            <Select.Trigger aria-label={`Pasangan untuk ${left}`} className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-border bg-white px-3 py-2 text-left text-sm text-navy outline-none transition-colors hover:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:border-primary">
              <Select.Value placeholder="Pilih pasangan"/>
              <Select.Icon><ChevronDown aria-hidden="true" className="size-4 shrink-0"/></Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className="z-[100] max-h-60 overflow-hidden rounded-xl border bg-card text-foreground shadow-lg motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95" position="popper" sideOffset={4}>
                <Select.Viewport className="p-1">
                  <Select.Item className="flex min-h-10 cursor-pointer items-center rounded-lg px-3 text-sm outline-none focus:bg-secondary data-[disabled]:opacity-45" value="__none__"><Select.ItemText>Belum dipilih</Select.ItemText></Select.Item>
                  {item.rights.map((right, rightIndex) => <Select.Item className="flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded-lg px-3 text-sm outline-none focus:bg-secondary data-[disabled]:opacity-45" disabled={usedElsewhere(rightIndex)} key={`${right}-${rightIndex}`} value={String(rightIndex)}><Select.ItemText>{right}</Select.ItemText><Select.ItemIndicator><Check aria-hidden="true" className="size-4 text-primary"/></Select.ItemIndicator></Select.Item>)}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>;
      })}
    </div>
  </div>;
}

function initialAnswer(item: PublicItem): AnswerValue {
  if (item.type === "order") return item.steps.map((step) => step.id);
  if (item.type === "match") return item.lefts.map(() => -1);
  if (item.type === "fill" || item.type === "teach") return "";
  return null;
}

function RoundReview({ result, notebookId, round }: { result: GameRoundResult; notebookId: string; round?: PublicRound }) {
  return <div className="space-y-3">{result.results.map((item) => {
    const roundItem = round?.items[item.index];
    const matchItem = roundItem?.type === "match" ? roundItem : undefined;
    const chosenPairs = Array.isArray(item.chosenAnswer) ? item.chosenAnswer as number[] : [];
    const correctPairs = Array.isArray(item.correctAnswer) ? item.correctAnswer as number[] : [];
    const matchedPairs = matchItem ? chosenPairs.reduce((count, chosen, pairIndex) => count + (chosen >= 0 && chosen === correctPairs[pairIndex] ? 1 : 0), 0) : 0;
    const itemPoints = Math.round(item.fraction * (item.type === "teach" ? 200 : 100));
    return <article className="rounded-2xl border bg-card p-4 sm:p-5" key={`${item.index}-${item.topic}`}>
      <div className="flex items-start gap-3">
        <span aria-label={item.correct ? "Benar" : item.fraction > 0 ? "Nilai parsial" : "Perlu ditinjau"} className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full ${item.correct ? "bg-secondary text-teal" : item.fraction > 0 ? "bg-warning/25 text-warning-foreground" : "bg-destructive/10 text-destructive"}`}>{item.correct ? <Check aria-hidden="true" className="size-4"/> : item.fraction > 0 ? <Sparkles aria-hidden="true" className="size-4"/> : <X aria-hidden="true" className="size-4"/>}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2"><p className="font-semibold text-navy">{gameNames[item.type]} · {item.topic}</p><span className="rounded-lg bg-muted px-2.5 py-1 text-xs font-bold">{itemPoints} poin</span></div>
          {matchItem && <div className="mt-3 space-y-2" aria-label={`${matchedPairs} dari ${matchItem.lefts.length} pasangan tepat`}>
            <p className="text-sm font-semibold text-navy">{matchedPairs} dari {matchItem.lefts.length} pasangan tepat</p>
            {matchItem.lefts.map((left, pairIndex) => {
              const chosen = chosenPairs[pairIndex] ?? -1;
              const correct = correctPairs[pairIndex] ?? -1;
              const isCorrect = chosen >= 0 && chosen === correct;
              return <div className={`grid gap-1 rounded-xl p-3 text-sm sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] ${isCorrect ? "bg-secondary/45" : "bg-warning/10"}`} key={`${left}-${pairIndex}`}>
                <span className="font-semibold text-navy">{left}</span>
                <span className="leading-5">{isCorrect ? "Tepat: " : "Jawaban benar: "}{matchItem.rights[correct] ?? "Belum tersedia"}{!isCorrect && <span className="block text-xs text-muted-foreground">Pilihanmu: {chosen >= 0 ? matchItem.rights[chosen] ?? "Belum tersedia" : "Belum dipilih"}</span>}</span>
              </div>;
            })}
          </div>}
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.explanation}</p>
          {item.teach && <><p className="mt-2 rounded-xl bg-secondary/50 p-3 text-sm leading-6">{item.teach.reply}</p>{item.teach.missing.length > 0 && <p className="mt-2 text-xs text-muted-foreground">Topik yang perlu ditambahkan: {item.teach.missing.join(", ")}</p>}</>}
          <div className="mt-3 flex flex-wrap items-center gap-2"><span className="rounded-full bg-muted px-3 py-1.5 text-xs">{item.ref.sourceTitle}{item.ref.page ? ` · hlm. ${item.ref.page}` : ""}</span><SourcePageDialog notebookId={notebookId} page={item.ref.page} sourceId={item.ref.sourceId} sourceTitle={item.ref.sourceTitle}/></div>
        </div>
      </div>
    </article>;
  })}</div>;
}

function SessionResults({ result, notebookId }: { result: GameFinish; notebookId: string }) {
  return <div className="mx-auto max-w-4xl space-y-6">
    <PageTitle eyebrow="Hasil sesi" title="Sesi selesai" description={`${result.correct} dari ${result.total} soal dijawab benar. Akurasi juga memperhitungkan nilai parsial.`} action={<div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link to={`/home?session=${result.sessionId}`}>Bagikan ke beranda</Link></Button><Button asChild><Link to={`/game/${notebookId}`}>Kembali ke game</Link></Button></div>}/>
    <section aria-label="Ringkasan sesi" className="overflow-hidden rounded-3xl bg-navy p-5 text-white sm:p-7">
      <div className="grid gap-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
        <BubiMascot animation={result.reaction.animation} animationKey={result.sessionId} className="mx-auto h-28 w-auto sm:mx-0" decorative emotion={result.reaction.emotion}/>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-white/10 p-4 sm:col-span-3"><p className="text-xs font-semibold uppercase tracking-wide text-white/70">Poin sesi</p><p className="mt-1 text-4xl font-extrabold">{result.points.toLocaleString("id-ID")}</p><p className="mt-2 text-sm text-white/75">Peringkat {result.rank} dari {result.players}{result.streak ? ` · streak ${result.streak} hari` : ""}</p></div>
          <div className="rounded-xl bg-white/10 p-3"><p className="text-xs text-white/70">Akurasi</p><p className="mt-1 text-xl font-bold">{result.accuracyPercent}%</p></div>
          <div className="rounded-xl bg-white/10 p-3"><p className="text-xs text-white/70">Benar penuh</p><p className="mt-1 text-xl font-bold">{result.correct}/{result.total}</p></div>
          <div className="rounded-xl bg-white/10 p-3"><p className="text-xs text-white/70">Peringkat</p><p className="mt-1 text-xl font-bold">{result.rank}/{result.players}</p></div>
        </div>
      </div>
    </section>
    {result.badgesEarned.length > 0 && <section className="rounded-3xl border bg-card p-5"><h2 className="font-bold text-navy">Lencana baru</h2><div className="mt-3 flex flex-wrap gap-2">{result.badgesEarned.map((badge) => <span className="inline-flex items-center gap-2 rounded-full bg-warning/30 px-3 py-2 text-xs font-semibold" key={badge.id}><Medal aria-hidden="true" className="size-4"/>{badge.name}</span>)}</div></section>}
    {result.weakTopics.length > 0 && <section className="space-y-3"><h2 className="font-bold text-navy">Topik yang bisa ditinjau</h2>{result.weakTopics.map((topic) => <Card className="rounded-2xl p-4" key={topic.topic}><p className="font-semibold text-navy">{topic.topic}</p><p className="mt-1 text-sm text-muted-foreground">{topic.missed} jawaban perlu diperiksa</p>{topic.reviewAt.map((item) => <p className="mt-2 text-xs text-muted-foreground" key={item}>Rujukan: {item}</p>)}<Button asChild className="mt-4" size="sm" variant="outline"><Link to={`/game/${notebookId}?focus=${encodeURIComponent(topic.topic)}`}>Mulai misi pemulihan</Link></Button></Card>)}</section>}
    <p className="text-xs leading-5 text-muted-foreground">Hasil, akurasi, dan poin dihitung oleh server. Jawaban parsial tetap dibedakan dari jawaban yang benar sepenuhnya.</p>
  </div>;
}

function RoundResults({ result, notebookId, round }: { result: GameRoundResult; notebookId: string; round?: PublicRound }) {
  const partialCount = result.results.filter((item) => !item.correct && item.fraction > 0).length;
  return <>
    <section aria-label="Ringkasan ronde" className="grid gap-4 rounded-3xl bg-navy p-5 text-white sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:p-6">
      <BubiMascot animation={result.reaction.animation} animationKey={`${result.roundIndex}:${result.correctCount}`} className="mx-auto h-20 w-auto sm:mx-0" decorative emotion={result.reaction.emotion}/>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-white/10 p-4 sm:col-span-3"><p className="text-xs font-semibold uppercase tracking-wide text-white/70">Ronde selesai</p><p className="mt-1 text-2xl font-extrabold">{result.correctCount} dari {result.total} benar penuh</p><p className="mt-1 text-sm text-white/75">{partialCount > 0 ? `${partialCount} jawaban mendapat nilai parsial.` : "Lihat pembahasan dan sumber untuk tiap jawaban."}</p></div>
        <div className="rounded-xl bg-white/10 p-3"><p className="text-xs text-white/70">Poin ronde</p><p className="mt-1 text-xl font-bold">{result.points}</p></div>
        <div className="rounded-xl bg-white/10 p-3"><p className="text-xs text-white/70">Bonus kecepatan</p><p className="mt-1 text-xl font-bold">+{result.speedBonusPoints ?? 0}</p></div>
        <div className="rounded-xl bg-white/10 p-3"><p className="text-xs text-white/70">Nilai parsial</p><p className="mt-1 text-xl font-bold">{partialCount}</p></div>
      </div>
    </section>
    <RoundReview notebookId={notebookId} result={result} round={round}/>
  </>;
}

export function WorkspaceGamePage() {
  const { notebookId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const notebook = useNotebook(notebookId);
  const sources = useSources(notebookId);
  const sourceScope = useSourceScope(notebookId, sources.data ?? []);
  const sessions = useQuery({ queryKey: ["notebooks", notebookId, "sessions"], queryFn: () => api<GameSessionList>(`/notebooks/${notebookId}/sessions`), enabled: Boolean(notebookId), refetchInterval: (query) => query.state.data?.some((session) => session.status === "waiting") ? 5000 : false });
  const [mode, setMode] = useState<CreateSessionInput["mode"]>("solo");
  const [rounds, setRounds] = useState(6);
  const [focusTopic, setFocusTopic] = useState(searchParams.get("focus") ?? "");
  const [gameTypes, setGameTypes] = useState<CreateSessionInput["gameTypes"]>([]);
  const [error, setError] = useState("");
  const create = useMutation({
    mutationFn: () => {
      if (sourceScope.sourceIds !== null && sourceScope.selectedSourceIds.length === 0) throw new Error("Pilih setidaknya satu sumber siap untuk sesi ini.");
      const parsed = createSessionSchema.safeParse({ mode, rounds, ...(focusTopic.trim() ? { focusTopic: focusTopic.trim() } : {}), ...(gameTypes?.length ? { gameTypes } : {}), ...(sourceScope.sourceIds === null ? {} : { sourceIds: sourceScope.selectedSourceIds }) });
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Periksa pengaturan sesi.");
      return api<GameSession>(`/notebooks/${notebookId}/sessions`, jsonBody("POST", parsed.data));
    },
    onSuccess: async (session) => { await sessions.refetch(); navigate(`/game/${notebookId}/sessions/${session.id}`); },
    onError: (cause) => setError(cause.message),
  });
  const join = useMutation({
    mutationFn: (sessionId: string) => api<GameSession>(`/notebooks/${notebookId}/sessions/${sessionId}/join`, jsonBody("POST")),
    onSuccess: (session) => navigate(`/game/${notebookId}/sessions/${session.id}`),
  });
  if (notebook.isPending || sources.isPending) return <LoadingState label="Menyiapkan sesi belajar…"/>;
  if (notebook.isError) return <ErrorState message={notebook.error.message} onRetry={() => void notebook.refetch()}/>;
  if (sources.isError) return <ErrorState message={sources.error.message} onRetry={() => void sources.refetch()}/>;
  const readySources = sources.data.filter((source) => source.status === "ready");
  const activeSessions = sessions.data?.filter((session) => session.status === "waiting" && session.mode !== "solo") ?? [];
  const setupReaction = create.isPending ? REACTION_FOR_EVENT.waiting_for_ai : REACTION_FOR_EVENT.greeting;
  return <div className="space-y-6"><PageTitle action={<Button asChild variant="outline"><Link to={`/workspaces/${notebookId}`}><ArrowLeft aria-hidden="true"/>Kembali ke workspace</Link></Button>} description={`${notebook.data.title} · ${readySources.length} sumber siap`} eyebrow="Game belajar" title="Pilih cara berlatih"/><div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(300px,0.95fr)]"><section className="space-y-4 rounded-3xl border bg-card p-5 sm:p-6"><div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary"><Sparkles aria-hidden="true"/></span><div><h2 className="font-bold text-navy">Sesi interaktif</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Server menyusun soal dari materi yang siap. Pilih tipe permainan atau biarkan Bubi menyusunnya otomatis.</p></div></div><SourceScopePicker onChange={sourceScope.setSourceIds} sourceIds={sourceScope.sourceIds} sources={sources.data}/><div className="space-y-2"><Label htmlFor="game-mode">Mode sesi</Label><select className="h-11 w-full rounded-xl border bg-background px-3 text-sm" id="game-mode" onChange={(event) => setMode(event.target.value as CreateSessionInput["mode"])} value={mode}><option value="solo">Mandiri</option><option value="duel">Duel bersama teman</option><option value="group">Kelompok, maksimal 12 pemain</option></select></div>{mode === "solo" && <div className="space-y-2"><Label htmlFor="game-rounds">Jumlah ronde · {rounds}</Label><input className="w-full accent-primary" id="game-rounds" max={10} min={3} onChange={(event) => setRounds(Number(event.target.value))} type="range" value={rounds}/></div>}<div className="space-y-2"><Label htmlFor="focus-topic">Topik pemulihan <span className="font-normal text-muted-foreground">(opsional)</span></Label><Input id="focus-topic" maxLength={120} onChange={(event) => setFocusTopic(event.target.value)} placeholder="Isi nama topik yang ingin ditinjau" value={focusTopic}/></div><fieldset className="space-y-2"><legend className="text-sm font-semibold">Tipe permainan <span className="font-normal text-muted-foreground">(kosongkan untuk otomatis)</span></legend><div className="grid gap-2 sm:grid-cols-2">{(Object.entries(gameNames) as Array<[keyof typeof gameNames, string]>).map(([key, label]) => <label className="flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm" key={key}><input checked={gameTypes?.includes(key) ?? false} className="size-4 accent-primary" onChange={(event) => setGameTypes((current) => event.target.checked ? [...(current ?? []), key] : (current ?? []).filter((item) => item !== key))} type="checkbox"/>{label}</label>)}</div></fieldset>{error && <ErrorState message={error}/>}<Button className="w-full" disabled={create.isPending || readySources.length === 0 || (sourceScope.sourceIds !== null && sourceScope.selectedSourceIds.length === 0)} onClick={() => { setError(""); create.mutate(); }}>{create.isPending ? <BubiLoading label="Bubi sedang menyiapkan sesi…" variant="compact"/> : <><Sparkles aria-hidden="true"/>{readySources.length ? "Mulai sesi" : "Menunggu sumber siap"}</>}</Button>{readySources.length === 0 && <p className="text-xs leading-5 text-muted-foreground">Tambahkan sumber ke workspace dan tunggu pemrosesannya selesai.</p>}</section><div className="space-y-4"><div className="rounded-3xl bg-navy p-5 text-white sm:p-6"><div className="flex items-center gap-4"><BubiMascot animation={setupReaction.animation} className="h-24 w-auto" decorative emotion={setupReaction.emotion} /><div><h2 className="font-bold">Latihan terhubung ke materi</h2><p className="mt-1 text-sm leading-6 text-white/75">Setiap jawaban disertai penjelasan dan rujukan halaman.</p></div></div></div><Card className="rounded-3xl p-5"><div className="flex items-center gap-2"><Users aria-hidden="true" className="size-4 text-teal"/><h2 className="font-bold text-navy">Sesi menunggu pemain</h2></div>{sessions.isError ? <p className="mt-3 text-sm text-destructive">{sessions.error.message}</p> : activeSessions.length ? <ul className="mt-3 space-y-2">{activeSessions.map((session) => <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/60 p-3" key={session.id}><div><p className="text-sm font-semibold">{session.mode === "duel" ? "Duel" : "Sesi kelompok"}{session.focusTopic ? ` · ${session.focusTopic}` : ""}</p><p className="text-xs text-muted-foreground">{session.players} pemain · {session.roundCount} ronde</p></div><Button disabled={join.isPending} onClick={() => join.mutate(session.id)} size="sm" variant="outline">Gabung</Button></li>)}</ul> : <p className="mt-3 text-sm leading-6 text-muted-foreground">Belum ada sesi bersama yang menunggu pemain.</p>}</Card><Card className="rounded-3xl p-5"><h2 className="font-bold text-navy">Buat kuis dari sumber</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Pilih latihan, kuis mingguan dengan papan skor, atau ujian dengan waktu server.</p><div className="mt-4"><QuizLauncher notebookId={notebookId} sources={sources.data}/></div></Card></div></div><section className="space-y-3 rounded-3xl border bg-card p-5 sm:p-6"><div className="flex items-center gap-2"><Trophy aria-hidden="true" className="size-4 text-teal"/><h2 className="font-bold text-navy">Latihan workspace</h2></div><QuizList notebookId={notebookId} role={notebook.data.role}/></section>{sessions.isError && <ErrorState message={sessions.error.message} onRetry={() => void sessions.refetch()}/>}</div>;
}

export function GameSessionPage() {
  const { notebookId = "", sessionId = "" } = useParams();
  const currentUser = useAuthMe();
  const queryClient = useQueryClient();
  const sessionQuery = useQuery({ queryKey: ["notebooks", notebookId, "sessions", sessionId], queryFn: () => api<GameSession>(`/notebooks/${notebookId}/sessions/${sessionId}`), enabled: Boolean(notebookId && sessionId), refetchInterval: (query) => { const state = query.state.data as GameSession | undefined; return state?.status === "waiting" || state?.status === "running" ? 2000 : false; } });
  const notebook = useQuery({ queryKey: ["notebooks", notebookId], queryFn: () => api<NotebookResponse>(`/notebooks/${notebookId}`) });
  const join = useMutation({ mutationFn: () => api<GameSession>(`/notebooks/${notebookId}/sessions/${sessionId}/join`, jsonBody("POST")), onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["notebooks", notebookId, "sessions", sessionId] }) });
  const start = useMutation({ mutationFn: () => api<GameSession>(`/notebooks/${notebookId}/sessions/${sessionId}/start`, jsonBody("POST")), onSuccess: (session) => queryClient.setQueryData(["notebooks", notebookId, "sessions", sessionId], session) });
  const [roundResult, setRoundResult] = useState<GameRoundResult | null>(null);
  const [activeRoundIndex, setActiveRoundIndex] = useState<number | null>(null);
  const [locallyAnsweredRounds, setLocallyAnsweredRounds] = useState<number[]>([]);
  const [finishResult, setFinishResult] = useState<GameFinish | null>(null);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerValue[]>([]);
  const [submitError, setSubmitError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const roundStartedAt = useRef(Date.now());
  const questionHeading = useRef<HTMLHeadingElement>(null);
  const [now, setNow] = useState(Date.now());
  const session = sessionQuery.data;
  const finish = useMutation({
    mutationFn: async () => {
      const previousStats = await queryClient.fetchQuery({ queryKey: ["me", "stats"], queryFn: () => api<UserStats>("/me/stats"), staleTime: 0 }).catch(() => undefined);
      const result = await api<GameFinish>(`/notebooks/${notebookId}/sessions/${sessionId}/finish`, jsonBody("POST"));
      return { result, previousStreak: previousStats?.streak };
    },
    onSuccess: async ({ result, previousStreak }) => {
      if (result.streak !== undefined && streakWasExtended(previousStreak, result.streak)) queueStreakCelebration(result.streak);
      setFinishResult(result);
      await queryClient.invalidateQueries({ queryKey: ["me", "stats"] });
    },
  });
  const roundAnswer = useMutation({
    mutationFn: ({ index, values, elapsedMs }: { index: number; values: AnswerValue[]; elapsedMs: number }) => api<GameRoundResult>(`/notebooks/${notebookId}/sessions/${sessionId}/rounds/${index}/answer`, jsonBody("POST", { answers: values, elapsedMs })),
    onSuccess: async (result) => {
      setLocallyAnsweredRounds((current) => current.includes(result.roundIndex) ? current : [...current, result.roundIndex]);
      setRoundResult(result);
      await queryClient.invalidateQueries({ queryKey: ["notebooks", notebookId, "sessions", sessionId] });
    },
    onError: async (error, variables) => {
      if (error instanceof ApiRequestError && error.status === 409) {
        try {
          const latestSession = await api<GameSession>(`/notebooks/${notebookId}/sessions/${sessionId}`);
          queryClient.setQueryData(["notebooks", notebookId, "sessions", sessionId], latestSession);
          if (latestSession.answeredRounds.includes(variables.index)) {
            setLocallyAnsweredRounds((current) => current.includes(variables.index) ? current : [...current, variables.index]);
            const completed = new Set([...latestSession.answeredRounds, ...locallyAnsweredRounds, variables.index]);
            const nextRound = latestSession.rounds.find((round) => !completed.has(round.index));
            setRoundResult(null);
            setSubmitError("");
            roundAnswer.reset();
            if (nextRound) setActiveRoundIndex(nextRound.index);
            else finish.mutate();
            return;
          }
        } catch {
          // Keep the submitted answer available when refreshing the session fails.
        }
      }
      setSubmitError(error.message);
    },
  });

  const resetRoundAnswer = roundAnswer.reset;
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  useEffect(() => {
    if (!session) return;
    setLocallyAnsweredRounds([]);
    setActiveRoundIndex(null);
    setRoundResult(null);
    setSubmitError("");
    resetRoundAnswer();
  }, [session?.id, resetRoundAnswer]);
  const completedRounds = Array.from(new Set([...(session?.answeredRounds ?? []), ...locallyAnsweredRounds]));
  const nextRoundIndex = session?.rounds.find((round) => !completedRounds.includes(round.index))?.index;
  const roundIndex = activeRoundIndex ?? nextRoundIndex;
  const round = roundIndex === undefined ? undefined : session?.rounds.find((item) => item.index === roundIndex);
  const questionIndex = round ? Math.min(activeQuestionIndex, Math.max(0, round.items.length - 1)) : 0;
  const currentItem = round?.items[questionIndex];
  const answeredQuestionCount = round?.items.filter((item, index) => isAnswerComplete(answers[index] ?? initialAnswer(item), item)).length ?? 0;
  const firstUnansweredQuestion = round?.items.findIndex((item, index) => !isAnswerComplete(answers[index] ?? initialAnswer(item), item)) ?? -1;
  useEffect(() => { if (session && activeRoundIndex === null && nextRoundIndex !== undefined) setActiveRoundIndex(nextRoundIndex); }, [session?.id, activeRoundIndex, nextRoundIndex]);
  useEffect(() => { questionHeading.current?.focus({ preventScroll: true }); }, [round?.index, questionIndex]);
  useEffect(() => { if (round && !roundResult) { setAnswers(round.items.map(initialAnswer)); setActiveQuestionIndex(0); roundStartedAt.current = Date.now(); } }, [round?.index, session?.id]);
  const elapsed = round ? Math.max(0, now - roundStartedAt.current) : 0;
  const remaining = round ? Math.max(0, round.timeLimitSec - Math.floor(elapsed / 1000)) : null;
  const participants = session?.participants ?? [];
  const isParticipant = Boolean(currentUser.data && participants.some((person) => person.userId === currentUser.data!.id));
  const isCreator = Boolean(currentUser.data && session?.hostId === currentUser.data.id);

  if (sessionQuery.isPending || notebook.isPending || currentUser.isPending) return <LoadingState label="Membuka sesi belajar…"/>;
  if (sessionQuery.isError) return <ErrorState message={sessionQuery.error.message} onRetry={() => void sessionQuery.refetch()}/>;
  if (notebook.isError) return <ErrorState message={notebook.error.message} onRetry={() => void notebook.refetch()}/>;
  if (!session || !notebook.data) return null;
  const sessionTitle = session.mode === "solo" ? "Latihan mandiri" : session.mode === "duel" ? "Duel belajar" : "Sesi kelompok";
  const greetingReaction = session.reactions.greeting ?? REACTION_FOR_EVENT.greeting;
  const sessionLink = `${window.location.origin}/game/${notebookId}/sessions/${sessionId}`;
  const copyLink = async () => {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(sessionLink);
      setCopyMessage("Tautan sesi berhasil disalin.");
    } catch {
      setCopyMessage(`Salin tautan ini secara manual: ${sessionLink}`);
    }
  };
  if (finishResult) return <SessionResults result={finishResult} notebookId={notebookId}/>;

  if (session.status === "waiting") return <div className="mx-auto max-w-3xl space-y-6">
    <PageTitle eyebrow={sessionTitle} title="Menunggu pemain" description={session.focusTopic ? `Fokus pemulihan: ${session.focusTopic}` : `${session.roundCount} ronde disiapkan dari materi workspace.`} action={<Button asChild variant="outline"><Link to={`/game/${notebookId}`}><ArrowLeft aria-hidden="true"/>Kembali</Link></Button>}/>
    <Card className="rounded-3xl p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-3"><BubiMascot animation={greetingReaction.animation} className="h-14 w-auto" decorative emotion={greetingReaction.emotion}/><p className="text-sm text-muted-foreground">Bubi menyapa sambil menunggu pemain bergabung.</p></div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold text-navy">Pemain ({participants.length}/{session.mode === "duel" ? 2 : 12})</h2>
        <div className="flex flex-wrap gap-2">
          {notebook.data.role === "owner" && <InviteWorkspaceDialog notebookId={notebookId} triggerLabel="Undang ke workspace"/>}
          <Button onClick={() => void copyLink()} size="sm" variant="outline">Salin tautan sesi</Button>
        </div>
      </div>
      {copyMessage && <p className="mt-3 break-all text-xs text-muted-foreground" role="status">{copyMessage}</p>}
      <ul className="mt-4 space-y-2">{participants.map((person) => <li className="flex items-center gap-3 rounded-xl bg-muted/60 p-3" key={person.userId}><span className="grid size-9 place-items-center rounded-full bg-secondary font-bold text-navy">{person.name.slice(0, 1).toUpperCase()}</span><span className="text-sm font-semibold">{person.name}{person.userId === currentUser.data?.id ? " · kamu" : ""}</span>{person.userId === session.hostId && <span className="ml-auto rounded-full bg-mint px-2.5 py-1 text-xs font-semibold text-navy">Host</span>}</li>)}</ul>
      <p className="mt-4 text-xs leading-5 text-muted-foreground">Tautan sesi hanya bisa dipakai anggota workspace yang sudah masuk. Duel dimulai saat dua pemain siap; sesi kelompok dapat menampung hingga 12 pemain.</p>
      {isCreator ? <Button className="mt-5 w-full" disabled={start.isPending || participants.length < 2} onClick={() => start.mutate()}>{start.isPending ? <BubiLoading label="Bubi sedang memulai sesi…" variant="compact"/> : participants.length < 2 ? "Menunggu satu pemain lagi" : "Mulai sesi"}</Button> : <Button className="mt-5 w-full" disabled={join.isPending || isParticipant}>{isParticipant ? "Kamu sudah bergabung" : join.isPending ? <BubiLoading label="Bubi sedang menghubungkan sesi…" variant="compact"/> : "Gabung sesi"}</Button>}
      {start.isError && <p className="mt-2 text-sm text-destructive" role="alert">{start.error.message}</p>}{join.isError && <p className="mt-2 text-sm text-destructive" role="alert">{join.error.message}</p>}
    </Card>
  </div>;

  if (!isParticipant) return <div className="mx-auto max-w-xl space-y-4"><ErrorState message="Sesi sudah berjalan. Gabung lewat ruang game workspace saat sesi masih menunggu pemain."/><Button asChild><Link to={`/game/${notebookId}`}>Kembali ke game</Link></Button></div>;
  if (roundResult) return <div className="mx-auto max-w-4xl space-y-5"><PageTitle eyebrow={`Ronde ${roundResult.roundIndex + 1} dari ${session.roundCount}`} title={`${roundResult.correctCount} dari ${roundResult.total} benar`} description="Tinjau jawaban, nilai parsial, dan sumber sebelum lanjut."/><RoundResults notebookId={notebookId} result={roundResult} round={session.rounds.find((candidate) => candidate.index === roundResult.roundIndex)}/><div className="flex flex-wrap justify-end gap-3">{nextRoundIndex === undefined ? <Button aria-busy={finish.isPending} disabled={finish.isPending} onClick={() => finish.mutate()}>{finish.isPending ? <><BubiMascot {...REACTION_FOR_EVENT.waiting_for_ai} className="h-7 w-auto" decorative/>Menyiapkan hasil sesi…</> : <>Lihat hasil sesi<ArrowRight aria-hidden="true"/></>}</Button> : <Button onClick={() => { roundAnswer.reset(); setSubmitError(""); setRoundResult(null); setActiveRoundIndex(nextRoundIndex); }}>{`Lanjut ronde ${nextRoundIndex + 1}`}<ArrowRight aria-hidden="true"/></Button>}</div>{finish.isError && <ErrorState message={finish.error.message}/>}</div>;
  if (!round) return <div className="mx-auto max-w-3xl space-y-4"><LoadingState label="Menyiapkan ronde berikutnya…"/><Button aria-busy={finish.isPending} onClick={() => finish.mutate()} disabled={finish.isPending}>{finish.isPending ? <BubiLoading label="Bubi sedang menyiapkan hasil…" variant="compact"/> : "Selesaikan sesi sekarang"}</Button>{finish.isError && <ErrorState message={finish.error.message}/>}</div>;

  if (!currentItem) return <LoadingState label="Menyiapkan soal ronde…"/>;
  const roundModeLabel = session.mode === "solo" ? "Latihan mandiri" : session.mode === "duel" ? "Duel" : "Kelompok";
  const sessionProgress = Math.min(100, ((completedRounds.length + (questionIndex + 1) / round.items.length) / session.roundCount) * 100);
  return <div className={`mx-auto space-y-5 rounded-3xl bg-navy p-4 text-white sm:p-6 lg:p-8 ${session.mode === "solo" ? "max-w-4xl" : "max-w-6xl"}`}>
    <header className="flex flex-wrap items-center justify-between gap-4">
      <Link className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-white/75 transition-colors hover:text-white" to={`/game/${notebookId}`}><ArrowLeft aria-hidden="true" className="size-4"/>Keluar dari ronde</Link>
      <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-white/85">
        <span className="rounded-full bg-white/10 px-3 py-2">{roundModeLabel}</span>
        <span>Ronde {round.index + 1} dari {session.roundCount}</span>
        {remaining !== null ? <span aria-live="polite" className={remaining < 20 ? "inline-flex items-center gap-2 rounded-full bg-coral/15 px-3 py-2 text-coral" : "inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2"}><Clock3 aria-hidden="true" className="size-4"/>{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}</span> : <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2"><Clock3 aria-hidden="true" className="size-4"/>Santai</span>}
      </div>
    </header>
    <div aria-label={`Progres sesi ${Math.round(sessionProgress)} persen`} className="h-2 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-mint transition-[width] duration-300" style={{ width: `${sessionProgress}%` }}/></div>
    <div className={session.mode === "solo" ? "" : "grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_17rem]"}>
      <section className="min-w-0 rounded-3xl border border-white/20 bg-card p-4 text-foreground sm:p-7" aria-labelledby="game-question">
        <div className="flex items-center gap-3 rounded-2xl bg-secondary/55 p-3 sm:p-4">
          <BubiMascot animationKey={`${round.index}:${roundAnswer.isPending ? "waiting" : "intro"}`} animation={roundAnswer.isPending ? REACTION_FOR_EVENT.waiting_for_ai.animation : round.cue.introAnimation} className="h-14 w-auto shrink-0" decorative emotion={roundAnswer.isPending ? REACTION_FOR_EVENT.waiting_for_ai.emotion : round.cue.introEmotion}/>
          <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{gameNames[round.type]}{round.topic ? ` · ${round.topic}` : ""}</p><p className="mt-1 font-semibold leading-6 text-navy" aria-live="polite">{round.cue.intro}</p></div>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Soal {questionIndex + 1} dari {round.items.length}</p>
          <p className="text-xs font-medium text-muted-foreground">{answeredQuestionCount} dari {round.items.length} dijawab</p>
        </div>
        <div aria-label={`Progres soal ${answeredQuestionCount} dari ${round.items.length} dijawab`} className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-teal transition-[width] duration-300" style={{ width: `${(answeredQuestionCount / round.items.length) * 100}%` }}/></div>
        {round.items.length > 1 && <nav aria-label="Pilih soal ronde ini" className="mt-4 flex flex-wrap gap-2">{round.items.map((item, index) => {
          const isAnswered = isAnswerComplete(answers[index] ?? initialAnswer(item), item);
          return <Button aria-current={questionIndex === index ? "step" : undefined} aria-label={`Buka soal ${index + 1}, ${isAnswered ? "sudah dijawab" : "belum dijawab"}`} className="min-h-11 min-w-11" disabled={roundAnswer.isPending} key={`${round.index}-${index}`} onClick={() => { setSubmitError(""); setActiveQuestionIndex(index); }} size="sm" variant={questionIndex === index ? "default" : isAnswered ? "secondary" : "outline"}>{isAnswered && questionIndex !== index && <Check aria-hidden="true"/>}{index + 1}</Button>;
        })}</nav>}
        <article className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-2 motion-safe:duration-200 mt-4 rounded-2xl bg-muted/55 p-4 sm:p-6" key={`${round.index}-${questionIndex}`}>
          <h1 className="text-lg font-bold leading-7 text-navy outline-none sm:text-2xl sm:leading-9" id="game-question" ref={questionHeading} tabIndex={-1}>{currentItem.prompt}</h1>
          <ItemAnswer disabled={roundAnswer.isPending} index={questionIndex} item={currentItem} onChange={(answer) => { setSubmitError(""); setAnswers((current) => { const next = [...current]; next[questionIndex] = answer; return next; }); }} value={answers[questionIndex] ?? initialAnswer(currentItem)}/>
        </article>
        {submitError && <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">{submitError}</p>}
        {roundAnswer.isError && <div className="mt-4"><ErrorState message={roundAnswer.error.message}/></div>}
        <footer className="mt-5 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-muted-foreground">{currentItem.type === "match" ? currentItem.scoring === "proportional" ? "Pasangkan sebanyak mungkin. Poin dihitung per pasangan yang tepat; pasangan kosong bernilai 0." : "Lengkapi semua pasangan; item sesi lama dinilai benar jika seluruh pasangan tepat." : participants.length > 1 ? `${participants.length} pemain · skor ronde diperbarui setelah jawaban diperiksa.` : "Jawaban diperiksa server berdasarkan sumber workspace."}</p>
          <div className="flex justify-between gap-2 sm:justify-end">
            <Button disabled={questionIndex === 0 || roundAnswer.isPending} onClick={() => { setSubmitError(""); setActiveQuestionIndex((index) => Math.max(0, index - 1)); }} variant="outline"><ArrowLeft aria-hidden="true"/>Sebelumnya</Button>
            {questionIndex < round.items.length - 1 ? <Button disabled={roundAnswer.isPending} onClick={() => { setSubmitError(""); setActiveQuestionIndex((index) => Math.min(round.items.length - 1, index + 1)); }}>Soal berikutnya<ArrowRight aria-hidden="true"/></Button> : <Button aria-busy={roundAnswer.isPending} disabled={roundAnswer.isPending} onClick={() => {
              setSubmitError("");
              if (firstUnansweredQuestion >= 0) {
                setActiveQuestionIndex(firstUnansweredQuestion);
                const unanswered = round.items[firstUnansweredQuestion];
                setSubmitError(unanswered?.type === "match"
                  ? unanswered.scoring === "proportional"
                    ? `Pilih setidaknya satu pasangan pada soal ${firstUnansweredQuestion + 1}. Pasangan yang dikosongkan bernilai 0.`
                    : `Lengkapi semua pasangan pada soal ${firstUnansweredQuestion + 1}.`
                  : `Soal ${firstUnansweredQuestion + 1} belum dijawab. Lengkapi dulu sebelum mengirim ronde.`);
                return;
              }
              const submittedAnswers = round.items.map((item, index) => answers[index] ?? initialAnswer(item));
              roundAnswer.mutate({ index: round.index, values: submittedAnswers, elapsedMs: Date.now() - roundStartedAt.current });
            }}>{roundAnswer.isPending ? <BubiLoading label="Bubi sedang memeriksa jawaban…" variant="compact"/> : <><Check aria-hidden="true"/>{round.items.length > 1 ? "Kirim jawaban ronde" : "Kirim jawaban"}</>}</Button>}
          </div>
        </footer>
      </section>
      {session.mode !== "solo" && <aside className="rounded-3xl border border-white/20 bg-card p-4 text-foreground sm:p-5" aria-label="Papan skor langsung">
        <div className="flex items-center gap-2"><Trophy aria-hidden="true" className="size-4 text-warning-foreground"/><h2 className="text-sm font-bold text-navy">Papan skor</h2></div>
        <p className="mt-1 text-xs text-muted-foreground">Pembaruan dari sesi server</p>
        <ol className="mt-4 space-y-2">{[...participants].sort((a, b) => b.score - a.score).map((player, index) => <li className={`flex items-center gap-3 rounded-xl p-3 ${player.userId === currentUser.data?.id ? "bg-secondary/70" : "bg-muted/60"}`} key={player.userId}><span className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-xs font-extrabold text-navy">{index + 1}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{player.name}{player.userId === currentUser.data?.id ? " · kamu" : ""}</span><span className="text-xs text-muted-foreground">{player.roundsAnswered} ronde selesai</span></span><span className="text-sm font-bold text-navy">{player.score}</span></li>)}</ol>
      </aside>}
    </div>
  </div>;
}
