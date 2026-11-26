import dns from "node:dns/promises";
import net from "node:net";
import JSZip from "jszip";
import { extractText, getDocumentProxy } from "unpdf";
import { AppError } from "../../lib/errors.js";

/** One page (or slide) of extracted text. `page` is null when the format has no real pages. */
export interface ExtractedPage {
  page: number | null;
  text: string;
}

export interface ExtractedTable {
  name: string;
  headers: string[];
  rows: string[][];
}

export const MAX_FILE_BYTES = 15 * 1024 * 1024;

const clean = (s: string) => s.split("\u0000").join("").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

export async function extractPdf(buf: Buffer): Promise<ExtractedPage[]> {
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const { text } = await extractText(pdf, { mergePages: false });
  const pages = (Array.isArray(text) ? text : [text]).map((t, i) => ({ page: i + 1, text: clean(t) }));
  return pages.filter((p) => p.text.length > 0);
}

export function extractPlain(buf: Buffer): ExtractedPage[] {
  const text = clean(buf.toString("utf8"));
  return text ? [{ page: null, text }] : [];
}

const decodeXml = (s: string) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

export async function extractDocx(buf: Buffer): Promise<ExtractedPage[]> {
  const zip = await JSZip.loadAsync(buf);
  const xml = await zip.file("word/document.xml")?.async("string");
  if (!xml) throw new AppError("VALIDATION", "Not a valid DOCX file");
  const text = xml
    .replace(/<\/w:p>/g, "\n")
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<[^>]+>/g, "");
  const out = clean(decodeXml(text));
  return out ? [{ page: null, text: out }] : [];
}

export async function extractPptx(buf: Buffer): Promise<ExtractedPage[]> {
  const zip = await JSZip.loadAsync(buf);
  const slides = Object.keys(zip.files)
    .map((n) => /^ppt\/slides\/slide(\d+)\.xml$/.exec(n))
    .filter((m): m is RegExpExecArray => !!m)
    .map((m) => ({ n: Number(m[1]), name: m[0] }))
    .sort((a, b) => a.n - b.n);
  if (!slides.length) throw new AppError("VALIDATION", "Not a valid PPTX file");
  const pages: ExtractedPage[] = [];
  for (const s of slides) {
    const xml = await zip.file(s.name)!.async("string");
    const text = clean(decodeXml(xml.replace(/<\/a:p>/g, "\n").replace(/<[^>]+>/g, "")));
    if (text) pages.push({ page: s.n, text });
  }
  return pages;
}

/** Spreadsheet sheets become "pages": a citation points at the sheet number. Rows are written as "header: value" pairs so retrieval keeps the meaning of each cell. */
function rowsToText(rows: string[][]): string {
  if (rows.length === 0) return "";
  const header = rows[0]!.map((h) => h.trim());
  const body = rows.slice(1).filter((r) => r.some((c) => c.trim()));
  if (body.length === 0) return header.join(" | ");
  return body
    .slice(0, 2000)
    .map((r) => r.map((c, i) => (c.trim() ? `${header[i] || `kolom ${i + 1}`}: ${c.trim()}` : "")).filter(Boolean).join("; "))
    .join("\n");
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const delimiter = (text.split("\n", 1)[0]?.match(/;/g)?.length ?? 0) > (text.split("\n", 1)[0]?.match(/,/g)?.length ?? 0) ? ";" : ",";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

export function extractCsv(buf: Buffer): ExtractedPage[] {
  const text = rowsToText(parseCsv(buf.toString("utf8").replace(/^\uFEFF/, "")));
  return text ? [{ page: null, text }] : [];
}

function toTable(name: string, rows: string[][]): ExtractedTable | null {
  if (!rows.length) return null;
  const headers = rows[0]!.slice(0, 60).map((cell, index) => cell.trim() || `Column ${index + 1}`);
  const body = rows.slice(1).filter((row) => row.some((cell) => cell.trim())).slice(0, 2000).map((row) => row.slice(0, 60));
  return headers.length ? { name, headers, rows: body } : null;
}

export function extractCsvContent(buf: Buffer): { pages: ExtractedPage[]; tables: ExtractedTable[] } {
  const rows = parseCsv(buf.toString("utf8").replace(/^\uFEFF/, ""));
  const text = rowsToText(rows);
  const table = toTable("CSV", rows);
  return { pages: text ? [{ page: null, text }] : [], tables: table ? [table] : [] };
}

export async function extractXlsxContent(buf: Buffer): Promise<{ pages: ExtractedPage[]; tables: ExtractedTable[] }> {
  const zip = await JSZip.loadAsync(buf);
  const shared = (await zip.file("xl/sharedStrings.xml")?.async("string")) ?? "";
  const strings = [...shared.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => decodeXml([...m[1]!.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join("")));
  const sheets = Object.keys(zip.files)
    .map((n) => /^xl\/worksheets\/sheet(\d+)\.xml$/.exec(n))
    .filter((m): m is RegExpExecArray => !!m)
    .map((m) => ({ n: Number(m[1]), name: m[0] }))
    .sort((a, b) => a.n - b.n);
  if (!sheets.length) throw new AppError("VALIDATION", "Not a valid XLSX file");
  const colIndex = (ref: string) => [...ref.replace(/\d+/g, "")].reduce((acc, c) => acc * 26 + c.charCodeAt(0) - 64, 0) - 1;
  const pages: ExtractedPage[] = [];
  const tables: ExtractedTable[] = [];
  for (const s of sheets) {
    const xml = await zip.file(s.name)!.async("string");
    const rows: string[][] = [];
    for (const rowMatch of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
      const row: string[] = [];
      for (const c of rowMatch[1]!.matchAll(/<c ([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const attrs = c[1]!;
        const ref = /r="([A-Z]+\d+)"/.exec(attrs)?.[1];
        const type = /t="(\w+)"/.exec(attrs)?.[1];
        const raw = /<v>([\s\S]*?)<\/v>/.exec(c[2] ?? "")?.[1] ?? /<t[^>]*>([\s\S]*?)<\/t>/.exec(c[2] ?? "")?.[1] ?? "";
        const value = type === "s" ? (strings[Number(raw)] ?? "") : decodeXml(raw);
        if (ref) row[colIndex(ref)] = value;
        else row.push(value);
      }
      rows.push(Array.from(row, (v) => v ?? ""));
    }
    const text = rowsToText(rows);
    if (text) pages.push({ page: s.n, text });
    const table = toTable(`Sheet ${s.n}`, rows);
    if (table) tables.push(table);
  }
  return { pages, tables };
}

export async function extractXlsx(buf: Buffer): Promise<ExtractedPage[]> {
  return (await extractXlsxContent(buf)).pages;
}

// ---- links with SSRF protection -------------------------------------------------------------------

export function isPrivateAddress(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number) as [number, number];
    return (
      a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
    );
  }
  const v = ip.toLowerCase();
  if (v === "::1" || v === "::") return true;
  if (v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80")) return true;
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v);
  return mapped ? isPrivateAddress(mapped[1]!) : false;
}

/** Throws unless the URL is http(s) and every address its host resolves to is public. */
export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new AppError("VALIDATION", "Invalid URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new AppError("VALIDATION", "Only http and https links are allowed");
  if (url.username || url.password) throw new AppError("VALIDATION", "Links with credentials are not allowed");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addrs = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true }).catch(() => []);
  if (!addrs.length) throw new AppError("VALIDATION", "Could not resolve that host");
  if (addrs.some((a) => isPrivateAddress(a.address))) throw new AppError("VALIDATION", "That address is not allowed");
  return url;
}

export function htmlToText(html: string): { title: string; text: string } {
  const title = decodeXml(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.trim() ?? "");
  const body = html
    .replace(/<(script|style|noscript|svg|head)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|div|h[1-6]|li|tr|br|section|article)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ");
  return { title, text: clean(decodeXml(body).replace(/[ \t]{2,}/g, " ")) };
}

export async function fetchLink(raw: string): Promise<{ title: string; pages: ExtractedPage[] }> {
  let url = await assertPublicUrl(raw);
  for (let hop = 0; hop < 4; hop++) {
    const res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(15_000), headers: { "user-agent": "DeepNotesBot/1.0", accept: "text/html,text/plain" } });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = await assertPublicUrl(new URL(res.headers.get("location")!, url).toString());
      continue;
    }
    if (!res.ok) throw new AppError("VALIDATION", `The link returned status ${res.status}`);
    const type = res.headers.get("content-type") ?? "";
    if (!/text\/(html|plain)/i.test(type)) throw new AppError("VALIDATION", "Only web pages and plain text are supported");
    const reader = res.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 2 * 1024 * 1024) {
        await reader.cancel();
        break;
      }
      chunks.push(value);
    }
    const body = Buffer.concat(chunks).toString("utf8");
    const { title, text } = /html/i.test(type) ? htmlToText(body) : { title: "", text: clean(body) };
    if (!text) throw new AppError("VALIDATION", "No readable text found at that link");
    return { title: title || url.hostname, pages: [{ page: null, text }] };
  }
  throw new AppError("VALIDATION", "Too many redirects");
}

// ---- chunking --------------------------------------------------------------------------------------

export interface Chunk {
  page: number | null;
  content: string;
}

/** Splits each page into passages of roughly 700 to 1100 characters on paragraph and sentence boundaries. */
export function chunkPages(pages: ExtractedPage[], target = 900): Chunk[] {
  const chunks: Chunk[] = [];
  for (const p of pages) {
    const firstChunkOnPage = chunks.length;
    const units = p.text.split(/\n{2,}|(?<=[.!?])\s+(?=[A-Z0-9])/).map((u) => u.trim()).filter(Boolean);
    let buf = "";
    const flush = () => {
      if (buf.trim().length >= 20 || (buf.trim() && chunks.length === firstChunkOnPage)) chunks.push({ page: p.page, content: buf.trim() });
      buf = "";
    };
    for (const u of units) {
      if (buf && buf.length + u.length + 1 > target) flush();
      if (u.length > target * 1.5) {
        for (let i = 0; i < u.length; i += target) {
          buf = u.slice(i, i + target);
          flush();
        }
      } else buf += (buf ? " " : "") + u;
    }
    flush();
  }
  return chunks;
}
