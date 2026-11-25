# Contract-driven Bubi expressions

| Attribute | Value |
|---|---|
| **Area** | 12-frontend |
| **Status** | implemented (frontend + shared emotion contract); live AI response not verified in this task |
| **Owner** | team |
| **Endpoints** | Existing companion, source, quiz, and game endpoints; no new endpoint |
| **Schemas** | `Beat`, `Emotion`, `Animation`, `REACTION_FOR_EVENT`, `GameRoundResult`, `GameFinish` |
| **Last updated** | 2026-11-25 |

## Purpose

Bubi's face and supported motion follow the active explanation beat or an existing study-flow reaction. The same mascot component keeps expression changes available without an AI call, while all explanation text and citations stay visible.

## Business rules

- **BR-01** The explanation response supplies each beat's `emotion` and `animation`; selecting a step only changes which beat drives Bubi and does not request new content.
- **BR-02** The six canonical emotions map to the original Figma SVGs: `idle`, `senang`, `sedih`, `marah`, `antusias`, and `semangat`. Older saved emotion labels are normalized when read.
- **BR-03** The renderer supports `wave`, `nod`, `think`, `lean_in`, and `celebrate` using the original SVG artwork. `wave` moves the right arm; `nod`, `think`, and `lean_in` move Bubi as one unit so facial details stay intact; `celebrate` moves Bubi and both arms. Unimplemented clips and clips absent from the selected mascot's catalog use a still pose.
- **BR-04** Reduced-motion mode removes mascot movement. The requested expression and all text/citations remain available.
- **BR-05** Waiting for an answer uses `waiting_for_ai`; a source transition from `processing` to `ready` uses `new_source_ready`; quiz outcomes use `quiz_correct`, `quiz_wrong`, or `quiz_perfect`; game outcomes use the reaction returned by the game contract.
- **BR-06** Reaction mappings use existing shared/API contracts and do not add AI requests.

## Behavior

The explanation page displays every beat as text and lets the learner select a step. The selected step drives Bubi's face and, when supported by both the renderer and the selected mascot, its short motion clip. A beat key replays the clip even when two steps use the same expression and motion. All citations remain in the existing reference list with their authorized source-page controls.

Answer and explanation loading states use the shared waiting reaction. When a source moves from `processing` to `ready`, the workspace shows a brief source-ready reaction. Quiz and game result panels use the existing shared/server reaction contracts. Every unsupported motion falls back to a still pose rather than guessing at a new animation.

## Authorization

No authorization behavior changes. Source-page controls continue to use the existing authorized notebook/source routes; client-side reaction state exposes no source contents.

## Data

No database migration or new endpoint is needed. API emotion responses use the six Figma expression names, and old stored labels are normalized when read. Reactions are derived from the existing response, query transition, or shared event mapping.

## Verification

- Component checks cover all six Figma SVG files, unique local SVG IDs and references, animated character/arm groups, supported motions, missing-part fallback, and the playback key.
- Reduced-motion CSS disables every animated SVG part while leaving emotion-specific artwork intact.
- Manual browser inspection and backend-backed source/answer/quiz/game flows are recorded in the task's version entry.
