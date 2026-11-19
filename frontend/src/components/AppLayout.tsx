import { Link, Outlet } from "react-router";
import { ApiStatus } from "@/features/health/ApiStatus";

export function AppLayout() {
  return (
    <div className="min-h-screen">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            Deep Notes
          </Link>
          <ApiStatus />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
