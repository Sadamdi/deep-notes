# Workspace AI actions

| Attribute | Value |
|---|---|
| **Area** | 12-frontend |
| **Status** | in progress |
| **Owner** | team |
| **Endpoints** | `POST /notebooks/:id/ai/assist`; existing ask, explain, quiz, session, and source endpoints |
| **Schemas** | `shared/src/notebook.ts`, `shared/src/responses.ts` |
| **Last updated** | 2026-11-25 |

## Purpose

Make source-grounded assistance available while users study, take notes, discuss material, and draft writing. Let users control which ready notebook sources may inform AI actions and review generated output before applying it.

## Business rules

- **BR-01** Only ready sources in the current notebook are eligible for retrieval.
- **BR-02** Every successful AI assist result must have at least one citation validated against retrieved source text; otherwise return the fixed not-found result.
- **BR-03** Source scope is per notebook and shared across learning interactions. Omitted `sourceIds` means all ready notebook sources.
- **BR-04** Generated notes, messages, and drafts remain local until the user explicitly saves them or creates a source.
- **BR-05** Creating a source from a note is an explicit action and uses the existing source ingestion/authorization rules.

## Behavior

Users can request question suggestions, summaries, writing drafts, or practice guidance using the current workspace source scope. Outputs and citations are shown for review before they are applied. Unsupported requests show that the answer is not in the selected sources. Notes, discussions, and Studio remain labeled as local until an existing backend save operation exists.

## Authorization

Notebook members with viewer access may ask for AI assistance. The existing source endpoint determines whether the user may create a reusable source; outsiders receive the API's notebook not-found response.

## Data

No new database table. AI assistance is not persisted. A note converted into a source is ingested through the existing `sources` tables and source-processing flow. Browser source scope is stored per notebook.

## Verification

The backend integration suite covers grounded output, refusal without support, invalid input, unauthenticated access, non-member access, cross-notebook source isolation, and citations. The suite uses deterministic fake AI and PGlite. Browser inspection confirmed the new actions and shared source picker on the workspace, notes, discussion, Studio, quiz, and game screens.

The live remote backend has not been updated with this route, so a real-model request and note-to-source submission were not run in the browser. See [version v20261125-workspace-ai-actions](../../version/v20261125-workspace-ai-actions.md) for exact verification results.
