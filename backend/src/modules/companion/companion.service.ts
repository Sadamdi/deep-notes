import crypto from "node:crypto";
import {
  ANIMATIONS,
  DEFAULT_ANIMATION_FOR_EMOTION,
  emotionSchema,
  type Beat,
  type ExplainRequest,
  type Mascot,
  type Performance,
} from "@deep-notes/shared";
import { z } from "zod";
import { getAi } from "../../ai/index.js";
import { NOT_FOUND_TEXT, RULES, MAX_DISTANCE, retrieve, sourcesBlock, validateCitations } from "../answers/answers.service.js";

/**
 * Mascots the interface can offer. The names are placeholders until the design team finalises the characters;
 * change them here and the catalog endpoint updates for everyone. Every mascot lists the clips it really has.
 */
export const MASCOTS: Mascot[] = [
  { id: "kiko", name: "Kiko", role: "teacher", tagline: "Sabar menjelaskan langkah demi langkah", animations: [...ANIMATIONS] },
  { id: "mimi", name: "Mimi", role: "friend", tagline: "Teman belajar yang santai dan suka bercanda", animations: [...ANIMATIONS] },
  { id: "bobo", name: "Bobo", role: "coach", tagline: "Penyemangat yang menjaga ritme belajarmu", animations: [...ANIMATIONS] },
];

const llmBeat = z.object({
  say: z.string().min(1),
  emotion: emotionSchema.catch("neutral"),
  animation: z.string().default(""),
  cite: z.number().int().nullable().optional(),
});
const llmPerformance = z.object({
  grounded: z.boolean(),
  beats: z.array(llmBeat).max(8).default([]),
  citations: z.array(z.object({ n: z.number().int(), quote: z.string().default("") })).default([]),
  followUps: z.array(z.string()).max(3).default([]),
});

const STYLE: Record<ExplainRequest["style"], string> = {
  teacher: "Bertindak sebagai GURU yang sabar: jelaskan runtut, beri contoh dari sumber, akhiri dengan pertanyaan pengecek pemahaman.",
  friend: "Bertindak sebagai TEMAN BELAJAR yang santai: bahasa akrab dan ringan, boleh sedikit bercanda, tetap akurat.",
  coach: "Bertindak sebagai PELATIH yang menyemangati: beri motivasi singkat dan langkah kecil berikutnya, tetap akurat.",
};
const LEVEL: Record<ExplainRequest["level"], string> = {
  simple: "Gunakan bahasa sangat sederhana dan kalimat pendek, hindari istilah teknis tanpa penjelasan. Cocok untuk pemula.",
  normal: "Gunakan bahasa kuliah yang jelas.",
  detailed: "Boleh rinci dan memakai istilah teknis dari sumber, dengan penjelasan singkat tiap istilah.",
};

const estimateMs = (text: string) => Math.min(12_000, Math.max(1_500, text.length * 45));

const newId = () => crypto.randomUUID();

export function notFoundPerformance(req: Pick<ExplainRequest, "style" | "level">, mascotId: string): Performance {
  return {
    id: newId(),
    mascotId,
    style: req.style,
    level: req.level,
    grounded: false,
    beats: [{ index: 0, say: NOT_FOUND_TEXT, emotion: "concerned", animation: "shrug", citation: null, durationMs: 2500, voiceNoteId: null }],
    citations: [],
    followUps: [],
  };
}

export async function explainAsPerformance(notebookId: string, req: ExplainRequest): Promise<Performance> {
  const mascotId = MASCOTS.some((m) => m.id === req.mascotId) ? req.mascotId! : (MASCOTS.find((m) => m.role === req.style)?.id ?? "kiko");
  const chunks = await retrieve(notebookId, req.question);
  if (!chunks.length || chunks[0]!.distance > MAX_DISTANCE) return notFoundPerformance(req, mascotId);

  const res = await getAi().generateJson({
    purpose: "explain",
    system: `${RULES}

${STYLE[req.style]} ${LEVEL[req.level]}
Susun penjelasan sebagai 3 sampai 6 "beats" pendek. Setiap beat punya:
- "say": teks yang diucapkan maskot, lengkap dan bisa dibaca sendiri tanpa animasi.
- "emotion": salah satu dari ${emotionSchema.options.join(", ")}.
- "animation": salah satu dari ${ANIMATIONS.join(", ")}. Pilih yang cocok dengan isi beat (misalnya point_right saat merujuk potongan sumber, think saat bernalar, nod saat membenarkan).
- "cite": nomor sumber [n] yang sedang dibahas pada beat itu, atau null.
Tambahkan "followUps": sampai 3 pertanyaan lanjutan yang masih bisa dijawab dari sumber.
Format balasan JSON: {"grounded": boolean, "beats": [{"say": string, "emotion": string, "animation": string, "cite": number|null}], "citations": [{"n": number, "quote": string}], "followUps": [string]}`,
    user: `SUMBER:\n${sourcesBlock(chunks)}\n\nPERTANYAAN: ${req.question}`,
    schema: llmPerformance,
  });

  const citations = validateCitations(res.citations, chunks);
  if (!res.grounded || citations.length === 0 || res.beats.length === 0) return notFoundPerformance(req, mascotId);

  // map the model's source numbers to positions in the validated citation list
  const order: number[] = [];
  for (const c of res.citations) if (chunks[c.n - 1] && !order.includes(c.n)) order.push(c.n);

  const beats: Beat[] = res.beats.map((b, index) => {
    const animation = (ANIMATIONS as readonly string[]).includes(b.animation) ? (b.animation as Beat["animation"]) : DEFAULT_ANIMATION_FOR_EMOTION[b.emotion];
    const at = b.cite == null ? -1 : order.indexOf(b.cite);
    return { index, say: b.say.trim(), emotion: b.emotion, animation, citation: at >= 0 ? at : null, durationMs: estimateMs(b.say), voiceNoteId: null };
  });
  return {
    id: newId(),
    mascotId,
    style: req.style,
    level: req.level,
    grounded: true,
    beats,
    citations,
    followUps: res.followUps.map((f) => f.trim()).filter(Boolean),
  };
}

/** A fixed sample so the frontend can build and test the player without waiting for the AI. */
export function demoPerformance(scenario: "explain" | "notfound"): Performance {
  if (scenario === "notfound") return notFoundPerformance({ style: "teacher", level: "normal" }, "kiko");
  return {
    id: "demo-explain",
    mascotId: "kiko",
    style: "teacher",
    level: "simple",
    grounded: true,
    beats: [
      { index: 0, say: "Halo! Hari ini kita bahas topologi bintang.", emotion: "happy", animation: "wave", citation: null, durationMs: 2200, voiceNoteId: null },
      { index: 1, say: "Di topologi bintang, semua perangkat tersambung ke satu switch di tengah.", emotion: "neutral", animation: "write_on_board", citation: 0, durationMs: 3800, voiceNoteId: null },
      { index: 2, say: "Kalau satu kabel putus, hanya satu perangkat yang terputus. Yang lain aman.", emotion: "happy", animation: "point_right", citation: 0, durationMs: 3600, voiceNoteId: null },
      { index: 3, say: "Tapi hati-hati: kalau switch-nya rusak, seluruh jaringan ikut mati.", emotion: "concerned", animation: "hold_magnifier", citation: 0, durationMs: 3400, voiceNoteId: null },
      { index: 4, say: "Nah, menurutmu kenapa switch pusat disebut titik kegagalan tunggal?", emotion: "curious", animation: "lean_in", citation: null, durationMs: 3200, voiceNoteId: null },
    ],
    citations: [
      {
        sourceId: "00000000-0000-0000-0000-000000000001",
        sourceTitle: "Catatan Jaringan Komputer (contoh)",
        page: 1,
        quote: "Pada topologi bintang, semua perangkat terhubung ke satu switch pusat.",
      },
    ],
    followUps: ["Apa beda topologi bintang dan topologi bus?", "Mengapa topologi bintang banyak dipakai di kantor?"],
  };
}
