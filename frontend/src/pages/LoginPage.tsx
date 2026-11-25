import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { loginSchema, type LoginInput } from "@deep-notes/shared";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthSplitShell } from "@/features/auth/AuthSplitShell";
import { AUTH_ME_QUERY_KEY, type CurrentUser } from "@/features/auth/useAuth";
import { ApiRequestError, api } from "@/lib/api";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

/** Implements Figma frames 175:166 (Masuk), 182:3148 (Masuk · galat), and 175:5303 (Masuk · Mobile). */
export function LoginPage() {
  useDocumentTitle("Masuk");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const nextPath = searchParams.get("next") || "/workspace";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginInput) => {
    setServerError(null);
    try {
      const user = await api<CurrentUser>("/auth/login", {
        method: "POST",
        body: JSON.stringify(values),
      });
      queryClient.setQueryData(AUTH_ME_QUERY_KEY, { ...user, lookingForPartners: false });
      await queryClient.invalidateQueries();
      await navigate(nextPath.startsWith("/") ? nextPath : "/workspace");
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.code === "UNAUTHORIZED") {
          setServerError("Email atau kata sandi belum tepat.");
          return;
        }
        if (err.code === "RATE_LIMITED") {
          setServerError("Terlalu banyak percobaan masuk. Tunggu sebentar lalu coba lagi.");
          return;
        }
      }
      setServerError(err instanceof Error ? err.message : "Gagal masuk ke akun. Coba lagi.");
    }
  };

  return (
    <AuthSplitShell title="Masuk" subtitle="Lanjutkan belajar dari materi yang kamu simpan.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="login-email" className="text-sm font-bold">
            Email kampus
          </Label>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="nama@example.com"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "login-email-error" : undefined}
            {...register("email")}
          />
          {errors.email && (
            <p id="login-email-error" role="alert" className="text-xs font-bold text-destructive">
              Masukkan alamat email yang lengkap.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="login-password" className="text-sm font-bold">
            Kata sandi
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Masukkan kata sandi"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "login-password-error" : undefined}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-pressed={showPassword}
              className="min-h-11 shrink-0 rounded-lg border border-border bg-muted px-3.5 text-xs font-bold text-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {showPassword ? "Tutup" : "Lihat"}
            </button>
          </div>
          {errors.password && (
            <p id="login-password-error" role="alert" className="text-xs font-bold text-destructive">
              Masukkan kata sandi akun kamu.
            </p>
          )}
        </div>

        {serverError && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 px-3.5 py-2.5 text-xs font-bold text-destructive"
          >
            {serverError}
          </p>
        )}

        <div className="space-y-3 pt-2">
          <Button type="submit" className="w-full justify-start px-4 text-[15px]" disabled={isSubmitting}>
            {isSubmitting ? "Memproses masuk..." : "Masuk"}
          </Button>

          <Button asChild variant="secondary" className="w-full justify-start px-4 text-[15px]">
            <Link to="/pemulihan">Lupa kata sandi?</Link>
          </Button>

          <Button asChild variant="secondary" className="w-full justify-start px-4 text-[15px]">
            <Link to={`/daftar${searchParams.get("next") ? `?next=${encodeURIComponent(nextPath)}` : ""}`}>
              Belum punya akun? Daftar
            </Link>
          </Button>
        </div>
      </form>
    </AuthSplitShell>
  );
}
