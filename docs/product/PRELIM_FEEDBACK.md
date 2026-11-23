# Preliminary round feedback and our response

Source: the judging result screen for the preliminary round (23 Nov 2026), one judge. Scores are 1 to 5 per criterion; the final score runs from 20 to 100.

| Criterion | Weight | Score |
|---|---|---|
| P1 Problem clarity | 30% | 3 / 5 |
| P2 Fit to the selected case | 20% | 4 / 5 |
| P3 Value and originality | 25% | 3 / 5 |
| P4 Feasibility | 15% | 4 / 5 |
| P5 Abstract clarity | 10% | 4 / 5 |
| **Final** | | **69.0 / 100** |

## Judge comment (paraphrased from the original Indonesian)

- The survey had only 6 respondents, even though it was acknowledged as an early signal.
- The case fit is fairly clear.
- NotebookLM was named, but the difference is only the group focus and visible contributions, with no feature comparison.
- A retrieval-based answer system in 3 weeks with a "not found" mitigation is fairly realistic, although the model was not yet chosen.
- The abstract is clear.

## What we change

| Weakness | Response | Where | Status |
|---|---|---|---|
| Evidence too thin (30% weight) | collect many more real survey responses; report counts honestly; add at least one real early test of the prototype with students | survey form, `docs/PLAN_SEMIFINAL.md` section 6 | open |
| No feature comparison, weak originality | a verified comparison table against NotebookLM and general AI chat; sharpen the differentiators around the **group** (see COMPETITIVE_ANALYSIS) | [COMPETITIVE_ANALYSIS.md](COMPETITIVE_ANALYSIS.md) | in progress |
| Model not chosen | pick models by a real API call, write them in the proposal and in `docs/ARCHITECTURE.md` | PLAN phase P0 | open |
| Feasibility: needs proof | working backend and a measured grounding evaluation as validation evidence | PLAN phases P1 to P4, `backend/scripts/eval-grounding.ts` (planned) | open |

Rule for the proposal: every number comes from real data; estimates are labeled; features not built are labeled as planned.
