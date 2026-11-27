# Automatic backend updates on the demo server

| Attribute | Value |
|---|---|
| **Version** | v0.0.17 |
| **Date** | 2026-11-27 |
| **Status** | In Progress |
| **Author** | Sulthan Adam Rahmadi |
| **Type** | Config |
| **Area** | backend / docs |
| **Branch** | `adam/auto-deploy` |

## 1. Why

The server kept running an old backend after `main` changed, so new frontend screens failed with "Route not found" and "Invalid request".

## 2. Changes

- CI publishes the built backend to the `backend-latest` release (`scripts/package-backend.sh`)
- the server applies it by itself (`scripts/server-update.sh`, cron)
- `docs/DEPLOYMENT.md` section 9.4; the embedded database test gets a longer time limit

## 3. Data impact

Migrations 0005 to 0008 were applied by hand on 27 Nov 2026 (new tables and indexes only), after a table dump saved on the server.

## 4. Rollback

Comment out the cron line on the server, then deploy the wanted commit with `scripts/deploy.sh`.
