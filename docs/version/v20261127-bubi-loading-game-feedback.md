# Bubi loading and richer game feedback

| Attribute | Value |
|---|---|
| **Version** | v0.0.18 |
| **Date** | 2026-11-27 |
| **Status** | In Progress |
| **Author** | Maulvi |
| **Type** | Feature / UI |
| **Area** | frontend / backend / shared / docs |
| **Branch** | `main` |
| **PR** | — |

## 1. Why

Learning flows need a consistent Bubi loading state, a usable step-order game, partial-credit matching with clear per-pair feedback, and a more readable result summary. These changes must keep keyboard and touch alternatives and preserve the rule used by already-created sessions.

## 2. Plan (fill before coding)

- [x] Add shared page, panel, and compact Bubi loading states for visible asynchronous work; keep compact loading inside its button, preserve existing content during background refresh, and honor reduced motion.
- [x] Make match choices unique and easy to select, calculate proportional partial credit for newly generated matches, and show each chosen pair beside its correct pair.
- [x] Make step ordering draggable with keyboard and touch support while keeping move-up and move-down buttons.
- [x] Improve round, session, and quiz result hierarchy with server-derived score details, citations, recovery actions, and accessible feedback.
- [x] Extend shared/backend/frontend contracts without a database migration; mark new match items as proportional and keep stored legacy rounds all-or-nothing.
- [x] Add or update focused backend, frontend, and desktop/mobile browser checks; update feature, API, design, and version docs; record a lesson.

| Risk | Impact | Mitigation |
|---|---|---|
| Existing live session contains a pre-change match item | An old round could unexpectedly receive partial credit | Persist the scoring marker inside newly planned item JSON; absent marker retains legacy grading |
| More than one match row can consume the same definition | Correct pair credit becomes ambiguous | Disable already-used options and enforce one-to-one assignment in UI and server grading |
| Drag becomes unavailable to keyboard or touch users | The step game becomes inaccessible | Keep explicit move buttons and use a React 19-compatible drag library with keyboard support |
| Mascot loading causes layout shifts or excessive motion | Content jumps or distracts users | Reserve component space and respect reduced-motion preferences |

## 3. Files changed

| File | Change |
|---|---|
| `frontend/src/components/shared/PageStates.tsx`, `frontend/src/index.css` | Shared animated Bubi loading states with reduced-motion support |
| `frontend/src/pages/GameSessionPage.tsx`, `frontend/src/pages/QuizPage.tsx` | Accessible game controls, partial-score and source reviews, stronger result summaries, and Bubi action feedback |
| `frontend/src/features/answers/AskPanel.tsx`, `AiAssistPanel.tsx`, `features/quizzes/QuizLauncher.tsx`, `features/sources/SourceUploader.tsx`, `pages/FeedPage.tsx`, `pages/JoinWorkspacePage.tsx` | Use the shared Bubi loading treatment in the main asynchronous actions |
| `backend/src/modules/play/items.ts`, `backend/src/modules/play/play.routes.ts`, `shared/src/game.ts`, `shared/src/responses.ts` | Proportional scoring marker, partial points/accuracy, chosen answer, and speed-bonus response field |
| `frontend/e2e/game-session.spec.ts`, `backend/tests/play.test.ts` | Partial-match, legacy-score, duplicate-pair, Bubi loading/reduced-motion, pointer/keyboard reordering, and question navigation coverage |
| `docs/GAME_CONTRACT.md`, `docs/API_CONTRACT.md`, `docs/DESIGN_SYSTEM.md`, `docs/frontend/FIGMA_COVERAGE.md`, `docs/features/12-frontend/experience.md` | Document the interaction and scoring contracts |

## 4. Before and after

Before: shared loading states use a generic spinner, step ordering only has move buttons, match grading is all-or-nothing, and game results do not clearly distinguish base points from the speed bonus.

After: shared async states use Bubi, order supports keyboard drag plus move buttons, new match items award proportional points while old stored rounds retain all-or-nothing grading, and game/quiz results show score details and answer review.

## 5. Data impact

No migration planned. The scoring version is stored with each generated match item in the existing session plan JSON. A missing marker means a legacy all-or-nothing round.

## 6. Verification

- [x] Backend checks: 111 tests passed across 14 files, including proportional scoring, legacy compatibility, and duplicate-pair rejection.
- [x] Frontend tests: 38 tests passed across 3 files; workspace lint, type checks, tests, and production builds passed with `pnpm run ci`.
- [x] Desktop and mobile Playwright: all 30 tests passed. Coverage includes Bubi loading with reduced motion and inside the quiz action button, match partial credit and review, pointer and keyboard step ordering, quiz navigation, and game results.
- [x] `git diff --check` passed.
- [x] No live AI calls, shared demo-server mutations, or database migrations were made. Browser API responses were mocked; live AI and deployment behavior remain unverified.

## 7. Rollback

Revert the frontend, backend, shared contract, and documentation changes. Existing sessions remain graded according to their stored scoring marker.
