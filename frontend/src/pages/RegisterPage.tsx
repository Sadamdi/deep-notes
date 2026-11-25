import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router";
import { registerSchema, type RegisterInput } from "@deep-notes/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PublicFrame } from "@/components/layout/PublicFrame";
import { useRegister } from "@/features/auth/useAuth";

export function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const registerAccount = useRegister();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  return (
    <PublicFrame description="Mulai ruang belajarmu bersama Bubi." eyebrow="Buat ruang belajar" sideAction={<Button asChild size="sm" variant="outline"><Link to="/login">Masuk</Link></Button>} title="Buat akun">
      <form className="space-y-4" noValidate onSubmit={handleSubmit((input) => registerAccount.mutate(input, { onSuccess: () => navigate("/home", { replace: true }) }))}>
        <div className="space-y-2"><Label htmlFor="register-name">Nama lengkap</Label><Input autoComplete="name" id="register-name" placeholder="Nama kamu" aria-invalid={Boolean(errors.name)} {...register("name")} />{errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}</div>
        <div className="space-y-2"><Label htmlFor="register-email">Email kampus</Label><Input autoComplete="email" id="register-email" placeholder="nama@kampus.ac.id" type="email" aria-invalid={Boolean(errors.email)} {...register("email")} />{errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}</div>
        <div className="space-y-2"><Label htmlFor="register-password">Kata sandi</Label><div className="relative"><Input autoComplete="new-password" className="pr-20" id="register-password" placeholder="Minimal 8 karakter" type={showPassword ? "text" : "password"} aria-invalid={Boolean(errors.password)} {...register("password")} /><Button aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"} className="absolute right-1 top-1" onClick={() => setShowPassword((show) => !show)} size="sm" type="button" variant="ghost">{showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}{showPassword ? "Sembunyikan" : "Lihat"}</Button></div>{errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}</div>
        {registerAccount.isError && <p className="rounded-xl bg-destructive/5 p-3 text-sm text-destructive" role="alert">{registerAccount.error.message}</p>}
        <Button className="w-full" disabled={registerAccount.isPending} type="submit">{registerAccount.isPending ? "Membuat akun…" : "Buat akun"}</Button>
        <p className="text-center text-sm text-muted-foreground">Sudah punya akun? <Link className="font-semibold text-primary hover:underline" to="/login">Masuk</Link></p>
      </form>
    </PublicFrame>
  );
}
