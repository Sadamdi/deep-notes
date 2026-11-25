import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

type PlannedSectionProps = {
  title: string;
  description: string;
  plannedScope: string;
};

/** Honest placeholder route so every sidebar and mobile menu item resolves cleanly before its full UI ships. */
export function PlannedSectionPage({ title, description, plannedScope }: PlannedSectionProps) {
  useDocumentTitle(title);

  return (
    <div className="max-w-2xl space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          <Badge variant="outline">Segera hadir</Badge>
        </div>
        <p className="text-sm text-muted-foreground sm:text-base">{description}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold">Status pengembangan layar</CardTitle>
          <CardDescription>{plannedScope}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2.5">
          <Button asChild>
            <Link to="/workspace">Ke Workspace Saya</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link to="/">Kembali ke Beranda</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
