import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router";
import { loginSchema, type LoginInput } from "@deep-notes/shared";
import { Button } from "@/components/ui/button";
import { AuthField } from "@/components/shared/AuthField";
import { AuthDivider, AuthFrame } from "@/components/layout/AuthFrame";
import { useLogin } from "@/features/auth/useAuth";

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const login = useLogin();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/home";
  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  return (
    <AuthFrame description="Lanjutkan belajar dari materi yang kamu simpan." title="Sign In">
      <form noValidate onSubmit={handleSubmit((input) => login.mutate(input, { onSuccess: () => navigate(from, { replace: true }) }))}>
        <div className="space-y-4">
          <AuthField
            autoComplete="email"
            error={errors.email?.message}
            icon={Mail}
            id="login-email"
            label="Email kampus"
            placeholder="nama@kampus.ac.id"
            registration={register("email")}
            type="email"
          />
          <AuthField
            autoComplete="current-password"
            error={errors.password?.message}
            icon={showPassword ? Eye : EyeOff}
            iconAction={{
              label: showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi",
              onClick: () => setShowPassword((show) => !show),
            }}
            id="login-password"
            label="Kata sandi"
            placeholder="Masukkan kata sandi"
            registration={register("password")}
            type={showPassword ? "text" : "password"}
          />
        </div>
        <div className="mt-2 text-right">
          <Link className="text-[14px] font-bold text-navy underline underline-offset-2" to="/recover">Forgot Password?</Link>
        </div>
        {login.isError && <p className="mt-5 rounded-xl bg-destructive/5 p-3 text-sm text-destructive" role="alert">{login.error.message}</p>}
        <Button className="auth-primary-button mt-8 w-full" disabled={login.isPending} type="submit">
          {login.isPending ? "Memeriksa akun…" : "Sign In"}
        </Button>
        <AuthDivider />
        <Button asChild className="auth-secondary-button mt-5 w-full" variant="outline">
          <Link to="/register">Create a new Account</Link>
        </Button>
      </form>
    </AuthFrame>
  );
}
