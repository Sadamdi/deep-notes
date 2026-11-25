import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BADGES, type BadgeId } from "@deep-notes/shared";
import { type FormEvent, useState } from "react";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AUTH_ME_QUERY_KEY, useAuth } from "@/features/auth/useAuth";
import { api } from "@/lib/api";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

type StatsResponse = {
  points: number;
  streakDays: number;
  bestStreak: number;
  sessionsCompleted: number;
  badges: Array<{ id: BadgeId; unlockedAt: string } | string>;
};

export function ProfilePage() {
  useDocumentTitle("Profil Saya");
  const queryClient = useQueryClient();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [course, setCourse] = useState<string | null>(null);
  const [looking, setLooking] = useState<boolean | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const statsQuery = useQuery({
    queryKey: ["me", "stats"],
    queryFn: () => api<StatsResponse>("/me/stats"),
    enabled: isAuthenticated,
  });

  const updateProfileMutation = useMutation({
    mutationFn: () =>
      api("/me/profile", {
        method: "PATCH",
        body: JSON.stringify({
          course: (course ?? user?.course ?? "").trim() || null,
          lookingForPartners: looking ?? user?.lookingForPartners ?? false,
        }),
      }),
    onSuccess: async () => {
      setSavedNotice("Profil belajar berhasil diperbarui.");
      await queryClient.invalidateQueries({ queryKey: AUTH_ME_QUERY_KEY });
    },
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Memuat profil...</p>;
  }

  if (!isAuthenticated || !user) {
    return (
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold">Masuk untuk melihat profil belajarmu</CardTitle>
          <CardDescription>Poin latihan, streak harian, dan lencana tersimpan di akun Deep Notes kamu.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2.5">
          <Button asChild>
            <Link to="/masuk?next=/profil">Masuk</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link to="/daftar?next=/profil">Buat Akun</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavedNotice(null);
    updateProfileMutation.mutate();
  };

  const stats = statsQuery.data;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{user.name}</h1>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-6">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Progres dan lencana belajar</CardTitle>
            <CardDescription>Diambil langsung dari riwayat sesi latihan kamu.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {statsQuery.isPending ? (
              <p className="text-sm text-muted-foreground">Memuat statistik...</p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl bg-secondary p-3 text-secondary-foreground">
                    <p className="text-xl font-bold">{stats?.points ?? 0}</p>
                    <p className="text-xs">Poin</p>
                  </div>
                  <div className="rounded-xl bg-muted p-3">
                    <p className="text-xl font-bold text-foreground">{stats?.streakDays ?? 0} hari</p>
                    <p className="text-xs text-muted-foreground">Streak aktif</p>
                  </div>
                  <div className="rounded-xl bg-muted p-3">
                    <p className="text-xl font-bold text-foreground">{stats?.sessionsCompleted ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Sesi selesai</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-bold text-muted-foreground">Lencana terbuka:</p>
                  {stats?.badges && stats.badges.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {stats.badges.map((b, i) => {
                        const id = typeof b === "string" ? b : b.id;
                        const label = id in BADGES ? BADGES[id as BadgeId] : id;
                        return (
                          <Badge key={`${id}-${i}`} variant="secondary">
                            {label}
                          </Badge>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Selesaikan sesi latihan pertamamu untuk membuka lencana pertama.
                    </p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-6">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Preferensi belajar</CardTitle>
            <CardDescription>Atur fokus mata kuliah dan ketersediaan mencari teman kelompok.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profile-course" className="text-sm font-bold">
                  Program studi atau mata kuliah fokus
                </Label>
                <Input
                  id="profile-course"
                  value={course ?? user.course ?? ""}
                  onChange={(e) => setCourse(e.target.value)}
                  placeholder="Contoh: Teknik Informatika"
                />
              </div>

              <label className="flex min-h-11 items-center gap-2.5 rounded-lg bg-muted px-3 py-2 text-sm font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={looking ?? user.lookingForPartners}
                  onChange={(e) => setLooking(e.target.checked)}
                  className="size-4 accent-primary"
                />
                <span>Tampilkan saya pada daftar pencari teman belajar</span>
              </label>

              {savedNotice && (
                <p role="status" className="rounded-lg bg-secondary p-2.5 text-xs font-bold text-secondary-foreground">
                  {savedNotice}
                </p>
              )}

              <Button type="submit" disabled={updateProfileMutation.isPending}>
                {updateProfileMutation.isPending ? "Menyimpan..." : "Simpan Profil"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
