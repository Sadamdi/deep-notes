import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { createNotebookSchema, type CreateNotebookInput } from "@deep-notes/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = { onSubmit: (input: CreateNotebookInput) => void | Promise<void> };

/** Form validation comes from the same Zod schema the API uses, so the two cannot drift. */
export function CreateNotebookForm({ onSubmit }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateNotebookInput>({ resolver: zodResolver(createNotebookSchema) });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="title">Notebook title</Label>
        <Input id="title" placeholder="Statistics exam prep" aria-invalid={!!errors.title} {...register("title")} />
        {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="course">Course (optional)</Label>
        <Input id="course" placeholder="STAT201" {...register("course")} />
        {errors.course && <p className="text-sm text-destructive">{errors.course.message}</p>}
      </div>
      <Button type="submit" disabled={isSubmitting}>
        Create notebook
      </Button>
    </form>
  );
}
