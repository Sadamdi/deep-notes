# Workspace AI actions

| Attribute | Value |
|---|---|
| **Area** | 12-frontend |
| **Status** | in progress |
| **Owner** | team |
| **Endpoints** | `POST /notebooks/:id/ai/assist`; existing ask, explain, quiz, session, and source endpoints |
| **Schemas** | `shared/src/notebook.ts`, `shared/src/responses.ts` |
| **Last updated** | 2026-11-26 |

## Purpose

Make source-grounded assistance available while users study, take notes, discuss material, and draft writing. Let users control which ready notebook sources may inform AI actions and review generated output before applying it.

## Business rules

- **BR-01** Only ready sources in the current notebook are eligible for retrieval.
- **BR-02** Every successful AI assist result must have at least one citation validated against retrieved source text; otherwise return the fixed not-found result.
- **BR-03** Source scope is per notebook and shared across learning interactions. Omitted `sourceIds` means all ready notebook sources.
- **BR-04** AI output only changes the editor after the user applies it. The edited note, message, or draft is sent to its server API only after the separate save/send action.
- **BR-05** Creating a source from a note is an explicit action and uses the existing source ingestion/authorization rules.
- **BR-06** Workspace question suggestions use up to three representative passages per ready source in the active scope, with a maximum of 40 passages per request. Every suggested question must refer to a passage included in the request.

## Behavior

Question suggestions load automatically when ready sources are available and refresh when the active source scope changes. Each suggestion can fill the question field, and the learner can edit it before asking. Summaries, writing drafts, and practice guidance use the current workspace source scope and remain reviewable before applying. Unsupported requests show that the answer is not in the selected sources.

## Authorization

Notebook members with viewer access may ask for AI assistance. The existing source endpoint determines whether the user may create a reusable source; outsiders receive the API's notebook not-found response.

## Data

No new database table. AI assistance is not persisted. A note converted into a source is ingested through the existing `sources` tables and source-processing flow. Browser source scope is stored per notebook.

## Verification

The backend integration suite covers generated suggestions from selected source passages without query embeddings, refusal without support, invalid input, unauthenticated access, non-member access, cross-notebook source isolation, and citations. The suite uses deterministic fake AI and PGlite. Browser inspection confirmed the shared source picker on the workspace, notes, discussion, Studio, quiz, and game screens.

The live remote OpenAPI document must expose `POST /notebooks/{id}/ai/assist` before automatic suggestions work against the demo. A real-model browser request still needs verification after that deployment. See [version v20261126-source-aware-ask](../../version/v20261126-source-aware-ask.md) for the implementation record.
