import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PublicFrame } from "@/components/layout/PublicFrame";
import { api, jsonBody } from "@/lib/api";

export function RecoveryPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const requestReset = useMutation({
    mutationFn: () => api<{ requested: boolean; message: string }>("/auth/password-reset/request", jsonBody("POST", { email })),
    onSuccess: (result) => setMessage(result.message),
  });
  const confirmReset = useMutation({
    mutationFn: () => api<{ changed: boolean }>("/auth/password-reset/confirm", jsonBody("POST", { token, newPassword })),
    onSuccess: () => setMessage("Kata sandi berhasil diubah. Masuk dengan kata sandi barumu."),
  });
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    if (token) {
      if (newPassword !== confirmation) { setMessage("Konfirmasi kata sandi belum sama."); return; }
      confirmReset.mutate();
    } else requestReset.mutate();
  };
  const pending = requestReset.isPending || confirmReset.isPending;
  const error = requestReset.error?.message ?? confirmReset.error?.message;
  const complete = confirmReset.isSuccess;
  return (
    <PublicFrame description={token ? "Tautan pemulihan berlaku selama 30 menit." : "Masukkan email kampus yang digunakan saat mendaftar."} eyebrow="Bantuan akun" sideAction={<Button asChild size="sm" variant="outline"><Link to="/login">Kembali ke masuk</Link></Button>} title={token ? "Buat kata sandi baru" : "Pulihkan akses akun"}>
      <form className="space-y-4" noValidate onSubmit={submit}>
        {token ? <>
          <div className="space-y-2"><Label htmlFor="recovery-password">Kata sandi baru</Label><Input autoComplete="new-password" id="recovery-password" maxLength={128} minLength={8} onChange={(event) => setNewPassword(event.target.value)} required type="password" value={newPassword}/></div>
          <div className="space-y-2"><Label htmlFor="recovery-confirm">Ulangi kata sandi baru</Label><Input autoComplete="new-password" id="recovery-confirm" maxLength={128} minLength={8} onChange={(event) => setConfirmation(event.target.value)} required type="password" value={confirmation}/></div>
        </> : <div className="space-y-2"><Label htmlFor="recovery-email">Email kampus</Label><Input autoComplete="email" id="recovery-email" maxLength={200} onChange={(event) => setEmail(event.target.value)} placeholder="nama@kampus.ac.id" required type="email" value={email}/></div>}
        {message && <p className="rounded-2xl bg-secondary/60 p-4 text-sm leading-6 text-navy" role="status">{message}</p>}
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        {complete ? <Button asChild className="w-full"><Link to="/login">Ke halaman masuk</Link></Button> : <Button className="w-full" disabled={pending || Boolean(token && newPassword.length < 8)} type="submit">{pending ? "Memproses…" : token ? "Simpan kata sandi baru" : "Kirim tautan pemulihan"}</Button>}
      </form>
    </PublicFrame>
  );
}
