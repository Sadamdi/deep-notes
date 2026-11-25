import { Link } from "react-router";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/useAuth";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

const MENU_ITEMS = [
  { to: "/studio", label: "Studio Penulis", primary: true },
  { to: "/profil", label: "Profil", primary: false },
  { to: "/pengaturan", label: "Pengaturan", primary: false },
  { to: "/mengikuti", label: "Mengikuti", primary: false },
  { to: "/pembuka", label: "Halaman Pembuka", primary: false },
  { to: "/", label: "Kembali ke Beranda", primary: false },
] as const;

/** Implements Figma frame "Menu Tambahan · Mobile" (node 175:7228). */
export function MobileMenuPage() {
  useDocumentTitle("Menu Tambahan");
  const { user, isAuthenticated, logout, isLoggingOut } = useAuth();

  return (
    <div className="mx-auto max-w-md space-y-6 py-2">
      <header className="space-y-1.5">
        <h1 className="text-[28px] leading-tight font-bold text-foreground">Menu Tambahan</h1>
        <p className="text-base text-muted-foreground">
          {isAuthenticated && user ? `Masuk sebagai ${user.name}` : "Navigasi Deep Notes"}
        </p>
      </header>

      {!isAuthenticated && (
        <div className="grid grid-cols-2 gap-2.5">
          <Button asChild>
            <Link to="/masuk">Masuk</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link to="/daftar">Buat Akun</Link>
          </Button>
        </div>
      )}

      <nav aria-label="Menu tambahan" className="space-y-2.5 pt-1">
        {MENU_ITEMS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={
              item.primary
                ? "flex min-h-12 items-center rounded-lg bg-primary px-3.5 py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none active:opacity-90"
                : "flex min-h-12 items-center rounded-lg bg-secondary px-3.5 py-3 text-sm font-bold text-secondary-foreground transition-colors hover:bg-secondary/80 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none active:opacity-90"
            }
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="space-y-2.5 pt-2">
        <ThemeToggle className="w-full" />
        {isAuthenticated && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={isLoggingOut}
            onClick={() => void logout()}
          >
            {isLoggingOut ? "Keluar..." : "Keluar dari Akun"}
          </Button>
        )}
      </div>
    </div>
  );
}
