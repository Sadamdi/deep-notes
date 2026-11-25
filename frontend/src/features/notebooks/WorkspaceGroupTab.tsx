import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SelectedPreviewTarget } from "@/features/notebooks/types";
import { api } from "@/lib/api";

type Props = {
  notebookId: string;
  isSample: boolean;
  isOwner: boolean;
  onJumpToCitation: (target: SelectedPreviewTarget) => void;
};

type ContributionsResponse = {
  members: Array<{
    userId: string;
    name: string;
    role: string;
    sourcesAdded: number;
    questionsAsked: number;
    quizzesTaken: number;
    assignmentsDone: number;
  }>;
};

type GapsResponse = {
  gaps: Array<{
    topic: string;
    answered: number;
    missed: number;
    missRatePercent: number;
    membersMissed: number;
    reviewPages: Array<{ sourceId: string; sourceTitle: string; page: number | null }>;
  }>;
};

type AssignmentsResponse = {
  items: Array<{
    id: string;
    topic: string;
    status: "todo" | "doing" | "done";
    assigneeId: string;
    assigneeName: string;
    sourceTitle: string | null;
  }>;
};

const NEXT_STATUS: Record<"todo" | "doing" | "done", "todo" | "doing" | "done"> = {
  todo: "doing",
  doing: "done",
  done: "todo",
};

const STATUS_DISPLAY: Record<"todo" | "doing" | "done", string> = {
  todo: "Belum dimulai",
  doing: "Dikerjakan",
  done: "Selesai",
};

/** Implements Figma frame 175:2179 (M Papan kelompok: kontribusi, progres, celah, tugas) + member invites. */
export function WorkspaceGroupTab({ notebookId, isSample, isOwner, onJumpToCitation }: Props) {
  const queryClient = useQueryClient();
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [memberEmail, setMemberEmail] = useState("");
  const [assignTopic, setAssignTopic] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [groupNotice, setGroupNotice] = useState<{ tone: "error" | "info"; text: string } | null>(null);

  const contribQuery = useQuery({
    queryKey: ["notebook-contributions", notebookId],
    queryFn: async () => {
      if (isSample) {
        return {
          members: [
            {
              userId: "u1",
              name: "Contoh Anggota A",
              role: "owner",
              sourcesAdded: 2,
              questionsAsked: 5,
              quizzesTaken: 2,
              assignmentsDone: 1,
            },
            {
              userId: "u2",
              name: "Contoh Anggota B",
              role: "editor",
              sourcesAdded: 1,
              questionsAsked: 3,
              quizzesTaken: 1,
              assignmentsDone: 0,
            },
          ],
        } satisfies ContributionsResponse;
      }
      return api<ContributionsResponse>(`/notebooks/${notebookId}/contributions`);
    },
  });

  const gapsQuery = useQuery({
    queryKey: ["notebook-gaps", notebookId],
    queryFn: async () => {
      if (isSample) {
        return {
          gaps: [
            {
              topic: "Ketahanan topologi bintang (contoh)",
              answered: 4,
              missed: 2,
              missRatePercent: 50,
              membersMissed: 2,
              reviewPages: [{ sourceId: "s1", sourceTitle: "Bab 1 Topologi.pdf (contoh)", page: 3 }],
            },
          ],
        } satisfies GapsResponse;
      }
      return api<GapsResponse>(`/notebooks/${notebookId}/gaps`);
    },
  });

  const assignmentsQuery = useQuery({
    queryKey: ["notebook-assignments", notebookId],
    queryFn: async () => {
      if (isSample) {
        return {
          items: [
            {
              id: "a1",
              topic: "Bab 1 Topologi Bintang (contoh)",
              status: "done",
              assigneeId: "u1",
              assigneeName: "Contoh Anggota A",
              sourceTitle: "Bab 1 Topologi.pdf",
            },
          ],
        } satisfies AssignmentsResponse;
      }
      return api<AssignmentsResponse>(`/notebooks/${notebookId}/assignments`);
    },
  });

  const createInviteMutation = useMutation({
    mutationFn: () =>
      api<{ token: string }>(`/notebooks/${notebookId}/invites`, {
        method: "POST",
        body: JSON.stringify({ role: "editor", expiresInDays: 7, maxUses: 20 }),
      }),
    onSuccess: (data) => {
      const url = `${window.location.origin}/join/${data.token}`;
      setInviteLink(url);
      setGroupNotice({ tone: "info", text: "Tautan undangan siap dibagikan ke teman sekelompok." });
    },
    onError: (err) => {
      setGroupNotice({ tone: "error", text: err instanceof Error ? err.message : "Gagal membuat tautan undangan." });
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: () =>
      api(`/notebooks/${notebookId}/members`, {
        method: "POST",
        body: JSON.stringify({ email: memberEmail.trim(), role: "editor" }),
      }),
    onSuccess: async () => {
      setMemberEmail("");
      setGroupNotice({ tone: "info", text: "Anggota berhasil ditambahkan ke workspace." });
      await queryClient.invalidateQueries({ queryKey: ["notebook-contributions", notebookId] });
    },
    onError: (err) => {
      setGroupNotice({ tone: "error", text: err instanceof Error ? err.message : "Gagal menambahkan anggota." });
    },
  });

  const createAssignmentMutation = useMutation({
    mutationFn: (targetUserId: string) =>
      api(`/notebooks/${notebookId}/assignments`, {
        method: "POST",
        body: JSON.stringify({ assigneeId: targetUserId, topic: assignTopic.trim() }),
      }),
    onSuccess: async () => {
      setAssignTopic("");
      await queryClient.invalidateQueries({ queryKey: ["notebook-assignments", notebookId] });
    },
    onError: (err) => {
      setGroupNotice({ tone: "error", text: err instanceof Error ? err.message : "Gagal menambahkan tugas belajar." });
    },
  });

  const cycleAssignmentMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "todo" | "doing" | "done" }) =>
      api(`/notebooks/${notebookId}/assignments/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notebook-assignments", notebookId] });
      await queryClient.invalidateQueries({ queryKey: ["notebook-contributions", notebookId] });
    },
  });

  const members = contribQuery.data?.members ?? [];
  const maxTotal = Math.max(
    1,
    ...members.map((m) => m.sourcesAdded + m.questionsAsked + m.quizzesTaken + m.assignmentsDone),
  );

  const handleAddMember = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!memberEmail.includes("@")) {
      setGroupNotice({ tone: "error", text: "Masukkan email anggota yang terdaftar." });
      return;
    }
    addMemberMutation.mutate();
  };

  const handleAddAssignment = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const targetUser = assigneeId || members[0]?.userId;
    if (!targetUser || assignTopic.trim().length < 2) {
      setGroupNotice({ tone: "error", text: "Pilih anggota dan isi topik tugas minimal 2 karakter." });
      return;
    }
    createAssignmentMutation.mutate(targetUser);
  };

  return (
    <div className="space-y-6">
      {groupNotice && (
        <p
          role={groupNotice.tone === "error" ? "alert" : "status"}
          className={
            groupNotice.tone === "error"
              ? "rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs font-bold text-destructive"
              : "rounded-xl bg-secondary p-3 text-xs font-bold text-secondary-foreground"
          }
        >
          {groupNotice.text}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Member contributions card (F-06) */}
        <Card className="lg:col-span-6">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Kontribusi anggota</CardTitle>
            <CardDescription>Rekam kontribusi nyata setiap anggota pada sumber, pertanyaan, dan kuis.</CardDescription>
          </CardHeader>
          <CardContent>
            {contribQuery.isPending ? (
              <p className="text-sm text-muted-foreground">Memuat kontribusi kelompok...</p>
            ) : members.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada data anggota.</p>
            ) : (
              <ul className="space-y-4">
                {members.map((m) => {
                  const total = m.sourcesAdded + m.questionsAsked + m.quizzesTaken + m.assignmentsDone;
                  const pct = Math.max(8, Math.round((total / maxTotal) * 100));
                  const initials = m.name
                    .split(" ")
                    .map((p) => p[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();
                  return (
                    <li key={m.userId} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span
                            aria-hidden="true"
                            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground"
                          >
                            {initials}
                          </span>
                          <div>
                            <p className="text-sm font-bold text-card-foreground">
                              {m.name} <span className="text-xs font-normal text-muted-foreground">({m.role})</span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {m.sourcesAdded} sumber · {m.questionsAsked} tanya · {m.quizzesTaken} kuis
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-foreground">{total} aksi</span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary/50" aria-hidden="true">
                        <div className="h-full rounded-full bg-brand-teal" style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Knowledge gap map card (F-16) */}
        <Card className="lg:col-span-6">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Peta celah pengetahuan</CardTitle>
            <CardDescription>Topik kuis yang paling sering meleset beserta rujukan halaman sumber.</CardDescription>
          </CardHeader>
          <CardContent>
            {gapsQuery.isPending ? (
              <p className="text-sm text-muted-foreground">Memeriksa hasil latihan kelompok...</p>
            ) : !gapsQuery.data || gapsQuery.data.gaps.length === 0 ? (
              <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
                Belum ada celah topik yang tercatat. Kerjakan kuis latihan untuk memetakan bagian materi yang perlu
                diulang.
              </p>
            ) : (
              <ul className="space-y-4">
                {gapsQuery.data.gaps.map((gap) => {
                  const firstRef = gap.reviewPages[0];
                  return (
                    <li key={gap.topic} className="space-y-2 rounded-xl bg-muted p-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-foreground">{gap.topic}</p>
                          <p className="text-xs text-muted-foreground">
                            Meleset {gap.missed} dari {gap.answered} jawaban ({gap.missRatePercent}%)
                          </p>
                        </div>
                        {firstRef && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              onJumpToCitation({
                                sourceId: firstRef.sourceId,
                                sourceTitle: firstRef.sourceTitle,
                                page: firstRef.page ?? 1,
                              })
                            }
                          >
                            Baca halaman {firstRef.page ?? 1}
                          </Button>
                        )}
                      </div>
                      <div className="h-3 w-full overflow-hidden rounded-full bg-secondary/60" aria-hidden="true">
                        <div
                          className="h-full rounded-full bg-destructive"
                          style={{ width: `${Math.max(10, gap.missRatePercent)}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Study assignments per member (F-17) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold">Tugas belajar per anggota</CardTitle>
          <CardDescription>Bagi bab atau subtopik ke anggota kelompok dan pantau statusnya bersama.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {assignmentsQuery.data && assignmentsQuery.data.items.length > 0 ? (
            <ul className="space-y-2.5">
              {assignmentsQuery.data.items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-bold text-foreground">{item.topic}</p>
                    <p className="text-xs text-muted-foreground">Penanggung jawab: {item.assigneeName}</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={item.status === "done" ? "secondary" : "outline"}
                    disabled={isSample || cycleAssignmentMutation.isPending}
                    onClick={() =>
                      cycleAssignmentMutation.mutate({
                        id: item.id,
                        status: NEXT_STATUS[item.status],
                      })
                    }
                  >
                    {STATUS_DISPLAY[item.status]}
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Belum ada pembagian tugas bab untuk kelompok ini.</p>
          )}

          {!isSample && isOwner && members.length > 0 && (
            <form onSubmit={handleAddAssignment} className="grid gap-3 border-t border-border pt-4 sm:grid-cols-12">
              <div className="space-y-1.5 sm:col-span-5">
                <Label htmlFor="assign-topic" className="text-xs font-bold">
                  Topik atau bab tugas
                </Label>
                <Input
                  id="assign-topic"
                  value={assignTopic}
                  onChange={(e) => setAssignTopic(e.target.value)}
                  placeholder="Contoh: Bab 3 Protokol TCP/UDP"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-4">
                <Label htmlFor="assign-member" className="text-xs font-bold">
                  Anggota
                </Label>
                <select
                  id="assign-member"
                  value={assigneeId || members[0]?.userId || ""}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="min-h-11 w-full rounded-lg border border-input bg-card px-3 text-sm text-card-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end sm:col-span-3">
                <Button type="submit" className="w-full" disabled={createAssignmentMutation.isPending}>
                  Tambah Tugas
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Invites and adding members (F-02) */}
      {!isSample && isOwner && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold">Undang teman sekelompok</CardTitle>
            <CardDescription>Bagikan tautan undangan atau tambahkan langsung melalui email terdaftar.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3 rounded-xl bg-muted p-4">
              <p className="text-sm font-bold text-foreground">Tautan undangan 7 hari</p>
              <Button
                type="button"
                variant="secondary"
                disabled={createInviteMutation.isPending}
                onClick={() => createInviteMutation.mutate()}
              >
                {createInviteMutation.isPending ? "Membuat tautan..." : "Buat Tautan Undangan"}
              </Button>
              {inviteLink && (
                <div className="space-y-2 pt-1">
                  <Input readOnly value={inviteLink} aria-label="Tautan undangan workspace" />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      void navigator.clipboard?.writeText(inviteLink);
                      setGroupNotice({ tone: "info", text: "Tautan undangan disalin ke papan klip." });
                    }}
                  >
                    Salin Tautan
                  </Button>
                </div>
              )}
            </div>

            <form onSubmit={handleAddMember} className="space-y-3 rounded-xl bg-muted p-4">
              <Label htmlFor="invite-member-email" className="text-sm font-bold">
                Tambah anggota lewat email
              </Label>
              <Input
                id="invite-member-email"
                type="email"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                placeholder="teman@example.com"
              />
              <Button type="submit" disabled={addMemberMutation.isPending}>
                {addMemberMutation.isPending ? "Menambahkan..." : "Tambah ke Workspace"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
