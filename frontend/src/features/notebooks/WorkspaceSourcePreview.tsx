import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useState } from "react";
import quoteIcon from "@/assets/icons/quote.svg";
import { Button } from "@/components/ui/button";
import type { SelectedPreviewTarget, WorkspaceSource } from "@/features/notebooks/types";
import { api } from "@/lib/api";

const SourceGraph = lazy(() => import("@/features/notebooks/SourceGraph"));

type Props = {
  notebookId: string;
  isSample: boolean;
  sources: WorkspaceSource[];
  target: SelectedPreviewTarget | null;
  onChangePage: (page: number) => void;
};

const SAMPLE_PAGE_TEXT: Record<string, string> = {
  "s1:1":
    "Bab 1 Topologi Jaringan. Topologi fisik menentukan bagaimana node dihubungkan secara fisik pada jaringan lokal kampus.",
  "s1:3":
    "Topologi bintang menghubungkan setiap perangkat ke satu switch pusat. Jika satu kabel perangkat putus, perangkat lain masih tetap terhubung melalui switch pusat.",
  "s2:1":
    "Model referensi OSI membagi komunikasi jaringan menjadi 7 lapisan, mulai dari lapisan fisik hingga aplikasi.",
};

export function WorkspaceSourcePreview({ notebookId, isSample, sources, target, onChangePage }: Props) {
  const [show3d, setShow3d] = useState(false);

  const activeSource = sources.find((s) => s.id === target?.sourceId) ?? null;
  const page = target?.page ?? 1;
  const maxPage = activeSource?.pageCount ?? 1;

  const pageQuery = useQuery({
    queryKey: ["source-page", notebookId, target?.sourceId, page],
    queryFn: async () => {
      if (isSample) {
        const sampleKey = `${target?.sourceId}:${page}`;
        return {
          page,
          text:
            SAMPLE_PAGE_TEXT[sampleKey] ??
            "Contoh cuplikan halaman sumber. Di ruang asli, teks halaman diambil langsung dari potongan dokumen yang diunggah.",
        };
      }
      return api<{ page: number; text: string }>(`/notebooks/${notebookId}/sources/${target!.sourceId}/pages/${page}`);
    },
    enabled: Boolean(target?.sourceId),
    retry: false,
  });

  return (
    <section
      id="peta-sumber"
      aria-labelledby="preview-heading"
      className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 id="preview-heading" className="text-xl font-bold text-card-foreground">
            Pratinjau Sumber
          </h2>
          {sources.length > 0 && (
            <button
              type="button"
              onClick={() => setShow3d((v) => !v)}
              aria-pressed={show3d}
              className="min-h-11 rounded-lg bg-muted px-3 text-xs font-bold text-foreground hover:bg-secondary hover:text-secondary-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {show3d ? "Teks Halaman" : "Peta 3D"}
            </button>
          )}
        </div>

        {show3d ? (
          <div className="space-y-2 rounded-xl bg-muted p-3">
            <p className="text-xs text-muted-foreground">
              Visualisasi opsional hubungan {sources.length} sumber. Seluruh isi materi tetap tersedia sebagai teks.
            </p>
            <Suspense fallback={<p className="py-8 text-xs text-muted-foreground">Memuat peta 3D...</p>}>
              <SourceGraph labels={sources.map((s) => s.title)} />
            </Suspense>
          </div>
        ) : !target ? (
          <div className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
            Pilih salah satu sumber yang siap di kolom kiri atau klik chip sitasi pada jawaban Bubi untuk membaca
            kutipan halamannya di sini.
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-bold text-card-foreground">{target.sourceTitle}</p>
              <p className="text-xs text-muted-foreground">
                Halaman {page}
                {maxPage > 1 ? ` dari ${maxPage}` : ""}
              </p>
            </div>

            {target.highlightQuote && (
              <blockquote className="rounded-xl border border-cite/35 bg-secondary/45 p-3 text-xs leading-relaxed text-foreground">
                <span className="mb-1 block font-bold text-cite">Kutipan yang dirujuk:</span>
                {target.highlightQuote}
              </blockquote>
            )}

            <div className="max-h-[340px] space-y-3 overflow-y-auto rounded-xl bg-muted p-3.5 text-sm leading-relaxed text-foreground">
              {pageQuery.isPending && <p className="text-xs text-muted-foreground">Memuat isi halaman {page}...</p>}
              {pageQuery.isError && (
                <p className="text-xs text-muted-foreground">
                  Sumber ini tidak memiliki penomoran halaman terpisah atau halaman {page} tidak tersedia.
                </p>
              )}
              {pageQuery.isSuccess && (
                <>
                  <p className="whitespace-pre-line">{pageQuery.data.text}</p>
                  <div className="flex items-center gap-2 pt-2 text-xs font-bold text-foreground">
                    <img
                      src={quoteIcon}
                      alt=""
                      aria-hidden="true"
                      width={18}
                      height={18}
                      className="dark:brightness-0 dark:invert"
                    />
                    <span>
                      {target.sourceTitle} · halaman {pageQuery.data.page}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {!show3d && target && maxPage > 1 && (
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="secondary" size="sm" disabled={page <= 1} onClick={() => onChangePage(page - 1)}>
            Hal. Sebelumnya
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={page >= maxPage}
            onClick={() => onChangePage(page + 1)}
          >
            Hal. Berikutnya
          </Button>
        </div>
      )}
    </section>
  );
}
