import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link } from "react-router";
import { Flame, Medal, Settings2, Users } from "lucide-react";
import { profileSchema, type PartnersResponse, type ProfileUpdateResponse, type ProfileInput, type UserStats } from "@deep-notes/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ErrorState, LoadingState, PageTitle } from "@/components/shared/PageStates";
import { useAuthMe, authQueryKey } from "@/features/auth/useAuth";
import { api, jsonBody } from "@/lib/api";

export function ProfilePage() {
  const auth = useAuthMe();
  const queryClient = useQueryClient();
  const stats = useQuery({ queryKey: ["me", "stats"], queryFn: () => api<UserStats>("/me/stats") });
  const partners = useQuery({
    queryKey: ["me", "partners"],
    queryFn: () => api<PartnersResponse>("/me/partners"),
    enabled: auth.data?.lookingForPartners === true,
  });
  const updateProfile = useMutation({
    mutationFn: (input: ProfileInput) => api<ProfileUpdateResponse>("/me/profile", jsonBody("PATCH", input)),
    onSuccess: (profile) => {
      queryClient.setQueryData(authQueryKey, (current: typeof auth.data) => current ? { ...current, course: profile.course, lookingForPartners: profile.lookingForPartners } : current);
      void queryClient.invalidateQueries({ queryKey: ["me", "partners"] });
    },
  });
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { course: auth.data?.course ?? "", lookingForPartners: auth.data?.lookingForPartners ?? false },
  });

  useEffect(() => {
    if (auth.data) reset({ course: auth.data.course ?? "", lookingForPartners: auth.data.lookingForPartners ?? false });
  }, [auth.data?.id, auth.data?.course, auth.data?.lookingForPartners, reset]);

  if (auth.isPending) return <LoadingState label="Memuat profil…" />;
  if (auth.isError || !auth.data) return <ErrorState message={auth.error?.message ?? "Profil belum berhasil dimuat."} />;

  const partnerOptIn = watch("lookingForPartners");

  return (
    <div className="space-y-6">
      <PageTitle action={<Button asChild variant="outline"><Link to="/account"><Settings2 aria-hidden="true" />Pengaturan akun</Link></Button>} description="Lihat perkembangan belajar dan atur profil yang dibagikan kepada teman." eyebrow="Profil" title="Profil saya" />
      <section className="grid gap-5 rounded-3xl border bg-card p-5 sm:grid-cols-[auto_minmax(0,1fr)_minmax(260px,0.8fr)] sm:items-center sm:p-7">
        <span aria-hidden="true" className="grid size-20 place-items-center rounded-full bg-secondary text-2xl font-bold text-navy">{auth.data.name.trim().slice(0, 1).toUpperCase()}</span>
        <div className="min-w-0"><h2 className="text-xl font-bold text-navy">{auth.data.name}</h2><p className="mt-1 text-sm text-muted-foreground">{auth.data.course || "Program studi belum diisi"}</p><p className="mt-1 text-xs text-muted-foreground">{auth.data.email}</p></div>
        <form className="rounded-2xl bg-muted/60 p-4" noValidate onSubmit={handleSubmit((input) => updateProfile.mutate(input))}>
          <div className="space-y-2"><Label htmlFor="profile-course">Program studi</Label><Input id="profile-course" maxLength={120} placeholder="Teknik Informatika" {...register("course")} />{errors.course && <p className="text-xs text-destructive">{errors.course.message}</p>}</div>
          <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-xl bg-white p-3 text-sm"><input className="mt-0.5 size-4 accent-primary" type="checkbox" {...register("lookingForPartners")} /><span><span className="block font-semibold">Cari partner belajar</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">Nama dan program studi ditampilkan kepada mahasiswa dengan program studi yang sama.</span></span></label>
          <Button className="mt-3 w-full" disabled={updateProfile.isPending} size="sm" type="submit">{updateProfile.isPending ? "Menyimpan…" : "Simpan profil"}</Button>
          {updateProfile.isError && <p className="mt-2 text-xs text-destructive" role="alert">{updateProfile.error.message}</p>}
          {updateProfile.isSuccess && <p className="mt-2 text-xs text-teal" role="status">Profil tersimpan.</p>}
        </form>
      </section>

      {stats.isPending ? <LoadingState label="Menghitung progres…" /> : stats.isError ? <ErrorState message={stats.error.message} onRetry={() => void stats.refetch()} /> : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="rounded-3xl p-5 sm:p-6"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Flame aria-hidden="true" className="size-4 text-warning-foreground" />Streak belajar</div><p className="mt-4 text-4xl font-bold text-warning-foreground">{stats.data.streak} hari</p><p className="mt-2 text-sm text-muted-foreground">Poin: {stats.data.points} · sesi selesai: {stats.data.sessionsPlayed}</p><div aria-label={`${stats.data.streak} hari streak, terbaik ${stats.data.bestStreak}`} className="mt-4 flex gap-1"><span className="h-3 flex-1 rounded-full bg-warning" /><span className={`h-3 flex-1 rounded-full ${stats.data.streak >= 2 ? "bg-warning" : "bg-muted"}`} /><span className={`h-3 flex-1 rounded-full ${stats.data.streak >= 3 ? "bg-warning" : "bg-muted"}`} /><span className={`h-3 flex-1 rounded-full ${stats.data.streak >= 4 ? "bg-warning" : "bg-muted"}`} /><span className={`h-3 flex-1 rounded-full ${stats.data.streak >= 5 ? "bg-warning" : "bg-muted"}`} /></div><p className="mt-2 text-xs text-muted-foreground">Streak terbaik: {stats.data.bestStreak} hari</p></Card>
          <Card className="rounded-3xl p-5 sm:p-6"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Medal aria-hidden="true" className="size-4 text-warning-foreground" />Lencana</div><div className="mt-4 flex flex-wrap gap-2">{stats.data.badges.length ? stats.data.badges.map((badge) => <span className="rounded-full bg-secondary px-3 py-2 text-xs font-semibold text-navy" key={badge.id}>{badge.name}</span>) : <p className="text-sm leading-6 text-muted-foreground">Lencana akan muncul setelah kamu menyelesaikan sesi belajar.</p>}</div><p className="mt-4 text-xs text-muted-foreground">{stats.data.badges.length} dari {stats.data.allBadges.length} lencana diraih</p></Card>
        </div>
      )}

      {partnerOptIn && <section className="space-y-3">
        <div className="flex items-center gap-2"><Users aria-hidden="true" className="size-4 text-teal" /><h2 className="font-bold text-navy">Partner belajar</h2></div>
        {auth.data.lookingForPartners !== true ? <p className="rounded-2xl bg-muted/60 p-4 text-sm leading-6 text-muted-foreground">Simpan profil untuk mengaktifkan pencarian partner belajar.</p> : partners.isPending ? <LoadingState label="Mencari partner…" /> : partners.isError ? <ErrorState message={partners.error.message} onRetry={() => void partners.refetch()} /> : partners.data.partners.length ? <div className="grid gap-3 sm:grid-cols-2">{partners.data.partners.map((partner) => <Card className="rounded-2xl p-4" key={partner.id}><p className="font-semibold">{partner.name}</p><p className="mt-1 text-sm text-muted-foreground">{partner.course}</p></Card>)}</div> : <p className="rounded-2xl bg-muted/60 p-4 text-sm leading-6 text-muted-foreground">{partners.data.hint || "Belum ada partner yang cocok. Kami tidak menampilkan alamat email."}</p>}
      </section>}
    </div>
  );
}
