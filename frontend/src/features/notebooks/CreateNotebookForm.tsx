import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { createNotebookSchema, type CreateNotebookInput } from "@deep-notes/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const categories = ["Informatika", "Matematika", "Bahasa", "Lainnya"] as const;

export function CreateNotebookForm({ onSubmit, isSubmitting = false }: { onSubmit: (input: CreateNotebookInput) => void | Promise<void>; isSubmitting?: boolean }) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateNotebookInput>({
    resolver: zodResolver(createNotebookSchema),
    defaultValues: { title: "", course: "", description: "", category: categories[0], visibility: "private" },
  });
  const preview = watch();

  async function submit(input: CreateNotebookInput) {
    await onSubmit({
      ...input,
      course: input.course?.trim() || undefined,
      description: input.description?.trim() || undefined,
      category: input.category?.trim() || undefined,
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(260px,0.85fr)]">
      <form className="space-y-5 rounded-3xl border border-border/70 bg-card p-5 shadow-sm sm:p-7" noValidate onSubmit={handleSubmit(submit)}>
        <div className="space-y-2">
          <Label htmlFor="workspace-title">Judul workspace</Label>
          <Input aria-invalid={Boolean(errors.title)} id="workspace-title" maxLength={120} placeholder="Jaringan Komputer – UTS" {...register("title")} />
          {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="workspace-course">Mata kuliah</Label>
            <Input id="workspace-course" maxLength={120} placeholder="Jaringan Komputer" {...register("course")} />
            {errors.course && <p className="text-sm text-destructive">{errors.course.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="workspace-category">Kategori</Label>
            <select className="h-10 w-full rounded-xl border border-input bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40" id="workspace-category" {...register("category")}>
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="workspace-description">Deskripsi</Label>
          <Textarea id="workspace-description" maxLength={500} placeholder="Catatan, slide, dan bank soal untuk UTS" {...register("description")} />
          {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">Siapa yang bisa menemukan workspace ini?</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="cursor-pointer rounded-2xl border bg-muted/40 p-4 has-[:checked]:border-primary has-[:checked]:bg-secondary/60">
              <span className="flex items-center gap-2 font-semibold"><input className="accent-primary" type="radio" value="private" {...register("visibility")} />Privat</span>
              <span className="mt-1 block pl-6 text-xs text-muted-foreground">Hanya anggota yang diundang.</span>
            </label>
            <label className="cursor-pointer rounded-2xl border bg-muted/40 p-4 has-[:checked]:border-primary has-[:checked]:bg-secondary/60">
              <span className="flex items-center gap-2 font-semibold"><input className="accent-primary" type="radio" value="public" {...register("visibility")} />Publik</span>
              <span className="mt-1 block pl-6 text-xs text-muted-foreground">Bisa ditemukan dan diminta untuk bergabung.</span>
            </label>
          </div>
        </fieldset>
        <div className="flex justify-end border-t pt-4">
          <Button disabled={isSubmitting} type="submit">{isSubmitting ? "Membuat workspace…" : "Buat workspace"}</Button>
        </div>
      </form>

      <aside className="h-fit rounded-3xl border border-primary/15 bg-secondary/50 p-5" aria-label="Pratinjau workspace">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Pratinjau kartu</p>
        <div className="mt-4 rounded-2xl border bg-card p-4 shadow-sm">
          <div className="h-24 rounded-xl bg-secondary" />
          <p className="mt-3 font-bold text-navy">{preview.title?.trim() || "Judul workspace"}</p>
          <p className="mt-1 text-xs text-muted-foreground">{preview.course?.trim() || "Mata kuliah"} · {preview.visibility === "public" ? "Publik" : "Privat"}</p>
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">{preview.description?.trim() || "Deskripsi singkat workspace akan muncul di sini."}</p>
        </div>
      </aside>
    </div>
  );
}
