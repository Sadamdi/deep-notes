import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, UserRoundMinus, UserRoundPlus, X } from "lucide-react";
import { Link } from "react-router";
import type { FriendRequestResult, FriendsResponse } from "@deep-notes/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState, ErrorState, LoadingState, PageTitle } from "@/components/shared/PageStates";
import { ApiRequestError, api, jsonBody } from "@/lib/api";

type FriendRequest = FriendsResponse["requests"][number];

export function FriendsPage() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState("");
  const friends = useQuery({ queryKey: ["me", "friends"], queryFn: () => api<FriendsResponse>("/me/friends") });
  const sendRequest = useMutation({
    mutationFn: () => api<FriendRequestResult>("/me/friend-requests", jsonBody("POST", { email })),
    onSuccess: async (response) => {
      setEmail("");
      setNotice(response.message);
      await queryClient.invalidateQueries({ queryKey: ["me", "friends"] });
    },
  });
  const updateRequest = useMutation<{ accepted?: boolean; removed?: boolean }, Error, { request: FriendRequest; accept: boolean }>({
    mutationFn: ({ request, accept }: { request: FriendRequest; accept: boolean }) => accept
      ? api<{ accepted: boolean }>(`/me/friend-requests/${request.id}/accept`, jsonBody("POST"))
      : api<{ removed: boolean }>(`/me/friend-requests/${request.id}`, { method: "DELETE" }),
    onSuccess: async () => {
      setNotice("");
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["me", "friends"] }), queryClient.invalidateQueries({ queryKey: ["users"] })]);
    },
  });
  const removeFriend = useMutation({
    mutationFn: (userId: string) => api<{ removed: boolean }>(`/me/friends/${userId}`, { method: "DELETE" }),
    onSuccess: async () => {
      setNotice("Teman dihapus dari daftarmu.");
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["me", "friends"] }), queryClient.invalidateQueries({ queryKey: ["users"] })]);
    },
  });

  if (friends.isPending) return <LoadingState label="Memuat daftar teman…" />;
  if (friends.isError) return <ErrorState message={friends.error instanceof ApiRequestError ? friends.error.message : "Daftar teman belum berhasil dimuat."} onRetry={() => void friends.refetch()} />;

  const incoming = friends.data.requests.filter((request) => request.direction === "incoming");
  const outgoing = friends.data.requests.filter((request) => request.direction === "outgoing");
  const actionError = sendRequest.error ?? updateRequest.error ?? removeFriend.error;

  function requestRow(request: FriendRequest, direction: "incoming" | "outgoing") {
    return <li className="flex flex-wrap items-center justify-between gap-4 border-b py-4 last:border-0" key={request.id}>
      <div className="flex min-w-0 items-center gap-3">
        <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary font-bold text-navy">{request.name.trim().slice(0, 1).toUpperCase()}</span>
        <div className="min-w-0"><p className="truncate font-semibold text-navy">{request.name}</p><p className="truncate text-sm text-muted-foreground">{request.course || "Program studi belum dibagikan"}</p></div>
      </div>
      <div className="flex gap-2">
        {direction === "incoming" && <Button disabled={updateRequest.isPending} onClick={() => updateRequest.mutate({ request, accept: true })} size="sm"><Check aria-hidden="true" />Terima</Button>}
        <Button disabled={updateRequest.isPending} onClick={() => updateRequest.mutate({ request, accept: false })} size="sm" variant="outline"><X aria-hidden="true" />{direction === "incoming" ? "Tolak" : "Batalkan"}</Button>
      </div>
    </li>;
  }

  return <div className="space-y-6">
    <Button asChild size="sm" variant="ghost"><Link to="/profile"><ArrowLeft aria-hidden="true" />Kembali ke profil</Link></Button>
    <PageTitle description="Kelola permintaan dan teman yang bisa kamu ajak belajar bersama." title="Teman belajar" />
    <section className="max-w-2xl space-y-3">
      <h2 className="font-bold text-navy">Tambah teman lewat email</h2>
      <form className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-end" onSubmit={(event) => { event.preventDefault(); setNotice(""); sendRequest.mutate(); }}>
        <div className="min-w-0 flex-1 space-y-2"><Label htmlFor="friend-email">Email akun teman</Label><Input autoComplete="off" id="friend-email" onChange={(event) => setEmail(event.target.value)} placeholder="nama@kampus.ac.id" required type="email" value={email} /></div>
        <Button disabled={sendRequest.isPending || !email.trim()} type="submit"><UserRoundPlus aria-hidden="true" />{sendRequest.isPending ? "Mengirim…" : "Kirim permintaan"}</Button>
      </form>
      <p className="text-xs leading-5 text-muted-foreground">Kami tidak menampilkan atau membagikan alamat email teman.</p>
      {notice && <p className="text-sm text-teal" role="status">{notice}</p>}
      {actionError && <ErrorState message={actionError instanceof ApiRequestError ? actionError.message : "Perubahan belum berhasil disimpan."} />}
    </section>

    <div className="grid gap-6 xl:grid-cols-2">
      <section className="rounded-3xl border bg-card p-5 sm:p-6">
        <h2 className="font-bold text-navy">Permintaan masuk <span className="ml-1 text-sm font-medium text-muted-foreground">{incoming.length}</span></h2>
        {incoming.length ? <ul className="mt-2">{incoming.map((request) => requestRow(request, "incoming"))}</ul> : <p className="mt-4 text-sm text-muted-foreground">Belum ada permintaan teman.</p>}
      </section>
      <section className="rounded-3xl border bg-card p-5 sm:p-6">
        <h2 className="font-bold text-navy">Permintaan terkirim <span className="ml-1 text-sm font-medium text-muted-foreground">{outgoing.length}</span></h2>
        {outgoing.length ? <ul className="mt-2">{outgoing.map((request) => requestRow(request, "outgoing"))}</ul> : <p className="mt-4 text-sm text-muted-foreground">Belum ada permintaan yang menunggu jawaban.</p>}
      </section>
    </div>

    <section className="space-y-3">
      <h2 className="font-bold text-navy">Temanku <span className="ml-1 text-sm font-medium text-muted-foreground">{friends.data.friends.length}</span></h2>
      {friends.data.friends.length ? <ul className="max-w-2xl divide-y rounded-3xl border bg-card px-5 sm:px-6">{friends.data.friends.map((friend) => <li className="flex flex-wrap items-center justify-between gap-4 py-4" key={friend.id}>
        <div className="flex min-w-0 items-center gap-3"><span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary font-bold text-navy">{friend.name.trim().slice(0, 1).toUpperCase()}</span><div className="min-w-0"><p className="truncate font-semibold text-navy">{friend.name}</p><p className="truncate text-sm text-muted-foreground">{friend.course || "Program studi belum dibagikan"}</p></div></div>
        <Button disabled={removeFriend.isPending} onClick={() => removeFriend.mutate(friend.id)} size="sm" variant="outline"><UserRoundMinus aria-hidden="true" />Hapus teman</Button>
      </li>)}</ul> : <EmptyState title="Daftar temanmu masih kosong" description="Tambahkan teman lewat email atau kirim permintaan dari profil publik mereka." />}
    </section>
  </div>;
}
