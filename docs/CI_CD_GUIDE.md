# CI and delivery

## CI (GitHub Actions, `.github/workflows/ci.yml`)

Runs on every pull request and on pushes to `main`: install with the lockfile, then `pnpm lint`, `pnpm type-check`, `pnpm test`,
`pnpm build`. The same four commands run locally with `pnpm ci`; run them before pushing and do not push while any is red.

## Branches and pull requests

- `main` is the only long-lived branch and must always build.
- Work on `<name>/<slug>` branches and open a PR to `main`. No direct pushes, no `--no-verify`.
- A PR needs a green CI run and at least one review. The team lead merges.
- If CI cannot run (billing or quota), run the four commands locally, paste the result in the PR as a "manual review" comment,
  then merge.
- Recommended GitHub settings: protect `main`, require the CI check, require one approval, dismiss stale approvals, disallow force pushes.

## Commit style

`feat(backend): ...`, `fix(frontend): ...`, `docs: ...`, `chore: ...`, `test: ...`, `refactor: ...`. Subject under 72 characters, one concern
per commit. No AI attribution lines.

## Secrets in CI and deploy

Secrets live only in the CI or hosting provider's secret store, never in the repo. `.env.example` lists the variable names.

## Deploy (to be decided)

Frontend: static build (`frontend/dist`) on any static host. Backend: `pnpm --filter @deep-notes/backend build` produces `backend/dist/server.js`,
started with `node dist/server.js` and the environment variables from `.env.example`. The deployment target and the hosted database
are decided before Final Day; record the choice in `docs/version/`.
