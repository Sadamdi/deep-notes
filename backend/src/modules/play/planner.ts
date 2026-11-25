import type { Animation, CreateSessionInput, Emotion, GameType } from "@deep-notes/shared";
import { getDb } from "../../db/index.js";
import { AppError } from "../../lib/errors.js";
import { TIME_LIMIT_SEC, generateRoundItems, type GameItem } from "./items.js";

export interface PlannedRound {
  index: number;
  type: GameType;
  topic: string | null;
  timeLimitSec: number;
  items: GameItem[];
  cue: { intro: string; introAnimation: Animation; introEmotion: Emotion };
}

const INTRO: Record<GameType, PlannedRound["cue"]> = {
  mcq: { intro: "Pemanasan dulu ya! Pilih jawaban yang paling tepat.", introAnimation: "wave", introEmotion: "senang" },
  fill: { intro: "Ada kata yang hilang. Bisa kamu tebak?", introAnimation: "lean_in", introEmotion: "antusias" },
  tf: { intro: "Benar atau salah? Hati-hati, ada yang sengaja diubah.", introAnimation: "think", introEmotion: "idle" },
  order: { intro: "Susun langkah-langkahnya sesuai urutan.", introAnimation: "point_up", introEmotion: "idle" },
  match: { intro: "Pasangkan istilah dengan artinya.", introAnimation: "hold_magnifier", introEmotion: "antusias" },
  guess_page: { intro: "Tebak dari mana kutipan ini berasal.", introAnimation: "read_book", introEmotion: "antusias" },
  teach: { intro: "Sekarang giliranmu mengajar aku. Jelaskan dengan kata-katamu!", introAnimation: "raise_hand", introEmotion: "antusias" },
};

/** Types that keep several players in step easily (short, tap-based). Used for duel and group modes. */
const SIMPLE: GameType[] = ["mcq", "tf", "guess_page", "fill"];

/**
 * Rule-based choice of the game type for every round (the model only writes the content).
 * Solo: warm-up, a recall game, a process or sorting game, a matching game, a source-skill game, then teach-back.
 * Duel and group: only short tap-based games, so players stay in sync.
 * Focus topics (recovery missions or the weakest topics of the group) steer rounds 2 and 4 to fill and tf.
 */
export function chooseTypes(rounds: number, mode: "solo" | "duel" | "group", allowed?: GameType[]): GameType[] {
  const solo: GameType[] = ["mcq", "fill", "order", "match", "tf", "teach", "guess_page", "mcq", "fill", "tf"];
  const social: GameType[] = ["mcq", "tf", "guess_page", "fill", "mcq", "tf", "fill", "guess_page", "mcq", "tf"];
  let base = mode === "solo" ? solo : social;
  if (allowed?.length) base = base.filter((t) => allowed.includes(t)).concat(allowed);
  const out: GameType[] = [];
  for (let i = 0; i < rounds; i++) out.push(base[i % Math.max(1, base.length)]!);
  if (mode === "solo" && !allowed?.length && rounds >= 4) out[rounds - 1] = "teach"; // always end by teaching
  return out;
}

async function weakTopics(notebookId: string): Promise<string[]> {
  const rows = await (await getDb()).query<{ topic: string }>(
    `WITH items AS (SELECT r->>'topic' AS topic, (r->>'correct')::boolean AS correct FROM quiz_attempts a, jsonb_array_elements(a.results) r WHERE a.notebook_id = $1)
     SELECT topic FROM items GROUP BY topic HAVING count(*) FILTER (WHERE NOT correct) > 0
     ORDER BY count(*) FILTER (WHERE NOT correct)::float / count(*) DESC, count(*) DESC LIMIT 3`,
    [notebookId],
  );
  return rows.map((r) => r.topic);
}

/** Builds the rounds of a session. A round the sources cannot support (for example "order" on text with no process) falls back to mcq. */
export async function planSession(notebookId: string, input: CreateSessionInput): Promise<PlannedRound[]> {
  const gaps = input.focusTopic ? [input.focusTopic] : await weakTopics(notebookId);
  const types = chooseTypes(input.rounds, input.mode, input.gameTypes);
  const sourceOpts = { sourceIds: input.sourceIds };

  const built = await Promise.all(
    types.map(async (type, index) => {
      // rounds 2 and 4 (index 1 and 3) practise the weakest topics when known
      const topic = gaps.length && (input.focusTopic || index === 1 || index === 3) ? gaps[index === 3 ? Math.min(1, gaps.length - 1) : 0]! : undefined;
      let actual: GameType = type;
      let items = await generateRoundItems(notebookId, type, { ...sourceOpts, topic }).catch(() => [] as GameItem[]);
      if (items.length === 0 && type !== "mcq") {
        actual = "mcq";
        items = await generateRoundItems(notebookId, "mcq", { ...sourceOpts, topic }).catch(() => [] as GameItem[]);
      }
      return { index, type: actual, topic: topic ?? null, items };
    }),
  );
  const usable = built.filter((r) => r.items.length > 0);
  if (usable.length === 0) throw new AppError("CONFLICT", "Not enough material to build a session: add more sources first");
  return usable.map((r, i) => ({ index: i, type: r.type, topic: r.topic, timeLimitSec: TIME_LIMIT_SEC[r.type], items: r.items, cue: INTRO[r.type] }));
}

export { SIMPLE };
