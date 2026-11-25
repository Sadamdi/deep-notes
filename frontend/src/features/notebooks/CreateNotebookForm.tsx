import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { createNotebookSchema, type CreateNotebookInput } from "@deep-notes/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiRequestError } from "@/lib/api";

type Props = { onSubmit: (input: CreateNotebookInput) => void | Promise<void> };

/** Form validation uses the shared Zod schema so client and API rules stay identical. */
export function CreateNotebookForm({ onSubmit }: Props) {
  const [submitNotice, setSubmitNotice] = useState<{ tone: "error" | "info"; text: string } | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateNotebookInput>({ resolver: zodResolver(createNotebookSchema) });

  const handleValidSubmit = async (input: CreateNotebookInput) => {
    setSubmitNotice(null);
    try {
      await onSubmit(input);
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === "UNAUTHORIZED") {
        setSubmitNotice({
          tone: "info",
          text: "Pembuatan workspace membutuhkan sesi akun aktif. Layar masuk dan daftar akan dihubungkan pada tahap berikutnya.",
        });
        return;
      }
      setSubmitNotice({
        tone: "error",
        text: err instanceof Error ? err.message : "Gagal membuat workspace. Periksa koneksi API lalu coba lagi.",
      });
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

      <div className="space-y-2">
        <Label htmlFor="notebook-course" className="font-bold">
          Kode atau nama mata kuliah (opsional)
        </Label>
        <Input
          id="notebook-course"
          placeholder="Contoh: IF3130"
          aria-invalid={!!errors.course}
          {...register("course")}
        />
        {errors.course && (
          <p role="alert" className="text-xs font-bold text-destructive">
            {errors.course.message}
          </p>
        )}
      </div>

      {submitNotice && (
        <p
          role="status"
          className={
            submitNotice.tone === "error"
              ? "rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-xs font-bold text-destructive"
              : "rounded-lg bg-warning px-3 py-2.5 text-xs font-bold text-warning-foreground"
          }
        >
          {submitNotice.text}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Menyimpan workspace..." : "Buat Workspace"}
      </Button>
    </form>
  );
}
