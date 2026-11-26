# Fixes found in local browser testing

| Attribute | Value |
|---|---|
| **Version** | v0.0.9 |
| **Date** | 2026-11-26 |
| **Status** | In Progress |
| **Author** | Sulthan Adam Rahmadi |
| **Type** | Fix |
| **Area** | backend / frontend / docs |
| **Branch** | `adam/fix-suggest-questions` |
| **PR** | opened from this branch |

## 1. Why

Browser testing showed that suggested questions always failed, a fresh checkout could not start the local backend, most mascot clips did not move, and generated questions could mention "passage".

## 2. Plan

This entry was written after the fixes.

- [x] each suggested question names its passage, so citations come from real retrieved passages
- [x] create missing parent folders for the embedded database
- [x] play all 21 non-idle mascot clips
- [x] tell quiz and game prompts not to mention "passage"

| Risk | Impact | Mitigation |
|---|---|---|
| Mascot gestures are simple and draw no props | looks less rich than the storyboard | design review |

## 3. Files changed

| File | Change |
|---|---|
| `backend/src/modules/answers/answers.service.ts` | per-question source numbers |
| `backend/src/db/index.ts` | create the data folder |
| `backend/src/modules/quizzes/quizzes.service.ts`, `backend/src/modules/play/items.ts` | prompt wording |
| `frontend/src/components/shared/BubiMascot.tsx`, `frontend/src/index.css` | mascot clips |

## 4. Before and after

Before: "Buat pertanyaan" answered "not found". After: it returns questions with citations (4 of 4 real calls).

## 5. Data impact

None. No migration.

## 6. Verification

- [x] lint, type-check, tests, build
- [x] suggested questions with the real model, local backend, 4 of 4
- [x] all 21 clips start a CSS animation in Chrome
- [x] all 7 game types, duel, group, weekly and exam quiz, teach-back through the local API
- [ ] not deployed yet

## 7. Rollback

Revert the merge commit.
