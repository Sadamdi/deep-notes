import { AlertCircle, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BubiMascot } from "@/components/shared/BubiMascot";
import { REACTION_FOR_EVENT } from "@deep-notes/shared";

export function BubiLoading({ label = "Bubi sedang menyiapkan halaman…", variant = "panel" }: { label?: string; variant?: "page" | "panel" | "compact" }) {
  const layout = variant === "page"
    ? "min-h-40 rounded-2xl border bg-card p-6"
    : variant === "compact"
      ? "min-h-0 min-w-0 gap-1 px-0 py-0 text-xs"
      : "min-h-24 gap-3 rounded-2xl bg-secondary/50 p-4";
  const mascotSize = variant === "compact" ? "h-6 w-auto" : variant === "page" ? "h-16 w-auto" : "h-12 w-auto";
  const Container = variant === "compact" ? "span" : "div";
  return (
    <Container aria-busy="true" className={`flex items-center justify-center ${layout} text-sm text-muted-foreground`} data-bubi-loading="" role="status">
      <BubiMascot {...REACTION_FOR_EVENT.waiting_for_ai} className={mascotSize} decorative />
      <span>{label}</span>
    </Container>
  );
}

export function LoadingState({ label = "Bubi sedang menyiapkan halaman…" }: { label?: string }) {
  return <BubiLoading label={label} variant="page"/>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm" role="alert">
      <AlertCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-destructive" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-foreground">Ada yang belum berhasil</p>
        <p className="mt-1 text-muted-foreground">{message}</p>
        {onRetry && <Button className="mt-3" onClick={onRetry} size="sm" variant="outline">Coba lagi</Button>}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed bg-white/70 p-6 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-secondary text-primary">
        <BookOpen aria-hidden="true" className="size-6" />
      </span>
      <h2 className="mt-4 font-semibold text-foreground">{title}</h2>
      <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PageTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{eyebrow}</p>}
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
