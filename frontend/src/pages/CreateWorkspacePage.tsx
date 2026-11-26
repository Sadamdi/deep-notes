import { useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateNotebookForm } from "@/features/notebooks/CreateNotebookForm";
import { useCreateNotebook } from "@/features/notebooks/queries";
import { ErrorState, PageTitle } from "@/components/shared/PageStates";

export function CreateWorkspacePage() {
  const createNotebook = useCreateNotebook();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <PageTitle action={<Button onClick={() => navigate(-1)} variant="outline"><ArrowLeft aria-hidden="true" />Kembali</Button>} description="Tentukan judul dan akses, lalu tambahkan materi dari sumber kelompok." eyebrow="Workspace saya" title="Buat workspace baru" />
      {createNotebook.isError && <ErrorState message={createNotebook.error.message} />}
      <CreateNotebookForm isSubmitting={createNotebook.isPending} onSubmit={(input) => createNotebook.mutate(input, { onSuccess: (notebook) => navigate(`/workspaces/${notebook.id}`) })} />
    </div>
  );
}
