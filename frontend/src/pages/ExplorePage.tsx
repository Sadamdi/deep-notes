import { useQuery } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiRequestError, api } from "@/lib/api";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

type PublicNotebook = {
  id: string;
  title: string;
  course: string | null;
  description: string | null;
  category: string | null;
  memberCount: number;
  sourceCount: number;
  isMember: boolean;
};

export function ExplorePage() {
  useDocumentTitle("Jelajah");
  const [draftQuery, setDraftQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");

  const publicQuery = useQuery({
    queryKey: ["public-notebooks", submittedQuery],
    queryFn: () => {
      const qs = submittedQuery ? `?q=${encodeURIComponent(submittedQuery)}` : "";
      return api<PublicNotebook[]>(`/public/notebooks${qs}`);
    },
    retry: false,
  });

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmittedQuery(draftQuery.trim());
  };

  const isUnauthorized =
    publicQuery.error instanceof ApiRequestError && publicQuery.error.code === "UNAUTHORIZED";

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Jelajah Workspace</h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Cari ruang belajar publik berdasarkan mata kuliah, topik, atau ringkasan materi.
        </p>
      </header>

      <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="explore-search" className="font-bold">
            Kata kunci mata kuliah atau topik
          </Label>
          <Input
            id="explore-search"
            value={draftQuery}
            onChange={(e) => setDraftQuery(e.target.value)}
            placeholder="Contoh: Jaringan Komputer, Statistika, Basis Data"
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit">Cari Ruang</Button>
          {submittedQuery && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDraftQuery("");
                setSubmittedQuery("");
              }}
            >
              Reset
            </Button>
          )}
        </div>
      </form>

      {publicQuery.isPending && (
        <Card>
          <CardContent className="py-8">
            <p role="status" className="text-sm text-muted-foreground">
              Mencari workspace publik...
            </p>
          </CardContent>
        </Card>
      )}

      {isUnauthorized && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-lg font-bold">Masuk untuk menjelajah katalog publik</CardTitle>
              <Badge variant="outline">Perlu sesi akun</Badge>
            </div>
            <CardDescription>
              Endpoint pencarian workspace publik (<code>GET /api/v1/public/notebooks</code>) memverifikasi keanggotaan
              pengguna. Kamu tetap bisa mencoba tata letak ruang pada halaman contoh.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary">
              <Link to="/notebooks/sample">Buka Contoh Workspace</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {publicQuery.isError && !isUnauthorized && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold text-destructive">Pencarian belum berhasil</CardTitle>
            <CardDescription>
              {publicQuery.error instanceof Error
                ? publicQuery.error.message
                : "Gagal menghubungi layanan pencarian workspace."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" variant="outline" onClick={() => void publicQuery.refetch()}>
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      )}

      {publicQuery.isSuccess && publicQuery.data.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold">Tidak ada workspace publik yang cocok</CardTitle>
            <CardDescription>
              {submittedQuery
                ? `Tidak ditemukan ruang publik untuk kata kunci "${submittedQuery}". Coba kata kunci lain atau buat ruang baru.`
                : "Belum ada workspace publik yang dibagikan. Buat workspace baru untuk memulai."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary">
              <Link to="/workspace">Ke Workspace Saya</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {publicQuery.isSuccess && publicQuery.data.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {publicQuery.data.map((nb) => (
            <li key={nb.id}>
              <Card className="h-full justify-between">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-bold">{nb.title}</CardTitle>
                    {nb.category && <Badge variant="secondary">{nb.category}</Badge>}
                  </div>
                  <CardDescription>
                    {nb.course ? `${nb.course} · ` : ""}
                    {nb.sourceCount} sumber · {nb.memberCount} anggota
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {nb.description && <p className="text-sm text-muted-foreground">{nb.description}</p>}
                  {nb.isMember ? (
                    <Button asChild className="w-full">
                      <Link to={`/notebooks/${nb.id}`}>Buka Ruang</Link>
                    </Button>
                  ) : (
                    <Badge variant="outline">Publik · minta bergabung setelah masuk</Badge>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
