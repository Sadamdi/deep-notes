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

// features and columns live at module scope so they stay referentially stable between renders
const features = tableFeatures({});
const helper = createColumnHelper<typeof features, SourceRow>();
const columns = helper.columns([
  helper.accessor("title", { header: "Title" }),
  helper.accessor("kind", { header: "Type" }),
  helper.accessor("uploadedBy", { header: "Added by" }),
  helper.accessor("status", {
    header: "Status",
    cell: (info) => (
      <Badge variant={info.getValue() === "failed" ? "destructive" : "secondary"}>{info.getValue()}</Badge>
    ),
  }),
]);

export function SourcesTable({ rows }: { rows: SourceRow[] }) {
  const table = useTable({ features, columns, data: rows });

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
