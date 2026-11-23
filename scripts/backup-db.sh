#!/usr/bin/env bash
# Dump the demo database to backups/ (gitignored). Needs pg_dump of the same or a newer major version than the server.
#
#   DATABASE_URL=postgresql://... bash scripts/backup-db.sh
#   PG_DUMP="/c/Program Files/PostgreSQL/17/bin/pg_dump" bash scripts/backup-db.sh
#
# Keep a copy outside this machine before the Final Day and before any risky migration.
set -euo pipefail
: "${DATABASE_URL:?set DATABASE_URL (percent-encode special characters in the password)}"
PG_DUMP="${PG_DUMP:-pg_dump}"
mkdir -p backups
OUT="backups/deepnotes-$(date +%Y%m%d-%H%M%S).dump"
"$PG_DUMP" --format=custom --no-owner --no-privileges --file "$OUT" "$DATABASE_URL"
echo "wrote $OUT ($(wc -c < "$OUT") bytes)"
echo "restore with: pg_restore --no-owner --clean --if-exists -d <target-url> $OUT"
