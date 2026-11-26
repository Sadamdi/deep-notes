import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { ArrowLeft, BadgeCheck, BookOpen, Flame, UserRoundCheck, UserRoundPlus } from "lucide-react";
import type { FriendRequestResult, PublicProfile } from "@deep-notes/shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState, PageTitle } from "@/components/shared/PageStates";
import { api, jsonBody } from "@/lib/api";
import { useAuthMe } from "@/features/auth/useAuth";

const badgeNames: Record<string, string> = { first_session: "Sesi pertama", perfect: "Skor sempurna", speedster: "Cepat tanggap", streak_3: "Streak 3 hari", streak_7: "Streak 7 hari", gap_guardian: "Penjaga celah", teammate: "Teman belajar" };

export function PublicProfilePage() {
  const { userId = "" } = useParams();
  const client = useQueryClient();
  const auth = useAuthMe();
  const profile = useQuery({ queryKey: ["users", userId], queryFn: () => api<PublicProfile>(`/users/${userId}`), enabled: Boolean(userId) });
  const follow = useMutation<{ following: boolean }>({
    mutationFn: () => profile.data?.followedByMe ? api<{ following: boolean }>(`/users/${userId}/follow`, { method: "DELETE" }) : api<{ following: boolean }>(`/users/${userId}/follow`, jsonBody("POST")),
    onSuccess: async () => { await Promise.all([client.invalidateQueries({ queryKey: ["users", userId] }), client.invalidateQueries({ queryKey: ["feed"] })]); },
  });
  const friendRequest = useMutation({
    mutationFn: () => api<FriendRequestResult>("/me/friend-requests", jsonBody("POST", { userId })),
    onSuccess: async () => { await Promise.all([client.invalidateQueries({ queryKey: ["users", userId] }), client.invalidateQueries({ queryKey: ["me", "friends"] })]); },
  });
  if (profile.isPending) return <LoadingState label="Memuat profil publik…"/>;
  if (profile.isError) return <ErrorState message={profile.error.message} onRetry={() => void profile.refetch()}/>;
  const user = profile.data;
  const isSelf = auth.data?.id === user.id;
  const friendAction = user.friendshipStatus === "friends"
    ? <Button asChild variant="outline"><Link to="/friends"><UserRoundCheck aria-hidden="true"/>Teman belajar</Link></Button>
    : user.friendshipStatus === "incoming"
      ? <Button asChild variant="outline"><Link to="/friends">Lihat permintaan</Link></Button>
      : user.friendshipStatus === "outgoing"
        ? <Button disabled variant="outline"><UserRoundCheck aria-hidden="true"/>Permintaan terkirim</Button>
        : <Button disabled={friendRequest.isPending} onClick={() => friendRequest.mutate()} variant="outline"><UserRoundPlus aria-hidden="true"/>{friendRequest.isPending ? "Mengirim…" : "Tambah teman"}</Button>;
  return <div className="space-y-6"><Button asChild size="sm" variant="ghost"><Link to="/home"><ArrowLeft aria-hidden="true"/>Kembali ke beranda</Link></Button><PageTitle eyebrow="Profil publik" title={user.name} description={user.course || "Program studi belum dibagikan."} action={<div className="flex flex-wrap gap-2">{!isSelf && friendAction}{!isSelf && (user.followedByMe ? <Button disabled={follow.isPending} onClick={() => follow.mutate()} variant="outline"><UserRoundCheck aria-hidden="true"/>Mengikuti</Button> : <Button disabled={follow.isPending} onClick={() => follow.mutate()}><UserRoundPlus aria-hidden="true"/>Ikuti</Button>)}</div>}/>{follow.isError && <ErrorState message={follow.error.message}/ >}{friendRequest.isError && <ErrorState message={friendRequest.error.message}/ >}{friendRequest.isSuccess && <p className="text-sm text-teal" role="status">Permintaan terkirim. Kamu bisa memeriksa statusnya di Teman belajar.</p>}<section className="grid gap-4 sm:grid-cols-3"><Metric icon={<UserRoundPlus aria-hidden="true"/>} value={user.followers} label="Pengikut"/><Metric icon={<BookOpen aria-hidden="true"/>} value={user.posts} label="Unggahan"/><Metric icon={<Flame aria-hidden="true"/>} value={user.points} label="Poin belajar"/></section><Card className="rounded-3xl p-5 sm:p-6"><div className="flex items-center gap-2"><BadgeCheck aria-hidden="true" className="size-5 text-teal"/><h2 className="font-bold text-navy">Lencana yang diraih</h2></div>{user.badges.length ? <ul className="mt-4 flex flex-wrap gap-2">{user.badges.map((badge) => <li className="rounded-full bg-secondary px-3 py-2 text-xs font-semibold text-navy" key={badge}>{badgeNames[badge] ?? badge}</li>)}</ul> : <EmptyState title="Belum ada lencana" description="Lencana akan muncul saat sesi belajar diselesaikan."/>}</Card><p className="rounded-2xl bg-muted/60 p-4 text-xs leading-5 text-muted-foreground">Profil publik hanya menampilkan nama, program studi, jumlah pengikut, unggahan, poin, dan lencana.</p></div>;
}

function Metric({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return <Card className="rounded-2xl p-4"><div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">{icon}{label}</div><p className="mt-3 text-3xl font-bold text-navy">{value.toLocaleString("id-ID")}</p></Card>;
}
