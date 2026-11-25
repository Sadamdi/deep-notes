import { Navigate, Outlet, useLocation } from "react-router";
import { ApiRequestError } from "@/lib/api";
import { useAuthMe } from "@/features/auth/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { ErrorState, LoadingState } from "@/components/shared/PageStates";

export function ProtectedLayout() {
  const location = useLocation();
  const userQuery = useAuthMe();

  if (userQuery.isPending) return <main className="page-frame py-10"><LoadingState label="Memeriksa sesi belajar…" /></main>;
  if (userQuery.error instanceof ApiRequestError && userQuery.error.code === "UNAUTHORIZED") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (userQuery.isError) {
    return (
      <main className="page-frame py-10">
        <ErrorState message={userQuery.error.message} onRetry={() => void userQuery.refetch()} />
      </main>
    );
  }

  return <AppLayout user={userQuery.data}><Outlet /></AppLayout>;
}
