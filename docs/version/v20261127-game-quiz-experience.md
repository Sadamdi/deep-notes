# Game, kuis, dan streak Bubi: perapian pengalaman belajar

| Attribute | Value |
|---|---|
| **Version** | v0.0.17 |
| **Date** | 2026-11-27 |
| **Status** | In Progress |
| **Author** | Maulvi |
| **Type** | Feature / UI |
| **Area** | frontend / docs |
| **Branch** | `main` |
| **PR** | — |

## 1. Why

The existing game round places every item on one long page, which makes each minigame feel like a generic form and is awkward on phones. The Game and Quiz screens should feel like a focused study arena while keeping Deep Notes' mint/navy identity, server grading, source citations, and the learner's answers intact.

## 2. Plan (fill before coding)

- [x] Use the inspected Figma game frame and its responsive variants to shape a focused, one-question-at-a-time round. Previous/next navigation preserves each answer; submission still sends the complete round once and keeps its timer running.
- [x] Give game item types and quiz states clearer hierarchy, progress, transitions, answer feedback, and server-error recovery without changing request/response contracts.
- [x] Reuse existing streak SVG tiers on Home and Profile. Animate the existing SVG only when a newly completed day is confirmed by server stats; honor reduced-motion preferences and never celebrate same-day repeats.
- [x] Add browser coverage for a multi-item game round, answer preservation, submission payload, streak animation/reduced motion, and the changed responsive flow.
- [x] Update frontend experience and Figma coverage docs with observed behavior and verification limits; record a lesson after verification.

| Risk | Impact | Mitigation |
|---|---|---|
| Server session refresh may lag after accepting an answer | Learner can be sent back to a submitted round | Keep accepted progress locally and preserve existing conflict recovery |
| Round timer can expire during navigation | Question changes must not reset the time limit | Keep one round start time and submit the complete current answer set |
| Streak result can be replayed on the same UTC date | False celebration | Compare pre-finish stats with the server-confirmed finish response |
| Figma game frame is denser than a phone viewport | Overflow or hidden controls | Reflow player, question, mascot, and scoreboard; verify mobile browser size |

## 3. Files changed

| File | Change |
|---|---|
| `frontend/src/pages/GameSessionPage.tsx` | One active question per round, answer map, navigation and round-level submission; confirmed streak increase queues the shared celebration. |
| `frontend/src/pages/QuizPage.tsx` | Stronger arena hierarchy, direct question navigation, preserved answers and safe practice retry. |
| `frontend/src/components/shared/StreakCard.tsx` | One-shot celebration tied to server stats, with text announcement and reduced-motion support. |
| `frontend/src/lib/streakCelebration.ts` | UTC-day gating for confirmed streak increases. |
| `frontend/src/components/shared/PageStates.tsx`, `frontend/src/components/ui/button.tsx`, `frontend/src/index.css` | Shared motion-safe page entrance, button feedback and mascot/streak motion. |
| `frontend/e2e/game-session.spec.ts`, `frontend/src/lib/streakCelebration.test.ts` | Desktop/mobile round navigation, payload, streak, reduced motion and date-gating coverage. |
| `docs/DESIGN_SYSTEM.md`, `docs/frontend/FIGMA_COVERAGE.md`, `docs/features/12-frontend/experience.md`, `docs/version/VERSION_INDEX.md` | Record the design rules, implementation coverage, verification and version state. |

## 4. Before and after

Before: every item in a game round is rendered vertically and submitted together from one long page. Quiz questions already navigate one at a time, but the game round does not.

After: game rounds present one active item with answer-preserving previous/next and question-map navigation. The last-item action sends the full answer list once; the timer continues across navigation. Quiz keeps its one-question flow with a clearer navy arena, progress, and safe retry. Streak artwork uses the existing tier SVGs, and animation appears only when server stats confirm a new UTC-day streak increase.

## 5. Data impact

No schema, API, or database changes planned. No shared database writes.

## 6. Verification

- [x] `pnpm run ci` — passed across workspace lint, type checks, tests, and production builds.
- [x] Frontend Playwright: all 24 desktop/mobile tests passed, including game session and quiz route coverage.
- [x] Reduced-motion browser check — streak count and accessible status update without mascot/card movement.
- [x] Frontend unit tests — 38 passed across 3 files; streak-day gating includes new day, same day, and missing prior stats.
- [x] `git diff --check` — passed.
- [x] Laptop browser inspected the local Game setup and workspace modes read-only. Mutating game flows ran in isolated Playwright mocks.
- [x] No live AI calls or shared demo server writes were made; this verifies frontend behavior, not live backend/AI quality.

## 7. Rollback

Revert the frontend and documentation changes. No migration or persisted data changes.
