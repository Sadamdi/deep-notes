import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { LoaderCircle, Users } from "lucide-react";
import type { FeedResponse, SavedPostList } from "@deep-notes/shared";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState, PageTitle } from "@/components/shared/PageStates";
import { PostComposer } from "@/features/feed/PostComposer";
import { FeedPostCard } from "@/features/feed/FeedPostCard";
import { ApiRequestError, api, jsonBody } from "@/lib/api";
import { legacySavedPostIdsKey, readSavedPostIds } from "@/features/feed/savedPosts";
import { StreakCard } from "@/components/shared/StreakCard";

export function FeedPage() {
  const location = useLocation();
  const queryClient = useQueryClient();
  const initialScope = location.pathname === "/following" ? "following" : location.pathname === "/saved" ? "saved" : "all";
  const [scope, setScope] = useState<"all" | "following" | "saved">(initialScope);
  useEffect(() => { setScope(location.pathname === "/following" ? "following" : location.pathname === "/saved" ? "saved" : "all"); }, [location.pathname]);
  const savedIds = useQuery({ queryKey: legacySavedPostIdsKey, queryFn: readSavedPostIds });
  const feed = useInfiniteQuery({
    queryKey: ["feed", scope],
    initialPageParam: null as string | null,
    enabled: scope !== "saved",
    queryFn: ({ pageParam }) => api<FeedResponse>(`/feed?scope=${scope === "following" ? "following" : "all"}&limit=20${pageParam ? `&before=${encodeURIComponent(pageParam)}` : ""}`),
    getNextPageParam: (page) => page.nextBefore ?? undefined,
  });
  const savedPosts = useQuery({
    queryKey: ["saved-posts"],
    enabled: scope === "saved",
    queryFn: () => api<SavedPostList>("/saved-posts"),
  });
  const legacyIdsToImport = (savedIds.data ?? []).filter((id) => !savedPosts.data?.posts.some((post) => post.id === id));
  const [migrationNotice, setMigrationNotice] = useState("");
  const importSaved = useMutation({
    mutationFn: async () => {
      let imported = 0;
      let unavailable = 0;
      for (const id of legacyIdsToImport) {
        try {
          await api<{ saved: boolean }>(`/posts/${id}/save`, jsonBody("POST"));
          imported++;
        } catch (error) {
          if (error instanceof ApiRequestError && error.status === 404) unavailable++;
          else throw error;
        }
      }
      return { imported, unavailable };
    },
    onSuccess: async ({ imported, unavailable }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["saved-posts"] }),
        queryClient.invalidateQueries({ queryKey: ["feed"] }),
      ]);
      setMigrationNotice(`${imported} bacaan diimpor ke akunmu${unavailable ? `; ${unavailable} unggahan lama sudah tidak tersedia` : ""}. Salinan browser tetap disimpan.`);
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
          {scope === "saved" && legacyIdsToImport.length > 0 && <div className="space-y-2 rounded-2xl border border-warning/50 bg-warning/15 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm leading-6"><strong className="text-navy">Ada {legacyIdsToImport.length} bacaan lama di browser ini.</strong> Impor agar tersimpan di akunmu.</p><Button disabled={importSaved.isPending} onClick={() => importSaved.mutate()} size="sm">{importSaved.isPending ? "Mengimpor…" : "Impor bacaan lama"}</Button></div>{migrationNotice && <p className="text-xs text-muted-foreground" role="status">{migrationNotice}</p>}{importSaved.isError && <p className="text-xs text-destructive" role="alert">{importSaved.error instanceof Error ? importSaved.error.message : "Bacaan lama belum berhasil diimpor. Coba lagi; item yang sudah masuk tidak akan digandakan."}</p>}</div>}
          {scope === "saved" ? savedPosts.isPending ? <LoadingState label="Memuat bacaan tersimpan…"/> : savedPosts.isError ? <ErrorState message={savedPosts.error instanceof ApiRequestError && savedPosts.error.status === 404 ? "Server belum menyediakan daftar bacaan tersimpan. Sambungkan ke backend terbaru; daftar lama di browser tetap aman." : savedPosts.error.message} onRetry={() => void savedPosts.refetch()}/> : savedPosts.data.posts.length === 0 ? <EmptyState description="Gunakan tombol Simpan pada unggahan untuk menyimpannya ke akunmu." title="Belum ada bacaan tersimpan"/> : <div className="space-y-4">{savedPosts.data.posts.map((post) => <FeedPostCard key={post.id} post={post}/>)}</div> : feed.isPending ? <LoadingState label="Memuat unggahan…" /> : feed.isError ? <ErrorState message={feed.error.message} onRetry={() => void feed.refetch()} /> : posts.length === 0 ? <EmptyState description={scope === "following" ? "Ikuti teman agar unggahan mereka muncul di sini." : "Belum ada unggahan. Bagikan satu hal yang baru kamu pelajari."} title="Feed masih kosong" /> : <div className="space-y-4">{posts.map((post) => <FeedPostCard key={post.id} post={post} />)}</div>}
          {scope !== "saved" && feed.hasNextPage && <Button className="w-full" disabled={feed.isFetchingNextPage} onClick={() => void feed.fetchNextPage()} variant="outline">{feed.isFetchingNextPage && <LoaderCircle aria-hidden="true" className="animate-spin" />}Muat unggahan berikutnya</Button>}
        </div>
        <aside className="sticky top-24 space-y-4">
          <div className="rounded-3xl bg-secondary p-5"><img alt="Bubi menemani belajar" className="mx-auto h-32 w-auto" src="/assets/bubi-antusias.svg" /><h2 className="mt-3 font-bold text-navy">Lanjutkan belajar</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Kembali ke workspace dan lanjutkan materi bersama Bubi.</p><Button asChild className="mt-4 w-full"><Link to="/workspaces">Buka workspace</Link></Button></div>
          <StreakCard />
        </aside>
      </div>
    </div>
  );
}
