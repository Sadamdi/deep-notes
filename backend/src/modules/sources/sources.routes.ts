import path from "node:path";
import { addLinkSourceSchema, addTextSourceSchema } from "@deep-notes/shared";
import { Router, type Request } from "express";
import multer from "multer";
import { getDb } from "../../db/index.js";
import { ok } from "../../lib/apiResponse.js";
import { logActivity } from "../../lib/activity.js";
import { AppError } from "../../lib/errors.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { notebookAccess, requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import {
  MAX_FILE_BYTES,
  extractCsv,
  extractDocx,
  extractXlsx,
  extractPdf,
  extractPlain,
  extractPptx,
  fetchLink,
  type ExtractedPage,
} from "./extract.js";
import { startIngestion, type PagesInput } from "./ingest.js";
import { getAi } from "../../ai/index.js";
import { env } from "../../config/env.js";

export const sourceRoutes = Router({ mergeParams: true });
sourceRoutes.use(requireAuth);

/** Quota that keeps one notebook from exhausting AI budget and storage on the shared demo server. */
export const MAX_SOURCES_PER_NOTEBOOK = 40;

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE_BYTES, files: 1 } });

const KIND_BY_EXT: Record<string, "pdf" | "text" | "docx" | "pptx" | "xlsx" | "csv" | "image"> = {
  ".pdf": "pdf",
  ".txt": "text",
  ".md": "text",
  ".markdown": "text",
  ".docx": "docx",
  ".pptx": "pptx",
  ".xlsx": "xlsx",
  ".csv": "csv",
  ".png": "image",
  ".jpg": "image",
  ".jpeg": "image",
  ".webp": "image",
};

const IMAGE_MIME: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };

const startsWith = (buf: Buffer, sig: string) => buf.subarray(0, sig.length).toString("latin1") === sig;

async function createSource(req: Request, title: string, kind: string, origin: string | null, pages: PagesInput) {
  const db = await getDb();
  const notebookId = req.member!.notebookId;
  const count = await db.query<{ n: number }>("SELECT count(*)::int AS n FROM sources WHERE notebook_id = $1", [notebookId]);
  if (count[0]!.n >= MAX_SOURCES_PER_NOTEBOOK) throw new AppError("CONFLICT", `A notebook can hold at most ${MAX_SOURCES_PER_NOTEBOOK} sources`);
  const rows = await db.query<{ id: string }>(
    "INSERT INTO sources(notebook_id, uploaded_by, title, kind, origin) VALUES ($1,$2,$3,$4,$5) RETURNING id",
    [notebookId, req.user!.id, title, kind, origin],
  );
  const id = rows[0]!.id;
  await logActivity(notebookId, req.user!.id, "source_added", id);
  startIngestion(id, notebookId, pages);
  return { id, title, kind, status: "processing" as const };
}

sourceRoutes.post(
  "/file",
  notebookAccess("editor"),
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const f = req.file;
    if (!f) throw new AppError("VALIDATION", "Attach a file in the 'file' field");
    const ext = path.extname(f.originalname).toLowerCase();
    const kind = KIND_BY_EXT[ext];
    if (!kind) throw new AppError("VALIDATION", "Supported files: PDF, TXT, MD, DOCX, PPTX, XLSX, CSV, PNG, JPG, WEBP");
    if (kind === "pdf" && !startsWith(f.buffer, "%PDF")) throw new AppError("VALIDATION", "The file is not a real PDF");
    if (kind === "image" && !(startsWith(f.buffer, "\x89PNG") || startsWith(f.buffer, "\xFF\xD8") || startsWith(f.buffer, "RIFF"))) throw new AppError("VALIDATION", "The file is not a real image");
    if ((kind === "docx" || kind === "pptx" || kind === "xlsx") && !startsWith(f.buffer, "PK")) throw new AppError("VALIDATION", `The file is not a real ${ext.slice(1).toUpperCase()}`);
    let pages: ExtractedPage[];
    try {
      pages = kind === "image" ? [] : kind === "csv" ? extractCsv(f.buffer) : kind === "xlsx" ? await extractXlsx(f.buffer) : kind === "pdf" ? await extractPdf(f.buffer) : kind === "docx" ? await extractDocx(f.buffer) : kind === "pptx" ? await extractPptx(f.buffer) : extractPlain(f.buffer);
    } catch (e) {
      if (e instanceof AppError) throw e;
      throw new AppError("VALIDATION", "The file could not be read");
    }
    let input: PagesInput = pages;
    if (!pages.length) {
      // a PDF without a text layer is a scan: read it with a vision model in the background
      if ((kind !== "pdf" && kind !== "image") || env.GEMINI_API_KEYS.length === 0) throw new AppError("VALIDATION", "No readable text found in this file");
      if (f.size > 12 * 1024 * 1024) throw new AppError("VALIDATION", "Scanned PDFs are limited to 12 MB");
      const data = f.buffer;
      const mime = kind === "image" ? IMAGE_MIME[ext]! : "application/pdf";
      input = async () => (await getAi().ocr(data, mime)).map((p) => ({ page: kind === "image" ? null : p.page, text: p.text }));
    }
    const title = typeof req.body?.title === "string" && req.body.title.trim() ? req.body.title.trim().slice(0, 160) : path.basename(f.originalname, ext);
    res.status(202).json(ok(await createSource(req, title, kind, null, input)));
  }),
);

sourceRoutes.post(
  "/text",
  notebookAccess("editor"),
  validate("body", addTextSourceSchema),
  asyncHandler(async (req, res) => {
    const b = req.body as { title: string; text: string };
    res.status(202).json(ok(await createSource(req, b.title, "text", null, extractPlain(Buffer.from(b.text, "utf8")))));
  }),
);

sourceRoutes.post(
  "/link",
  notebookAccess("editor"),
  validate("body", addLinkSourceSchema),
  asyncHandler(async (req, res) => {
    const b = req.body as { url: string; title?: string };
    const { title, pages } = await fetchLink(b.url);
    res.status(202).json(ok(await createSource(req, b.title || title, "link", b.url, pages)));
  }),
);

const SRC_FIELDS = `s.id, s.title, s.kind, s.status, s.error, s.page_count AS "pageCount", s.origin, s.created_at AS "createdAt",
  s.uploaded_by AS "uploadedBy", u.name AS "uploadedByName",
  (SELECT count(*)::int FROM source_chunks c WHERE c.source_id = s.id) AS "chunkCount"`;

sourceRoutes.get(
  "/",
  notebookAccess("viewer"),
  asyncHandler(async (req, res) => {
    const rows = await (await getDb()).query(
      `SELECT ${SRC_FIELDS} FROM sources s JOIN users u ON u.id = s.uploaded_by WHERE s.notebook_id = $1 ORDER BY s.created_at DESC`,
      [req.member!.notebookId],
    );
    res.json(ok(rows));
  }),
);

sourceRoutes.get(
  "/:sourceId",
  notebookAccess("viewer"),
  asyncHandler(async (req, res) => {
    const rows = await (await getDb()).query(
      `SELECT ${SRC_FIELDS} FROM sources s JOIN users u ON u.id = s.uploaded_by WHERE s.notebook_id = $1 AND s.id::text = $2`,
      [req.member!.notebookId, req.params.sourceId],
    );
    if (!rows[0]) throw new AppError("NOT_FOUND", "Source not found");
    res.json(ok(rows[0]));
  }),
);

/** Text of one page, so a citation chip can open the exact passage. */
sourceRoutes.get(
  "/:sourceId/pages/:page",
  notebookAccess("viewer"),
  asyncHandler(async (req, res) => {
    const page = Number(req.params.page);
    if (!Number.isInteger(page) || page < 1) throw new AppError("VALIDATION", "Invalid page");
    const rows = await (await getDb()).query(
      `SELECT c.content, c.idx FROM source_chunks c JOIN sources s ON s.id = c.source_id
       WHERE s.notebook_id = $1 AND s.id::text = $2 AND c.page = $3 ORDER BY c.idx`,
      [req.member!.notebookId, req.params.sourceId, page],
    );
    if (!rows.length) throw new AppError("NOT_FOUND", "Page not found");
    res.json(ok({ page, text: rows.map((r) => r.content).join("\n\n") }));
  }),
);

sourceRoutes.delete(
  "/:sourceId",
  notebookAccess("editor"),
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const rows = await db.query<{ uploaded_by: string }>("SELECT uploaded_by FROM sources WHERE notebook_id = $1 AND id::text = $2", [
      req.member!.notebookId,
      req.params.sourceId,
    ]);
    if (!rows[0]) throw new AppError("NOT_FOUND", "Source not found");
    if (req.member!.role !== "owner" && rows[0].uploaded_by !== req.user!.id) throw new AppError("FORBIDDEN", "Only the uploader or the owner can delete a source");
    await db.query("DELETE FROM sources WHERE id::text = $1", [req.params.sourceId]);
    res.json(ok({ deleted: true }));
  }),
);
