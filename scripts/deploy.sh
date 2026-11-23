#!/usr/bin/env bash
# Deploy the latest main on the server. Run as the deploy user, from anywhere:
#
#   bash /opt/deepnotes/app/scripts/deploy.sh                 # build and restart
#   RUN_MIGRATIONS=yes bash /opt/deepnotes/app/scripts/deploy.sh   # also apply database migrations
#
# Migrations are never automatic: they change the shared database, so a person opts in each time.
# If the health check fails after the restart, the script goes back to the previous commit and exits non-zero.
set -euo pipefail

APP=/opt/deepnotes/app
HEALTH_URL="http://127.0.0.1:4000/api/v1/health"

cd "$APP"
PREV="$(git rev-parse HEAD)"
git fetch --quiet origin main
git merge --ff-only origin/main
NEW="$(git rev-parse HEAD)"
echo "deploying $PREV -> $NEW"

build_and_restart() {
  pnpm install --frozen-lockfile
  pnpm build
  pm2 startOrReload deploy/ecosystem.config.cjs --update-env
  pm2 save >/dev/null
  sudo /usr/bin/systemctl reload nginx
}

healthy() {
  for _ in $(seq 1 20); do
    curl -fsS "$HEALTH_URL" >/dev/null 2>&1 && return 0
    sleep 1
  done
  return 1
}

build_and_restart

if [ "${RUN_MIGRATIONS:-no}" = "yes" ]; then
  echo "applying migrations (opted in)"
  ENV_FILE=/opt/deepnotes/.env pnpm --filter @deep-notes/backend db:migrate
fi

if healthy; then
  echo "healthy at $NEW"
else
  echo "health check failed; rolling back to $PREV" >&2
  git reset --hard "$PREV"
  build_and_restart
  healthy || echo "rollback is also unhealthy: check 'pm2 logs deepnotes-api'" >&2
  exit 1
fi
