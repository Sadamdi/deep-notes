#!/usr/bin/env bash
# Deploy the backend from this machine to the demo server. Run from the repo root (Git Bash on Windows works):
#
#   bash scripts/deploy.sh
#
# What it does: builds the backend, uploads dist/, migrations/ and a production package.json (the shared
# package is bundled), installs production dependencies on the server (the server is small, so it never
# builds), restarts the pm2 app and checks health. If the health check fails it restores the previous dist
# and restarts again. Database migrations run on start and are additive; they are not rolled back.
#
# Settings (environment variables, defaults in brackets):
#   DEPLOY_HOST (required, for example root@<server-ip>)  DEPLOY_PORT [22232]  DEPLOY_KEY [~/.ssh/deepnotes_vps_ed25519]
#   The server address is not kept in the repository because it is public; ask Adam or read your own notes.
set -euo pipefail

HOST="${DEPLOY_HOST:?set DEPLOY_HOST, for example root@<server-ip>}"
PORT="${DEPLOY_PORT:-22232}"
KEY="${DEPLOY_KEY:-$HOME/.ssh/deepnotes_vps_ed25519}"
APP=/opt/deepnotes/app/backend
SSH=(ssh -i "$KEY" -p "$PORT" -o BatchMode=yes "$HOST")
SCP=(scp -i "$KEY" -P "$PORT" -o BatchMode=yes)

cd "$(dirname "$0")/.."
pnpm install --frozen-lockfile
pnpm --filter @deep-notes/backend test
pnpm --filter @deep-notes/backend build

ARCHIVE="$(mktemp)"
trap 'rm -f "$ARCHIVE"' EXIT
bash scripts/package-backend.sh "$ARCHIVE"

"${SCP[@]}" "$ARCHIVE" "$HOST:/tmp/deepnotes-release.tgz"

"${SSH[@]}" bash -s <<REMOTE
set -euo pipefail
cd $APP
rm -rf dist.prev migrations.prev
[ -d dist ] && mv dist dist.prev
[ -d migrations ] && mv migrations migrations.prev
tar xzf /tmp/deepnotes-release.tgz
npm install --omit=dev --no-audit --no-fund >/dev/null
pm2 restart deepnotes-api --update-env >/dev/null
healthy() { for _ in \$(seq 1 25); do curl -fsS http://127.0.0.1:4000/api/v1/health >/dev/null 2>&1 && return 0; sleep 1; done; return 1; }
if healthy; then
  pm2 save >/dev/null
  echo "healthy: new release is live"
else
  echo "health check failed; restoring the previous release" >&2
  rm -rf dist migrations
  [ -d dist.prev ] && mv dist.prev dist
  [ -d migrations.prev ] && mv migrations.prev migrations
  pm2 restart deepnotes-api --update-env >/dev/null
  healthy || echo "previous release is also unhealthy: run 'pm2 logs deepnotes-api' on the server" >&2
  exit 1
fi
REMOTE
