import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PublicFrame } from "@/components/layout/PublicFrame";

export function RecoveryPage() {
  return (
    <PublicFrame description="Masukkan email kampus yang digunakan saat mendaftar." eyebrow="Bantuan akun" sideAction={<Button asChild size="sm" variant="outline"><Link to="/login">Kembali ke masuk</Link></Button>} title="Pulihkan akses akun">
      <div className="space-y-4">
        <div className="space-y-2"><Label htmlFor="recovery-email">Email kampus</Label><Input autoComplete="email" disabled id="recovery-email" placeholder="nama@kampus.ac.id" type="email" /></div>
        <div className="rounded-2xl border border-warning/50 bg-warning/15 p-4 text-sm leading-6" role="status">
          Pemulihan kata sandi melalui email belum tersedia di layanan. Perubahan kata sandi memerlukan sesi masuk dan kata sandi saat ini.
        </div>
        <Button asChild className="w-full" variant="outline"><Link to="/login">Kembali ke masuk</Link></Button>
      </div>
    </PublicFrame>
  );
}
