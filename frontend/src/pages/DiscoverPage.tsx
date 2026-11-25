import { useDeferredValue, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router";
import { ArrowRight, Compass, Search, Users } from "lucide-react";
import type { PublicNotebook } from "@deep-notes/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AppDialog } from "@/components/shared/AppDialog";
import { EmptyState, ErrorState, LoadingState, PageTitle } from "@/components/shared/PageStates";
import { ApiRequestError, api, jsonBody } from "@/lib/api";

function PublicNotebookCard({ notebook }: { notebook: PublicNotebook }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const queryClient = useQueryClient();
  const join = useMutation({
    mutationFn: () => api<{ status: "pending" }>(`/public/notebooks/${notebook.id}/join-requests`, jsonBody("POST", { message })),
    onSuccess: async () => {
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["public-notebooks"] });
    },
  });

  return (
    <article className="rounded-3xl border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3"><span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-navy">{notebook.category || "Mata kuliah"}</span><span className="text-xs text-muted-foreground">Publik</span></div>
      <h2 className="mt-4 text-lg font-bold text-navy">{notebook.title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{notebook.course || "Mata kuliah belum diisi"}</p>
      <p className="mt-3 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-muted-foreground">{notebook.description || "Ruang belajar bersama."}</p>
      <div className="mt-4 flex gap-3 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><Users aria-hidden="true" className="size-3.5" />{notebook.memberCount} anggota</span><span>{notebook.sourceCount} sumber</span></div>
      {notebook.isMember ? <Button asChild className="mt-5 w-full"><Link to={`/workspaces/${notebook.id}`}>Buka workspace<ArrowRight aria-hidden="true" /></Link></Button> : join.isSuccess ? <Button className="mt-5 w-full" disabled variant="secondary">Permintaan terkirim</Button> : <AppDialog description="Pemilik workspace akan meninjau permintaanmu." onOpenChange={setOpen} open={open} title="Minta bergabung" trigger={<Button className="mt-5 w-full" onClick={() => setOpen(true)} variant="outline">Minta bergabung</Button>}>
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); join.mutate(); }}>
          <label className="block space-y-2 text-sm font-semibold" htmlFor={`join-message-${notebook.id}`}>Pesan untuk pemilik <span className="font-normal text-muted-foreground">(opsional)</span></label>
          <Textarea className="min-h-24" id={`join-message-${notebook.id}`} maxLength={300} onChange={(event) => setMessage(event.target.value)} value={message} />
          {join.isError && <ErrorState message={join.error instanceof ApiRequestError ? join.error.message : "Permintaan belum berhasil dikirim."} />}
          <Button className="w-full" disabled={join.isPending} type="submit">{join.isPending ? "Mengirim…" : "Kirim permintaan"}</Button>
        </form>
      </AppDialog>}
    </article>
  );
}

export function DiscoverPage() {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const deferredQuery = useDeferredValue(query.trim());
  const notebooks = useQuery({
    queryKey: ["public-notebooks", deferredQuery],
    queryFn: () => api<PublicNotebook[]>(`/public/notebooks?q=${encodeURIComponent(deferredQuery)}`),
  });

  return (
    <div className="space-y-6">
      <PageTitle description="Temukan workspace mata kuliah publik dan minta izin untuk bergabung." eyebrow="Jelajah" title="Ruang belajar publik" action={<span className="grid size-11 place-items-center rounded-2xl bg-secondary text-primary"><Compass aria-hidden="true" /></span>} />
      <div className="relative max-w-2xl"><Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-10" onChange={(event) => setQuery(event.target.value)} placeholder="Cari mata kuliah atau topik" value={query} /></div>
      {notebooks.isPending ? <LoadingState label="Mencari workspace…" /> : notebooks.isError ? <ErrorState message={notebooks.error.message} onRetry={() => void notebooks.refetch()} /> : notebooks.data.length === 0 ? <EmptyState description="Coba kata kunci lain atau buat workspace publik untuk dibagikan." title="Belum ada hasil" /> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{notebooks.data.map((notebook) => <PublicNotebookCard key={notebook.id} notebook={notebook} />)}</div>}
    </div>
  );
}
