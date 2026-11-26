import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link2, UserRoundPlus, Users } from "lucide-react";
import type { AddMemberResult, FriendsResponse, InviteResult, NotebookMember } from "@deep-notes/shared";
import { addMemberSchema } from "@deep-notes/shared";
import { AppDialog } from "@/components/shared/AppDialog";
import { ErrorState } from "@/components/shared/PageStates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiRequestError, api, jsonBody } from "@/lib/api";

type MemberTarget = { email: string } | { friendId: string };

export function InviteWorkspaceDialog({ notebookId, triggerLabel = "Undang teman" }: { notebookId: string; triggerLabel?: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [token, setToken] = useState("");
  const [status, setStatus] = useState("");
  const friends = useQuery({ queryKey: ["me", "friends"], queryFn: () => api<FriendsResponse>("/me/friends"), enabled: open });
  const members = useQuery({ queryKey: ["notebooks", notebookId, "members"], queryFn: () => api<NotebookMember[]>(`/notebooks/${notebookId}/members`), enabled: open });
  const addMember = useMutation({
    mutationFn: (target: MemberTarget) => {
      const body = addMemberSchema.parse({ ...target, role });
      return api<AddMemberResult>(`/notebooks/${notebookId}/members`, jsonBody("POST", body));
    },
    onSuccess: async () => {
      setEmail("");
      setStatus("Anggota berhasil ditambahkan ke workspace.");
      await queryClient.invalidateQueries({ queryKey: ["notebooks", notebookId, "members"] });
    },
  });
  const createInvite = useMutation({
    mutationFn: () => api<InviteResult>(`/notebooks/${notebookId}/invites`, jsonBody("POST", { role, expiresInDays: 7, maxUses: 20 })),
    onSuccess: (result) => { setToken(result.token); setStatus(""); },
  });
  const inviteLink = token ? `${window.location.origin}/join/${token}` : "";
  const memberIds = new Set(members.data?.map((member) => member.id) ?? []);
  const actionError = addMember.error ?? createInvite.error;

  async function copyLink() {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(inviteLink);
      setStatus("Tautan undangan berhasil disalin.");
    } catch {
      setStatus("Pilih tautan di atas lalu salin secara manual.");
    }
  }

  function reset() {
    setEmail("");
    setRole("editor");
    setToken("");
    setStatus("");
    addMember.reset();
    createInvite.reset();
  }

  return <AppDialog
    description="Pilih teman yang sudah terhubung, tambahkan akun terdaftar, atau buat tautan undangan."
    onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) reset(); }}
    open={open}
    title="Undang ke workspace"
    trigger={<Button onClick={() => setOpen(true)} variant="outline"><Users aria-hidden="true" />{triggerLabel}</Button>}
  >
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="invite-role">Peran teman</Label>
        <select className="h-11 w-full rounded-xl border bg-background px-3 text-sm" id="invite-role" onChange={(event) => setRole(event.target.value as "editor" | "viewer")} value={role}>
          <option value="editor">Editor · dapat menambahkan dan mengelola materi</option>
          <option value="viewer">Pembaca · dapat melihat dan belajar</option>
        </select>
      </div>

      <section className="space-y-3 rounded-2xl border p-4" aria-labelledby="invite-friends-title">
        <div><h3 className="font-semibold text-navy" id="invite-friends-title">Teman belajar</h3><p className="mt-1 text-sm text-muted-foreground">Hanya teman yang sudah menerima permintaanmu.</p></div>
        {friends.isPending || members.isPending ? <p className="text-sm text-muted-foreground">Memuat daftar teman…</p> : friends.isError ? <ErrorState message={friends.error.message} onRetry={() => void friends.refetch()} /> : members.isError ? <ErrorState message={members.error.message} onRetry={() => void members.refetch()} /> : friends.data.friends.length ? <ul className="max-h-52 divide-y overflow-y-auto">{friends.data.friends.map((friend) => {
          const alreadyMember = memberIds.has(friend.id);
          return <li className="flex items-center justify-between gap-3 py-3" key={friend.id}>
            <div className="min-w-0"><p className="truncate text-sm font-semibold text-navy">{friend.name}</p><p className="truncate text-xs text-muted-foreground">{friend.course || "Program studi belum dibagikan"}</p></div>
            <Button disabled={alreadyMember || addMember.isPending} onClick={() => addMember.mutate({ friendId: friend.id })} size="sm" variant={alreadyMember ? "outline" : "default"}>{alreadyMember ? "Sudah bergabung" : "Tambahkan"}</Button>
          </li>;
        })}</ul> : <p className="text-sm text-muted-foreground">Daftar temanmu masih kosong. Hubungkan teman dari halaman Teman belajar.</p>}
      </section>

      <form className="space-y-3 rounded-2xl border p-4" onSubmit={(event) => { event.preventDefault(); addMember.mutate({ email: email.trim() }); }}>
        <div><h3 className="font-semibold text-navy">Tambah akun lewat email</h3><p className="mt-1 text-sm text-muted-foreground">Email harus milik akun Deep Notes yang sudah terdaftar.</p></div>
        <div className="space-y-2"><Label htmlFor="invite-email">Email kampus</Label><Input autoComplete="off" id="invite-email" onChange={(event) => setEmail(event.target.value)} placeholder="nama@kampus.ac.id" required type="email" value={email}/></div>
        <Button disabled={addMember.isPending || !email.trim()} type="submit" variant="outline"><UserRoundPlus aria-hidden="true"/>Tambahkan anggota</Button>
      </form>

      <section className="space-y-3 rounded-2xl bg-muted/50 p-4" aria-labelledby="invite-link-title">
        <div><h3 className="font-semibold text-navy" id="invite-link-title">Tautan undangan</h3><p className="mt-1 text-sm text-muted-foreground">Berlaku 7 hari, maksimal 20 penggunaan, dengan peran yang dipilih di atas.</p></div>
        {token ? <><div className="space-y-2"><Label htmlFor="workspace-invite-link">Tautan</Label><Input id="workspace-invite-link" onFocus={(event) => event.currentTarget.select()} readOnly value={inviteLink}/></div><Button onClick={() => void copyLink()} variant="outline"><Link2 aria-hidden="true"/>Salin tautan</Button></> : <Button disabled={createInvite.isPending} onClick={() => createInvite.mutate()} variant="outline"><Link2 aria-hidden="true"/>{createInvite.isPending ? "Membuat tautan…" : "Buat tautan undangan"}</Button>}
      </section>

      {status && <p className="text-sm text-teal" role="status">{status}</p>}
      {actionError && <ErrorState message={actionError instanceof ApiRequestError ? actionError.message : "Perubahan undangan belum berhasil disimpan."} />}
    </div>
  </AppDialog>;
}
