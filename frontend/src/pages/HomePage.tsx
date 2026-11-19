import { Link } from "react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateNotebookForm } from "@/features/notebooks/CreateNotebookForm";

export function HomePage() {
  return (
    <div className="grid gap-8 md:grid-cols-2">
      <section className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">Study together, from the same sources.</h1>
        <p className="text-muted-foreground">
          One shared notebook per course. Ask questions and get answers only from your group&apos;s materials, with the
          source and page shown.
        </p>
        <Link to="/notebooks/sample" className="text-sm text-primary underline underline-offset-4">
          Open the sample workspace layout
        </Link>
      </section>
      <Card>
        <CardHeader>
          <CardTitle>New notebook</CardTitle>
          <CardDescription>The API endpoint is not built yet; this form only validates input for now.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* TODO: call POST /notebooks once the notebooks module exists */}
          <CreateNotebookForm onSubmit={(input) => console.info("validated input", input)} />
        </CardContent>
      </Card>
    </div>
  );
}
