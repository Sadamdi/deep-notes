import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { ArrowLeft, BookOpenText, MessageCircle, Search, Send, UserRound } from "lucide-react";
import type { ArticleDetail, PublishedArticle, PublicationList, PublicProfile, WriterDraftResponse } from "@deep-notes/shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, ErrorState, LoadingState, PageTitle } from "@/components/shared/PageStates";
import { useNotebooks } from "@/features/notebooks/queries";
import { useAuthMe } from "@/features/auth/useAuth";
import { api, jsonBody } from "@/lib/api";

const publicationsKey = ["publications"] as const;

function ArticleCard({ article }: { article: PublishedArticle }) {
  return <Card className="overflow-hidden rounded-3xl p-0">
    {article.coverUrl && <img alt="" className="h-44 w-full object-cover" loading="lazy" src={article.coverUrl}/>}
    <div className="p-5"><div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span className="rounded-full bg-secondary px-3 py-1 font-semibold text-navy">{article.visibility === "public" ? "Publik" : "Workspace"}</span><Link className="inline-flex items-center gap-1 hover:text-teal" to={`/authors/${article.authorId}`}><UserRound aria-hidden="true" className="size-3.5"/>{article.authorName}</Link><span>{new Date(article.updatedAt).toLocaleDateString("id-ID")}</span></div><Link className="mt-3 block text-lg font-bold text-navy hover:text-teal" to={`/articles/${article.id}`}>{article.title}</Link><p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{article.summary || article.body}</p><p className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground"><MessageCircle aria-hidden="true" className="size-3.5"/>{article.commentCount} komentar</p></div>
  </Card>;
}

export function PublicationHandoffPage() {
  const { articleId = "", authorId = "" } = useParams();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const client = useQueryClient();
  const auth = useAuthMe();
  const notebooks = useNotebooks();
  const [query, setQuery] = useState("");
  const [draftId, setDraftId] = useState(() => new URLSearchParams(search).get("draft") ?? "");
  const [articleToUpdate, setArticleToUpdate] = useState("");
  const [visibility, setVisibility] = useState<"public" | "workspace">("public");
  const [notebookId, setNotebookId] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [replyTo, setReplyTo] = useState("");
  useEffect(() => { setDraftId(new URLSearchParams(search).get("draft") ?? ""); }, [search]);
  const listUrl = `/publications?q=${encodeURIComponent(query.trim())}&limit=20`;
  const list = useQuery({ queryKey: [...publicationsKey, "list", query], queryFn: () => api<PublicationList>(listUrl), enabled: pathname === "/publications" });
  const authorArticles = useQuery({ queryKey: [...publicationsKey, "author", authorId], queryFn: () => api<PublicationList>(`/authors/${authorId}/publications?limit=50`), enabled: Boolean(authorId) });
  const detail = useQuery({ queryKey: [...publicationsKey, "detail", articleId], queryFn: () => api<ArticleDetail>(`/publications/${articleId}`), enabled: Boolean(articleId) });
  const drafts = useQuery({ queryKey: ["me", "drafts"], queryFn: () => api<WriterDraftResponse[]>("/me/drafts"), enabled: pathname === "/publications" });
  const ownArticles = useQuery({ queryKey: [...publicationsKey, "author", auth.data?.id], queryFn: () => api<PublicationList>(`/authors/${auth.data!.id}/publications?limit=50`), enabled: pathname === "/publications" && Boolean(auth.data?.id) });
  const authorProfile = useQuery({ queryKey: ["users", detail.data?.article.authorId], queryFn: () => api<PublicProfile>(`/users/${detail.data!.article.authorId}`), enabled: Boolean(detail.data?.article.authorId) });
  const publish = useMutation({
    mutationFn: async () => {
      const body = { draftId, visibility, ...(visibility === "workspace" ? { notebookId } : {}), ...(coverUrl.trim() ? { coverUrl: coverUrl.trim() } : { coverUrl: null }) };
      return articleToUpdate
        ? api<PublishedArticle>(`/publications/${articleToUpdate}`, jsonBody("PATCH", body))
        : api<PublishedArticle>("/publications", jsonBody("POST", body));
    },
    onSuccess: async (article) => {
      await client.invalidateQueries({ queryKey: publicationsKey });
      navigate(`/articles/${article.id}`);
    },
  });
  const comment = useMutation({
    mutationFn: () => api(`/publications/${articleId}/comments`, jsonBody("POST", { body: commentBody, ...(replyTo ? { parentId: replyTo } : {}) })),
    onSuccess: async () => {
      setCommentBody(""); setReplyTo("");
      await client.invalidateQueries({ queryKey: [...publicationsKey, articleId] });
    },
  });
  const follow = useMutation({
    mutationFn: () => authorProfile.data?.followedByMe
      ? api(`/users/${detail.data!.article.authorId}/follow`, { method: "DELETE" })
      : api(`/users/${detail.data!.article.authorId}/follow`, jsonBody("POST")),
    onSuccess: () => client.invalidateQueries({ queryKey: ["users", detail.data?.article.authorId] }),
  });

  if (articleId) {
    if (detail.isPending || authorProfile.isPending) return <LoadingState label="Memuat artikel…"/>;
    if (detail.isError) return <ErrorState message={detail.error.message} onRetry={() => void detail.refetch()}/>;
    const { article, comments } = detail.data;
    const isAuthor = auth.data?.id === article.authorId;
    return <div className="mx-auto max-w-4xl space-y-5"><Button asChild size="sm" variant="ghost"><Link to="/publications"><ArrowLeft aria-hidden="true"/>Kembali ke publikasi</Link></Button>
      {article.coverUrl && <img alt="Sampul artikel" className="max-h-80 w-full rounded-3xl object-cover" src={article.coverUrl}/>}
      <PageTitle eyebrow={article.visibility === "public" ? "Artikel publik" : "Artikel workspace"} title={article.title} description={`${article.summary} · ${new Date(article.updatedAt).toLocaleDateString("id-ID")}`} action={<div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link to={`/authors/${article.authorId}`}><UserRound aria-hidden="true"/>{article.authorName}</Link></Button>{!isAuthor && <Button disabled={follow.isPending || authorProfile.isError} onClick={() => follow.mutate()} variant={authorProfile.data?.followedByMe ? "outline" : "default"}>{authorProfile.data?.followedByMe ? "Mengikuti" : "Ikuti penulis"}</Button>}</div>}/>
      {follow.isError && <p className="text-sm text-destructive" role="alert">{follow.error.message}</p>}
      <Card className="rounded-3xl p-5 sm:p-7"><div className="whitespace-pre-wrap text-sm leading-7 text-foreground">{article.body}</div><p className="mt-6 border-t pt-4 text-xs text-muted-foreground">Versi terbit {article.version}. Perubahan pada draft tidak tampil sampai diterbitkan kembali.</p></Card>
      <section className="space-y-4"><div className="flex items-center gap-2"><MessageCircle aria-hidden="true" className="size-5 text-teal"/><h2 className="font-bold text-navy">Diskusi · {comments.length}</h2></div>
        <form className="space-y-3 rounded-3xl border bg-card p-4" onSubmit={(event: FormEvent) => { event.preventDefault(); if (commentBody.trim()) comment.mutate(); }}>
          {replyTo && <p className="text-xs text-muted-foreground">Balas komentar · <button className="font-semibold text-teal" onClick={() => setReplyTo("")} type="button">Batal</button></p>}
          <Label className="sr-only" htmlFor="article-comment">Tulis komentar</Label><Textarea id="article-comment" maxLength={2000} onChange={(event) => setCommentBody(event.target.value)} placeholder="Tulis komentar atau pertanyaan…" value={commentBody}/>
          {comment.isError && <p className="text-sm text-destructive" role="alert">{comment.error.message}</p>}
          <Button disabled={comment.isPending || !commentBody.trim()} type="submit"><Send aria-hidden="true"/>{comment.isPending ? "Mengirim…" : "Kirim komentar"}</Button>
        </form>
        {comments.length ? comments.map((item) => <article className={`rounded-2xl border bg-card p-4 ${item.parentId ? "ml-6 sm:ml-12" : ""}`} key={item.id}><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-navy">{item.authorName}</p><time className="text-xs text-muted-foreground" dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</time></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{item.body}</p>{!item.parentId && <button className="mt-3 text-xs font-semibold text-teal hover:underline" onClick={() => setReplyTo(item.id)} type="button">Balas</button>}</article>) : <EmptyState title="Belum ada komentar" description="Mulai diskusi dengan penulis tentang isi artikel."/>}
      </section>
    </div>;
  }

  if (authorId) return <div className="space-y-5"><PageTitle eyebrow="Tulisan penulis" title="Publikasi penulis" description="Tulisan yang boleh kamu baca dari profil ini." action={<Button asChild variant="outline"><Link to={`/users/${authorId}`}><UserRound aria-hidden="true"/>Profil sosial</Link></Button>}/>{authorArticles.isPending ? <LoadingState label="Memuat tulisan…"/> : authorArticles.isError ? <ErrorState message={authorArticles.error.message} onRetry={() => void authorArticles.refetch()}/> : authorArticles.data.items.length ? <div className="grid gap-4 md:grid-cols-2">{authorArticles.data.items.map((article) => <ArticleCard article={article} key={article.id}/>)}</div> : <EmptyState title="Belum ada tulisan yang dapat dibaca" description="Artikel privat workspace hanya terlihat oleh anggota workspace."/>}</div>;

  return <div className="space-y-6"><PageTitle eyebrow="Publikasi" title="Tulisan komunitas" description="Baca artikel belajar dan terbitkan snapshot dari draft Studio." action={<Button asChild variant="outline"><Link to="/studio"><BookOpenText aria-hidden="true"/>Buka Studio</Link></Button>}/>
    <Card className="space-y-4 rounded-3xl p-4 sm:p-6"><div><h2 className="font-bold text-navy">Terbitkan dari draft</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Draft akan disalin menjadi versi terbit. Editan berikutnya baru terlihat setelah kamu menerbitkan versi baru.</p></div>
      {drafts.isPending || notebooks.isPending || ownArticles.isPending ? <LoadingState label="Memuat draft dan workspace…"/> : drafts.isError ? <ErrorState message={drafts.error.message} onRetry={() => void drafts.refetch()}/> : notebooks.isError ? <ErrorState message={notebooks.error.message} onRetry={() => void notebooks.refetch()}/> : <form className="grid gap-4 sm:grid-cols-2" onSubmit={(event: FormEvent) => { event.preventDefault(); publish.mutate(); }}>
        <div className="space-y-2"><Label htmlFor="publication-draft">Draft Studio</Label><select className="h-11 w-full rounded-xl border bg-background px-3 text-sm" id="publication-draft" onChange={(event) => setDraftId(event.target.value)} value={draftId}><option value="">Pilih draft</option>{drafts.data.map((draft) => <option key={draft.id} value={draft.id}>{draft.title}</option>)}</select></div>
        <div className="space-y-2"><Label htmlFor="publication-update">Terbitkan sebagai</Label><select className="h-11 w-full rounded-xl border bg-background px-3 text-sm" id="publication-update" onChange={(event) => { const value = event.target.value; setArticleToUpdate(value); const existing = ownArticles.data?.items.find((item) => item.id === value); if (existing) { setVisibility(existing.visibility); setNotebookId(existing.notebookId ?? ""); setCoverUrl(existing.coverUrl ?? ""); } }} value={articleToUpdate}><option value="">Artikel baru</option>{ownArticles.data?.items.map((article) => <option key={article.id} value={article.id}>Versi baru · {article.title}</option>)}</select></div>
        <div className="space-y-2"><Label htmlFor="publication-visibility">Audiens</Label><select className="h-11 w-full rounded-xl border bg-background px-3 text-sm" id="publication-visibility" onChange={(event) => setVisibility(event.target.value as "public" | "workspace")} value={visibility}><option value="public">Publik</option><option value="workspace">Anggota workspace</option></select></div>
        {visibility === "workspace" && <div className="space-y-2"><Label htmlFor="publication-notebook">Workspace</Label><select className="h-11 w-full rounded-xl border bg-background px-3 text-sm" id="publication-notebook" onChange={(event) => setNotebookId(event.target.value)} value={notebookId}><option value="">Pilih workspace</option>{notebooks.data.map((notebook) => <option key={notebook.id} value={notebook.id}>{notebook.title}</option>)}</select></div>}
        <div className="space-y-2 sm:col-span-2"><Label htmlFor="publication-cover">URL sampul (opsional)</Label><Input id="publication-cover" maxLength={2000} onChange={(event) => setCoverUrl(event.target.value)} placeholder="https://…" type="url" value={coverUrl}/></div>
        {publish.isError && <p className="text-sm text-destructive sm:col-span-2" role="alert">{publish.error.message}</p>}
        <div className="sm:col-span-2"><Button disabled={publish.isPending || !draftId || (visibility === "workspace" && !notebookId)} type="submit">{publish.isPending ? "Menerbitkan…" : articleToUpdate ? "Terbitkan versi baru" : "Terbitkan artikel"}</Button></div>
      </form>}
    </Card>
    <div className="flex flex-col gap-3 sm:flex-row"><Label className="sr-only" htmlFor="publication-search">Cari tulisan</Label><div className="relative flex-1"><Search aria-hidden="true" className="absolute left-3 top-3 size-4 text-muted-foreground"/><Input className="pl-9" id="publication-search" onChange={(event) => setQuery(event.target.value)} placeholder="Cari judul atau topik…" value={query}/></div></div>
    {list.isPending ? <LoadingState label="Memuat publikasi…"/> : list.isError ? <ErrorState message={list.error.message} onRetry={() => void list.refetch()}/> : list.data.items.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{list.data.items.map((article) => <ArticleCard article={article} key={article.id}/>)}</div> : <EmptyState title="Belum ada artikel" description="Terbitkan draft Studio atau coba pencarian yang berbeda."/>}
  </div>;
}
