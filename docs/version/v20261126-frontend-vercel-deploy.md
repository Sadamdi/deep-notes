# Frontend deployment on Vercel

| Attribute | Value |
|---|---|
| **Version** | v0.0.8 |
| **Date** | 2026-11-26 |
| **Status** | In Progress |
| **Author** | Sulthan Adam Rahmadi |
| **Type** | Config |
| **Area** | frontend / docs |
| **Branch** | `adam/frontend-vercel-deploy` |
| **PR** | opened from this branch |

## 1. Why

The team needs a public address for the web app, next to the backend that already runs on the demo server.

## 2. Plan

This entry was written after the first deployment, not before the code.

- [x] Vercel rewrites for `/api/*` and app routes
- [x] deploy script that uploads only built files
- [x] `docs/DEPLOYMENT.md` section 9.3

| Risk | Impact | Mitigation |
|---|---|---|
| Visitor IP is not forwarded by the gateway | register/login limits may be shared (not verified) | check before the demo |

## 3. Files changed

| File | Change |
|---|---|
| `frontend/vercel.json` | new: API and single-page-app rewrites |
| `scripts/deploy-frontend.sh` | new: build and publish `frontend/dist` |
| `docs/DEPLOYMENT.md` | section 9.3 |

## 4. Before and after

Before: no frontend deployment. After: https://deepnotes-app.vercel.app serves the app and forwards `/api/*` to the gateway.

## 5. Data impact

No migration. The live check created a throwaway user and notebook on the shared demo database and deleted both.

## 6. Verification

- [x] lint, type-check, tests (backend 92, frontend 16), frontend and backend build (26 Nov 2026)
- [x] `GET /`, `/login`, `/api/v1/health`, `/api/v1/companion/catalog` on the Vercel address: 200
- [x] register page rendered in a browser with no console errors
- [x] backend live check through the gateway: the 19 main checks passed with real models, then password change and account deletion
- [ ] register and sign in through the Vercel frontend (session cookie)
- [ ] `/ai/assist` against the live server

## 7. Rollback

Promote an earlier deployment in the Vercel dashboard, or delete the `deepnotes-app` project.
