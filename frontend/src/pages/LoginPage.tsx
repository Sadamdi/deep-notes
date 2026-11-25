import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router";
import { loginSchema, type LoginInput } from "@deep-notes/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PublicFrame } from "@/components/layout/PublicFrame";
import { useLogin } from "@/features/auth/useAuth";

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const login = useLogin();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/home";
  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  return (
    <PublicFrame description="Lanjutkan belajar dari materi yang kamu simpan." eyebrow="Selamat datang kembali" sideAction={<Button asChild size="sm" variant="outline"><Link to="/register">Buat akun</Link></Button>} title="Masuk">
      <form className="space-y-5" noValidate onSubmit={handleSubmit((input) => login.mutate(input, { onSuccess: () => navigate(from, { replace: true }) }))}>
        <div className="space-y-2"><Label htmlFor="login-email">Email kampus</Label><Input autoComplete="email" id="login-email" placeholder="nama@kampus.ac.id" type="email" aria-invalid={Boolean(errors.email)} {...register("email")} />{errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}</div>
        <div className="space-y-2"><div className="flex items-center justify-between gap-2"><Label htmlFor="login-password">Kata sandi</Label><Link className="text-xs font-semibold text-primary underline-offset-4 hover:underline" to="/recover">Lupa kata sandi?</Link></div><div className="relative"><Input autoComplete="current-password" className="pr-20" id="login-password" type={showPassword ? "text" : "password"} aria-invalid={Boolean(errors.password)} {...register("password")} /><Button aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"} className="absolute right-1 top-1" onClick={() => setShowPassword((show) => !show)} size="sm" type="button" variant="ghost">{showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}{showPassword ? "Sembunyikan" : "Lihat"}</Button></div>{errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}</div>
        {login.isError && <p className="rounded-xl bg-destructive/5 p-3 text-sm text-destructive" role="alert">{login.error.message}</p>}
        <Button className="w-full" disabled={login.isPending} type="submit">{login.isPending ? "Memeriksa akun…" : "Masuk"}</Button>
        <p className="text-center text-sm text-muted-foreground">Belum punya akun? <Link className="font-semibold text-primary hover:underline" to="/register">Daftar</Link></p>
      </form>
    </PublicFrame>
  );
}
