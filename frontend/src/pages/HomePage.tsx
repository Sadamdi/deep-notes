import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateNotebookInput, Performance } from "@deep-notes/shared";
import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router";
import bubiAntusias from "@/assets/brand/bubi-antusias.svg";
import notebookIcon from "@/assets/icons/notebook.svg";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/features/auth/useAuth";
import { CreateNotebookForm } from "@/features/notebooks/CreateNotebookForm";
import { api } from "@/lib/api";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

type FeedPost = {
  id: string;
  body: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  authorCourse: string | null;
  likes: number;
  likedByMe: boolean;
  comments: number;
  followingAuthor: boolean;
  card:
    | {
        type: "notebook";
        id?: string;
        title?: string;
        sourceCount?: number;
        memberCount?: number;
        unavailable?: boolean;
      }
    | { type: "result"; mode?: string; correct?: number; total?: number; points?: number }
    | null;
};

type FeedResponse = {
  posts: FeedPost[];
  nextBefore: string | null;
};

type MyNotebookSummary = {
  id: string;
  title: string;
  visibility: "private" | "public";
};

export function HomePage({ scope = "all" }: { scope?: "all" | "following" }) {
  useDocumentTitle(scope === "following" ? "Mengikuti" : "Beranda");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const [beatIndex, setBeatIndex] = useState(0);
  const [composerOpen, setComposerOpen] = useState(false);
  const [postBody, setPostBody] = useState("");
  const [attachNotebookId, setAttachNotebookId] = useState("");
  const [postError, setPostError] = useState<string | null>(null);

  const demoQuery = useQuery({
    queryKey: ["companion-demo", "explain"],
    queryFn: () => api<Performance>("/companion/demo?scenario=explain"),
  });

  const feedQuery = useQuery({
    queryKey: ["feed", scope],
    queryFn: () => api<FeedResponse>(`/feed?scope=${scope}&limit=20`),
    enabled: isAuthenticated,
  });

  const myNotebooksQuery = useQuery({
    queryKey: ["notebooks", "mine"],
    queryFn: () => api<MyNotebookSummary[]>("/notebooks"),
    enabled: isAuthenticated,
  });

  const createPostMutation = useMutation({
    mutationFn: () =>
      api("/posts", {
        method: "POST",
        body: JSON.stringify({
          body: postBody.trim(),
          attach: attachNotebookId ? { type: "notebook", notebookId: attachNotebookId } : undefined,
        }),
      }),
    onSuccess: async () => {
      setPostBody("");
      setAttachNotebookId("");
      setComposerOpen(false);
      setPostError(null);
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
    onError: (err) => {
      setPostError(err instanceof Error ? err.message : "Gagal menerbitkan unggahan.");
    },
  });

  const toggleLikeMutation = useMutation({
    mutationFn: ({ id, liked }: { id: string; liked: boolean }) =>
      api(`/posts/${id}/like`, { method: liked ? "DELETE" : "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feed"] }),
  });

  const toggleFollowMutation = useMutation({
    mutationFn: ({ authorId, following }: { authorId: string; following: boolean }) =>
      api(`/users/${authorId}/follow`, { method: following ? "DELETE" : "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feed"] }),
  });

  const handleCreateNotebook = async (input: CreateNotebookInput) => {
    const created = await api<{ id: string }>("/notebooks", {
      method: "POST",
      body: JSON.stringify(input),
    });
    await navigate(`/notebooks/${created.id}`);
  };

  const handlePublishPost = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (postBody.trim().length < 1) {
      setPostError("Tulis isi catatan singkat terlebih dahulu.");
      return;
    }
    createPostMutation.mutate();
  };

  const beats = demoQuery.data?.beats ?? [];
  const activeBeat = beats[Math.min(beatIndex, Math.max(beats.length - 1, 0))];
  const activeCitation =
    activeBeat && activeBeat.citation !== null ? demoQuery.data?.citations[activeBeat.citation] : undefined;

  const publicMine = (myNotebooksQuery.data ?? []).filter((n) => n.visibility === "public");
  const latestNotebook = myNotebooksQuery.data?.[0];

  if (!isAuthenticated) {
    return (
      <div className="space-y-8">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-[34px]">
              Ruang belajar kelompok bersama <span className="text-brand-teal">Bubi</span>
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
              Kumpulkan materi kuliah satu kelompok, ajukan pertanyaan yang dijawab hanya dari sumber kelompok dengan
              sitasi halaman, lalu uji pemahaman bersama.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Button asChild variant="secondary">
              <Link to="/pembuka">Halaman Pembuka</Link>
            </Button>
            <Button asChild>
              <Link to="/daftar">Mulai Belajar</Link>
            </Button>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-12">
          <section
            aria-labelledby="bubi-preview-heading"
            className="flex flex-col justify-between gap-5 rounded-2xl bg-secondary p-5 text-secondary-foreground sm:p-6 lg:col-span-7"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="space-y-1">
                <h2 id="bubi-preview-heading" className="text-xl font-bold text-secondary-foreground sm:text-2xl">
                  Pratinjau belajar bersama Bubi
                </h2>
                <p className="text-sm text-muted-foreground">
                  Setiap penjelasan selalu berupa teks lengkap dan merujuk ke halaman sumber.
                </p>
              </div>
              <Badge variant="outline" className="border-foreground/25 bg-card text-foreground">
                Data contoh API
              </Badge>
            </div>

            {demoQuery.isPending && (
              <div role="status" className="rounded-xl bg-card p-5 text-sm font-medium text-muted-foreground">
                Memuat contoh langkah penjelasan dari server...
              </div>
            )}

            {demoQuery.isError && (
              <div role="alert" className="space-y-3 rounded-xl bg-card p-5 text-sm text-foreground">
                <p className="font-bold text-destructive">Contoh penjelasan belum dapat dimuat dari server.</p>
                <Button type="button" variant="outline" onClick={() => void demoQuery.refetch()}>
                  Muat Ulang Contoh
                </Button>
              </div>
            )}

            {demoQuery.isSuccess && activeBeat && (
              <>
                <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <p className="text-xs font-bold text-secondary-foreground">
                    Langkah {beatIndex + 1} dari {beats.length} · ekspresi: {activeBeat.emotion}
                  </p>
                  <img
                    src={bubiAntusias}
                    alt="Maskot Bubi mendampingi sesi belajar"
                    width={120}
                    height={128}
                    className="h-auto w-[108px] sm:w-[120px]"
                  />
                </div>

                <div className="space-y-3 rounded-xl bg-card p-4 text-card-foreground sm:p-5">
                  <p className="text-sm leading-relaxed sm:text-base">{activeBeat.say}</p>
                  {activeCitation && (
                    <p className="inline-flex flex-wrap items-center gap-1.5 rounded-md bg-muted px-2.5 py-1.5 text-xs font-bold text-cite">
                      <span>Sitasi: {activeCitation.sourceTitle}</span>
                      {activeCitation.page !== null && <span>· halaman {activeCitation.page}</span>}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={beatIndex === 0}
                      onClick={() => setBeatIndex((idx) => Math.max(0, idx - 1))}
                    >
                      Sebelumnya
                    </Button>
                    <Button
                      type="button"
                      disabled={beatIndex >= beats.length - 1}
                      onClick={() => setBeatIndex((idx) => Math.min(beats.length - 1, idx + 1))}
                    >
                      Langkah Berikutnya
                    </Button>
                  </div>
                  <Link
                    to="/notebooks/sample"
                    className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-bold text-secondary-foreground underline underline-offset-4 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    Lihat contoh ruang belajar
                  </Link>
                </div>
              </>
            )}
          </section>

          <Card className="lg:col-span-5">
            <CardHeader>
              <CardTitle className="text-xl font-bold">Buat workspace mata kuliah</CardTitle>
              <CardDescription>
                Satu ruang bersama untuk materi PDF, catatan, tanya jawab bersitasi, dan kuis latihan kelompok.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <CreateNotebookForm onSubmit={handleCreateNotebook} />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  /* Signed-in Beranda: implements Figma frame 175:225 ("1 Beranda (feed sosial)") */
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-[36px]">
          {scope === "following" ? "Mengikuti" : "Ilmu dari teman"}
        </h1>
        <div className="flex flex-wrap gap-2.5">
          <Button asChild variant="secondary">
            <Link to={scope === "following" ? "/" : "/mengikuti"}>
              {scope === "following" ? "Semua Kiriman" : "Mengikuti"}
            </Link>
          </Button>
          <Button type="button" onClick={() => setComposerOpen((v) => !v)}>
            {composerOpen ? "Tutup Editor" : "Tulis Unggahan"}
          </Button>
        </div>
      </header>

      {composerOpen && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold">Tulis Unggahan Belajar</CardTitle>
            <CardDescription>Bagikan rangkuman atau lampirkan workspace publik milikmu.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePublishPost} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="post-body" className="text-xs font-bold">
                  Catatan belajar (maksimal 500 karakter)
                </Label>
                <textarea
                  id="post-body"
                  rows={3}
                  maxLength={500}
                  value={postBody}
                  onChange={(e) => setPostBody(e.target.value)}
                  placeholder="Apa konsep menarik yang baru kamu pelajari hari ini?"
                  className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-card-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                />
              </div>

              {publicMine.length > 0 && (
                <div className="space-y-1.5">
                  <Label htmlFor="post-attach-nb" className="text-xs font-bold">
                    Lampirkan workspace publik (opsional)
                  </Label>
                  <select
                    id="post-attach-nb"
                    value={attachNotebookId}
                    onChange={(e) => setAttachNotebookId(e.target.value)}
                    className="min-h-11 w-full rounded-lg border border-input bg-card px-3 text-sm text-card-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    <option value="">Tanpa lampiran</option>
                    {publicMine.map((nb) => (
                      <option key={nb.id} value={nb.id}>
                        {nb.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {postError && (
                <p role="alert" className="text-xs font-bold text-destructive">
                  {postError}
                </p>
              )}

              <Button type="submit" disabled={createPostMutation.isPending}>
                {createPostMutation.isPending ? "Menerbitkan..." : "Terbitkan Unggahan"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-12">
        {/* Feed column */}
        <section aria-label="Linimasa belajar" className="space-y-4 lg:col-span-8">
          {feedQuery.isPending && (
            <Card>
              <CardContent className="py-8">
                <p role="status" className="text-sm text-muted-foreground">
                  Memuat kiriman teman belajar...
                </p>
              </CardContent>
            </Card>
          )}

          {feedQuery.isError && (
            <Card>
              <CardContent className="space-y-3 py-6">
                <p role="alert" className="text-sm font-bold text-destructive">
                  Gagal memuat linimasa belajar.
                </p>
                <Button type="button" variant="outline" onClick={() => void feedQuery.refetch()}>
                  Muat Ulang
                </Button>
              </CardContent>
            </Card>
          )}

          {feedQuery.isSuccess && feedQuery.data.posts.length === 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-bold">
                  {scope === "following" ? "Belum ada kiriman dari akun yang diikuti" : "Belum ada unggahan belajar"}
                </CardTitle>
                <CardDescription>
                  Jadilah yang pertama membagikan rangkuman belajar atau lampirkan workspace publik melalui tombol Tulis
                  Unggahan.
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {feedQuery.isSuccess &&
            feedQuery.data.posts.map((post) => {
              const initials = post.authorName
                .split(" ")
                .map((p) => p[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();
              return (
                <Card key={post.id}>
                  <CardContent className="space-y-4 pt-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span
                          aria-hidden="true"
                          className="inline-flex size-10 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
                        >
                          {initials}
                        </span>
                        <div>
                          <p className="text-sm font-bold text-card-foreground">{post.authorName}</p>
                          <p className="text-xs text-muted-foreground">
                            {post.authorCourse ?? "Mahasiswa"} · {new Date(post.createdAt).toLocaleDateString("id-ID")}
                          </p>
                        </div>
                      </div>

                      {user && post.authorId !== user.id && (
                        <Button
                          type="button"
                          size="xs"
                          variant={post.followingAuthor ? "outline" : "secondary"}
                          onClick={() =>
                            toggleFollowMutation.mutate({
                              authorId: post.authorId,
                              following: post.followingAuthor,
                            })
                          }
                        >
                          {post.followingAuthor ? "Diikuti" : "Ikuti"}
                        </Button>
                      )}
                    </div>

                    <p className="whitespace-pre-line text-sm leading-relaxed text-card-foreground sm:text-base">
                      {post.body}
                    </p>

                    {post.card?.type === "notebook" && !post.card.unavailable && post.card.id && (
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-secondary p-4 text-secondary-foreground">
                        <div className="flex items-center gap-3">
                          <img
                            src={notebookIcon}
                            alt=""
                            aria-hidden="true"
                            width={21}
                            height={21}
                            className="dark:brightness-0 dark:invert"
                          />
                          <div>
                            <p className="text-sm font-bold">{post.card.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {post.card.sourceCount ?? 0} sumber · {post.card.memberCount ?? 1} anggota
                            </p>
                          </div>
                        </div>
                        <Button asChild size="sm">
                          <Link to={`/notebooks/${post.card.id}`}>Buka</Link>
                        </Button>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <Button
                        type="button"
                        size="xs"
                        variant={post.likedByMe ? "secondary" : "outline"}
                        onClick={() => toggleLikeMutation.mutate({ id: post.id, liked: post.likedByMe })}
                      >
                        {post.likedByMe ? "Disukai" : "Suka"} ({post.likes})
                      </Button>
                      <span className="text-xs font-medium text-muted-foreground">{post.comments} komentar</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </section>

        {/* Right companion and quick workspace column */}
        <aside aria-label="Lanjutkan belajar" className="space-y-4 lg:col-span-4">
          <div className="space-y-4 rounded-2xl bg-secondary p-5 text-secondary-foreground">
            <div className="space-y-1">
              <h2 className="text-xl font-bold">Lanjutkan belajar</h2>
              <p className="text-sm text-muted-foreground">
                {latestNotebook ? latestNotebook.title : "Buka workspace untuk tanya Bubi"}
              </p>
            </div>
            <div className="flex justify-center">
              <img src={bubiAntusias} alt="" aria-hidden="true" width={128} height={136} className="h-auto w-[124px]" />
            </div>
            <Button asChild className="w-full">
              <Link to={latestNotebook ? `/notebooks/${latestNotebook.id}` : "/workspace"}>
                {latestNotebook ? "Lanjutkan dengan Bubi" : "Buat Workspace Pertama"}
              </Link>
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold">Workspace saya</CardTitle>
              <CardDescription>
                {myNotebooksQuery.data?.length
                  ? `${myNotebooksQuery.data.length} ruang belajar aktif`
                  : "Belum ada ruang yang dibuat"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="secondary" className="w-full">
                <Link to="/workspace">Buka Ruang</Link>
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
