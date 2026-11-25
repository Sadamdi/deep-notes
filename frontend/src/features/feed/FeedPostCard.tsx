import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router";
import { Bookmark, BookOpenText, Heart, Trash2, UserRoundPlus } from "lucide-react";
import type { FeedPost } from "@deep-notes/shared";
import { useAuthMe } from "@/features/auth/useAuth";
import { AppDialog } from "@/components/shared/AppDialog";
import { Button } from "@/components/ui/button";
import { CommentDialog } from "@/features/feed/CommentDialog";
import { api, jsonBody } from "@/lib/api";
import { readSavedPostIds, savedPostIdsKey, writeSavedPostIds } from "@/features/feed/savedPosts";

function relativeTime(value: string) {
  const elapsed = Date.now() - Date.parse(value);
  const formatter = new Intl.RelativeTimeFormat("id", { numeric: "auto" });
  if (elapsed < 60_000) return formatter.format(-Math.floor(elapsed / 1000), "second");
  if (elapsed < 3_600_000) return formatter.format(-Math.floor(elapsed / 60_000), "minute");
  if (elapsed < 86_400_000) return formatter.format(-Math.floor(elapsed / 3_600_000), "hour");
  return formatter.format(-Math.floor(elapsed / 86_400_000), "day");
}

export function FeedPostCard({ post }: { post: FeedPost }) {
  const queryClient = useQueryClient();
  const me = useAuthMe();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const savedIds = useQuery({ queryKey: savedPostIdsKey, queryFn: readSavedPostIds });
  const savePost = useMutation({
    mutationFn: async () => {
      const current = savedIds.data ?? [];
      const next = current.includes(post.id) ? current.filter((id) => id !== post.id) : [...current, post.id];
      if (!writeSavedPostIds(next)) throw new Error("Browser tidak dapat menyimpan daftar bacaan di perangkat ini.");
      return next;
    },
    onSuccess: (ids) => {
      queryClient.setQueryData(savedPostIdsKey, ids);
      void queryClient.invalidateQueries({ queryKey: ["saved-posts"] });
    },
  });
  const like = useMutation<{ liked: boolean; likes: number }>({
    mutationFn: () => post.likedByMe ? api<{ liked: boolean; likes: number }>(`/posts/${post.id}/like`, { method: "DELETE" }) : api<{ liked: boolean; likes: number }>(`/posts/${post.id}/like`, jsonBody("POST")),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["feed"] }),
  });
  const follow = useMutation<{ following: boolean }>({
    mutationFn: () => post.followingAuthor ? api<{ following: boolean }>(`/users/${post.authorId}/follow`, { method: "DELETE" }) : api<{ following: boolean }>(`/users/${post.authorId}/follow`, jsonBody("POST")),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["feed"] }),
  });
  const deletePost = useMutation({
    mutationFn: () => api<{ deleted: true }>(`/posts/${post.id}`, { method: "DELETE" }),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["feed"] }),
  });

  return (
    <article className="rounded-3xl border bg-card p-4 shadow-sm sm:p-5">
      <header className="flex items-start gap-3">
        <Link aria-label={`Lihat profil ${post.authorName}`} className="grid size-10 shrink-0 place-items-center rounded-full bg-teal text-sm font-bold text-white" to={`/users/${post.authorId}`}>{post.authorName.trim().slice(0, 1).toUpperCase()}</Link>
        <div className="min-w-0 flex-1"><h2 className="truncate text-sm font-bold"><Link className="hover:underline" to={`/users/${post.authorId}`}>{post.authorName}</Link></h2><p className="mt-0.5 text-xs text-muted-foreground">{post.authorCourse || "Teman belajar"} · {relativeTime(post.createdAt)}</p></div>
        {me.data?.id !== post.authorId && <Button aria-pressed={post.followingAuthor} disabled={follow.isPending} onClick={() => follow.mutate()} size="sm" variant={post.followingAuthor ? "outline" : "ghost"}><UserRoundPlus aria-hidden="true" />{post.followingAuthor ? "Mengikuti" : "Ikuti"}</Button>}
      </header>
      <p className="mt-4 whitespace-pre-wrap text-sm leading-6">{post.body}</p>
      {post.card?.type === "notebook" && (
        post.card.unavailable ? <div className="mt-4 rounded-2xl bg-muted p-4 text-sm text-muted-foreground">Workspace terlampir sudah tidak tersedia untuk publik.</div> :
          <div className="mt-4 rounded-2xl bg-secondary/65 p-4"><div className="flex items-start gap-3"><span className="grid size-9 place-items-center rounded-xl bg-white text-primary"><BookOpenText aria-hidden="true" className="size-4" /></span><div className="min-w-0 flex-1"><p className="font-semibold text-navy">{post.card.title}</p><p className="mt-1 text-xs text-muted-foreground">{post.card.course || post.card.category || "Workspace publik"} · {post.card.memberCount} anggota · {post.card.sourceCount} sumber</p></div></div><p className="mt-3 line-clamp-2 text-sm leading-5 text-muted-foreground">{post.card.description || "Ruang belajar publik."}</p><Button asChild className="mt-3" size="sm" variant="outline"><Link to={`/discover?q=${encodeURIComponent(post.card.title)}`}>Jelajahi workspace</Link></Button></div>
      )}
      {post.card?.type === "result" && <div className="mt-4 rounded-2xl bg-warning/25 p-4"><p className="font-semibold text-navy">Sesi {post.card.mode === "solo" ? "mandiri" : post.card.mode === "duel" ? "duel" : "kelompok"}</p><p className="mt-1 text-sm text-muted-foreground">{post.card.correct ?? 0}/{post.card.total ?? 0} jawaban benar · {post.card.points ?? 0} poin</p></div>}
      <footer className="mt-4 flex flex-wrap items-center gap-1 border-t pt-3">
        <Button aria-pressed={post.likedByMe} disabled={like.isPending} onClick={() => like.mutate()} size="sm" variant={post.likedByMe ? "secondary" : "ghost"}><Heart aria-hidden="true" className={post.likedByMe ? "fill-current" : ""} />{post.likes}</Button>
        <Button aria-label={savedIds.data?.includes(post.id) ? "Hapus dari bacaan tersimpan di perangkat ini" : "Simpan untuk dibaca di perangkat ini"} aria-pressed={savedIds.data?.includes(post.id) ?? false} disabled={savePost.isPending || savedIds.isPending} onClick={() => savePost.mutate()} size="sm" variant={savedIds.data?.includes(post.id) ? "secondary" : "ghost"}><Bookmark aria-hidden="true" className={savedIds.data?.includes(post.id) ? "fill-current" : ""}/>{savedIds.data?.includes(post.id) ? "Tersimpan" : "Simpan"}</Button>
        <CommentDialog commentCount={post.comments} postAuthorId={post.authorId} postId={post.id} />
        {me.data?.id === post.authorId && <AppDialog description="Unggahan akan dihapus dari feed semua orang." onOpenChange={setDeleteOpen} open={deleteOpen} title="Hapus unggahan" trigger={<Button aria-label="Hapus unggahan" onClick={() => setDeleteOpen(true)} size="sm" variant="ghost"><Trash2 aria-hidden="true"/></Button>}><p className="text-sm leading-6 text-muted-foreground">Tanggapan dan suka pada unggahan ini juga tidak akan tampil lagi.</p>{deletePost.isError && <p className="mt-3 text-sm text-destructive" role="alert">{deletePost.error.message}</p>}<Button className="mt-4 w-full" disabled={deletePost.isPending} onClick={() => deletePost.mutate(undefined, { onSuccess: () => setDeleteOpen(false) })} variant="destructive">{deletePost.isPending ? "Menghapus…" : "Hapus unggahan"}</Button></AppDialog>}
      </footer>
      {savePost.isError && <p className="mt-2 text-xs text-destructive" role="alert">{savePost.error.message}</p>}
    </article>
  );
}
