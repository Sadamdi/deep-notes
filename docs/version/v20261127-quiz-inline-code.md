# Quiz inline code rendering

| Attribute | Value |
|---|---|
| **Version** | v0.0.19 |
| **Date** | 2026-11-27 |
| **Status** | In Progress |
| **Author** | team |
| **Type** | Fix |
| **Area** | frontend / docs |
| **Branch** | `maul/frontend-integration` |
| **PR** | — |

## 1. Why

Generated quiz questions can contain inline Markdown code spans such as `` `equals()` ``. The quiz currently prints the delimiters, making code questions harder to read.

## 2. Plan

- [x] Add a regression check for inline code in a quiz prompt and choice.
- [x] Render inline code semantically and safely in the quiz and its answer review.
- [x] Update frontend experience notes and record verification.

| Risk | Impact | Mitigation |
|---|---|---|
| Unmatched backticks in source text | Text should remain readable | Leave unmatched delimiters as plain text |

## 3. Files changed

| File | Change |
|---|---|
| `frontend/src/pages/QuizPage.tsx` | Render inline code in quiz prompts, choices, and review |
| `frontend/src/components/shared/InlineCodeText.tsx` | Safe inline-code presentation |
| `frontend/e2e/game-session.spec.ts` | Regression coverage |
| `docs/features/12-frontend/experience.md` | Document display behavior |

## 4. Before and after

Before: `` `equals()` `` and `` `==` `` are shown with literal backticks. After: the delimiters are hidden and the enclosed text uses semantic `<code>` styling.

## 5. Data impact

No data or API contract changes.

## 6. Verification

- [x] Targeted Playwright quiz navigation test passed after first failing on the raw-markdown prompt.
- [x] `pnpm run ci` passed: lint, type checks, 38 frontend tests, 111 backend tests, and builds.
- [x] Browser inspection at the existing quiz route confirmed inline code is formatted and the supplied white line did not recur after the transition settled.

The thin white line in the supplied capture was not present in a fresh capture of the same open quiz page. It was not reproducible as a page element during this check.

## 7. Rollback

Revert the frontend rendering and its test/documentation changes. No data migration is needed.
