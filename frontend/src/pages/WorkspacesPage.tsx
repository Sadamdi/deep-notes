import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateNotebookInput, NotebookRole } from "@deep-notes/shared";
import { Link, useNavigate } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateNotebookForm } from "@/features/notebooks/CreateNotebookForm";
import { ApiRequestError, api } from "@/lib/api";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

type NotebookSummary = {
  id: string;
  title: string;
  course: string | null;
  description: string | null;
  visibility: "private" | "public";
  role: NotebookRole;
  memberCount: number;
  sourceCount: number;
};

export function WorkspacesPage() {
  useDocumentTitle("Workspace Saya");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const notebooksQuery = useQuery({
    queryKey: ["notebooks", "mine"],
    queryFn: () => api<NotebookSummary[]>("/notebooks"),
    retry: false,
  });

  const handleCreate = async (input: CreateNotebookInput) => {
    const created = await api<{ id: string }>("/notebooks", {
      method: "POST",
      body: JSON.stringify(input),
    });
    await queryClient.invalidateQueries({ queryKey: ["notebooks", "mine"] });
    await navigate(`/notebooks/${created.id}`);
  };

  const isUnauthorized =
    notebooksQuery.error instanceof ApiRequestError && notebooksQuery.error.code === "UNAUTHORIZED";

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Workspace Saya</h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Daftar ruang belajar tempat kamu tergabung sebagai pemilik, penyunting, atau pembaca.
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link to="/notebooks/sample">Buka Contoh Workspace</Link>
        </Button>
      </header>

      <div className="grid gap-6 lg:grid-cols-12">
        <section aria-label="Daftar workspace" className="space-y-4 lg:col-span-7">
          {notebooksQuery.isPending && (
            <Card>
              <CardContent className="py-8">
                <p role="status" className="text-sm text-muted-foreground">
                  Memuat daftar workspace kamu...
                </p>
              </CardContent>
            </Card>
          )}

          {isUnauthorized && (
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-lg font-bold">Sesi akun belum aktif</CardTitle>
                  <Badge variant="outline">Perlu masuk</Badge>
                </div>
                <CardDescription>
                  Daftar workspace pribadi dan kelompok diambil dari endpoint <code>GET /api/v1/notebooks</code> setelah
                  masuk. Sambil menunggu layar masuk selesai dikerjakan, kamu bisa meninjau tata letak contoh ruang.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="secondary">
                  <Link to="/notebooks/sample">Tinjau Tata Letak Ruang Contoh</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {notebooksQuery.isError && !isUnauthorized && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-bold text-destructive">Gagal memuat workspace</CardTitle>
                <CardDescription>
                  {notebooksQuery.error instanceof Error
                    ? notebooksQuery.error.message
                    : "Server tidak merespons permintaan daftar workspace."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button type="button" variant="outline" onClick={() => void notebooksQuery.refetch()}>
                  Coba Lagi
                </Button>
              </CardContent>
            </Card>
          )}

          {notebooksQuery.isSuccess && notebooksQuery.data.length === 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-bold">Belum ada workspace</CardTitle>
                <CardDescription>
                  Buat workspace pertamamu lewat formulir di samping untuk mulai mengumpulkan materi kuliah.
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {notebooksQuery.isSuccess && notebooksQuery.data.length > 0 && (
            <ul className="grid gap-4 sm:grid-cols-2">
              {notebooksQuery.data.map((nb) => (
                <li key={nb.id}>
                  <Card className="h-full justify-between">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base font-bold">{nb.title}</CardTitle>
                        <Badge variant="secondary">{nb.role}</Badge>
                      </div>
                      <CardDescription>
                        {nb.course ? `${nb.course} · ` : ""}
                        {nb.sourceCount} sumber · {nb.memberCount} anggota
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button asChild className="w-full">
                        <Link to={`/notebooks/${nb.id}`}>Buka Ruang</Link>
                      </Button>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>

        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Buat workspace baru</CardTitle>
            <CardDescription>Undang teman sekelompok setelah ruang berhasil dibuat.</CardDescription>
          </CardHeader>
          <CardContent>
            <CreateNotebookForm onSubmit={handleCreate} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
