#!/usr/bin/env bash
# Runs ON THE DEMO SERVER from cron. Applies the newest backend release that CI published from main.
# The server pulls from a public release, so no SSH key or token is stored on GitHub.
# Install and operation: docs/DEPLOYMENT.md section 9.4.
#
# Safety: checksum check, health check with rollback, and a new migration that drops, renames or deletes
# anything is NOT applied automatically (deploy it by hand with scripts/deploy.sh after a backup).
set -euo pipefail

APP="${APP:-/opt/deepnotes/app/backend}"
STATE="${STATE:-/opt/deepnotes/update}"
BASE="${BASE:-https://github.com/Sadamdi/deep-notes/releases/download/backend-latest}"
HEALTH="${HEALTH:-http://127.0.0.1:4000/api/v1/health}"
log() { echo "$(date -u +%FT%TZ) $*"; }

mkdir -p "$STATE"
exec 9>"$STATE/lock"
flock -n 9 || exit 0

manifest="$(curl -fsSL --max-time 30 "$BASE/manifest.txt")" || exit 0
read -r commit sum <<<"$manifest"
[[ $commit =~ ^[0-9a-f]{40}$ && $sum =~ ^[0-9a-f]{64}$ ]] || { log "unreadable manifest"; exit 1; }
[ "$commit" = "$(cat "$STATE/deployed" 2>/dev/null || true)" ] && exit 0
[ "$commit" = "$(cat "$STATE/failed" 2>/dev/null || true)" ] && exit 0

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
curl -fsSL --max-time 120 -o "$tmp/release.tgz" "$BASE/backend.tgz"
# a mismatch usually means the release is being replaced right now: try again on the next run
echo "$sum  $tmp/release.tgz" | sha256sum --check --status || { log "checksum mismatch for $commit"; exit 1; }
mkdir "$tmp/new"
tar xzf "$tmp/release.tgz" -C "$tmp/new"

for file in "$tmp"/new/migrations/*.sql; do
  name="$(basename "$file")"
  [ -f "$APP/migrations/$name" ] && continue
  if sed 's/--.*//' "$file" | grep -qiE '\b(drop|truncate|rename)\b|delete[[:space:]]+from|alter[[:space:]]+column'; then
    log "NOT deployed $commit: migration $name changes existing data; deploy it by hand"
    echo "$commit" >"$STATE/failed"
    exit 1
  fi
done

cd "$APP"
rm -rf dist.prev migrations.prev
cp -r dist dist.prev
cp -r migrations migrations.prev
cp package.json package.json.prev
rm -rf dist migrations
cp -r "$tmp/new/dist" "$tmp/new/migrations" .
cp "$tmp/new/package.json" package.json

healthy() { for _ in $(seq 1 40); do curl -fsS --max-time 5 "$HEALTH" >/dev/null 2>&1 && return 0; sleep 1; done; return 1; }

if npm install --omit=dev --no-audit --no-fund >/dev/null && pm2 restart deepnotes-api --update-env >/dev/null && healthy; then
  pm2 save >/dev/null
  echo "$commit" >"$STATE/deployed"
  log "deployed $commit"
else
  log "FAILED $commit: restoring the previous release"
  rm -rf dist migrations
  mv dist.prev dist
  mv migrations.prev migrations
  mv package.json.prev package.json
  npm install --omit=dev --no-audit --no-fund >/dev/null || true
  pm2 restart deepnotes-api --update-env >/dev/null
  echo "$commit" >"$STATE/failed"
  healthy || log "previous release is also unhealthy: run 'pm2 logs deepnotes-api'"
  exit 1
fi
