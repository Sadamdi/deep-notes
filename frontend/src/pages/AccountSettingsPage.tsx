import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { AlertTriangle, Download, KeyRound, LogOut, Shield, Trash2 } from "lucide-react";
import { changePasswordSchema, deleteAccountSchema } from "@deep-notes/shared";
import { AppDialog } from "@/components/shared/AppDialog";
import { ErrorState, PageTitle } from "@/components/shared/PageStates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, jsonBody } from "@/lib/api";

function downloadJson(value: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `deep-notes-export-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function AccountSettingsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const exportData = useMutation({ mutationFn: () => api<unknown>("/me/export") , onSuccess: downloadJson });
  const changePassword = useMutation({
    mutationFn: () => {
      if (newPassword !== confirmPassword) throw new Error("Konfirmasi kata sandi belum sama.");
      const parsed = changePasswordSchema.safeParse({ currentPassword, newPassword });
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Periksa kata sandi baru.");
      return api<{ changed: true }>("/me/password", jsonBody("POST", parsed.data));
    },
    onSuccess: () => { setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setPasswordMessage("Kata sandi berhasil diganti. Sesi di perangkat lain sudah dikeluarkan."); },
    onError: (error) => setPasswordMessage(error.message),
  });
  const logoutAll = useMutation({
    mutationFn: () => api<{ loggedOut: true }>("/me/logout-all", jsonBody("POST")),
    onSuccess: async () => { await queryClient.clear(); navigate("/login", { replace: true }); },
  });
  const deleteAccount = useMutation({
    mutationFn: () => {
      const parsed = deleteAccountSchema.safeParse({ password: deletePassword });
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Masukkan kata sandi.");
      return api<{ deleted: true }>("/me", jsonBody("DELETE", parsed.data));
    },
    onSuccess: async () => { await queryClient.clear(); navigate("/", { replace: true }); },
    onError: (error) => setDeleteError(error.message),
  });

  return <div className="space-y-6"><PageTitle eyebrow="Akun" title="Pengaturan akun" description="Atur keamanan akun dan unduh salinan data yang tersimpan."/><div className="grid gap-4 xl:grid-cols-2"><section className="space-y-4 rounded-3xl border bg-card p-5 sm:p-6"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary"><KeyRound aria-hidden="true"/></span><div><h2 className="font-bold text-navy">Ubah kata sandi</h2><p className="text-xs text-muted-foreground">Sesi perangkat lain akan berakhir.</p></div></div><form className="space-y-3" onSubmit={(event) => { event.preventDefault(); setPasswordMessage(""); changePassword.mutate(); }}><div className="space-y-2"><Label htmlFor="current-password">Kata sandi saat ini</Label><Input autoComplete="current-password" id="current-password" onChange={(event) => setCurrentPassword(event.target.value)} required type="password" value={currentPassword}/></div><div className="space-y-2"><Label htmlFor="new-password">Kata sandi baru</Label><Input autoComplete="new-password" id="new-password" maxLength={128} minLength={8} onChange={(event) => setNewPassword(event.target.value)} required type="password" value={newPassword}/></div><div className="space-y-2"><Label htmlFor="confirm-password">Ulangi kata sandi baru</Label><Input autoComplete="new-password" id="confirm-password" maxLength={128} minLength={8} onChange={(event) => setConfirmPassword(event.target.value)} required type="password" value={confirmPassword}/></div><Button disabled={changePassword.isPending} type="submit">{changePassword.isPending ? "Menyimpan…" : "Simpan kata sandi"}</Button>{passwordMessage && <p className={changePassword.isError ? "text-sm text-destructive" : "text-sm text-teal"} role={changePassword.isError ? "alert" : "status"}>{passwordMessage}</p>}</form></section>
      <section className="space-y-4 rounded-3xl border bg-card p-5 sm:p-6"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary"><Shield aria-hidden="true"/></span><div><h2 className="font-bold text-navy">Data dan sesi</h2><p className="text-xs text-muted-foreground">Semua aksi memakai endpoint akun yang tersedia.</p></div></div><div className="space-y-3"><Button className="w-full justify-start" disabled={exportData.isPending} onClick={() => exportData.mutate()} variant="outline"><Download aria-hidden="true"/>{exportData.isPending ? "Menyiapkan salinan…" : "Unduh salinan data saya"}</Button>{exportData.isError && <ErrorState message={exportData.error.message}/>}<Button className="w-full justify-start" disabled={logoutAll.isPending} onClick={() => logoutAll.mutate()} variant="outline"><LogOut aria-hidden="true"/>{logoutAll.isPending ? "Mengeluarkan sesi…" : "Keluar dari semua perangkat"}</Button>{logoutAll.isError && <ErrorState message={logoutAll.error.message}/>}</div></section></div>
      <section className="rounded-3xl border border-destructive/30 bg-destructive/5 p-5 sm:p-6"><div className="flex items-start gap-3"><AlertTriangle aria-hidden="true" className="mt-1 size-5 text-destructive"/><div className="flex-1"><h2 className="font-bold text-destructive">Hapus akun</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">Penghapusan tidak dapat dibatalkan. Workspace yang masih kamu miliki harus dihapus atau dialihkan terlebih dahulu.</p><AppDialog description="Aksi ini permanen. Masukkan kata sandi untuk melanjutkan." onOpenChange={(open) => { setDeleteOpen(open); if (!open) { setDeletePassword(""); setDeleteError(""); deleteAccount.reset(); } }} open={deleteOpen} title="Hapus akun Deep Notes" trigger={<Button className="mt-4" onClick={() => setDeleteOpen(true)} variant="destructive"><Trash2 aria-hidden="true"/>Hapus akun</Button>}><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); setDeleteError(""); deleteAccount.mutate(); }}><div className="space-y-2"><Label htmlFor="delete-password">Kata sandi</Label><Input autoComplete="current-password" id="delete-password" onChange={(event) => setDeletePassword(event.target.value)} required type="password" value={deletePassword}/></div>{deleteError && <p className="text-sm text-destructive" role="alert">{deleteError}</p>}<Button className="w-full" disabled={deleteAccount.isPending} type="submit" variant="destructive">{deleteAccount.isPending ? "Menghapus…" : "Hapus akun saya"}</Button></form></AppDialog></div></div></section></div>;
}
