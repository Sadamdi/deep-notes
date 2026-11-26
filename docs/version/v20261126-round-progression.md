# Keep game rounds moving forward

| Attribute | Value |
|---|---|
| **Version** | v0.0.14 |
| **Date** | 2026-11-27 |
| **Status** | In Progress |
| **Author** | Maulvi |
| **Type** | Fix |
| **Area** | frontend / docs |
| **Branch** | `maul/server-backed-inputs` |
| **PR** | — |

## Why

After a round answer is accepted, a fast click on Continue can return the player to the same round while the progress refresh is pending. The API then rejects the duplicate answer.

## Plan

- [x] Preserve acknowledged round progress immediately and ignore stale polling progress for the current session.
- [x] Recover from a duplicate-answer conflict by refreshing the session and advancing only if the server confirms that round is complete.
- [x] Verify the shared round flow across all game types and keep normal quiz navigation covered.
- [x] Run frontend, backend, and browser checks and record their actual results.

## Verification

- [x] Browser regression held a stale progress response while the player advanced and submitted the next round. The regression failed before the fix at the missing “Lanjut ronde 2” action.
- [x] Covered all seven minigame renderers, per-round input reset, final results, reload after an accepted answer, and recovery from a duplicate-answer `409`.
- [x] Checked solo, duel, group, and ordinary quiz navigation on desktop and mobile. All 10 mocked-browser cases passed.
- [x] `pnpm run ci` passed lint, type-check, 104 backend tests, 35 frontend tests, and production builds.

Browser tests use mocked API responses. No deployed backend or real AI model was involved in this fix.
