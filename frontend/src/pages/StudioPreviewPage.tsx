import { Link, useParams } from "react-router";
import { ArrowLeft, Eye, FilePenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState, PageTitle } from "@/components/shared/PageStates";
import { useWriterDrafts } from "@/features/studio/queries";

export function StudioPreviewPage() {
  const { draftId = "" } = useParams();
  const draftsQuery = useWriterDrafts();
  if (draftsQuery.isPending) return <LoadingState label="Memuat pratinjau draft…"/>;
  if (draftsQuery.isError) return <ErrorState message={draftsQuery.error.message} onRetry={() => void draftsQuery.refetch()}/>;
  const drafts = draftsQuery.data;
  const draft = drafts.find((item) => item.id === draftId);
  if (!draft) return <EmptyState title="Draft tidak ditemukan di akunmu" description="Draft ini mungkin sudah dihapus atau kamu sedang memakai akun yang berbeda." action={<Button asChild><Link to="/studio">Kembali ke studio</Link></Button>}/>;
  return <div className="mx-auto max-w-4xl space-y-6"><PageTitle eyebrow="Pratinjau draft pribadi" title="Pratinjau artikel" description="Tulisan ini tersimpan di akunmu. Draft belum diterbitkan atau dibagikan." action={<div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link to={`/studio?draft=${draft.id}`}><ArrowLeft aria-hidden="true"/>Editor</Link></Button><Button asChild><Link to={`/publications?draft=${draft.id}`}><Eye aria-hidden="true"/>Atur audiens</Link></Button></div>}/>
    <Card className="rounded-3xl p-5 sm:p-9"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Diperbarui {new Date(draft.updatedAt).toLocaleDateString("id-ID")}</p><h2 className="mt-3 text-3xl font-bold tracking-tight text-navy">{draft.title}</h2>{draft.summary && <p className="mt-3 text-lg leading-7 text-muted-foreground">{draft.summary}</p>}<div className="mt-6 border-t pt-6"><p className="whitespace-pre-wrap text-sm leading-7">{draft.body || "Draft ini belum memiliki isi."}</p></div><Button asChild className="mt-6" variant="outline"><Link to={`/studio?draft=${draft.id}`}><FilePenLine aria-hidden="true"/>Lanjutkan menulis</Link></Button></Card>
  </div>;
}
