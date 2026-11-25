import { type FormEvent, useState } from "react";
import { Link } from "react-router";
import brandMark from "@/assets/brand/deep-notes-mark.svg";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

/**
 * Implements Figma frame 175:205 (Pemulihan Akun).
 * Explicitly labeled as an interface simulation because email reset delivery is not enabled on the backend yet.
 */
export function AccountRecoveryPage() {
  useDocumentTitle("Pemulihan Akun");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed.includes("@") || trimmed.length < 5) {
      setError("Masukkan alamat email yang lengkap.");
      return;
    }
    setError(null);
    setSubmitted(true);
  };

  return (
    <div className="min-h-dvh bg-background px-5 py-8 text-foreground sm:px-10 lg:px-14">
      <div className="mx-auto max-w-[1160px] space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/pembuka"
            className="inline-flex min-h-11 items-center gap-2.5 rounded-md px-1 text-xl font-bold tracking-tight text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <img src={brandMark} alt="" aria-hidden="true" width={28} height={28} />
            <span>Deep Notes</span>
          </Link>
          <Badge variant="outline">Simulasi antarmuka</Badge>
        </header>

        <main className="rounded-3xl border border-border bg-card p-6 sm:p-10 lg:p-12">
          <div className="max-w-xl space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Pulihkan akses akun</h1>
              <p className="text-base text-muted-foreground sm:text-lg">
                Masukkan email kampus yang digunakan saat mendaftar.
              </p>
            </div>

            {submitted ? (
              <div role="status" className="space-y-4 rounded-xl bg-warning p-5 text-sm text-warning-foreground">
                <p className="font-bold">Simulasi permintaan pemulihan untuk {email}</p>
                <p>
                  Pengiriman email pemulihan otomatis belum diaktifkan pada server saat ini. Bila kamu masih masuk di
                  perangkat lain, ubah kata sandi langsung melalui halaman Pengaturan Akun.
                </p>
                <div className="flex flex-wrap gap-2.5">
                  <Button asChild>
                    <Link to="/masuk">Kembali ke Masuk</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/pengaturan">Buka Pengaturan Akun</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="recovery-email" className="text-sm font-bold">
                    Email kampus
                  </Label>
                  <Input
                    id="recovery-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@example.com"
                    aria-invalid={!!error}
                    aria-describedby={error ? "recovery-email-error" : undefined}
                  />
                  {error && (
                    <p id="recovery-email-error" role="alert" className="text-xs font-bold text-destructive">
                      {error}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button type="submit" className="sm:min-w-[220px]">
                    Kirim tautan
                  </Button>
                  <Button asChild variant="secondary" className="sm:min-w-[220px]">
                    <Link to="/masuk">Kembali ke Masuk</Link>
                  </Button>
                </div>
              </form>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
