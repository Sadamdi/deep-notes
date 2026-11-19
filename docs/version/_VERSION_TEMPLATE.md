# <Change title or plan>

| Attribute | Value |
|---|---|
| **Version** | vX.Y.Z |
| **Date** | YYYY-MM-DD |
| **Status** | Plan / In Progress / Released / Rolled Back |
| **Author** | name |
| **Type** | Feature / Fix / Refactor / Migration / Docs / Config |
| **Area** | backend / frontend / shared / docs |
| **Branch** | `<name>/<slug>` |
| **PR** | link |

## 1. Why

One to three sentences: the need, not the technique.

## 2. Plan (fill before coding)

- [ ] step
- [ ] migration or data impact
- [ ] docs to update

| Risk | Impact | Mitigation |
|---|---|---|

## 3. Files changed

| File | Change |
|---|---|

## 4. Before and after

Show the behavior or contract that changed (request/response example, screenshot description).

## 5. Data impact

Tables, migrations, backfill. Applied to a non-local database? Yes/No (needs the lead's approval).

## 6. Verification

- [ ] `pnpm ci`
- [ ] endpoint exercised: method, path, status, account role (no credential values)
- [ ] failure paths: invalid input, not signed in, not a member
- [ ] two-notebook isolation checked
- [ ] AI features: model used, result, time (real call, not a stub)

## 7. Rollback

How to undo, and whether the migration can be reverted.
