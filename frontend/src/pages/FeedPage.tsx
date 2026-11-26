import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { LoaderCircle, Users } from "lucide-react";
import type { FeedPost, FeedResponse } from "@deep-notes/shared";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState, PageTitle } from "@/components/shared/PageStates";
import { PostComposer } from "@/features/feed/PostComposer";
import { FeedPostCard } from "@/features/feed/FeedPostCard";
import { api } from "@/lib/api";
import { ApiRequestError } from "@/lib/api";
import { readSavedPostIds, savedPostIdsKey, writeSavedPostIds } from "@/features/feed/savedPosts";

export function FeedPage() {
  const location = useLocation();
  const initialScope = location.pathname === "/following" ? "following" : location.pathname === "/saved" ? "saved" : "all";
  const [scope, setScope] = useState<"all" | "following" | "saved">(initialScope);
  useEffect(() => { setScope(location.pathname === "/following" ? "following" : location.pathname === "/saved" ? "saved" : "all"); }, [location.pathname]);
  const savedIds = useQuery({ queryKey: savedPostIdsKey, queryFn: readSavedPostIds });
  const feed = useInfiniteQuery({
    queryKey: ["feed", scope],
    initialPageParam: null as string | null,
    enabled: scope !== "saved",
    queryFn: ({ pageParam }) => api<FeedResponse>(`/feed?scope=${scope === "following" ? "following" : "all"}&limit=20${pageParam ? `&before=${encodeURIComponent(pageParam)}` : ""}`),
    getNextPageParam: (page) => page.nextBefore ?? undefined,
  });
  const savedPosts = useQuery({
    queryKey: ["saved-posts", savedIds.data],
    enabled: scope === "saved" && savedIds.isSuccess,
    queryFn: async () => {
      const results = await Promise.all((savedIds.data ?? []).map(async (id) => {
        try { return await api<FeedPost>(`/posts/${id}`); }
        catch (error) {
          if (error instanceof ApiRequestError && error.status === 404) return null;
          throw error;
        }
      }));
      const posts = results.filter((post): post is FeedPost => post !== null);
      const aliveIds = posts.map((post) => post.id);
      if (aliveIds.length !== (savedIds.data ?? []).length && writeSavedPostIds(aliveIds)) void savedIds.refetch();
      return posts;
    },
  });
  const posts = feed.data?.pages.flatMap((page) => page.posts) ?? [];

  return (
    <div className="space-y-6">
      <PageTitle description="Bagikan rangkuman dan temukan cara belajar teman sekelas." eyebrow="Beranda" title="Ilmu dari teman" action={<span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-2 text-xs font-semibold text-navy"><Users aria-hidden="true" className="size-4" />Belajar bersama</span>} />
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <PostComposer />
          <div className="flex w-fit gap-1 rounded-2xl bg-muted p-1" role="group" aria-label="Cakupan feed">
            <Button aria-pressed={scope === "all"} onClick={() => setScope("all")} size="sm" variant={scope === "all" ? "default" : "ghost"}>Semua</Button>
            <Button aria-pressed={scope === "following"} onClick={() => setScope("following")} size="sm" variant={scope === "following" ? "default" : "ghost"}>Mengikuti</Button>
            <Button aria-pressed={scope === "saved"} onClick={() => setScope("saved")} size="sm" variant={scope === "saved" ? "default" : "ghost"}>Tersimpan</Button>
          </div>
          <p className="text-xs text-muted-foreground">Bacaan tersimpan hanya ada di perangkat ini.</p>
          {scope === "saved" ? savedIds.isPending || savedPosts.isPending ? <LoadingState label="Memuat bacaan tersimpan…"/> : savedPosts.isError ? <ErrorState message={savedPosts.error.message} onRetry={() => void savedPosts.refetch()}/> : savedPosts.data.length === 0 ? <EmptyState description="Gunakan tombol Simpan pada unggahan untuk menyimpannya di perangkat ini." title="Belum ada bacaan tersimpan"/> : <div className="space-y-4">{savedPosts.data.map((post) => <FeedPostCard key={post.id} post={post}/>)}</div> : feed.isPending ? <LoadingState label="Memuat unggahan…" /> : feed.isError ? <ErrorState message={feed.error.message} onRetry={() => void feed.refetch()} /> : posts.length === 0 ? <EmptyState description={scope === "following" ? "Ikuti teman agar unggahan mereka muncul di sini." : "Belum ada unggahan. Bagikan satu hal yang baru kamu pelajari."} title="Feed masih kosong" /> : <div className="space-y-4">{posts.map((post) => <FeedPostCard key={post.id} post={post} />)}</div>}
          {scope !== "saved" && feed.hasNextPage && <Button className="w-full" disabled={feed.isFetchingNextPage} onClick={() => void feed.fetchNextPage()} variant="outline">{feed.isFetchingNextPage && <LoaderCircle aria-hidden="true" className="animate-spin" />}Muat unggahan berikutnya</Button>}
        </div>
        <aside className="sticky top-24 space-y-4">
          <div className="rounded-3xl bg-secondary p-5"><img alt="Bubi menemani belajar" className="mx-auto h-32 w-auto" src="/assets/bubi-antusias.svg" /><h2 className="mt-3 font-bold text-navy">Lanjutkan belajar</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Kembali ke workspace dan lanjutkan materi bersama Bubi.</p><Button asChild className="mt-4 w-full"><Link to="/workspaces">Buka workspace</Link></Button></div>
        </aside>
      </div>
    </div>
  );
}
