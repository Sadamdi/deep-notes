import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router";
import brandMark from "@/assets/brand/deep-notes-mark.svg";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/features/auth/useAuth";
import { api } from "@/lib/api";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

export function JoinInvitePage() {
  useDocumentTitle("Undangan Workspace");
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading } = useAuth();

  const acceptMutation = useMutation({
    mutationFn: () => api<{ notebookId: string; role: string }>(`/invites/${encodeURIComponent(token)}/accept`, { method: "POST" }),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["notebooks"] });
      await navigate(`/notebooks/${data.notebookId}`);
    },
  });

  const nextParam = encodeURIComponent(`/join/${token}`);

  return (
    <div className="min-h-dvh bg-background px-5 py-10 text-foreground">
      <div className="mx-auto max-w-lg space-y-6">
        <Link
          to="/"
          className="inline-flex min-h-11 items-center gap-2.5 rounded-md px-1 text-xl font-bold tracking-tight text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <img src={brandMark} alt="" aria-hidden="true" width={28} height={28} />
          <span>Deep Notes</span>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Undangan Ruang Belajar</CardTitle>
            <CardDescription>
              Terima undangan untuk bergabung ke workspace kelompok dan mengakses sumber belajar bersama.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading && <p className="text-sm text-muted-foreground">Memeriksa status sesi akun...</p>}

            {!isLoading && !isAuthenticated && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Masuk atau buat akun terlebih dahulu agar undangan ini langsung terhubung ke akunmu.
                </p>
                <div className="flex flex-wrap gap-2.5">
                  <Button asChild>
                    <Link to={`/masuk?next=${nextParam}`}>Masuk dan Gabung</Link>
                  </Button>
                  <Button asChild variant="secondary">
                    <Link to={`/daftar?next=${nextParam}`}>Buat Akun Baru</Link>
                  </Button>
                </div>
              </div>
            )}

            {!isLoading && isAuthenticated && (
              <div className="space-y-3">
                {acceptMutation.isError && (
                  <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-xs font-bold text-destructive">
                    {acceptMutation.error instanceof Error
                      ? acceptMutation.error.message
                      : "Undangan tidak ditemukan atau sudah kedaluwarsa."}
                  </p>
                )}
                <div className="flex flex-wrap gap-2.5">
                  <Button
                    type="button"
                    disabled={acceptMutation.isPending || !token}
                    onClick={() => acceptMutation.mutate()}
                  >
                    {acceptMutation.isPending ? "Bergabung..." : "Terima Undangan"}
                  </Button>
                  <Button asChild variant="secondary">
                    <Link to="/workspace">Batal</Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
