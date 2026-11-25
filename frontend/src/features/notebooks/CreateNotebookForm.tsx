import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router";
import { createNotebookSchema, type CreateNotebookInput } from "@deep-notes/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiRequestError } from "@/lib/api";

type Props = { onSubmit: (input: CreateNotebookInput) => void | Promise<void> };

/** Form validation uses the shared Zod schema so client and API rules stay identical. */
export function CreateNotebookForm({ onSubmit }: Props) {
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateNotebookInput>({
    resolver: zodResolver(createNotebookSchema),
    defaultValues: { visibility: "private" },
  });

  const handleValidSubmit = async (input: CreateNotebookInput) => {
    setNeedsSignIn(false);
    setSubmitError(null);
    try {
      await onSubmit(input);
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === "UNAUTHORIZED") {
        setNeedsSignIn(true);
        return;
      }
      setSubmitError(err instanceof Error ? err.message : "Gagal membuat workspace. Periksa koneksi API lalu coba lagi.");
    }
  };

  return (
    <form onSubmit={handleSubmit(handleValidSubmit)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="notebook-title" className="font-bold">
          Judul workspace
        </Label>
        <Input
          id="notebook-title"
          placeholder="Contoh: Jaringan Komputer UTS"
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? "notebook-title-error" : undefined}
          {...register("title")}
        />
        {errors.title && (
          <p id="notebook-title-error" role="alert" className="text-xs font-bold text-destructive">
            Judul minimal 3 karakter.
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="notebook-course" className="font-bold">
            Mata kuliah (opsional)
          </Label>
          <Input
            id="notebook-course"
            placeholder="Contoh: IF3130"
            aria-invalid={!!errors.course}
            {...register("course")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notebook-visibility" className="font-bold">
            Visibilitas ruang
          </Label>
          <select
            id="notebook-visibility"
            {...register("visibility")}
            className="min-h-11 w-full rounded-lg border border-input bg-card px-3 text-sm font-medium text-card-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <option value="private">Privat (anggota saja)</option>
            <option value="public">Publik (muncul di Jelajah)</option>
          </select>
        </div>
      </div>

      {needsSignIn && (
        <div role="status" className="space-y-2 rounded-lg bg-warning p-3 text-xs text-warning-foreground">
          <p className="font-bold">Masuk terlebih dahulu untuk membuat workspace baru.</p>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="xs">
              <Link to="/masuk?next=/workspace">Masuk</Link>
            </Button>
            <Button asChild size="xs" variant="outline">
              <Link to="/daftar?next=/workspace">Buat Akun</Link>
            </Button>
          </div>
        </div>
      )}

      {submitError && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-xs font-bold text-destructive"
        >
          {submitError}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Menyimpan workspace..." : "Buat Workspace"}
      </Button>
    </form>
  );
}
