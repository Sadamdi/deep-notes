import { setAi } from "../../../backend/src/ai/index.js";
import { assistFromWorkspaceSources } from "../../../backend/src/modules/answers/answers.service.js";
import { closeApp, createNotebookWithSources, freshApp, signUp } from "../../../backend/tests/helpers.js";

const { app, db } = await freshApp();

try {
  const user = await signUp(app, "Saran sumber");
  const notebookId = await createNotebookWithSources(user.agent, [[
    "String Method",
    "String adalah tipe data untuk menyimpan teks. Method length menghitung jumlah karakter. Method substring mengambil bagian teks dari posisi awal sampai posisi akhir yang dipilih.",
  ]]);
  const source = (await user.agent.get(`/api/v1/notebooks/${notebookId}/sources`)).body.data[0] as { id: string };

  setAi(undefined);
  const startedAt = Date.now();
  const result = await assistFromWorkspaceSources(notebookId, {
    task: "suggest_questions",
    input: "",
    sourceIds: [source.id],
  });
  const elapsedMs = Date.now() - startedAt;
  console.info(JSON.stringify({ grounded: result.grounded, items: result.items, citations: result.citations, elapsedMs }));

  if (!result.grounded || result.items.length === 0 || result.citations.length === 0) {
    throw new Error("Real AI did not return a cited question from the selected source.");
  }
} finally {
  await closeApp(db);
}
