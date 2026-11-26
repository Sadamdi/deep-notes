import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { ArrowRight, Clock3, Trophy, Trash2 } from "lucide-react";
import type { NotebookRole, QuizListItem, QuizScoreboard } from "@deep-notes/shared";
import { AppDialog } from "@/components/shared/AppDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/PageStates";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuthMe } from "@/features/auth/useAuth";
import { api } from "@/lib/api";

const kindNames = { practice: "Latihan bebas", weekly: "Kuis mingguan", exam: "Ujian" } as const;

export function QuizScoreboardDialog({ notebookId, quizId }: { notebookId: string; quizId: string }) {
  const [open, setOpen] = useState(false);
  const board = useQuery({ queryKey: ["notebooks", notebookId, "quizzes", quizId, "scoreboard"], queryFn: () => api<QuizScoreboard>(`/notebooks/${notebookId}/quizzes/${quizId}/scoreboard`), enabled: open });
  return <AppDialog description="Peringkat berdasarkan nilai terbaik dan durasi pengerjaan." onOpenChange={setOpen} open={open} title="Papan skor" trigger={<Button onClick={() => setOpen(true)} size="sm" variant="outline"><Trophy aria-hidden="true"/>Papan skor</Button>}>
    {board.isPending ? <LoadingState label="Memuat peringkat…"/> : board.isError ? <ErrorState message={board.error.message} onRetry={() => void board.refetch()}/> : <div className="space-y-4"><ol className="space-y-2">{board.data.ranking.map((entry) => <li className="flex items-center justify-between gap-3 rounded-xl bg-muted/60 p-3" key={entry.userId}><span className="min-w-0"><strong className="mr-2">#{entry.rank}</strong>{entry.name}</span><span className="shrink-0 text-sm font-semibold">{entry.score}/{entry.total}</span></li>)}</ol>{board.data.ranking.length === 0 && <p className="rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">Belum ada hasil.</p>}{board.data.notYetTaken.length > 0 && <section><h3 className="text-sm font-semibold text-navy">Belum mengerjakan ({board.data.notYetTaken.length})</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{board.data.notYetTaken.map((person) => person.name).join(", ")}</p></section>}</div>}
  </AppDialog>;
}

export function QuizList({ notebookId, role }: { notebookId: string; role: NotebookRole }) {
  const navigate = useNavigate();
  const currentUser = useAuthMe();
  const queryClient = useQueryClient();
  const quizzes = useQuery({ queryKey: ["notebooks", notebookId, "quizzes"], queryFn: () => api<QuizListItem[]>(`/notebooks/${notebookId}/quizzes`) });
  const remove = useMutation({
    mutationFn: (quizId: string) => api<{ deleted: true }>(`/notebooks/${notebookId}/quizzes/${quizId}`, { method: "DELETE" }),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["notebooks", notebookId, "quizzes"] }),
  });
  if (quizzes.isPending) return <LoadingState label="Memuat latihan workspace…"/>;
  if (quizzes.isError) return <ErrorState message={quizzes.error.message} onRetry={() => void quizzes.refetch()}/>;
  if (quizzes.data.length === 0) return <EmptyState title="Belum ada latihan" description="Buat kuis dari sumber workspace. Hasil setiap soal akan terhubung ke halaman materi."/>;
  return <div className="space-y-3">{quizzes.data.map((quiz) => {
    const canDelete = role === "owner" || quiz.createdBy === currentUser.data?.id;
    const closed = quiz.kind === "weekly" && quiz.dueAt !== null && Date.parse(quiz.dueAt) < Date.now();
    const alreadyTaken = quiz.kind === "weekly" && quiz.myAttempts > 0;
    return <Card className="flex flex-col gap-4 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between" key={quiz.id}><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-secondary px-3 py-1 text-[11px] font-semibold text-navy">{kindNames[quiz.kind]}</span>{quiz.kind === "exam" && quiz.timeLimitSec && <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"><Clock3 aria-hidden="true" className="size-3"/>{Math.round(quiz.timeLimitSec / 60)} menit</span>}</div><h3 className="mt-2 truncate font-bold text-navy">{quiz.title}</h3><p className="mt-1 text-xs text-muted-foreground">{quiz.questionCount} soal · dibuat {new Date(quiz.createdAt).toLocaleDateString("id-ID")}{quiz.dueAt ? ` · batas ${new Date(quiz.dueAt).toLocaleDateString("id-ID")}` : ""}</p><p className="mt-1 text-xs text-muted-foreground">{quiz.myAttempts ? `${quiz.myAttempts} kali dikerjakan · nilai terbaik ${quiz.myBest ?? 0}/${quiz.questionCount}` : "Belum pernah kamu kerjakan"}</p></div><div className="flex flex-wrap items-center gap-2">{quiz.kind !== "practice" && <QuizScoreboardDialog notebookId={notebookId} quizId={quiz.id}/>}<Button disabled={closed || alreadyTaken} onClick={() => navigate(`/game/${notebookId}/quizzes/${quiz.id}`)} size="sm">{closed ? "Sudah ditutup" : alreadyTaken ? "Sudah dikerjakan" : quiz.kind === "exam" ? "Mulai ujian" : quiz.myAttempts ? "Ulangi latihan" : "Mulai"}<ArrowRight aria-hidden="true"/></Button>{canDelete && <Button aria-label={`Hapus ${quiz.title}`} disabled={remove.isPending} onClick={() => { if (window.confirm(`Hapus “${quiz.title}”? Hasil percobaan terkait juga akan hilang.`)) remove.mutate(quiz.id); }} size="icon-sm" variant="ghost"><Trash2 aria-hidden="true" className="size-4"/></Button>}</div></Card>;
  })}{remove.isError && <ErrorState message={remove.error.message}/>}</div>;
}
