import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import type { NotificationList } from "@deep-notes/shared";
import { AppDialog } from "@/components/shared/AppDialog";
import { Button } from "@/components/ui/button";
import { ErrorState, LoadingState } from "@/components/shared/PageStates";
import { api, jsonBody } from "@/lib/api";
import { Link } from "react-router";

const notificationsKey = ["me", "notifications"];

export function NotificationTrigger({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const notifications = useQuery({ queryKey: notificationsKey, queryFn: () => api<NotificationList>("/me/notifications") });
  const unread = notifications.data?.unreadCount ?? 0;
  return <Button aria-label={`Buka notifikasi${unread ? `, ${unread} belum dibaca` : ""}`} className="relative" onClick={() => onOpenChange(true)} size="icon" variant="outline"><Bell aria-hidden="true"/>{unread > 0 && <span aria-hidden="true" className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-coral px-1 text-[10px] font-bold text-white">{unread > 99 ? "99+" : unread}</span>}</Button>;
}

export function NotificationCenter({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const notifications = useQuery({ queryKey: notificationsKey, queryFn: () => api<NotificationList>("/me/notifications"), enabled: open, refetchInterval: open ? 30_000 : false });
  const markRead = useMutation({
    mutationFn: (id: string) => api(`/me/notifications/${id}`, jsonBody("PATCH")),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationsKey }),
  });
  const markAllRead = useMutation({
    mutationFn: () => api("/me/notifications/read-all", jsonBody("POST")),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationsKey }),
  });
  const unread = notifications.data?.unreadCount ?? 0;
  return (
    <AppDialog
      description="Aktivitas pertemanan dan workspace yang ditujukan kepadamu."
      onOpenChange={onOpenChange}
      open={open}
      title="Notifikasi"
    >
      <div className="max-h-[65vh] space-y-3 overflow-y-auto">
        {notifications.isPending ? <LoadingState label="Memuat notifikasi…"/> : notifications.isError ? <ErrorState message={notifications.error.message} onRetry={() => void notifications.refetch()}/> : notifications.data.items.length === 0 ? <div className="rounded-2xl bg-muted/60 p-5 text-center"><Bell aria-hidden="true" className="mx-auto size-5 text-muted-foreground"/><p className="mt-2 font-semibold text-navy">Belum ada notifikasi</p><p className="mt-1 text-sm text-muted-foreground">Permintaan teman dan aktivitas workspace akan muncul di sini.</p></div> : <>
          {unread > 0 && <Button className="ml-auto" disabled={markAllRead.isPending} onClick={() => markAllRead.mutate()} size="sm" variant="outline"><CheckCheck aria-hidden="true"/>Tandai semua dibaca</Button>}
          {notifications.data.items.map((item) => <article className={`rounded-2xl border p-4 ${item.readAt ? "bg-card" : "border-teal/30 bg-secondary/40"}`} key={item.id}>
            <div className="flex items-start gap-3"><span aria-hidden="true" className={`mt-1 size-2 shrink-0 rounded-full ${item.readAt ? "bg-muted-foreground/30" : "bg-teal"}`}/><div className="min-w-0 flex-1"><p className="font-semibold text-navy">{item.title}</p><p className="mt-1 text-sm leading-5 text-muted-foreground">{item.body}</p><time className="mt-2 block text-xs text-muted-foreground" dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</time><Link className="mt-3 inline-flex text-sm font-semibold text-teal hover:underline" onClick={() => { if (!item.readAt) markRead.mutate(item.id); onOpenChange(false); }} to={item.href}>Lihat aktivitas</Link></div></div>
          </article>)}
        </>}
        {markRead.isError && <p className="text-sm text-destructive" role="alert">{markRead.error.message}</p>}
        {markAllRead.isError && <p className="text-sm text-destructive" role="alert">{markAllRead.error.message}</p>}
      </div>
    </AppDialog>
  );
}
