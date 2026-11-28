# Findings from live browser testing

| Attribute | Value |
|---|---|
| **Version** | v0.0.21 |
| **Date** | 2026-11-28 |
| **Status** | In Progress |
| **Author** | Sulthan Adam Rahmadi |
| **Type** | Fix |
| **Area** | backend / frontend |
| **Branch** | `adam/fix-live-qa` |

## 1. Findings and fixes

| Finding on the live site | Fix |
|---|---|
| Markdown asterisks shown in answers | `lib/plainText.ts` applied to answers, explanation steps and assist output |
| Suggested questions mention "Sumber [1]" | same helper removes prompt passage numbers |
| A new article comment appears only after reload | invalidate the article detail query |
| Writer Studio says publishing is not available | text updated |

## 2. Verification

- [x] new unit tests for the helper; project checks (see the pull request)
- [ ] checked again on the live site after deploy

## 3. Rollback

Revert the merge commit.
