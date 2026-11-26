import { useState } from "react";
import type { MindMapResponse, NotebookMember } from "@deep-notes/shared";
import { BubiMascot } from "@/components/shared/BubiMascot";
import { SourcePageDialog } from "@/features/sources/SourcePageDialog";
import { cn } from "@/lib/utils";
import { buildConceptForest, type TreeNode } from "./conceptLayout";

/** Illustrated classroom: a chalkboard with readable topics, Bubi explaining the chosen one, and the class members. */
export function ClassroomScene({ graph, members, notebookId, sourceId, sourceTitle }: {
  graph: MindMapResponse;
  members: NotebookMember[];
  notebookId: string;
  sourceId: string;
  sourceTitle: string;
}) {
  const { roots } = buildConceptForest(graph);
  const root = roots[0]!;
  // topics on the board: the branches of the main topic, followed by any topic that is not connected to it
  const topics = [...root.children, ...roots.slice(1)];
  const [selected, setSelected] = useState<{ id: string; turn: number }>({ id: root.node.id, turn: 0 });
  const find = (list: TreeNode[]): TreeNode | undefined => {
    for (const item of list) {
      if (item.node.id === selected.id) return item;
      const inner = find(item.children);
      if (inner) return inner;
    }
    return undefined;
  };
  const current = find(roots) ?? root;
  const pick = (id: string) => setSelected((value) => ({ id, turn: value.turn + 1 }));
  const chip = (item: TreeNode, small = false) => (
    <button
      aria-pressed={current.node.id === item.node.id}
      className={cn(
        "rounded-xl border border-white/35 px-3 py-2 text-left font-semibold text-white transition hover:border-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
        small ? "text-xs" : "text-sm",
        current.node.id === item.node.id && "border-white bg-white/20",
      )}
      onClick={() => pick(item.node.id)}
      type="button"
    >
      {item.node.label}
    </button>
  );

  return (
    <div className="overflow-hidden rounded-2xl bg-secondary/50">
      <div className="grid gap-4 p-3 sm:p-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="rounded-2xl border-8 border-[#b98a54] bg-[#24544a] p-4 shadow-sm sm:p-6">
          <div className="flex justify-center">{chip(root)}</div>
          <ul className="mt-5 grid gap-x-3 gap-y-4 border-t border-dashed border-white/35 pt-5 sm:grid-cols-2 xl:grid-cols-3">
            {topics.map((topic) => (
              <li className="flex flex-col gap-2" key={topic.node.id}>
                {chip(topic)}
                {topic.children.length > 0 && (
                  <ul className="ml-3 flex flex-wrap gap-1.5 border-l border-white/35 pl-3">
                    {topic.children.map((child) => <li key={child.node.id}>{chip(child, true)}</li>)}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col items-center gap-3 self-start lg:sticky lg:top-4">
          <div aria-live="polite" className="w-full rounded-2xl border bg-card p-4 text-sm leading-6">
            <p className="font-bold text-navy">{current.node.label}</p>
            {current.children.length ? (
              <ul className="mt-2 space-y-1">
                {current.children.map((child) => (
                  <li key={child.node.id}><span className="text-muted-foreground">{child.relation || "terhubung dengan"}</span> <button className="font-semibold text-navy underline underline-offset-2" onClick={() => pick(child.node.id)} type="button">{child.node.label}</button></li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-muted-foreground">Buka halaman sumber untuk membaca penjelasan topik ini.</p>
            )}
            <div className="mt-3"><SourcePageDialog notebookId={notebookId} page={current.node.page} sourceId={sourceId} sourceTitle={sourceTitle} /></div>
          </div>
          <BubiMascot animation={current.children.length ? "write_on_board" : "point_up"} animationKey={selected.turn} className="h-40" decorative emotion="semangat" />
        </div>
      </div>

      <ul aria-label="Anggota di kelas" className="flex flex-wrap justify-center gap-x-6 gap-y-4 bg-[#e7cfa6] px-4 py-5">
        {members.map((member) => (
          <li className="flex w-24 flex-col items-center" key={member.id}>
            <span aria-hidden="true" className="grid size-11 place-items-center rounded-full bg-secondary text-base font-bold text-navy ring-2 ring-white">{member.name.trim().slice(0, 1).toUpperCase()}</span>
            <span aria-hidden="true" className="-mt-1 h-5 w-20 rounded-md bg-[#a9743f]" />
            <span className="mt-1 max-w-full truncate text-xs font-semibold text-[#3b2a14]">{member.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
