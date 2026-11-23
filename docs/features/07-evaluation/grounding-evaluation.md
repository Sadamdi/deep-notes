# F-07 Grounding evaluation

Status: implemented. Latest report: [../../evaluation/GROUNDING_EVAL_2026-11-23.md](../../evaluation/GROUNDING_EVAL_2026-11-23.md).

Run it with `pnpm --filter @deep-notes/backend eval:grounding` (needs the AI keys in `backend/.env`; uses an in-memory database, so nothing shared is touched).

What it does: ingests `backend/eval/demo-material.md` (8 synthetic pages, one with a planted instruction), asks the 31 questions in `backend/eval/questions.json` (21 answerable, 10 unanswerable), checks each answer automatically and writes a dated report with the setup, the figures and every miss.

Business rules
- BR-01 Figures go into the proposal exactly as the script prints them, with the date and model ids, and with the limits listed in the report (small synthetic set, one run, keyword-based checking).
- BR-02 Rerun after any change to prompts, models, chunking or the refusal threshold, and before the final demo.
- BR-03 To evaluate real course material, replace the material and question files; do not publish copyrighted material in the repo.
