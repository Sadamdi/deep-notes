import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { createNotebookSchema, type CreateNotebookInput } from "@deep-notes/shared";
import { BookOpenText, Calculator, Languages, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const categories = ["Informatika", "Matematika", "Bahasa", "Lainnya"] as const;
const categoryIcons = { Informatika: BookOpenText, Matematika: Calculator, Bahasa: Languages, Lainnya: Sparkles };

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
  const CategoryIcon = categoryIcons[preview.category as keyof typeof categoryIcons] ?? Sparkles;

  async function submit(input: CreateNotebookInput) {
    await onSubmit({
      ...input,
      course: input.course?.trim() || undefined,
      description: input.description?.trim() || undefined,
      category: input.category?.trim() || undefined,
    });
  }

  return (
    <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(260px,0.85fr)]">
      <form className="min-w-0 space-y-5 rounded-3xl border border-border/70 bg-card p-5 shadow-sm sm:p-7" noValidate onSubmit={handleSubmit(submit)}>
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

      <aside className="order-last min-w-0 h-fit rounded-3xl border border-primary/20 bg-secondary/70 p-4 sm:p-5 xl:order-none" aria-label="Pratinjau workspace">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Pratinjau kartu</p>
        <div className="mt-4 overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="relative flex h-28 items-center justify-between overflow-hidden bg-primary p-5 text-primary-foreground">
            <div className="absolute -right-5 -top-10 size-36 rounded-full bg-secondary/25" />
            <div className="relative"><p className="text-xs font-semibold uppercase tracking-wider opacity-80">Ruang belajar</p><p className="mt-1 max-w-[12rem] truncate text-lg font-bold">{preview.course?.trim() || "Belajar bersama"}</p></div>
            <CategoryIcon aria-hidden="true" className="relative size-10 shrink-0" strokeWidth={1.7}/>
          </div>
          <div className="p-4">
            <p className="truncate font-bold text-navy">{preview.title?.trim() || "Judul workspace"}</p>
            <p className="mt-1 text-xs text-muted-foreground">{preview.category} · {preview.visibility === "public" ? "Publik" : "Privat"}</p>
            <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">{preview.description?.trim() || "Deskripsi singkat workspace akan muncul di sini."}</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
