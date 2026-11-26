# Frontend agent workflow and final Figma reference

| Attribute | Value |
|---|---|
| **Version** | v0.0.3 |
| **Date** | 2026-11-25 |
| **Status** | In Progress |
| **Author** | Team |
| **Type** | Docs / Config |
| **Area** | frontend / docs |
| **Branch** | `codex/frontend-agent-guidance` |
| **PR** | — |

## 1. Why

Frontend work needs one clear reference for the final Figma design, existing frontend stack, the installed Codex skills that apply to each kind of task, and the sources to verify when design and runtime behavior disagree. Ponytail is the default for coding, with review and audit skills selected only for those requests.

## 2. Plan

- [x] Read the current agent rules, frontend guidance, design system, dependencies, and final Figma file.
- [x] Add the frontend workflow and skill selection rules to `AGENTS.md`.
- [x] Review the documentation diff for consistency and formatting.

| Risk | Impact | Mitigation |
|---|---|---|
| Agent guidance duplicates or conflicts with existing frontend docs | Stale or inconsistent instructions | Point to existing docs and keep the new section focused on design source and skill routing |

## 3. Files changed

| File | Change |
|---|---|
| `AGENTS.md` | Add final Figma source, frontend workflow, Ponytail defaults, and task-based skill routing |
| `docs/version/VERSION_INDEX.md` | Register this documentation change |
| `docs/version/v20261125-frontend-agent-guidance.md` | Record the plan and verification status |

## 4. Before and after

Before, the repository did not identify the provided final Figma file, explain which skills to load, or set a source of evidence for uncertain frontend behavior. After, `AGENTS.md` directs screen work to the final Figma file, matches runtime behavior against the API contract and code, and loads skills by task type.

## 5. Data impact

No application data, database, or migration changes.

## 6. Verification

- [x] Documentation links and skill names checked.
- [x] `git diff --check` passes.

## 7. Rollback

Revert the `AGENTS.md` changes and remove this version entry and note.
