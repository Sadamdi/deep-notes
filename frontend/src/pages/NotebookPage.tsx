import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { Link, useParams } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SourcesTable, type SourceRow } from "@/features/notebooks/SourcesTable";
import { api } from "@/lib/api";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

// three.js loads on demand so reading sources never waits on WebGL bundle parsing.
const SourceGraph = lazy(() => import("@/features/notebooks/SourceGraph"));

/** Layout sample rows. Explicitly labeled in the UI and used only on `/notebooks/sample`. */
const SAMPLE_SOURCES: SourceRow[] = [
  { id: "s1", title: "Bab 1 Topologi.pdf (contoh)", kind: "pdf", uploadedBy: "Contoh anggota", status: "ready" },
  { id: "s2", title: "Slide Lapisan OSI.pptx (contoh)", kind: "pptx", uploadedBy: "Contoh anggota", status: "ready" },
  { id: "s3", title: "Catatan Praktikum.md (contoh)", kind: "text", uploadedBy: "Contoh anggota", status: "processing" },
];

type NotebookDetail = {
  id: string;
  title: string;
  course: string | null;
  role: string;
};

type ApiSource = {
  id: string;
  title: string;
  kind: string;
  uploadedByName?: string;
  status: "processing" | "ready" | "failed";
};

export function NotebookPage() {
  const { notebookId = "sample" } = useParams();
  const isSample = notebookId === "sample";

  const detailQuery = useQuery({
    queryKey: ["notebook", notebookId],
    queryFn: () => api<NotebookDetail>(`/notebooks/${notebookId}`),
    enabled: !isSample,
    retry: false,
  });

  const sourcesQuery = useQuery({
    queryKey: ["notebook-sources", notebookId],
    queryFn: () => api<ApiSource[]>(`/notebooks/${notebookId}/sources`),
    enabled: !isSample,
    retry: false,
  });

  const heading = isSample ? "Jaringan Komputer UTS" : (detailQuery.data?.title ?? "Workspace");
  useDocumentTitle(heading);

  if (!isSample && (detailQuery.isPending || sourcesQuery.isPending)) {
    return (
      <Card>
        <CardContent className="py-8">
          <p role="status" className="text-sm text-muted-foreground">
            Memuat isi workspace...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!isSample && (detailQuery.isError || sourcesQuery.isError)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold text-destructive">Workspace tidak dapat dibuka</CardTitle>
          <CardDescription>
            Ruang ini tidak ditemukan, membutuhkan sesi masuk, atau akun kamu belum terdaftar sebagai anggota.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="secondary">
            <Link to="/workspace">Kembali ke Workspace Saya</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/notebooks/sample">Buka Contoh Workspace</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const rows: SourceRow[] = isSample
    ? SAMPLE_SOURCES
    : (sourcesQuery.data ?? []).map((s) => ({
        id: s.id,
        title: s.title,
        kind: s.kind,
        uploadedBy: s.uploadedByName ?? "Anggota",
        status: s.status,
      }));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{heading}</h1>
            {isSample ? (
              <Badge variant="secondary">Data contoh</Badge>
            ) : (
              detailQuery.data?.role && <Badge variant="secondary">Peran: {detailQuery.data.role}</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {isSample
              ? "Contoh tata letak ruang belajar kelompok. Baris sumber di bawah adalah data contoh."
              : (detailQuery.data?.course ?? "Ruang belajar kelompok")}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/workspace">Daftar Workspace</Link>
        </Button>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card id="sumber-ruang" className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Sumber materi</CardTitle>
            <CardDescription>Seluruh dokumen yang menjadi satu-satunya acuan jawaban Bubi dan kuis.</CardDescription>
          </CardHeader>
          <CardContent>
            <SourcesTable rows={rows} />
          </CardContent>
        </Card>

        <Card id="peta-sumber">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Peta sumber</CardTitle>
            <CardDescription>Tampilan 3D opsional. Informasi utama tetap tersedia pada tabel sumber.</CardDescription>
          </CardHeader>
          <CardContent>
            {rows.length > 0 ? (
              <Suspense fallback={<p className="text-sm text-muted-foreground">Memuat visualisasi 3D...</p>}>
                <SourceGraph labels={rows.map((s) => s.title)} />
              </Suspense>
            ) : (
              <p className="text-sm text-muted-foreground">Unggah minimal satu sumber untuk melihat peta.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
