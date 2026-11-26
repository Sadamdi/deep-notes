import type { MindMapResponse } from "@deep-notes/shared";

type Node = MindMapResponse["nodes"][number];

export interface TreeNode {
  node: Node;
  /** Label of the edge that links this node to its parent. */
  relation: string;
  children: TreeNode[];
}

/**
 * Turns the concept graph into a forest: every node appears once, under the first parent that reaches it
 * (breadth first, lowest level first). Edges that would add a second parent are returned separately.
 */
export function buildConceptForest(graph: MindMapResponse) {
  const byId = new Map(graph.nodes.map((node) => [node.id, { node, relation: "", children: [] } as TreeNode]));
  const used = new Set<number>();
  const seen = new Set<string>();
  const roots: TreeNode[] = [];

  for (const start of [...graph.nodes].sort((a, b) => a.level - b.level)) {
    if (seen.has(start.id)) continue;
    seen.add(start.id);
    roots.push(byId.get(start.id)!);
    const queue = [start.id];
    for (let head = 0; head < queue.length; head += 1) {
      graph.edges.forEach((edge, index) => {
        if (edge.from !== queue[head] || seen.has(edge.to)) return;
        const child = byId.get(edge.to);
        if (!child) return;
        seen.add(edge.to);
        used.add(index);
        child.relation = edge.label;
        byId.get(edge.from)!.children.push(child);
        queue.push(edge.to);
      });
    }
  }

  return { roots, extraEdges: graph.edges.filter((edge, index) => !used.has(index) && byId.has(edge.from) && byId.has(edge.to)) };
}

export interface Placed {
  node: Node;
  relation: string;
  parentId: string | null;
  column: number;
  /** Vertical slot; a parent sits in the middle of its children. */
  row: number;
}

export function layoutConceptForest(roots: TreeNode[]) {
  const placed: Placed[] = [];
  let nextRow = 0;
  const place = (tree: TreeNode, column: number, parentId: string | null): number => {
    const rows = tree.children.map((child) => place(child, column + 1, tree.node.id));
    const row = rows.length ? (rows[0]! + rows[rows.length - 1]!) / 2 : nextRow++;
    placed.push({ node: tree.node, relation: tree.relation, parentId, column, row });
    return row;
  };
  for (const root of roots) place(root, 0, null);
  return { placed, rows: nextRow, columns: placed.reduce((max, item) => Math.max(max, item.column + 1), 0) };
}

/** Splits a label into at most two lines that fit a node box. */
export function wrapLabel(label: string, width = 24) {
  const lines: string[] = [""];
  for (const word of label.split(/\s+/)) {
    const current = lines[lines.length - 1]!;
    if (!current) lines[lines.length - 1] = word;
    else if (`${current} ${word}`.length <= width) lines[lines.length - 1] = `${current} ${word}`;
    else lines.push(word);
  }
  const shown = lines.slice(0, 2);
  if (lines.length > 2) shown[1] = `${shown[1]}…`;
  return shown.map((line) => (line.length > width + 1 ? `${line.slice(0, width)}…` : line));
}
