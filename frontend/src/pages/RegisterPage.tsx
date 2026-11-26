import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Mail, UserRound } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router";
import { registerSchema, type RegisterInput } from "@deep-notes/shared";
import { Button } from "@/components/ui/button";
import { AuthField } from "@/components/shared/AuthField";
import { AuthDivider, AuthFrame } from "@/components/layout/AuthFrame";
import { useRegister } from "@/features/auth/useAuth";

export function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const registerAccount = useRegister();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  return (
    <AuthFrame description="Mulai ruang belajarmu bersama Deep Notes." title="Sign Up">
      <form noValidate onSubmit={handleSubmit((input) => registerAccount.mutate(input, { onSuccess: () => navigate("/home", { replace: true }) }))}>
        <div className="space-y-4">
          <AuthField
            autoComplete="name"
            error={errors.name?.message}
            icon={UserRound}
            id="register-name"
            label="Nama Lengkap"
            placeholder="Nama lengkap"
            registration={register("name")}
          />
          <AuthField
            autoComplete="email"
            error={errors.email?.message}
            icon={Mail}
            id="register-email"
            label="Email kampus"
            placeholder="nama@kampus.ac.id"
            registration={register("email")}
            type="email"
          />
          <AuthField
            autoComplete="new-password"
            error={errors.password?.message}
            icon={showPassword ? Eye : EyeOff}
            iconAction={{
              label: showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi",
              onClick: () => setShowPassword((show) => !show),
            }}
            id="register-password"
            label="Password"
            placeholder="Masukkan kata sandi"
            registration={register("password")}
            type={showPassword ? "text" : "password"}
          />
        </div>
        {registerAccount.isError && <p className="mt-5 rounded-xl bg-destructive/5 p-3 text-sm text-destructive" role="alert">{registerAccount.error.message}</p>}
        <Button className="auth-primary-button mt-11 w-full" disabled={registerAccount.isPending} type="submit">
          {registerAccount.isPending ? "Membuat akun…" : "Sign Up"}
        </Button>
        <AuthDivider />
        <Button asChild className="auth-secondary-button mt-5 w-full" variant="outline">
          <Link to="/login">Sign In to your account</Link>
        </Button>
      </form>
    </AuthFrame>
  );
}
