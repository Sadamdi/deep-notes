import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { MessageCircle, Send, Trash2 } from "lucide-react";
import { createCommentSchema, type CommentResponse, type CreateCommentInput } from "@deep-notes/shared";
import { AppDialog } from "@/components/shared/AppDialog";
import { ErrorState, LoadingState } from "@/components/shared/PageStates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, jsonBody, ApiRequestError } from "@/lib/api";
import { useAuthMe } from "@/features/auth/useAuth";

export function CommentDialog({ postId, postAuthorId, commentCount }: { postId: string; postAuthorId: string; commentCount: number }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const me = useAuthMe();
  const comments = useQuery({
    queryKey: ["posts", postId, "comments"],
    queryFn: () => api<CommentResponse[]>(`/posts/${postId}/comments`),
    enabled: open,
  });
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateCommentInput>({ resolver: zodResolver(createCommentSchema) });
  const createComment = useMutation({
    mutationFn: (input: CreateCommentInput) => api<{ id: string }>(`/posts/${postId}/comments`, jsonBody("POST", input)),
    onSuccess: async () => {
      reset();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["posts", postId, "comments"] }),
        queryClient.invalidateQueries({ queryKey: ["feed"] }),
      ]);
    },
  });
  const deleteComment = useMutation({
    mutationFn: (commentId: string) => api<{ deleted: true }>(`/posts/${postId}/comments/${commentId}`, { method: "DELETE" }),
    onSuccess: async () => Promise.all([queryClient.invalidateQueries({ queryKey: ["posts", postId, "comments"] }), queryClient.invalidateQueries({ queryKey: ["feed"] })]),
  });

  return (
    <AppDialog description={`${commentCount} tanggapan`} onOpenChange={setOpen} open={open} title="Diskusi unggahan" trigger={<Button onClick={() => setOpen(true)} size="sm" variant="ghost"><MessageCircle aria-hidden="true" />Balas <span className="text-muted-foreground">{commentCount}</span></Button>}>
      <div className="space-y-4">
        {comments.isPending ? <LoadingState label="Memuat tanggapan…" /> : comments.isError ? <ErrorState message={comments.error.message} onRetry={() => void comments.refetch()} /> : comments.data.length === 0 ? <p className="rounded-xl bg-muted/60 p-4 text-sm text-muted-foreground">Belum ada tanggapan. Mulai diskusi dengan santun.</p> : <ul className="max-h-64 space-y-3 overflow-y-auto">{comments.data.map((comment) => <li className="flex items-start gap-3 rounded-xl bg-muted/60 p-3" key={comment.id}><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{comment.authorName}</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6">{comment.body}</p></div>{(comment.authorId === me.data?.id || postAuthorId === me.data?.id) && <Button aria-label="Hapus tanggapan" disabled={deleteComment.isPending} onClick={() => { if (window.confirm("Hapus tanggapan ini?")) deleteComment.mutate(comment.id); }} size="icon-sm" variant="ghost"><Trash2 aria-hidden="true" className="size-4"/></Button>}</li>)}</ul>}
        <form className="flex gap-2" onSubmit={handleSubmit((input) => createComment.mutate(input))}>
          <div className="min-w-0 flex-1"><label className="sr-only" htmlFor={`comment-${postId}`}>Tulis tanggapan</label><Input id={`comment-${postId}`} maxLength={300} placeholder="Tulis tanggapan…" {...register("body")} />{errors.body && <p className="mt-1 text-xs text-destructive">{errors.body.message}</p>}</div>
          <Button aria-label="Kirim tanggapan" disabled={createComment.isPending} size="icon" type="submit"><Send aria-hidden="true" /></Button>
        </form>
        {createComment.isError && <ErrorState message={createComment.error instanceof ApiRequestError ? createComment.error.message : "Tanggapan belum berhasil dikirim."} />}
        {deleteComment.isError && <ErrorState message={deleteComment.error.message}/>}
      </div>
    </AppDialog>
  );
}
