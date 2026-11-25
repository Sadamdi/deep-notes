# Contract-driven Bubi expressions

| Attribute | Value |
|---|---|
| **Version** | v0.0.5 |
| **Date** | 2026-11-25 |
| **Status** | In Progress |
| **Author** | Codex + Deep Notes team |
| **Type** | Feature |
| **Area** | frontend / docs |
| **Branch** | `codex/frontend-agent-guidance` |
| **PR** | — |

## 1. Why

Bubi's expression should follow the active explanation beat and existing quiz/game reactions. Readers can select explanation steps themselves, and all spoken text and citations remain available when motion is disabled.

## 2. Plan

- [x] Export the six specified Figma variants: Idle, Senang, Sedih, Marah, Antusias, and Semangat.
- [x] Make these six variants the canonical AI-facing emotion contract while retaining a safe reader for previously stored emotion labels.
- [x] Use the exact Figma SVG for each canonical emotion, keeping unsupported or missing assets on the Idle pose.
- [x] Keep explanation step selection, pending responses, quiz results, and game reactions on their existing response data without extra AI requests.
- [x] Animate Bubi and its arm groups in the existing SVG files for the supported clips, replaying the clip when the active beat changes.
- [x] Respect reduced motion while keeping expression changes visible.
- [x] Update the companion feature, design-system documentation, and version index.
- [x] Verify all six expressions, supported clips, beat replay, and reduced-motion behavior in the local visual preview.
- [ ] Verify explanation-step changes and source/answer/quiz/game reactions against a running backend.

| Risk | Impact | Mitigation |
|---|---|---|
| Stored responses may contain the earlier semantic emotion labels | Old explanations could fail validation after the contract update | Accept and normalize the six legacy labels when reading old responses; prompt new responses with the six Figma labels. |
| Motion may obscure or distract from explanation text | Reading comprehension and accessibility suffer | Keep all beat text and citations visible; keep clips short and disable spatial motion when reduced motion is active. |

## 3. Files changed

- `frontend/src/components/shared/BubiMascot.tsx` and `BubiMascot.test.tsx` — shared six-expression renderer, unique SVG IDs, character/arm motion, playback-key replay, accessible label, and still-pose fallback.
- `frontend/public/assets/bubi-idle.svg`, `bubi-senang.svg`, `bubi-sedih.svg`, `bubi-marah.svg`, `bubi-antusias.svg`, and `bubi-semangat.svg` — exact transparent Figma character variants.
- `frontend/src/index.css` — short mascot motion clips and reduced-motion override.
- `frontend/src/pages/CompanionPage.tsx` — manual beat selection while every explanation and citation remains rendered.
- `frontend/src/components/layout/PublicFrame.tsx`, `frontend/src/pages/LandingPage.tsx`, and `frontend/src/pages/FeedPage.tsx` — replace the old excited illustration with the exact Antusias SVG.
- `frontend/src/features/answers/AskPanel.tsx`, `frontend/src/pages/WorkspacePage.tsx`, `frontend/src/pages/QuizPage.tsx`, `frontend/src/features/quizzes/QuizLauncher.tsx`, `frontend/src/pages/GamePage.tsx`, and `frontend/src/pages/GameSessionPage.tsx` — existing waiting, source-ready, quiz, and game reactions.
- `shared/src/schemas.ts` and `shared/src/companion.ts`, plus backend companion/answer/game reaction mapping and their tests — canonical Figma emotion names and normalization for older stored labels.
- `docs/features/12-frontend/bubi-expressions.md`, `docs/features/04-answers/answers.md`, `docs/features/FEATURE_INDEX.md`, `docs/API_CONTRACT.md`, `docs/DESIGN_SYSTEM.md`, `docs/COMPANION_CONTRACT.md`, `docs/GAME_CONTRACT.md`, and `docs/version/VERSION_INDEX.md` — feature and design documentation.

## 4. Before and after

Before: explanation steps are all static text and share a static Bubi image. After: the selected step drives a reusable Bubi expression and supported motion while text and citations remain on the page.

## 5. Data impact

No database migration or new endpoint is needed. API responses now use the six Figma expression labels; readers normalize older stored values so existing saved content remains valid.

## 6. Verification

Automated checks completed:

- Bubi component tests: 16 passed, covering all six exact SVGs and their character/arm groups, unique IDs and internal references, legacy emotion normalization, five supported motions, missing-part fallback, and playback keys.
- Shared, frontend, and backend TypeScript checks passed.
- Frontend and backend ESLint passed; backend Vitest: 89 passed.
- Frontend Vite production build and backend tsup build passed.
- Figma SVGs were rendered together for visual inspection; all six match the supplied expressions and use transparent artwork.
- Impeccable detector returned no findings for the changed frontend files.
- `git diff --check` passed; it reported only a pre-existing line-ending warning in `agents/knowledge/lessons.md`.

The workspace's `pnpm` check command attempted to refresh dependencies and stopped because it could not request confirmation in this session. No dependencies were changed; checks used the tools already present in the workspace. The local visual preview confirmed all six expressions, five supported clips, replay, and the reduced-motion toggle. Signed-in browser checks for explanation-step changes, source/answer/quiz/game API flows, and the operating-system reduced-motion preference remain unverified because the backend is off and this session has no user login.

## 7. Rollback

Revert the Bubi mascot component, its page integrations, styles, and documentation. No data rollback is required.
