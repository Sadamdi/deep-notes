import { Link, useLocation, useParams } from "react-router";
import { ArrowLeft, BookOpenText, CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageTitle } from "@/components/shared/PageStates";

export function PublicationHandoffPage() {
  const { pathname } = useLocation();
  const { articleId, authorId } = useParams();
  const title = authorId ? "Profil penulis" : articleId ? "Detail artikel" : "Beranda publikasi";
  const subject = authorId ? "daftar tulisan per penulis, ikuti penulis, dan daftar pengikut" : articleId ? "artikel yang diterbitkan, audiens, komentar, dan balasan" : "daftar artikel publik dan pencarian publikasi";
  return <div className="mx-auto max-w-3xl space-y-6"><PageTitle eyebrow="Handoff backend" title={title} description="Layar ini mengikuti desain final Figma. Konten publik tidak diisi contoh karena API publikasi belum tersedia." action={<Button asChild variant="outline"><Link to="/studio"><ArrowLeft aria-hidden="true"/>Kembali ke studio</Link></Button>}/>
    <Card className="space-y-4 rounded-3xl p-5 sm:p-7"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-secondary text-navy"><CircleHelp aria-hidden="true"/></span><h2 className="font-bold text-navy">Dukungan yang dibutuhkan</h2></div><p className="text-sm leading-6 text-muted-foreground">Backend perlu menyediakan kontrak terverifikasi untuk {subject}. Tidak ada route yang sesuai di modul backend saat ini{articleId ? ` untuk artikel ${articleId}` : authorId ? ` untuk penulis ${authorId}` : ""}.</p><div className="rounded-2xl bg-warning/15 p-4"><p className="text-sm font-semibold text-navy">Belum ada data publik</p><p className="mt-1 text-sm leading-6 text-muted-foreground">Saat API tersedia, halaman ini dapat menampilkan artikel dan tindakan sesuai akses pembaca.</p></div>{authorId && <Button asChild variant="outline"><Link to={`/users/${authorId}`}><BookOpenText aria-hidden="true"/>Buka profil sosial yang tersedia</Link></Button>}{pathname.startsWith("/publications") && <Button asChild><Link to="/studio">Susun draft lokal</Link></Button>}</Card>
  </div>;
}
