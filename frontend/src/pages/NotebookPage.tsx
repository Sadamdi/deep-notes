import { lazy, Suspense } from "react";
import { useParams } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SourcesTable, type SourceRow } from "@/features/notebooks/SourcesTable";

// three.js is heavy and not needed to read or ask, so it loads only when this view renders
const SourceGraph = lazy(() => import("@/features/notebooks/SourceGraph"));

/** Layout placeholder. Every row below is sample data for the layout, not real content. */
const SAMPLE_SOURCES: SourceRow[] = [
  { id: "s1", title: "Lecture 3 slides (sample)", kind: "slides", uploadedBy: "Sample member", status: "ready" },
  { id: "s2", title: "Journal article (sample)", kind: "pdf", uploadedBy: "Sample member", status: "ready" },
  { id: "s3", title: "Study notes (sample)", kind: "note", uploadedBy: "Sample member", status: "processing" },
];

export function NotebookPage() {
  const { notebookId } = useParams();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Notebook {notebookId}</h1>
        <Badge variant="secondary">Sample data</Badge>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Sources</CardTitle>
            <CardDescription>Everything the assistant is allowed to answer from.</CardDescription>
          </CardHeader>
          <CardContent>
            <SourcesTable rows={SAMPLE_SOURCES} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Source map</CardTitle>
            <CardDescription>Optional 3D view of how sources relate.</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<p className="text-sm text-muted-foreground">Loading view...</p>}>
              <SourceGraph labels={SAMPLE_SOURCES.map((s) => s.title)} />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
