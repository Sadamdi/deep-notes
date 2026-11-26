import { useState } from "react";
import type { MindMapResponse } from "@deep-notes/shared";
import { buildConceptForest, layoutConceptForest, wrapLabel } from "./conceptLayout";

const BOX_W = 190;
const BOX_H = 52;
const COLUMN = 330;
const ROW = 68;
const PAD = 16;

/** Left-to-right concept tree. The relation text sits on the line just before the child, so labels never pile up. */
export function ConceptTree({ graph, title }: { graph: MindMapResponse; title: string }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const { roots, extraEdges } = buildConceptForest(graph);
  const { placed, rows, columns } = layoutConceptForest(roots);
  const at = new Map(placed.map((item) => [item.node.id, { x: PAD + item.column * COLUMN, y: PAD + item.row * ROW }]));
  const width = PAD * 2 + (columns - 1) * COLUMN + BOX_W;
  const height = PAD * 2 + (rows - 1) * ROW + BOX_H;
  const labels = new Map(graph.nodes.map((node) => [node.id, node.label]));
  const related = extraEdges.filter((edge) => edge.from === activeId || edge.to === activeId);

  return (
    <div>
      <div className="overflow-x-auto">
        <svg aria-label={`Peta konsep sumber ${title}`} className="mx-auto block" height={height} role="img" viewBox={`0 0 ${width} ${height}`} width={width}>
          {placed.map((item) => {
            if (!item.parentId) return null;
            const from = at.get(item.parentId)!;
            const to = at.get(item.node.id)!;
            const x1 = from.x + BOX_W;
            const y1 = from.y + BOX_H / 2;
            const y2 = to.y + BOX_H / 2;
            const bend = x1 + 26;
            const active = activeId === item.node.id || activeId === item.parentId;
            return (
              <g key={`edge-${item.node.id}`}>
                <path d={`M ${x1} ${y1} C ${bend} ${y1}, ${x1} ${y2}, ${bend} ${y2} H ${to.x}`} fill="none" stroke="var(--color-teal)" strokeOpacity={active ? 1 : 0.4} strokeWidth={active ? 2.5 : 1.5} />
                {item.relation && (
                  <text fill="var(--color-muted-foreground)" fontSize="11" textAnchor="end" x={to.x - 8} y={y2 - 5}>
                    {item.relation.length > 18 ? `${item.relation.slice(0, 17)}…` : item.relation}
                    <title>{item.relation}</title>
                  </text>
                )}
              </g>
            );
          })}
          {placed.map((item) => {
            const point = at.get(item.node.id)!;
            const root = item.column === 0;
            const lines = wrapLabel(item.node.label);
            return (
              <g key={item.node.id} onMouseEnter={() => setActiveId(item.node.id)} onMouseLeave={() => setActiveId(null)}>
                <title>{item.node.page ? `${item.node.label} · halaman ${item.node.page}` : item.node.label}</title>
                <rect fill={root ? "var(--color-navy)" : item.column === 1 ? "var(--color-secondary)" : "var(--color-card)"} height={BOX_H} rx="14" stroke={activeId === item.node.id ? "var(--color-teal)" : "var(--color-border)"} strokeWidth={activeId === item.node.id ? 2.5 : 1.5} width={BOX_W} x={point.x} y={point.y} />
                <text fill={root ? "white" : "var(--color-navy)"} fontSize="13" fontWeight="600" textAnchor="middle">
                  {lines.map((line, index) => (
                    <tspan key={index} x={point.x + BOX_W / 2} y={point.y + BOX_H / 2 + 4.5 + (index - (lines.length - 1) / 2) * 16}>{line}</tspan>
                  ))}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <p aria-live="polite" className="mt-3 min-h-5 text-xs leading-5 text-muted-foreground">
        {related.length ? `Juga terhubung: ${related.map((edge) => `${labels.get(edge.from)} → ${labels.get(edge.to)} (${edge.label})`).join("; ")}` : extraEdges.length ? "Arahkan penunjuk ke sebuah topik untuk melihat hubungan lainnya." : ""}
      </p>
    </div>
  );
}
