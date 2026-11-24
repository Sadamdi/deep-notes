# F-04 Cited answers and F-10 explanation steps

Status: implemented; tested with a deterministic fake model and measured with the real models (see F-07).

Endpoints: `POST /notebooks/:id/ask`, `POST /notebooks/:id/explain`, `GET /notebooks/:id/questions`. Flow diagram: [../../flows/ask-with-citations.md](../../flows/ask-with-citations.md).

Flow: embed the question, fetch the 6 nearest passages of this notebook (pgvector cosine distance), refuse early if even the best is farther than 0.62, otherwise ask the model for JSON with numbered citations, validate them, store the question and answer.

Business rules
- BR-01 Only passages of the caller's notebook are retrieved. Another group's sources can never appear.
- BR-02 A citation counts only if its number points at a passage that was actually retrieved. Duplicates and invented numbers are dropped.
- BR-03 The quote shown to the user is the model's quote only if it really appears in that passage; otherwise the start of the passage is shown. A fabricated quote cannot reach the screen.
- BR-04 A grounded answer needs at least one valid citation. Otherwise, or if the model says it cannot answer, the result is the fixed refusal `Tidak ditemukan di sumber notebook ini.` with no citations.
- BR-05 The prompt marks source text as data and tells the model to ignore instructions inside it. Evaluated with a planted instruction on one page (F-07).
- BR-06 Asking is limited to 40 AI requests per user per 10 minutes. Viewers may ask.
- BR-07 F-10: the explanation comes as 3 to 6 short steps, each with an `emotion` (neutral, curious, happy, thinking, encouraging, concerned) for the animated companion. Every step is complete text, so the animation is optional. If nothing is found, one `concerned` step carries the refusal.
- BR-08 Every question is stored with who asked it and feeds the contributions view.
- BR-09 The companion explanation (`POST /notebooks/:id/companion/explain`) follows the same grounding rules and returns a performance of beats; see [../../COMPANION_CONTRACT.md](../../COMPANION_CONTRACT.md). The model may only choose animations from a closed list; anything else is replaced by the default clip for the beat's emotion, and a beat citing a source that was not retrieved gets no citation.
