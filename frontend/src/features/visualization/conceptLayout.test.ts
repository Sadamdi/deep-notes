import { describe, expect, it } from "vitest";
import type { MindMapResponse } from "@deep-notes/shared";
import { buildConceptForest, layoutConceptForest, wrapLabel } from "./conceptLayout";

const node = (id: string, level: number) => ({ id, label: id, page: 1, level });
const graph: MindMapResponse = {
  sourceId: "00000000-0000-4000-8000-000000000000",
  kind: "mindmap",
  cached: false,
  nodes: [node("root", 0), node("a", 1), node("b", 1), node("a1", 2), node("a2", 2), node("alone", 1)],
  edges: [
    { from: "root", to: "a", label: "has" },
    { from: "root", to: "b", label: "has" },
    { from: "a", to: "a1", label: "kind" },
    { from: "a", to: "a2", label: "kind" },
    { from: "b", to: "a1", label: "uses" },
    { from: "b", to: "missing", label: "broken" },
  ],
};

describe("concept layout", () => {
  it("places every node once and keeps second parents as extra edges", () => {
    const { roots, extraEdges } = buildConceptForest(graph);
    expect(roots.map((item) => item.node.id)).toEqual(["root", "alone"]);
    expect(extraEdges).toEqual([{ from: "b", to: "a1", label: "uses" }]);
    const { placed, columns, rows } = layoutConceptForest(roots);
    expect(placed.map((item) => item.node.id).sort()).toEqual(["a", "a1", "a2", "alone", "b", "root"]);
    expect(columns).toBe(3);
    expect(rows).toBe(4);
  });

  it("never puts two nodes of one column on the same row and centres parents", () => {
    const { placed } = layoutConceptForest(buildConceptForest(graph).roots);
    expect(new Set(placed.map((item) => `${item.column}:${item.row}`)).size).toBe(placed.length);
    const row = (id: string) => placed.find((item) => item.node.id === id)!.row;
    expect(row("a")).toBe((row("a1") + row("a2")) / 2);
  });

  it("wraps long labels into at most two lines", () => {
    expect(wrapLabel("Model referensi OSI tujuh lapisan jaringan komputer modern", 20)).toHaveLength(2);
    expect(wrapLabel("DNS")).toEqual(["DNS"]);
  });
});
