# Daily workflow (people and agents)

1. **Sync.** `git pull` on `main`, then branch: `git switch -c <name>/<slug>`. `pnpm install` if the lockfile changed.
2. **Read.** [AGENTS.md](../AGENTS.md), `agents/knowledge/lessons.md`, and the feature doc for the area you touch.
3. **Plan.** Add a `Plan` entry in `docs/version/` (copy `_VERSION_TEMPLATE.md`) and a line in `VERSION_INDEX.md`. Check
   `docs/todo/TODO_INDEX.md` for the related item.
4. **Contract first.** Change or add the Zod schema in `shared/`. Backend and frontend both build on it.
5. **Implement.** Backend: routes, controller, service, repository. Frontend: feature folder, then page.
6. **Verify for real.** Run the app and exercise the change (API with curl or a test, UI in the browser with Network and Console open).
   Test the failure paths and the two-notebook isolation.
7. **Document.** Update the docs listed in AGENTS.md section 7. Move the version entry to `Released` and fill in Verification.
8. **Check.** `pnpm ci`.
9. **PR.** Push the branch, open a PR to `main` with summary, how to test, and notes. Wait for review.
10. **Learn.** If you hit a trap, record it: `python agents/tools/record_lesson.py "what happened and the fix" --tag <area>`.

## Who works where

The backend is owned by Adam; the frontend by the other members. Both sides meet at `shared/`: agree on a schema change in the PR
before building on it, so neither side blocks the other. Frontend work can start against the documented contract in
[API_CONTRACT.md](API_CONTRACT.md) before an endpoint is implemented.

## For AI agents specifically

- Put tools and scratch work in `agents/`, never in temp folders.
- Read a script before running it; never run destructive scripts against a non-local database.
- Do not claim a feature works until you ran it; report what was not verified.
- No AI attribution lines in commits or PRs.
