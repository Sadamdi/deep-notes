import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { registerSchema, type RegisterInput } from "@deep-notes/shared";
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

/** Implements Figma frame 175:193 (Daftar Deep Notes). */
export function RegisterPage() {
  useDocumentTitle("Buat Akun");
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
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (values: RegisterInput) => {
    setServerError(null);
    try {
      const user = await api<CurrentUser>("/auth/register", {
        method: "POST",
        body: JSON.stringify(values),
      });
      queryClient.setQueryData(AUTH_ME_QUERY_KEY, { ...user, lookingForPartners: false });
      await queryClient.invalidateQueries();
      await navigate(nextPath.startsWith("/") ? nextPath : "/workspace");
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === "CONFLICT") {
        setServerError("Email ini sudah terdaftar. Silakan masuk dengan akun tersebut.");
        return;
      }
      setServerError(err instanceof Error ? err.message : "Gagal membuat akun. Coba lagi.");
    }
  };

  return (
    <AuthSplitShell title="Buat akun" subtitle="Mulai ruang belajarmu bersama Bubi.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="register-name" className="text-sm font-bold">
            Nama lengkap
          </Label>
          <Input
            id="register-name"
            autoComplete="name"
            placeholder="Nama kamu"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "register-name-error" : undefined}
            {...register("name")}
          />
          {errors.name && (
            <p id="register-name-error" role="alert" className="text-xs font-bold text-destructive">
              Nama minimal 2 karakter.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="register-email" className="text-sm font-bold">
            Email kampus
          </Label>
          <Input
            id="register-email"
            type="email"
            autoComplete="email"
            placeholder="nama@example.com"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "register-email-error" : undefined}
            {...register("email")}
          />
          {errors.email && (
            <p id="register-email-error" role="alert" className="text-xs font-bold text-destructive">
              Masukkan alamat email yang lengkap.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="register-password" className="text-sm font-bold">
            Kata sandi
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="register-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Minimal 8 karakter"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "register-password-error" : undefined}
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
            <p id="register-password-error" role="alert" className="text-xs font-bold text-destructive">
              Kata sandi minimal 8 karakter.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="register-course" className="text-sm font-bold">
            Program studi atau fokus kuliah (opsional)
          </Label>
          <Input
            id="register-course"
            placeholder="Contoh: Teknik Informatika"
            aria-invalid={!!errors.course}
            {...register("course")}
          />
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
            {isSubmitting ? "Membuat akun..." : "Buat Akun"}
          </Button>

          <Button asChild variant="secondary" className="w-full justify-start px-4 text-[15px]">
            <Link to={`/masuk${searchParams.get("next") ? `?next=${encodeURIComponent(nextPath)}` : ""}`}>
              Sudah punya akun? Masuk
            </Link>
          </Button>
        </div>
      </form>
    </AuthSplitShell>
  );
}
