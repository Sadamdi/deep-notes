import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Send } from "lucide-react";
import { useSearchParams } from "react-router";
import { createPostSchema, type CreatePostInput, type FeedPost, type GameSessionList, type NotebookListItem } from "@deep-notes/shared";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ErrorState } from "@/components/shared/PageStates";
import { ApiRequestError, api, jsonBody } from "@/lib/api";

type AttachmentOption = { value: string; label: string; attach: NonNullable<CreatePostInput["attach"]> };

export function PostComposer() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const sessionToShare = searchParams.get("session");
  const [attachment, setAttachment] = useState("");
  const notebooks = useQuery({ queryKey: ["notebooks"], queryFn: () => api<NotebookListItem[]>("/notebooks") });
  const sessions = useQuery({
    queryKey: ["feed", "attachable-sessions", notebooks.data?.map((notebook) => notebook.id)],
    enabled: Boolean(notebooks.data?.length),
    queryFn: async () => {
      const responses = await Promise.all(notebooks.data!.map(async (notebook) => ({ notebook, sessions: await api<GameSessionList>(`/notebooks/${notebook.id}/sessions`) })));
      return responses.flatMap(({ notebook, sessions: notebookSessions }) => notebookSessions.filter((session) => session.status === "finished").map((session) => ({ value: `result:${session.id}`, label: `${session.mode === "solo" ? "Mandiri" : session.mode === "duel" ? "Duel" : "Kelompok"} · ${notebook.title} · ${session.createdAt.slice(0, 10)}`, attach: { type: "result" as const, sessionId: session.id } } satisfies AttachmentOption)));
    },
  });
  const post = useMutation({
    mutationFn: (input: CreatePostInput) => api<FeedPost>("/posts", jsonBody("POST", input)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<CreatePostInput>({
    resolver: zodResolver(createPostSchema),
    defaultValues: { body: "" },
  });
  const options: AttachmentOption[] = [
    ...(notebooks.data ?? []).filter((notebook) => notebook.visibility === "public").map((notebook) => ({ value: `notebook:${notebook.id}`, label: notebook.title, attach: { type: "notebook" as const, notebookId: notebook.id } })),
    ...(sessions.data ?? []),
  ];
  useEffect(() => {
    if (sessionToShare && options.some((option) => option.value === `result:${sessionToShare}`)) setAttachment(`result:${sessionToShare}`);
  }, [sessions.data, sessionToShare]);

  return (
    <form className="rounded-3xl border bg-card p-4 sm:p-5" noValidate onSubmit={handleSubmit((input) => {
      const choice = options.find((option) => option.value === attachment);
      const parsed = createPostSchema.safeParse({ ...input, ...(choice ? { attach: choice.attach } : {}) });
      if (parsed.success) post.mutate(parsed.data, { onSuccess: () => { reset(); setAttachment(""); } });
    })}>
      <label className="sr-only" htmlFor="feed-post">Bagikan hal yang kamu pelajari</label>
      <Textarea id="feed-post" maxLength={500} placeholder="Apa yang kamu pelajari hari ini?" {...register("body")} />
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2"><label className="text-xs font-semibold text-muted-foreground" htmlFor="feed-attachment">Lampirkan sesuatu <span className="font-normal">(opsional)</span></label><select className="h-10 w-full rounded-xl border bg-background px-3 text-sm" id="feed-attachment" onChange={(event) => setAttachment(event.target.value)} value={attachment}><option value="">Tanpa lampiran</option>{options.some((option) => option.attach.type === "notebook") && <optgroup label="Workspace publik">{options.filter((option) => option.attach.type === "notebook").map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</optgroup>}{options.some((option) => option.attach.type === "result") && <optgroup label="Hasil sesi">{options.filter((option) => option.attach.type === "result").map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</optgroup>}</select><p className="text-[11px] text-muted-foreground">{sessions.isError ? "Hasil sesi belum dapat dimuat." : "Lampiran workspace hanya tersedia untuk workspace publik."}</p></div>
        <div className="flex items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{watch("body")?.length ?? 0}/500 karakter</p><Button disabled={post.isPending || !(watch("body")?.trim())} type="submit"><Send aria-hidden="true" />{post.isPending ? "Membagikan…" : "Tulis unggahan"}</Button></div>
      </div>
      {errors.body && <p className="mt-2 text-sm text-destructive">{errors.body.message}</p>}
      {post.isError && <div className="mt-3"><ErrorState message={post.error instanceof ApiRequestError ? post.error.message : "Unggahan belum berhasil dibagikan."} /></div>}
    </form>
  );
}
