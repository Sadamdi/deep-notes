import { createColumnHelper, tableFeatures, useTable } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type SourceRow = {
  id: string;
  title: string;
  kind: string;
  uploadedBy: string;
  status: "processing" | "ready" | "failed";
};

const STATUS_LABEL: Record<SourceRow["status"], string> = {
  ready: "Siap",
  processing: "Diproses",
  failed: "Gagal",
};

// Keep features and columns at module scope so references stay stable across renders.
const features = tableFeatures({});
const helper = createColumnHelper<typeof features, SourceRow>();
const columns = helper.columns([
  helper.accessor("title", { header: "Judul sumber" }),
  helper.accessor("kind", { header: "Jenis" }),
  helper.accessor("uploadedBy", { header: "Diunggah oleh" }),
  helper.accessor("status", {
    header: "Status",
    cell: (info) => {
      const status = info.getValue();
      return (
        <Badge variant={status === "failed" ? "destructive" : status === "ready" ? "secondary" : "outline"}>
          {STATUS_LABEL[status]}
        </Badge>
      );
    },
  }),
]);

export function SourcesTable({ rows }: { rows: SourceRow[] }) {
  const table = useTable({ features, columns, data: rows });

  if (rows.length === 0) {
    return (
      <p className="rounded-lg bg-muted px-4 py-6 text-sm text-muted-foreground">
        Belum ada sumber yang diunggah ke ruang ini.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id}>
            {group.headers.map((header) => (
              <TableHead key={header.id}>{header.isPlaceholder ? null : <table.FlexRender header={header} />}</TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getAllCells().map((cell) => (
              <TableCell key={cell.id}>
                <table.FlexRender cell={cell} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
