import { zodResolver } from "@hookform/resolvers/zod";
import { changePasswordSchema } from "@deep-notes/shared";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router";
import type { z } from "zod";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/features/auth/useAuth";
import { api } from "@/lib/api";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export function SettingsPage() {
  useDocumentTitle("Pengaturan Akun");
  const { isAuthenticated, isLoading } = useAuth();
  const [notice, setNotice] = useState<{ tone: "error" | "info"; text: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema) });

  const onPasswordSubmit = async (values: ChangePasswordInput) => {
    setNotice(null);
    try {
      await api("/me/password", { method: "POST", body: JSON.stringify(values) });
      reset();
      setNotice({ tone: "info", text: "Kata sandi berhasil diperbarui dan sesi perangkat lain dihentikan." });
    } catch (err) {
      setNotice({
        tone: "error",
        text: err instanceof Error ? err.message : "Gagal mengganti kata sandi.",
      });
    }
  };

  const handleLogoutAll = async () => {
    setNotice(null);
    try {
      await api("/me/logout-all", { method: "POST" });
      window.location.href = "/masuk";
    } catch (err) {
      setNotice({ tone: "error", text: err instanceof Error ? err.message : "Gagal mengakhiri sesi." });
    }
  };

  const handleExport = async () => {
    setNotice(null);
    try {
      const data = await api<unknown>("/me/export");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "deep-notes-data-saya.json";
      a.click();
      URL.revokeObjectURL(url);
      setNotice({ tone: "info", text: "Salinan data akun berhasil diunduh." });
    } catch (err) {
      setNotice({ tone: "error", text: err instanceof Error ? err.message : "Gagal mengekspor data." });
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Pengaturan Akun</h1>
        <p className="text-sm text-muted-foreground">Kelola tampilan, keamanan kata sandi, dan sesi perangkatmu.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold">Preferensi tampilan</CardTitle>
          <CardDescription>Pilih mode terang atau gelap sesuai kenyamanan membaca.</CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeToggle className="w-full max-w-xs" />
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Memeriksa sesi akun...</p>
      ) : !isAuthenticated ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold">Pengaturan keamanan memerlukan sesi masuk</CardTitle>
            <CardDescription>Masuk terlebih dahulu untuk mengubah kata sandi atau mengunduh salinan datamu.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/masuk?next=/pengaturan">Masuk ke Akun</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {notice && (
            <p
              role={notice.tone === "error" ? "alert" : "status"}
              className={
                notice.tone === "error"
                  ? "rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs font-bold text-destructive"
                  : "rounded-xl bg-secondary p-3 text-xs font-bold text-secondary-foreground"
              }
            >
              {notice.text}
            </p>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold">Ganti kata sandi</CardTitle>
              <CardDescription>Mengganti kata sandi akan mengeluarkan akun dari perangkat lain.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onPasswordSubmit)} className="space-y-4" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="current-password" className="text-sm font-bold">
                    Kata sandi saat ini
                  </Label>
                  <Input
                    id="current-password"
                    type="password"
                    autoComplete="current-password"
                    aria-invalid={!!errors.currentPassword}
                    {...register("currentPassword")}
                  />
                  {errors.currentPassword && (
                    <p role="alert" className="text-xs font-bold text-destructive">
                      Masukkan kata sandi saat ini.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-sm font-bold">
                    Kata sandi baru (minimal 8 karakter)
                  </Label>
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    aria-invalid={!!errors.newPassword}
                    {...register("newPassword")}
                  />
                  {errors.newPassword && (
                    <p role="alert" className="text-xs font-bold text-destructive">
                      Kata sandi baru minimal 8 karakter.
                    </p>
                  )}
                </div>

                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Menyimpan..." : "Perbarui Kata Sandi"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold">Sesi perangkat dan salinan data</CardTitle>
              <CardDescription>Unduh seluruh catatan yang kamu buat atau akhiri semua sesi aktif.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button type="button" variant="secondary" onClick={() => void handleExport()}>
                Unduh Data Saya (JSON)
              </Button>
              <Button type="button" variant="outline" onClick={() => void handleLogoutAll()}>
                Keluar dari Semua Perangkat
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
