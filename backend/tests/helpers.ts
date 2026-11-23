import JSZip from "jszip";
import request from "supertest";
import { createApp } from "../src/app.js";
import { setAi, type AiProvider } from "../src/ai/index.js";
import { migrate, pgliteDb, setDb, type Db } from "../src/db/index.js";
import { waitForIngestion } from "../src/modules/sources/ingest.js";

const tokens = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 4);

function hash(t: string): number {
  let h = 2166136261;
  for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619);
  return Math.abs(h) % 768;
}

export function fakeEmbedding(text: string): number[] {
  const v = new Array<number>(768).fill(0);
  for (const t of tokens(text)) v[hash(t)]! += 1;
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / n);
}

/** Deterministic stand-in for the real models: word-overlap retrieval and templated JSON. */
export const fakeAi: AiProvider = {
  async embed(texts) {
    return texts.map(fakeEmbedding);
  },
  async generateJson(opts) {
    const user = opts.user;
    if (opts.purpose === "quiz") {
      const passages = [...user.matchAll(/PASSAGE (\d+):\n([\s\S]*?)(?=\n\nPASSAGE \d+:|$)/g)];
      return opts.schema.parse({
        items: passages.map((m, i) => ({
          n: Number(m[1]),
          question: `Apa isi inti passage ${i + 1}?`,
          options: [`Jawaban benar ${i}`, `Pengecoh A ${i}`, `Pengecoh B ${i}`, `Pengecoh C ${i}`],
          answerIndex: 0,
          explanation: `Lihat: ${m[2]!.slice(0, 40)}`,
          topic: i % 2 === 0 ? "Topik Genap" : "Topik Ganjil",
        })),
      });
    }
    const q = /PERTANYAAN: ([\s\S]*)$/.exec(user)?.[1] ?? "";
    const blocks = [...user.matchAll(/\[(\d+)\] \(([^)]*)\)\n([\s\S]*?)(?=\n\n\[\d+\] \(|\n\nPERTANYAAN:)/g)];
    const qt = new Set(tokens(q));
    let best = { n: 0, overlap: 0, text: "" };
    for (const b of blocks) {
      const overlap = tokens(b[3]!).filter((t) => qt.has(t)).length;
      if (overlap > best.overlap) best = { n: Number(b[1]), overlap, text: b[3]! };
    }
    if (best.overlap < 2) {
      return opts.purpose === "explain"
        ? opts.schema.parse({ grounded: false, steps: [], citations: [] })
        : opts.schema.parse({ grounded: false, answer: "", citations: [] });
    }
    const quote = best.text.slice(0, 50);
    return opts.purpose === "explain"
      ? opts.schema.parse({
          grounded: true,
          steps: [
            { text: "Langkah pertama dari sumber.", emotion: "curious" },
            { text: best.text.slice(0, 80), emotion: "happy" },
          ],
          citations: [{ n: best.n, quote }],
        })
      : opts.schema.parse({ grounded: true, answer: `Menurut sumber: ${best.text.slice(0, 120)}`, citations: [{ n: best.n, quote }] });
  },
};

export async function freshApp() {
  const db: Db = await pgliteDb();
  await migrate(db);
  setDb(db);
  setAi(fakeAi);
  return { app: createApp(), db };
}

export async function closeApp(db: Db) {
  await waitForIngestion();
  setDb(undefined);
  setAi(undefined);
  await db.close();
}

let counter = 0;
export async function signUp(app: ReturnType<typeof createApp>, name = "Tester") {
  const agent = request.agent(app);
  const email = `user${++counter}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const res = await agent.post("/api/v1/auth/register").send({ email, name, password: "password-123" });
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { agent, email, id: res.body.data.id as string, name };
}

export const STAR_TEXT =
  "Topologi bintang menghubungkan semua perangkat ke satu switch pusat. Kerusakan satu kabel hanya memutus satu perangkat dari jaringan, sehingga jaringan lain tetap berjalan normal. Topologi ini mudah dikelola dan dipakai di kebanyakan jaringan kantor.";
export const OSI_TEXT =
  "Model OSI memiliki tujuh lapisan: fisik, data link, jaringan, transport, sesi, presentasi, dan aplikasi. Lapisan transport bertugas mengirim data antar proses dengan protokol TCP yang andal atau UDP yang cepat tanpa jaminan pengiriman.";
export const SUBNET_TEXT =
  "Subnet mask 255.255.255.0 berarti dua puluh empat bit pertama adalah bagian jaringan, sehingga satu subnet menampung dua ratus lima puluh empat host yang dapat dipakai. Protokol DHCP memberikan alamat IP secara otomatis kepada perangkat.";

export async function createNotebookWithSources(agent: ReturnType<typeof request.agent>, texts: Array<[string, string]> = [["Jaringan 1", STAR_TEXT], ["Jaringan 2", OSI_TEXT], ["Jaringan 3", SUBNET_TEXT]]) {
  const nb = await agent.post("/api/v1/notebooks").send({ title: "Jaringan Komputer" });
  const id = nb.body.data.id as string;
  for (const [title, text] of texts) {
    const r = await agent.post(`/api/v1/notebooks/${id}/sources/text`).send({ title, text });
    if (r.status !== 202) throw new Error(`source failed ${r.status} ${JSON.stringify(r.body)}`);
  }
  await waitForIngestion();
  return id;
}

/** Builds a small valid PDF, one text line per page, for upload tests. */
export function makePdf(pages: string[]): Buffer {
  const objs: string[] = [];
  const kids = pages.map((_, i) => `${3 + i * 2} 0 R`).join(" ");
  objs.push("<</Type/Catalog/Pages 2 0 R>>");
  objs.push(`<</Type/Pages/Kids[${kids}]/Count ${pages.length}>>`);
  const fontId = 3 + pages.length * 2;
  pages.forEach((text, i) => {
    const content = `BT /F1 12 Tf 72 720 Td (${text.replace(/[()\\]/g, "")}) Tj ET`;
    objs.push(`<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents ${4 + i * 2} 0 R/Resources<</Font<</F1 ${fontId} 0 R>>>>>>`);
    objs.push(`<</Length ${content.length}>>\nstream\n${content}\nendstream`);
  });
  objs.push("<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>");
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<</Root 1 0 R/Size ${objs.length + 1}>>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(out, "latin1");
}

export async function makeDocx(paragraphs: string[]): Promise<Buffer> {
  const zip = new JSZip();
  zip.file("word/document.xml", `<w:document><w:body>${paragraphs.map((p) => `<w:p><w:r><w:t>${p}</w:t></w:r></w:p>`).join("")}</w:body></w:document>`);
  return zip.generateAsync({ type: "nodebuffer" });
}

export async function makePptx(slides: string[]): Promise<Buffer> {
  const zip = new JSZip();
  slides.forEach((s, i) => zip.file(`ppt/slides/slide${i + 1}.xml`, `<p:sld><a:p><a:r><a:t>${s}</a:t></a:r></a:p></p:sld>`));
  return zip.generateAsync({ type: "nodebuffer" });
}
