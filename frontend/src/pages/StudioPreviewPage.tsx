import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, Eye, FilePenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AppDialog } from "@/components/shared/AppDialog";
import { EmptyState, PageTitle } from "@/components/shared/PageStates";
import { readWriterDrafts } from "@/features/studio/localDrafts";

export function StudioPreviewPage() {
  const { draftId = "" } = useParams();
  const [publishOpen, setPublishOpen] = useState(false);
  const drafts = useMemo(() => readWriterDrafts(), []);
  const draft = drafts.find((item) => item.id === draftId);
  if (!draft) return <EmptyState title="Draft tidak ditemukan di perangkat ini" description="Draft lokal hanya tersedia pada browser tempat draft dibuat." action={<Button asChild><Link to="/studio">Kembali ke studio</Link></Button>}/>;
  return <div className="mx-auto max-w-4xl space-y-6"><PageTitle eyebrow="Pratinjau tulisan lokal" title="Pratinjau artikel" description="Pratinjau ini hanya berasal dari draft di browser ini. Tulisan belum diterbitkan atau dibagikan." action={<div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link to={`/studio?draft=${draft.id}`}><ArrowLeft aria-hidden="true"/>Editor</Link></Button><AppDialog description="Figma menyediakan alur publikasi, tetapi backend belum memiliki kontrak API untuk membuat artikel atau mengubah audiensnya." onOpenChange={setPublishOpen} open={publishOpen} title="Publikasi belum tersedia" trigger={<Button onClick={() => setPublishOpen(true)}><Eye aria-hidden="true"/>Atur audiens</Button>}><div className="space-y-3 rounded-2xl bg-warning/15 p-4"><p className="text-sm font-semibold text-navy">Tulisan belum diterbitkan.</p><p className="text-sm leading-6 text-muted-foreground">API artikel, audiens publik, sampul, komentar, dan profil penulis belum tersedia. Draft tetap berada di perangkat ini.</p></div></AppDialog></div>}/>
    <Card className="rounded-3xl p-5 sm:p-9"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Draft lokal · {new Date(draft.updatedAt).toLocaleDateString("id-ID")}</p><h2 className="mt-3 text-3xl font-bold tracking-tight text-navy">{draft.title}</h2>{draft.summary && <p className="mt-3 text-lg leading-7 text-muted-foreground">{draft.summary}</p>}<div className="mt-6 border-t pt-6"><p className="whitespace-pre-wrap text-sm leading-7">{draft.body || "Draft ini belum memiliki isi."}</p></div><Button asChild className="mt-6" variant="outline"><Link to={`/studio?draft=${draft.id}`}><FilePenLine aria-hidden="true"/>Lanjutkan menulis</Link></Button></Card>
  </div>;
}
