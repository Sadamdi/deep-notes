import { z, type ZodType } from "zod";
import { env } from "../config/env.js";

export type EmbedTask = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

export interface GenerateJsonOptions<T> {
  system: string;
  user: string;
  schema: ZodType<T>;
  /** lets tests and logs tell requests apart */
  purpose: "answer" | "quiz" | "explain" | "game" | "teach" | "visual" | "other";
}

export interface AiProvider {
  generateJson<T>(opts: GenerateJsonOptions<T>): Promise<T>;
  embed(texts: string[], task: EmbedTask): Promise<number[][]>;
  /** Reads text from a scanned document (no text layer) with a vision model. */
  ocr(data: Buffer, mimeType: string): Promise<Array<{ page: number; text: string }>>;
}

const GEMINI = "https://generativelanguage.googleapis.com/v1beta";
const COOLDOWN_MS = 60_000;

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Rotates API keys; a key that returns quota/permission errors rests for a minute. */
class KeyRing {
  private i = 0;
  private resting = new Map<string, number>();
  constructor(private keys: string[]) {}
  get size() {
    return this.keys.length;
  }
  next(): string | undefined {
    for (let n = 0; n < this.keys.length; n++) {
      const k = this.keys[this.i++ % this.keys.length]!;
      if ((this.resting.get(k) ?? 0) < Date.now()) return k;
    }
    return undefined;
  }
  rest(key: string) {
    this.resting.set(key, Date.now() + COOLDOWN_MS);
  }
}

async function postJson(url: string, body: unknown, headers: Record<string, string> = {}, timeoutMs = 60_000): Promise<Record<string, any>> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  if (!res.ok) throw new HttpError(res.status, text.slice(0, 200));
  return JSON.parse(text);
}

function extractJson(text: string): unknown {
  const fenced = text.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
  const start = fenced.indexOf("{");
  const end = fenced.lastIndexOf("}");
  return JSON.parse(start >= 0 && end > start ? fenced.slice(start, end + 1) : fenced);
}

const normalize = (v: number[]) => {
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / n);
};

export function createRealAi(): AiProvider {
  const ring = new KeyRing(env.GEMINI_API_KEYS);
  const textModel = env.AI_TEXT_MODEL ?? "gemini-2.5-flash";
  const fallbackModel = env.AI_FALLBACK_TEXT_MODEL ?? "phantom/vibecode/qwen3.8-flash";

  async function viaGemini(system: string, user: string): Promise<string> {
    let last: unknown = new Error("no Gemini key available");
    for (let attempt = 0; attempt < Math.max(2, Math.min(ring.size, 5)); attempt++) {
      const key = ring.next();
      if (!key) break;
      try {
        const j = await postJson(`${GEMINI}/models/${textModel}:generateContent`, {
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
        }, { "x-goog-api-key": key });
        const text = j.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
        if (!text) throw new HttpError(502, "empty Gemini response");
        return text;
      } catch (e) {
        last = e;
        if (e instanceof HttpError && [403, 429, 500, 502, 503].includes(e.status)) ring.rest(key);
        else throw e;
      }
    }
    throw last;
  }

  async function viaCompat(system: string, user: string): Promise<string> {
    if (!env.OPENAI_COMPAT_BASE_URL || !env.OPENAI_COMPAT_API_KEY) throw new Error("no OpenAI-compatible fallback configured");
    const j = await postJson(
      `${env.OPENAI_COMPAT_BASE_URL.replace(/\/$/, "")}/chat/completions`,
      { model: fallbackModel, temperature: 0.2, messages: [{ role: "system", content: system }, { role: "user", content: user }] },
      { Authorization: `Bearer ${env.OPENAI_COMPAT_API_KEY}` },
    );
    return j.choices?.[0]?.message?.content ?? "";
  }

  return {
    async generateJson(opts) {
      const order = env.AI_PROVIDER_ORDER.filter((p) => (p === "gemini" ? env.GEMINI_API_KEYS.length > 0 : p === "openai-compat" ? !!env.OPENAI_COMPAT_API_KEY : false));
      if (order.length === 0) throw new Error("no AI provider configured");
      let last: unknown;
      for (const p of order) {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const text = await (p === "gemini" ? viaGemini : viaCompat)(opts.system, opts.user);
            return opts.schema.parse(extractJson(text));
          } catch (e) {
            last = e;
            if (e instanceof HttpError && e.status >= 400 && e.status < 500 && e.status !== 429) break;
          }
        }
      }
      throw new Error(`AI generation failed: ${(last as Error)?.message ?? last}`);
    },

    async ocr(data, mimeType) {
      if (env.GEMINI_API_KEYS.length === 0) throw new Error("scanned documents need GEMINI_API_KEYS");
      const prompt =
        'Transkripsikan seluruh teks pada dokumen ini apa adanya, per halaman, tanpa menambah, merangkum, atau menyimpulkan. Balas JSON saja: {"pages":[{"page":number,"text":string}]}. Lewati halaman tanpa teks.';
      const schema = z.object({ pages: z.array(z.object({ page: z.number().int().positive(), text: z.string() })) });
      let last: unknown = new Error("no Gemini key available");
      for (let attempt = 0; attempt < Math.max(2, Math.min(ring.size, 5)); attempt++) {
        const key = ring.next();
        if (!key) break;
        try {
          const j = await postJson(
            `${GEMINI}/models/${textModel}:generateContent`,
            {
              contents: [{ role: "user", parts: [{ inlineData: { mimeType, data: data.toString("base64") } }, { text: prompt }] }],
              generationConfig: { responseMimeType: "application/json", temperature: 0 },
            },
            { "x-goog-api-key": key },
            180_000,
          );
          const text = j.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
          return schema.parse(extractJson(text)).pages.filter((p) => p.text.trim());
        } catch (e) {
          last = e;
          if (e instanceof HttpError && [403, 429, 500, 502, 503].includes(e.status)) ring.rest(key);
          else if (!(e instanceof SyntaxError)) throw e;
        }
      }
      throw new Error(`text recognition failed: ${(last as Error)?.message ?? last}`);
    },

    async embed(texts, task) {
      if (texts.length === 0) return [];
      if (env.GEMINI_API_KEYS.length === 0) throw new Error("embeddings need GEMINI_API_KEYS");
      const out: number[][] = [];
      for (let i = 0; i < texts.length; i += 50) {
        const batch = texts.slice(i, i + 50);
        let done = false;
        let last: unknown;
        for (let attempt = 0; attempt < Math.max(2, Math.min(ring.size, 6)) && !done; attempt++) {
          const key = ring.next();
          if (!key) break;
          try {
            const j = await postJson(`${GEMINI}/models/${env.AI_EMBED_MODEL}:batchEmbedContents`, {
              requests: batch.map((t) => ({
                model: `models/${env.AI_EMBED_MODEL}`,
                content: { parts: [{ text: t }] },
                taskType: task,
                outputDimensionality: env.AI_EMBED_DIMENSIONS,
              })),
            }, { "x-goog-api-key": key });
            for (const e of j.embeddings) out.push(normalize(e.values));
            done = true;
          } catch (e) {
            last = e;
            if (e instanceof HttpError && [403, 429, 500, 502, 503].includes(e.status)) ring.rest(key);
            else throw e;
          }
        }
        if (!done) throw new Error(`embedding failed: ${(last as Error)?.message ?? "no key available"}`);
      }
      return out;
    },
  };
}

let provider: AiProvider | undefined;
export const getAi = (): AiProvider => (provider ??= createRealAi());
export const setAi = (p: AiProvider | undefined): void => {
  provider = p;
};
