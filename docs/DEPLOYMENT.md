# Deployment

> **Note (24 Nov 2026):** sections 2 to 4 describe the original nginx plan, which was not used because the shared server already runs other projects. The topology that actually runs is in sections 9 and 9.1; `deploy/nginx` and `bootstrap-server.sh` were removed.

Status (23 Nov 2026): **designed, not yet executed.** Nothing here has been run on the server. Items marked "unverified" must be confirmed during the first run and this page updated.

## 1. Security first

Credentials were pasted into a chat while planning (AI provider keys, a proxy key, a server root password, a database password). Treat every one of them as exposed:

| Secret | Do this |
|---|---|
| Gemini API keys | delete or regenerate them in Google AI Studio; create new ones and keep them only in `.env` files |
| OpenAI-compatible proxy key | ask the provider to revoke and reissue |
| Server root password | change it now; create a `deploy` user with key-only login (section 3); once key login works, turn off root and password login in `sshd_config` yourself |
| Database password | reset it in the Supabase dashboard (Project settings, Database) and update the `.env` files |

Rules from now on: secrets live only in `.env` files (gitignored, `chmod 600` on the server) or the host's secret store. They are never typed into chat, issues, PRs, docs, logs or commit messages. AI agents working in this repo do not log in with passwords: the first login is done by a person, then key-based access is set up. Details: `AGENTS.md` section 6.

## 2. Topology

```
Internet ── nginx (80/443) ──┬── static files  /opt/deepnotes/app/frontend/dist
                             └── /api/*  ──►  Node backend 127.0.0.1:4000  (pm2: deepnotes-api)
                                                 ├── uploads   /opt/deepnotes/uploads  (private, 0700)
                                                 ├── PostgreSQL + pgvector (Supabase, session pooler)
                                                 └── AI: Gemini, fallback OpenAI-compatible endpoint
```

The frontend and the API share one origin, so production needs no CORS. The VPS here uses a non-default SSH port (22232): pass it explicitly (`ssh -p 22232 ...`).

## 3. One-time server setup (a person does the first login)

On your laptop (the password is typed by you, in your own terminal):

```bash
ssh-keygen -t ed25519 -f ~/.ssh/deepnotes_vps_ed25519 -C "deepnotes-deploy"
```

Copy `deploy/bootstrap-server.sh`, `deploy/nginx/deepnotes.conf` to the server (they are in the repo), read the script, and run it as root with your new **public** key:

```bash
scp -P 22232 -r deploy root@<server-ip>:/root/deploy
ssh -p 22232 root@<server-ip>
# on the server:
bash /root/deploy/bootstrap-server.sh "<the single line printed by: cat ~/.ssh/deepnotes_vps_ed25519.pub>" <domain-or-underscore>
```

The script installs nginx, Node 22, pnpm and pm2, creates the `deploy` user (key login only), creates `/opt/deepnotes`, and installs the nginx site. It does not touch the firewall or `sshd_config`. It first prints what already listens on ports 80, 443 and 4000 and the current nginx sites, because this server may host other things: read that output.

Then, as the deploy user (`ssh -i ~/.ssh/deepnotes_vps_ed25519 -p 22232 deploy@<server-ip>`):

```bash
cd /opt/deepnotes && git clone https://github.com/Sadamdi/deep-notes.git app
nano /opt/deepnotes/.env && chmod 600 /opt/deepnotes/.env      # contents: section 5
bash /opt/deepnotes/app/scripts/deploy.sh
RUN_MIGRATIONS=yes bash /opt/deepnotes/app/scripts/deploy.sh   # first run only, after reviewing the migration SQL
```

After the deploy user can log in with the key, add an entry to `~/.ssh/config` (Host name, HostName, Port 22232, User deploy, IdentityFile) so the key is used automatically.

## 4. Deploy flow and rollback

`scripts/deploy.sh` (run as `deploy`): fast-forward `main`, `pnpm install --frozen-lockfile`, `pnpm build`, `pm2 startOrReload`, reload nginx, then poll `/api/v1/health`. If the check fails it resets to the previous commit, rebuilds, and exits non-zero. Migrations run only with `RUN_MIGRATIONS=yes`. A cron job that runs the script every few minutes may be added later; until the pipeline is trusted, deploy by hand after a merged PR. Unverified: the first real run.

## 5. Environment variables on the server (`/opt/deepnotes/.env`)

Same names as `backend/.env.example`. Server-specific values:

| Variable | Server value |
|---|---|
| `NODE_ENV` | `production` (also set by pm2) |
| `PORT` | `4000` |
| `CORS_ORIGIN` | the public origin (same-origin setup: only needed for tools hitting the API directly) |
| `DATABASE_URL` | the Supabase **session pooler** URL, password percent-encoded |
| `DATABASE_SSL` | `require` |
| `SESSION_SECRET` | 32+ random characters, unique to this environment |
| `UPLOAD_DIR` | `/opt/deepnotes/uploads` |
| `GEMINI_API_KEYS` | comma-separated keys |
| `OPENAI_COMPAT_BASE_URL`, `OPENAI_COMPAT_API_KEY` | optional fallback provider |
| `AI_TEXT_MODEL`, `AI_FALLBACK_TEXT_MODEL`, `AI_EMBED_MODEL`, `AI_EMBED_DIMENSIONS` | chosen in task T-012 |

## 6. Database (Supabase)

- Enable pgvector once: in the SQL editor run `CREATE EXTENSION IF NOT EXISTS vector;` (it may live in the `extensions` schema; unverified how the Drizzle migration should reference the type, check on the first migration).
- Use the **session pooler** (port 5432) for the app and for migrations. The transaction pooler (port 6543) does not support prepared statements by default.
- Percent-encode special characters in the password. Do not add `sslmode` to the URL; set `DATABASE_SSL=require`. TODO: pin the provider's CA certificate instead of skipping verification.
- This database is **shared/demo**. Do not run tests, seed or cleanup against it (the scripts refuse non-localhost hosts). Development uses a different database.
- Backups: the free tier may not include point-in-time recovery (verify). Until confirmed, schedule a `pg_dump` from the server to `/opt/deepnotes/backups` and copy dumps off the machine.

## 7. Domain and TLS

Decision needed: a domain or subdomain for the demo. Without one the app is reachable only over plain HTTP by IP, which is poor for logins and for any browser feature that requires HTTPS. With DNS pointing at the server: `sudo certbot --nginx -d <domain>` (install certbot first) adds HTTPS and renewal.

## 8. After the first successful deploy

Update this page (remove "unverified" where proven), `docs/version/`, and `agents/knowledge/proyek.md`; record the health check result (status code and time), not secrets.

## 9. Current demo topology (24 Nov 2026): Vercel frontend, backend behind a Cloudflare quick tunnel

The shared demo VPS already runs other projects (apache2 on port 80, other pm2 apps, other tunnels), so nginx and the static frontend are not used there. What actually runs:

| Part | Where | Notes |
|---|---|---|
| Frontend | Vercel (Vercel domain) | rewrite `/api/*` to the tunnel URL |
| Backend | pm2 app `deepnotes-api` on the VPS, `127.0.0.1:4000` | files in `/opt/deepnotes/app/backend`, env in `/opt/deepnotes/.env` (chmod 600) |
| Public HTTPS | pm2 app `deepnotes-tunnel` (`cloudflared` quick tunnel) | URL on `trycloudflare.com`, **changes whenever the tunnel restarts** |

Health check: `GET <tunnel-url>/api/v1/health`.

Rules learned the hard way:
- The VPS has `~/.cloudflared/config.yml` for another project. A quick tunnel started without `--config` loads it and answers every request with an empty 404. Always start with `--config /opt/deepnotes/cloudflared-quick.yml` (an empty file).
- The server has 1 GB RAM: build on a laptop and upload `dist/` plus a production `package.json`, then `npm install --omit=dev` on the server. Do not run `pnpm install` there.
- After a tunnel restart, read the new URL with `pm2 logs deepnotes-tunnel --nostream | grep trycloudflare` and update the Vercel rewrite. For a stable URL, move to a named tunnel with a domain (section 7).
- SSH to the VPS: port 22232 with a key. Passwords are never used by agents and must not be pasted into chat.

### 9.1 Update 24 Nov 2026: database and what runs now
- The API on the VPS uses the Supabase session pooler (`DATABASE_SSL=require`); migrations in `backend/migrations/*.sql` are applied automatically at start by `getDb()` and can be run by hand with `pnpm --filter @deep-notes/backend db:migrate`. pgvector is created by migration `0001`.
- An embedded PGlite database exists for development and tests (`./.data/pglite`, or in memory in tests). It is **not** used on the VPS: it needs about 300 MB of RAM and got the process restarted by `max_memory_restart` on the 1 GB shared box. Production refuses to start without `DATABASE_URL` unless `ALLOW_PGLITE=1`.
- Deploy by hand until `scripts/deploy.sh` is updated: build on a laptop (`pnpm --filter @deep-notes/backend build`), upload `dist/`, `migrations/` and a production `package.json` (workspace package removed, because `@deep-notes/shared` is bundled), then `npm install --omit=dev` and `pm2 restart deepnotes-api`. The API process is limited to 250 MB (`--max-memory-restart 250M`).
- Live check after any deploy: `node agents/e2e-live.mjs <public-url>` (in the hackathon workspace) registers a throwaway user and exercises every main flow with the real models; it deletes its notebook at the end. Last result: 15 of 15 checks passed on 24 Nov 2026.

### 9.2 Stable public address (25 Nov 2026)
The API is reachable at **https://deepnotes-api.vercel.app** through a small gateway on Vercel (project `deepnotes-api`, free plan, source in `deploy/gateway/`). It forwards `/api/*` to the current tunnel address read from `deploy/server-url.json` on `main`, so frontend code never depends on the tunnel address.
- After a tunnel restart: `DEPLOY_HOST=root@<server-ip> node scripts/update-server-url.mjs`, then commit and push. The gateway uses the new address within about half a minute.
- It runs on the Node.js runtime with `maxDuration` 100 seconds: an edge function must answer within 25 seconds, which cut off slow AI requests (game sessions, concept maps). It is pinned to region `pdx1`, near the demo server (US west).
- Redeploy the gateway only when `deploy/gateway/` changes (Vercel dashboard or the Vercel MCP `create_deployment` with those files). It has no secrets and no environment variables.
- Limits: request bodies up to about 4.5 MB (Vercel), so uploads above that fail with `413` through the gateway; the server itself accepts 15 MB. Anyone who can push to `main` can repoint the gateway, so keep push access small.
- A permanent fix needs a domain on Cloudflare and a named tunnel (free tunnel, domain costs); then the gateway becomes unnecessary.

### 9.3 Frontend on Vercel (26 Nov 2026)
The frontend is live at **https://deepnotes-app.vercel.app** (Vercel project `deepnotes-app`). Deploy with `bash scripts/deploy-frontend.sh`: it builds here and uploads only `frontend/dist`. `frontend/vercel.json` forwards `/api/*` to the gateway (section 9.2), so the browser sees one origin, and serves `index.html` for app routes. There is no Git auto-deploy; run the script after a merge.
- `deep-notes.vercel.app`, mentioned in earlier docs and in the server `CORS_ORIGIN`, is not served by this project.
- The gateway does not forward the visitor's IP, so per-IP limits (register, login) are likely shared by all visitors (not verified).

### 9.4 Automatic backend updates
After a push to `main` passes CI, the `release` job publishes the built backend to the `backend-latest` release. On the server, cron runs `/opt/deepnotes/bin/server-update.sh` (a copy of `scripts/server-update.sh`) every 2 minutes; it applies a new release with a checksum check, a health check and rollback. Migrations run on start; a new migration that drops, renames or deletes anything is refused and must be deployed by hand after a backup. Log: `/opt/deepnotes/logs/update.log`. To pause: comment out the cron line (`crontab -e`). Reinstall the script after changing it. Anyone who can push to `main` changes what runs on the server, so keep push access small. The frontend is not automatic: run `scripts/deploy-frontend.sh`.
