import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowRight, LoaderCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState, LoadingState } from "@/components/shared/PageStates";
import { ApiRequestError, api, jsonBody } from "@/lib/api";

type JoinResult = { notebookId: string; role: "owner" | "editor" | "viewer" | "existing" };

export function JoinWorkspacePage() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const acceptInvite = useMutation({
    mutationFn: () => api<JoinResult>(`/invites/${encodeURIComponent(token)}/accept`, jsonBody("POST")),
    onSuccess: (result) => navigate(`/workspaces/${result.notebookId}`, { replace: true }),
  });

  useEffect(() => {
    if (token) acceptInvite.mutate();
  }, [token]);

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <Card className="items-center rounded-3xl p-7 text-center sm:p-10">
        <span className="grid size-14 place-items-center rounded-2xl bg-secondary text-primary"><Users aria-hidden="true" className="size-7" /></span>
        <h1 className="mt-4 text-2xl font-bold text-navy">Undangan workspace</h1>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">Tautan ini akan menambahkanmu sebagai anggota ruang belajar kelompok.</p>
        {acceptInvite.isPending && <div className="mt-6 w-full"><LoadingState label="Memeriksa undangan…" /></div>}
        {acceptInvite.isError && <div className="mt-6 w-full space-y-4"><ErrorState message={acceptInvite.error instanceof ApiRequestError ? acceptInvite.error.message : "Undangan belum berhasil diterima."} onRetry={() => acceptInvite.mutate()} /><Button asChild><Link to="/workspaces">Lihat workspace saya<ArrowRight aria-hidden="true" /></Link></Button></div>}
        {!acceptInvite.isPending && !acceptInvite.isError && <p className="mt-5 inline-flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle aria-hidden="true" className="size-4 animate-spin" />Menyiapkan ruang belajar…</p>}
      </Card>
    </div>
  );
}
