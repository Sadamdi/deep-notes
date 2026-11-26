import { useState } from "react";
import { BookOpenText, Compass, Home, LogOut, Menu, PenTool, Plus, Sparkles, UserRound, Users } from "lucide-react";
import { Link, NavLink, useLocation, useNavigate } from "react-router";
import type { UserResponse } from "@deep-notes/shared";
import { Button } from "@/components/ui/button";
import { AppDialog } from "@/components/shared/AppDialog";
import { useLogout } from "@/features/auth/useAuth";
import { NotificationCenter, NotificationTrigger } from "@/components/layout/NotificationCenter";

const primaryLinks = [
  { to: "/home", label: "Beranda", icon: Home },
  { to: "/workspaces", label: "Workspace Saya", icon: BookOpenText },
  { to: "/discover", label: "Jelajah", icon: Compass },
  { to: "/game", label: "Game", icon: Sparkles },
  { to: "/studio", label: "Studio Penulis", icon: PenTool },
  { to: "/profile", label: "Profil", icon: UserRound },
  { to: "/friends", label: "Teman belajar", icon: Users },
];

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "DN";
}

export function AppLayout({ user, children }: { user: UserResponse; children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useLogout();
  const currentLink = primaryLinks.find((item) => location.pathname.startsWith(item.to))?.to ?? "/home";

  async function signOut() {
    setLogoutError("");
    try {
      await logout.mutateAsync();
      navigate("/", { replace: true });
    } catch {
      setLogoutError("Belum berhasil keluar. Periksa koneksi lalu coba lagi.");
    }
  }

  return (
    <div className="min-h-dvh bg-background text-foreground lg:grid lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r bg-card px-3 py-5 lg:flex">
        <Link aria-label="Deep Notes, beranda" className="mb-8 flex items-center gap-3 px-2" to="/home">
          <img alt="" className="size-7" src="/assets/brand-deep-notes-mark.svg" />
          <span className="text-lg font-bold tracking-tight text-navy">Deep Notes</span>
        </Link>
        <nav aria-label="Navigasi utama" className="space-y-1">
          {primaryLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}
              key={to}
              to={to}
            >
              <Icon aria-hidden="true" className="size-4 shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-4">
          <div className="rounded-2xl bg-secondary p-4">
            <img alt="Bubi, teman belajar" className="mx-auto h-24 w-auto" src="/assets/bubi-idle.svg" />
            <p className="mt-2 text-center text-xs font-semibold leading-5 text-navy">Belajar bersama dari sumber kelompokmu.</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-muted/70 p-3">
            <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-teal text-sm font-bold text-white">{initials(user.name)}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.course || "Mahasiswa"}</p>
            </div>
            <Button aria-label="Keluar" disabled={logout.isPending} onClick={() => void signOut()} size="icon-sm" variant="ghost">
              <LogOut aria-hidden="true" />
            </Button>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="hidden h-16 items-center justify-between border-b bg-background/85 px-7 backdrop-blur-lg lg:flex"><div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ruang belajar</p><p className="text-sm font-bold text-navy">Halo, {user.name.split(" ")[0]}</p></div><NotificationTrigger onOpenChange={setNotificationsOpen}/></header>
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/90 px-4 backdrop-blur-lg lg:hidden">
          <Link className="flex items-center gap-2 font-bold text-navy" to="/home">
            <img alt="" className="size-6" src="/assets/brand-deep-notes-mark.svg" />
            Deep Notes
          </Link>
          <div className="flex items-center gap-2"><NotificationTrigger onOpenChange={setNotificationsOpen}/><AppDialog
            description={`Masuk sebagai ${user.name}`}
            onOpenChange={setMenuOpen}
            open={menuOpen}
            title="Menu"
            trigger={<Button aria-label="Buka menu" size="icon" variant="outline"><Menu aria-hidden="true" /></Button>}
          >
            <nav aria-label="Navigasi seluler" className="space-y-2">
              {primaryLinks.map(({ to, label, icon: Icon }) => (
                <Link className={`nav-link ${currentLink === to ? "nav-link-active" : ""}`} key={to} onClick={() => setMenuOpen(false)} to={to}>
                  <Icon aria-hidden="true" className="size-4" />{label}
                </Link>
              ))}
              <Button className="w-full justify-start" disabled={logout.isPending} onClick={() => void signOut()} variant="ghost">
                <LogOut aria-hidden="true" /> Keluar
              </Button>
            </nav>
          </AppDialog></div>
        </header>
        <NotificationCenter onOpenChange={setNotificationsOpen} open={notificationsOpen}/>
        <main className="page-frame px-4 py-6 pb-24 sm:px-6 lg:px-7 lg:py-8 lg:pb-10">
          {logoutError && <p className="mb-4 rounded-xl bg-destructive/5 p-3 text-sm text-destructive" role="alert">{logoutError}</p>}
          {children}
        </main>
        <nav aria-label="Navigasi bawah" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t bg-card/95 px-2 py-2 backdrop-blur-lg lg:hidden">
          {primaryLinks.slice(0, 3).map(({ to, label, icon: Icon }) => (
            <Link aria-current={location.pathname.startsWith(to) ? "page" : undefined} className={`mobile-nav-link ${location.pathname.startsWith(to) ? "mobile-nav-link-active" : ""}`} key={to} to={to}>
              <Icon aria-hidden="true" className="size-5" /><span>{label}</span>
            </Link>
          ))}
          <Link className="mobile-nav-link" to="/workspaces/new"><Plus aria-hidden="true" className="size-5" /><span>Buat baru</span></Link>
        </nav>
      </div>
    </div>
  );
}
