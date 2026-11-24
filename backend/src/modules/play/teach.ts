import type { Animation, Citation } from "@deep-notes/shared";
import { z } from "zod";
import { getAi } from "../../ai/index.js";
import { MAX_DISTANCE, RULES, retrieve, sourcesBlock, validateCitations } from "../answers/answers.service.js";

const teachLlm = z.object({
  understood: z.enum(["yes", "partly", "no"]),
  score: z.number().min(0).max(100),
  covered: z.array(z.string()).default([]),
  missing: z.array(z.string()).default([]),
  wrong: z.array(z.string()).default([]),
  reply: z.string().min(1),
  citations: z.array(z.object({ n: z.number().int(), quote: z.string().default("") })).default([]),
});

export interface TeachResult {
  /** false when the topic is not in the sources, so the explanation cannot be checked */
  checkable: boolean;
  understood: "yes" | "partly" | "no";
  score: number;
  covered: string[];
  missing: string[];
  wrong: string[];
  /** what the mascot says back, as a "confused student" */
  reply: string;
  animation: Animation;
  emotion: "happy" | "thinking" | "concerned";
  citations: Citation[];
}

const REACTION = {
  yes: { animation: "nod", emotion: "happy" },
  partly: { animation: "think", emotion: "thinking" },
  no: { animation: "shake_head", emotion: "concerned" },
} as const;

/** The player explains a topic to the mascot; the sources decide what is right. The mascot never invents facts. */
export async function evaluateTeachBack(notebookId: string, topic: string, explanation: string, sourceIds?: string[]): Promise<TeachResult> {
  const chunks = await retrieve(notebookId, `${topic}\n${explanation}`.slice(0, 1500), 6, sourceIds);
  if (!chunks.length || chunks[0]!.distance > MAX_DISTANCE) {
    return { checkable: false, understood: "no", score: 0, covered: [], missing: [], wrong: [], reply: "Aku tidak menemukan topik ini di sumber, jadi aku belum bisa memeriksa penjelasanmu. Coba tambah sumbernya.", animation: "shrug", emotion: "concerned", citations: [] };
  }
  const res = await getAi().generateJson({
    purpose: "teach",
    system: `${RULES}\nKamu berperan sebagai MURID yang pura-pura bingung, dan sekaligus penilai. Pemain menjelaskan sebuah topik kepadamu. Nilai penjelasannya HANYA berdasarkan SUMBER.\n- "understood": yes (benar dan cukup lengkap), partly (benar tapi kurang), no (salah atau sangat kurang).\n- "score": 0 sampai 100.\n- "covered": poin sumber yang sudah dijelaskan dengan benar. "missing": poin penting yang belum disebut. "wrong": klaim pemain yang bertentangan dengan sumber.\n- "reply": jawabanmu sebagai murid dalam 1 sampai 2 kalimat: tunjukkan apa yang sudah kamu pahami dan tanyakan satu hal yang masih membingungkan (dari poin yang kurang). Jangan menambah fakta di luar sumber.\n- "citations": sumber yang dipakai untuk menilai.\nFormat JSON: {"understood":"yes|partly|no","score":number,"covered":[string],"missing":[string],"wrong":[string],"reply":string,"citations":[{"n":number,"quote":string}]}`,
    user: `SUMBER:\n${sourcesBlock(chunks)}\n\nTOPIK: ${topic}\n\nPENJELASAN PEMAIN:\n${explanation}`,
    schema: teachLlm,
  });
  const citations = validateCitations(res.citations, chunks);
  const r = REACTION[res.understood];
  return { checkable: true, understood: res.understood, score: Math.round(res.score), covered: res.covered, missing: res.missing, wrong: res.wrong, reply: res.reply.trim(), animation: r.animation, emotion: r.emotion, citations };
}
