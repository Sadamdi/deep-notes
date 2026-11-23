# Model selection (T-012)

Date: 23 Nov 2026. Method: `agents/model-bench/bench.mjs` in the hackathon workspace (the script is kept outside this repo). Each candidate answered the same 10 questions over a short synthetic Indonesian text of 4 pages: 6 answerable (needs the right page citation and a keyword) and 4 unanswerable (must return `grounded: false` with no citation). One run, temperature 0, JSON output.

| Model (provider) | Answerable ok | Refused ok | Valid JSON | Median latency |
|---|---|---|---|---|
| gemini-2.5-flash (Gemini) | 6 of 6 | 4 of 4 | 10 of 10 | 2.1 s |
| gemini-2.5-flash-lite (Gemini) | 5 of 5 | 4 of 4 | 9 of 10 | 1.3 s (one request refused: free tier not available for that key) |
| qwen3.8-flash (OpenAI-compatible proxy) | 6 of 6 | 4 of 4 | 10 of 10 | 1.1 s |
| deepseek-v4.1-flash (proxy) | 6 of 6 | 4 of 4 | 10 of 10 | 1.6 s |
| gpt-5.6-luna (proxy) | 6 of 6 | 4 of 4 | 10 of 10 | 2.0 s |
| glm-5.3-flash (proxy) | 6 of 6 | 4 of 4 | 10 of 10 | 2.5 s |
| gemini-3.5-flash, 3.5-flash-lite, 3.6-flash, 3.7-flash, 3.1-flash-lite (Gemini) | not measurable | not measurable | not measurable | quota errors (429) on the keys we hold |

## Decision
- **Text generation, primary:** `gemini-2.5-flash`. Perfect on this set, stable on 10 of 11 keys, and the same vendor as the embeddings.
- **Text generation, fallback:** `phantom/vibecode/qwen3.8-flash` through the OpenAI-compatible proxy. Also perfect and the fastest. Used automatically when all Gemini keys are rate limited.
- **Embeddings:** `gemini-embedding-001` at 768 dimensions (the pinned model; vectors are normalised on our side). `gemini-embedding-2` also works at 768 but is not needed.
- Key rotation: 11 Gemini keys are rotated; a key that returns 403, 429 or 5xx rests for 60 seconds. One key currently returns 403 and is skipped automatically.

## Limits of this evidence
Ten questions on a toy text cannot separate the top models; it only shows that none of the chosen models fails the basic grounding behaviour. The meaningful result is the larger run in [../evaluation/GROUNDING_EVAL_2026-11-23.md](../evaluation/GROUNDING_EVAL_2026-11-23.md). Newer Gemini models may beat the choice above once the key quota allows testing them; the model ids are configuration (`AI_TEXT_MODEL`, `AI_FALLBACK_TEXT_MODEL`), so switching needs no code change.
