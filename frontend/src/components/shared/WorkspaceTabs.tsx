import { Link, useLocation } from "react-router";

const items = [
  { key: "learn", label: "Belajar", path: "" },
  { key: "companion", label: "Belajar dengan Bubi", path: "/companion" },
  { key: "team", label: "Ruang kelompok", path: "/team" },
  { key: "discussion", label: "Diskusi", path: "/discussion" },
  { key: "notes", label: "Catatan", path: "/notes" },
  { key: "class", label: "Kelas Bubi", path: "/class" },
  { key: "visualization", label: "Visualisasi materi", path: "/visualization" },
] as const;

export function WorkspaceTabs({ notebookId }: { notebookId: string }) {
  const { pathname } = useLocation();
  const currentPath = pathname.replace(`/workspaces/${notebookId}`, "");

  return (
    <nav aria-label="Bagian workspace" className="flex flex-wrap gap-2 border-b pb-3">
      {items.map((item) => {
        const active = currentPath === item.path || (item.key === "learn" && currentPath.startsWith("/sources/"));
        return active ? (
          <span aria-current="page" className="inline-flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" key={item.key}>{item.label}</span>
        ) : (
          <Link className="inline-flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" key={item.key} to={`/workspaces/${notebookId}${item.path}`}>{item.label}</Link>
        );
      })}
    </nav>
  );
}
