import { useState } from "react";
import { ArrowUpRight, BookOpen } from "lucide-react";
import type { SourceResponse } from "@deep-notes/shared";
import { AppDialog } from "@/components/shared/AppDialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export function SourceScopePicker({ sources, sourceIds, onChange }: { sources: SourceResponse[]; sourceIds: string[] | null; onChange: (ids: string[] | null) => void }) {
  const [open, setOpen] = useState(false);
  const readySources = sources.filter((source) => source.status === "ready");
  const selectedCount = sourceIds === null ? readySources.length : sourceIds.filter((id) => readySources.some((source) => source.id === id)).length;
  const toggle = (id: string, checked: boolean) => {
    const next = new Set(sourceIds ?? readySources.map((source) => source.id));
    if (checked) next.add(id);
    else next.delete(id);
    onChange([...next]);
  };

  return <AppDialog
    description="Pilihan acuan ini dipakai bersama saat kamu belajar, membuat kuis, bermain, atau meminta bantuan Bubi."
    onOpenChange={setOpen}
    open={open}
    title="Pilih acuan belajar"
    trigger={<Button className="w-full justify-between" disabled={!readySources.length} onClick={() => setOpen(true)} type="button" variant="outline"><span className="flex items-center gap-2"><BookOpen aria-hidden="true" className="size-4"/>Acuan: {sourceIds === null ? "Semua sumber siap" : `${selectedCount} dipilih`}</span><ArrowUpRight aria-hidden="true" className="size-4"/></Button>}
  >
    <div className="space-y-2">
      <button className="w-full rounded-xl border px-3 py-3 text-left text-sm font-semibold hover:bg-muted" onClick={() => onChange(null)} type="button">Semua sumber siap <span className="ml-1 font-normal text-muted-foreground">({readySources.length})</span></button>
      {readySources.map((source) => <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-3 hover:bg-muted" key={source.id}>
        <Checkbox checked={sourceIds === null || sourceIds.includes(source.id)} onCheckedChange={(value) => toggle(source.id, value === true)}/>
        <span className="min-w-0"><span className="block text-sm font-medium">{source.title}</span><span className="mt-1 block text-xs text-muted-foreground">{source.pageCount ? `${source.pageCount} halaman` : "Materi teks"}</span></span>
      </label>)}
      {sourceIds !== null && selectedCount === 0 && <p className="text-sm text-destructive" role="alert">Pilih setidaknya satu sumber siap.</p>}
    </div>
  </AppDialog>;
}
