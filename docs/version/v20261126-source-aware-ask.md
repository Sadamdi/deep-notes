# Source-aware question suggestions

| Attribute | Value |
|---|---|
| **Version** | v0.0.12 |
| **Date** | 2026-11-26 |
| **Status** | In Progress |
| **Author** | Maulvi |
| **Type** | Feature |
| **Area** | backend / frontend / shared / docs |
| **Branch** | `maul/server-backed-inputs` |
| **PR** | — |

## 1. Why

The workspace question field suggests a fixed networking question even when the selected source is about another subject. Generate suggestions from the ready source scope and let each suggestion fill the question field.

## 2. Plan

- [x] Allow an empty context only for `suggest_questions` and build source evidence directly from up to three representative ready chunks per selected source, capped at 40 passages.
- [x] Automatically load suggestions when a ready source scope is available or changes, with topic-aware placeholder, retry, loading, empty, and citation states.
- [x] Update the API and frontend behavior documentation.
- [x] Test source scope, unsupported and invalid input, empty source sets, cross-notebook isolation, and OpenAPI registration with isolated PGlite.
- [x] Run full lint, type-check, test, and build CI.
- [ ] Verify concurrent scope changes and the real-model result in the authenticated browser after credentials and the server route are available.

| Risk | Impact | Mitigation |
|---|---|---|
| Empty context could bypass retrieval or source authorization. | Suggestions may use unrelated or private material. | Select only ready chunks in the authorized notebook and selected source IDs; cite only those chunks. |
| Automatic suggestions could call the model repeatedly. | Added latency and model usage. | Cache by notebook, ready source IDs and chunk counts, and enabled source scope. |

## 3. Files changed

| File | Change |
|---|---|
| `shared/src/notebook.ts`, `backend/src/modules/answers/answers.service.ts` | Scope the empty-input behavior and sample passages from ready selected sources. |
| `backend/src/docs/endpoints.ts`, `backend/tests/ai-features.test.ts`, `backend/tests/helpers.ts` | Publish the request contract and verify grounding and scope in PGlite tests. |
| `frontend/src/features/answers/AskPanel.tsx` | Load scoped suggestions automatically and display topic-aware hints and clickable questions. |
| `docs/API_CONTRACT.md`, feature and handoff documentation | Explain the updated source-suggestion behavior. |

## 4. Before and after

Before: the fixed placeholder refers to a switch and star topology, and the AI suggestions require that same hard-coded context. After: prompt hints and automatically generated suggestions reflect the selected ready source material.

## 5. Data impact

None. No migration or persistent data writes.

## 6. Verification

- [x] `pnpm --filter @deep-notes/backend exec vitest run tests/ai-features.test.ts tests/docs.test.ts`: 22 tests passed; the full backend suite has 100 passing tests.
- [x] `pnpm run ci`: lint, type checks, 100 backend tests, 35 frontend tests, and production builds passed.
- [ ] Live model and authenticated-browser checks remain pending. The local backend has no configured AI provider, and the shared demo OpenAPI document does not list `/notebooks/{id}/ai/assist`.

No shared database was written. The real-model smoke attempt stopped before making an external AI request because no provider key was configured.

## 7. Rollback

Revert the API schema, source sampling, and workspace UI changes. No data rollback is required.
