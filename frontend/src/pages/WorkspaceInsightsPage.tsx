import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ClipboardList, Copy, Link2, Plus, UserPlus } from "lucide-react";
import { useParams } from "react-router";
import type { AssignmentList, GroupContributions, GroupProgress, KnowledgeGaps, NotebookMember, NotebookResponse, SourceResponse } from "@deep-notes/shared";
import { addMemberSchema, createAssignmentSchema, createInviteSchema } from "@deep-notes/shared";
import { AppDialog } from "@/components/shared/AppDialog";
import { EmptyState, ErrorState, LoadingState, PageTitle } from "@/components/shared/PageStates";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SourcePageDialog } from "@/features/sources/SourcePageDialog";
import { api, jsonBody } from "@/lib/api";

type Tab = "activity" | "progress" | "gaps" | "assignments" | "members";
const tabLabels: Record<Tab, string> = { activity: "Kontribusi", progress: "Progres", gaps: "Celah materi", assignments: "Tugas", members: "Anggota" };

function useGroupData(notebookId: string) {
  const notebook = useQuery({ queryKey: ["notebooks", notebookId], queryFn: () => api<NotebookResponse>(`/notebooks/${notebookId}`) });
  const contributions = useQuery({ queryKey: ["notebooks", notebookId, "contributions"], queryFn: () => api<GroupContributions>(`/notebooks/${notebookId}/contributions`) });
  const progress = useQuery({ queryKey: ["notebooks", notebookId, "progress"], queryFn: () => api<GroupProgress>(`/notebooks/${notebookId}/progress`) });
  const gaps = useQuery({ queryKey: ["notebooks", notebookId, "gaps"], queryFn: () => api<KnowledgeGaps>(`/notebooks/${notebookId}/gaps`) });
  const assignments = useQuery({ queryKey: ["notebooks", notebookId, "assignments"], queryFn: () => api<AssignmentList>(`/notebooks/${notebookId}/assignments`) });
  const members = useQuery({ queryKey: ["notebooks", notebookId, "members"], queryFn: () => api<NotebookMember[]>(`/notebooks/${notebookId}/members`) });
  const sources = useQuery({ queryKey: ["notebooks", notebookId, "sources"], queryFn: () => api<SourceResponse[]>(`/notebooks/${notebookId}/sources`) });
  return { notebook, contributions, progress, gaps, assignments, members, sources };
}

function Metric({ value, label }: { value: string | number; label: string }) {
  return <div className="rounded-2xl bg-muted/70 p-4"><p className="text-2xl font-bold text-navy">{value}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></div>;
}

function ContributionPanel({ data }: { data: GroupContributions }) {
  return <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{data.members.map((member) => <Card className="rounded-2xl p-4" key={member.userId}><div className="flex items-center justify-between gap-2"><p className="truncate font-semibold text-navy">{member.name}</p><span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-semibold capitalize">{member.role}</span></div><div className="mt-4 grid grid-cols-2 gap-2"><Metric value={member.sourcesAdded} label="Sumber ditambah"/><Metric value={member.questionsAsked} label="Pertanyaan"/><Metric value={member.quizzesTaken} label="Kuis"/><Metric value={member.assignmentsDone} label="Tugas selesai"/></div><p className="mt-3 text-xs text-muted-foreground">Aktif terakhir: {member.lastActiveAt ? new Date(member.lastActiveAt).toLocaleDateString("id-ID") : "Belum ada aktivitas"}</p></Card>)}</div><section className="rounded-3xl border bg-card p-5"><h2 className="font-bold text-navy">Aktivitas terbaru</h2>{data.recent.length ? <ol className="mt-4 divide-y">{data.recent.map((item, index) => <li className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm" key={`${item.userId}-${item.at}-${index}`}><span><strong>{item.userName}</strong> · {activityLabel(item.type)}</span><time className="text-xs text-muted-foreground" dateTime={item.at}>{new Date(item.at).toLocaleString("id-ID")}</time></li>)}</ol> : <p className="mt-3 text-sm text-muted-foreground">Aktivitas kelompok akan tampil setelah ada sumber, pertanyaan, kuis, atau tugas.</p>}</section></div>;
}

function activityLabel(type: string) {
  if (type === "source_added") return "menambahkan sumber";
  if (type === "question_asked") return "bertanya kepada asisten";
  if (type === "quiz_taken") return "menyelesaikan latihan";
  if (type === "assignment_done") return "menyelesaikan tugas";
  return "beraktivitas di workspace";
}

function ProgressPanel({ data }: { data: GroupProgress }) {
  return <div className="space-y-4"><section className="grid gap-3 sm:grid-cols-3"><Metric value={data.group.attempts} label="Percobaan kuis kelompok"/><Metric value={data.group.averagePercent === null ? "—" : `${data.group.averagePercent}%`} label="Rata-rata kelompok"/><Metric value={data.members.filter((member) => member.attempts > 0).length} label="Anggota yang sudah berlatih"/></section><section className="rounded-3xl border bg-card p-5"><h2 className="font-bold text-navy">Progres per anggota</h2><div className="mt-4 space-y-4">{data.members.map((member) => <div className="space-y-2" key={member.userId}><div className="flex flex-wrap justify-between gap-2 text-sm"><span className="font-semibold">{member.name}</span><span className="text-muted-foreground">{member.attempts ? `${member.averagePercent}% rata-rata · terbaik ${member.bestPercent}% · ${member.attempts} percobaan` : "Belum ada percobaan"}</span></div><div aria-label={member.averagePercent === null ? `${member.name}, belum ada data` : `${member.name}, rata-rata ${member.averagePercent}%`} className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${member.averagePercent ?? 0}%` }}/></div></div>)}</div><p className="mt-5 text-xs leading-5 text-muted-foreground">Nilai dihitung dari percobaan kuis yang tercatat. Rata-rata bisa berubah seiring bertambahnya latihan.</p></section></div>;
}

function GapsPanel({ data, notebookId }: { data: KnowledgeGaps; notebookId: string }) {
  if (!data.gaps.length) return <EmptyState title="Belum ada celah yang terdeteksi" description="Selesaikan kuis terlebih dahulu. Topik yang perlu ditinjau muncul berdasarkan jawaban yang keliru."/>;
  return <div className="grid gap-3 lg:grid-cols-2">{data.gaps.map((gap) => <Card className="rounded-3xl p-5" key={gap.topic}><div className="flex items-start justify-between gap-3"><div><h2 className="font-bold text-navy">{gap.topic}</h2><p className="mt-1 text-xs text-muted-foreground">{gap.membersMissed} anggota · {gap.missed} dari {gap.answered} jawaban keliru</p></div><span className="rounded-full bg-coral/20 px-3 py-1.5 text-sm font-bold text-navy">{gap.missRatePercent}%</span></div><div className="mt-4 space-y-2">{gap.reviewPages.map((ref, index) => <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/60 p-3 text-xs" key={`${ref.sourceId}-${ref.page}-${index}`}><span className="font-medium">{ref.sourceTitle}{ref.page ? ` · halaman ${ref.page}` : ""}</span><SourcePageDialog notebookId={notebookId} page={ref.page} sourceId={ref.sourceId} sourceTitle={ref.sourceTitle}/></div>)}</div></Card>)}</div>;
}

function AssignmentPanel({ notebookId, notebook, assignments, members, sources }: { notebookId: string; notebook: NotebookResponse; assignments: AssignmentList; members: NotebookMember[]; sources: SourceResponse[] }) {
  const queryClient = useQueryClient();
  const owner = notebook.role === "owner";
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [error, setError] = useState("");
  const create = useMutation({
    mutationFn: () => {
      const parsed = createAssignmentSchema.safeParse({ assigneeId, topic, ...(sourceId ? { sourceId } : {}) });
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Periksa data tugas.");
      return api<{ id: string }>(`/notebooks/${notebookId}/assignments`, jsonBody("POST", parsed.data));
    },
    onSuccess: async () => { setOpen(false); setTopic(""); setAssigneeId(""); setSourceId(""); await queryClient.invalidateQueries({ queryKey: ["notebooks", notebookId, "assignments"] }); },
  });
  const changeStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "todo" | "doing" | "done" }) => api<{ id: string; status: string }>(`/notebooks/${notebookId}/assignments/${id}`, jsonBody("PATCH", { status })),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["notebooks", notebookId, "assignments"] }),
  });
  const deleteAssignment = useMutation({
    mutationFn: (id: string) => api<{ deleted: true }>(`/notebooks/${notebookId}/assignments/${id}`, { method: "DELETE" }),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["notebooks", notebookId, "assignments"] }),
  });
  const readySources = sources.filter((source) => source.status === "ready");
  const nextStatus = (status: string) => status === "todo" ? "doing" : status === "doing" ? "done" : "todo";
  return <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{assignments.perMember.map((member) => <Card className="rounded-2xl p-4" key={member.userId}><p className="font-semibold text-navy">{member.name}</p><p className="mt-1 text-sm text-muted-foreground">{member.done} dari {member.total} tugas selesai</p><div className="mt-3 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${member.total ? member.done / member.total * 100 : 0}%` }}/></div></Card>)}</div><div className="flex items-center justify-between gap-3"><h2 className="font-bold text-navy">Daftar tugas</h2>{owner && <AppDialog description="Tugas dibuat untuk anggota workspace dan dapat ditautkan ke satu sumber." onOpenChange={(value) => { setOpen(value); if (!value) { setError(""); create.reset(); } }} open={open} title="Bagi tugas belajar" trigger={<Button onClick={() => setOpen(true)}><Plus aria-hidden="true"/>Tambah tugas</Button>}><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); setError(""); create.mutate(undefined, { onError: (cause) => setError(cause.message) }); }}><div className="space-y-2"><Label htmlFor="assignment-topic">Topik</Label><Input id="assignment-topic" maxLength={160} minLength={2} onChange={(event) => setTopic(event.target.value)} required value={topic}/></div><div className="space-y-2"><Label htmlFor="assignment-assignee">Anggota</Label><select className="h-10 w-full rounded-xl border bg-background px-3 text-sm" id="assignment-assignee" onChange={(event) => setAssigneeId(event.target.value)} required value={assigneeId}><option value="">Pilih anggota</option>{members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></div><div className="space-y-2"><Label htmlFor="assignment-source">Sumber rujukan <span className="font-normal text-muted-foreground">(opsional)</span></Label><select className="h-10 w-full rounded-xl border bg-background px-3 text-sm" id="assignment-source" onChange={(event) => setSourceId(event.target.value)} value={sourceId}><option value="">Tanpa sumber khusus</option>{readySources.map((source) => <option key={source.id} value={source.id}>{source.title}</option>)}</select></div>{error && <p className="text-sm text-destructive" role="alert">{error}</p>}<Button className="w-full" disabled={create.isPending} type="submit">{create.isPending ? "Membuat…" : "Buat tugas"}</Button></form></AppDialog>}</div>{assignments.items.length ? <div className="space-y-3">{assignments.items.map((item) => <Card className="flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between" key={item.id}><div className="flex items-start gap-3"><span className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl ${item.status === "done" ? "bg-secondary text-teal" : "bg-muted text-muted-foreground"}`}>{item.status === "done" ? <Check aria-hidden="true" className="size-4"/> : <ClipboardList aria-hidden="true" className="size-4"/>}</span><div><p className="font-semibold text-navy">{item.topic}</p><p className="mt-1 text-xs text-muted-foreground">{item.assigneeName}{item.sourceTitle ? ` · ${item.sourceTitle}` : ""}{item.dueAt ? ` · tenggat ${new Date(item.dueAt).toLocaleDateString("id-ID")}` : ""}</p></div></div><div className="flex items-center gap-2"><span className="rounded-full bg-muted px-3 py-1.5 text-xs capitalize">{item.status === "todo" ? "Belum mulai" : item.status === "doing" ? "Dikerjakan" : "Selesai"}</span><Button aria-label={item.status === "done" ? "Tandai belum mulai" : "Pindah ke status berikutnya"} disabled={changeStatus.isPending} onClick={() => changeStatus.mutate({ id: item.id, status: nextStatus(item.status) as "todo" | "doing" | "done" })} size="icon-sm" variant="outline"><Check aria-hidden="true" className="size-4"/></Button>{owner && <Button aria-label={`Hapus tugas ${item.topic}`} disabled={deleteAssignment.isPending} onClick={() => deleteAssignment.mutate(item.id)} size="icon-sm" variant="ghost">×</Button>}</div></Card>)}</div> : <EmptyState title="Belum ada tugas" description={owner ? "Bagikan topik pertama agar progres kelompok punya langkah yang jelas." : "Pemilik workspace dapat membagikan topik untuk dipelajari bersama."}/>}</div>;
}

function MembersPanel({ notebookId, notebook, members }: { notebookId: string; notebook: NotebookResponse; members: NotebookMember[] }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: ({ id, action, role }: { id: string; action: "role" | "remove"; role?: "editor" | "viewer" }) => action === "role" ? api(`/notebooks/${notebookId}/members/${id}`, jsonBody("PATCH", { role })) : api(`/notebooks/${notebookId}/members/${id}`, { method: "DELETE" }),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["notebooks", notebookId, "members"] }),
  });
  return <div className="space-y-3">{error && <p className="rounded-xl bg-destructive/5 p-3 text-sm text-destructive" role="alert">{error}</p>}{members.map((member) => <Card className="flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4" key={member.id}><div className="flex min-w-0 items-center gap-3"><span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary font-bold text-navy">{member.name.slice(0, 1).toUpperCase()}</span><div className="min-w-0"><p className="truncate font-semibold text-navy">{member.name}</p><p className="truncate text-xs text-muted-foreground">{member.email}</p></div></div><div className="flex items-center gap-2"><span className="rounded-full bg-muted px-3 py-1.5 text-xs capitalize">{member.role === "owner" ? "Pemilik" : member.role === "editor" ? "Editor" : "Pembaca"}</span>{notebook.role === "owner" && member.role !== "owner" && <><select aria-label={`Peran ${member.name}`} className="h-9 rounded-lg border bg-background px-2 text-xs" onChange={(event) => mutation.mutate({ id: member.id, action: "role", role: event.target.value as "editor" | "viewer" }, { onError: (cause) => setError(cause.message) })} value={member.role}><option value="editor">Editor</option><option value="viewer">Pembaca</option></select><Button aria-label={`Hapus ${member.name}`} onClick={() => { if (window.confirm(`Keluarkan ${member.name} dari workspace?`)) mutation.mutate({ id: member.id, action: "remove" }, { onError: (cause) => setError(cause.message) }); }} size="sm" variant="outline">Keluarkan</Button></>}</div></Card>)}</div>;
}

function InviteManagementPanel({ notebookId }: { notebookId: string }) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");
  const [message, setMessage] = useState("");
  const invites = useQuery({
    queryKey: ["notebooks", notebookId, "invites"],
    queryFn: () => api<Array<{ token: string; role: "editor" | "viewer"; uses: number; maxUses: number; expiresAt: string; inactive: boolean }>>(`/notebooks/${notebookId}/invites`),
  });
  const requests = useQuery({
    queryKey: ["notebooks", notebookId, "join-requests"],
    queryFn: () => api<Array<{ userId: string; name: string; email: string; message: string | null; createdAt: string }>>(`/notebooks/${notebookId}/join-requests`),
  });
  const addMember = useMutation({
    mutationFn: () => {
      const parsed = addMemberSchema.safeParse({ email, role });
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Periksa email anggota.");
      return api<{ userId: string; role: string }>(`/notebooks/${notebookId}/members`, jsonBody("POST", parsed.data));
    },
    onSuccess: async () => { setEmail(""); setMessage("Anggota berhasil ditambahkan."); await queryClient.invalidateQueries({ queryKey: ["notebooks", notebookId, "members"] }); },
    onError: (error) => setMessage(error.message),
  });
  const createInvite = useMutation({
    mutationFn: () => {
      const parsed = createInviteSchema.safeParse({ role: inviteRole, expiresInDays: 7, maxUses: 20 });
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Periksa pengaturan tautan.");
      return api<{ token: string }>(`/notebooks/${notebookId}/invites`, jsonBody("POST", parsed.data));
    },
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["notebooks", notebookId, "invites"] }),
    onError: (error) => setMessage(error.message),
  });
  const revoke = useMutation({ mutationFn: (token: string) => api<{ revoked: true }>(`/notebooks/${notebookId}/invites/${encodeURIComponent(token)}`, { method: "DELETE" }), onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["notebooks", notebookId, "invites"] }) });
  const decide = useMutation({
    mutationFn: ({ userId, decision }: { userId: string; decision: "approve" | "reject" }) => api<{ userId: string; status: string }>(`/notebooks/${notebookId}/join-requests/${userId}/${decision}`, jsonBody("POST")),
    onSuccess: async () => Promise.all([queryClient.invalidateQueries({ queryKey: ["notebooks", notebookId, "join-requests"] }), queryClient.invalidateQueries({ queryKey: ["notebooks", notebookId, "members"] })]),
  });
  return <div className="space-y-4"><div className="grid gap-4 xl:grid-cols-2"><Card className="space-y-3 rounded-3xl p-5"><div className="flex items-center gap-2"><UserPlus aria-hidden="true" className="size-4 text-teal"/><h2 className="font-bold text-navy">Tambah akun anggota</h2></div><p className="text-xs leading-5 text-muted-foreground">Anggota perlu sudah memiliki akun Deep Notes.</p><form className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]" onSubmit={(event) => { event.preventDefault(); addMember.mutate(); }}><Input aria-label="Email anggota" autoComplete="email" onChange={(event) => setEmail(event.target.value)} placeholder="nama@email.com" required type="email" value={email}/><select aria-label="Peran anggota baru" className="h-10 rounded-xl border bg-background px-3 text-sm" onChange={(event) => setRole(event.target.value as "editor" | "viewer")} value={role}><option value="editor">Editor</option><option value="viewer">Pembaca</option></select><Button disabled={addMember.isPending} type="submit">{addMember.isPending ? "Menambahkan…" : "Tambah"}</Button></form></Card><Card className="space-y-3 rounded-3xl p-5"><div className="flex items-center gap-2"><Link2 aria-hidden="true" className="size-4 text-teal"/><h2 className="font-bold text-navy">Tautan undangan</h2></div><div className="flex flex-wrap items-center gap-2"><select aria-label="Peran undangan" className="h-10 rounded-xl border bg-background px-3 text-sm" onChange={(event) => setInviteRole(event.target.value as "editor" | "viewer")} value={inviteRole}><option value="editor">Editor</option><option value="viewer">Pembaca</option></select><Button disabled={createInvite.isPending} onClick={() => createInvite.mutate()} size="sm"><Plus aria-hidden="true"/>{createInvite.isPending ? "Membuat…" : "Buat tautan 7 hari"}</Button></div>{invites.isPending ? <p className="text-xs text-muted-foreground">Memuat tautan…</p> : invites.isError ? <p className="text-xs text-destructive">{invites.error.message}</p> : invites.data.length ? <ul className="max-h-48 space-y-2 overflow-y-auto">{invites.data.map((invite) => <li className="flex items-center justify-between gap-2 rounded-xl bg-muted/60 p-3" key={invite.token}><div><p className="text-xs font-semibold">{invite.role === "editor" ? "Editor" : "Pembaca"} · {invite.uses}/{invite.maxUses} penggunaan</p><p className="mt-1 text-[11px] text-muted-foreground">{invite.inactive ? "Tidak aktif" : `Berlaku sampai ${new Date(invite.expiresAt).toLocaleDateString("id-ID")}`}</p></div><div className="flex gap-1"><Button aria-label="Salin tautan undangan" onClick={async () => { const url = `${window.location.origin}/join/${invite.token}`; try { await navigator.clipboard.writeText(url); setMessage("Tautan berhasil disalin."); } catch { setMessage(url); } }} size="icon-sm" variant="ghost"><Copy aria-hidden="true" className="size-4"/></Button><Button aria-label="Cabut undangan" disabled={revoke.isPending} onClick={() => { if (window.confirm("Cabut tautan undangan ini?")) revoke.mutate(invite.token); }} size="icon-sm" variant="ghost">×</Button></div></li>)}</ul> : <p className="text-xs text-muted-foreground">Belum ada tautan undangan.</p>}</Card></div>{message && <p className="rounded-xl bg-muted/70 p-3 text-sm" role="status">{message}</p>}<Card className="rounded-3xl p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="font-bold text-navy">Permintaan bergabung</h2><p className="mt-1 text-xs text-muted-foreground">Pemohon akan masuk sebagai pembaca jika disetujui.</p></div><span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">{requests.data?.length ?? 0}</span></div>{requests.isPending ? <LoadingState label="Memeriksa permintaan…"/> : requests.isError ? <ErrorState message={requests.error.message} onRetry={() => void requests.refetch()}/> : requests.data.length ? <ul className="mt-4 space-y-2">{requests.data.map((request) => <li className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-muted/60 p-4" key={request.userId}><div className="min-w-0"><p className="font-semibold text-navy">{request.name}</p><p className="text-xs text-muted-foreground">{request.email} · {new Date(request.createdAt).toLocaleDateString("id-ID")}</p>{request.message && <p className="mt-2 text-sm leading-5">{request.message}</p>}</div><div className="flex gap-2"><Button disabled={decide.isPending} onClick={() => decide.mutate({ userId: request.userId, decision: "reject" })} size="sm" variant="outline">Tolak</Button><Button disabled={decide.isPending} onClick={() => decide.mutate({ userId: request.userId, decision: "approve" })} size="sm">Setujui</Button></div></li>)}</ul> : <p className="mt-4 text-sm text-muted-foreground">Belum ada permintaan yang perlu ditinjau.</p>}</Card></div>;
}

export function WorkspaceInsightsPage() {
  const { notebookId = "" } = useParams();
  const [tab, setTab] = useState<Tab>("activity");
  const data = useGroupData(notebookId);
  if (data.notebook.isPending) return <LoadingState label="Memuat ruang kelompok…"/>;
  if (data.notebook.isError) return <ErrorState message={data.notebook.error.message} onRetry={() => void data.notebook.refetch()}/>;
  const notebook = data.notebook.data;
  const active = tab === "activity" ? data.contributions : tab === "progress" ? data.progress : tab === "gaps" ? data.gaps : tab === "assignments" ? data.assignments : data.members;
  if (active.isPending) return <LoadingState label="Memuat ringkasan kelompok…"/>;
  if (active.isError) return <ErrorState message={active.error.message} onRetry={() => void active.refetch()}/>;
  if (tab === "assignments") {
    const supportingError = data.members.isError ? data.members.error : data.sources.isError ? data.sources.error : null;
    if (supportingError) return <ErrorState message={supportingError.message} onRetry={() => { void data.members.refetch(); void data.sources.refetch(); }}/>;
    if (data.members.isPending || data.sources.isPending) return <LoadingState label="Memuat anggota dan sumber workspace…"/>;
  }
  return <div className="space-y-6"><PageTitle eyebrow={notebook.title} title="Ruang kelompok" description="Lihat aktivitas, progres kuis, topik yang perlu ditinjau, tugas, dan anggota workspace."/><div className="flex gap-2 overflow-x-auto pb-2" aria-label="Bagian ruang kelompok" role="tablist">{(Object.keys(tabLabels) as Tab[]).map((key) => <button aria-selected={tab === key} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${tab === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`} key={key} onClick={() => setTab(key)} role="tab">{tabLabels[key]}</button>)}</div><section aria-label={tabLabels[tab]} role="tabpanel">{tab === "activity" && <ContributionPanel data={data.contributions.data!}/ >}{tab === "progress" && <ProgressPanel data={data.progress.data!}/ >}{tab === "gaps" && <GapsPanel data={data.gaps.data!} notebookId={notebookId}/ >}{tab === "assignments" && data.assignments.data && data.members.data && data.sources.data && <AssignmentPanel assignments={data.assignments.data} members={data.members.data} notebook={notebook} notebookId={notebookId} sources={data.sources.data}/ >}{tab === "members" && <div className="space-y-6">{notebook.role === "owner" && <InviteManagementPanel notebookId={notebookId}/>}<MembersPanel members={data.members.data!} notebook={notebook} notebookId={notebookId}/></div>}</section></div>;
}
