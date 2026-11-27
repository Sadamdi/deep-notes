#!/usr/bin/env bash
# Pack the built backend (dist, migrations, production package.json) into one archive.
# Run after `pnpm --filter @deep-notes/backend build`. Used by deploy.sh and by CI.
#
#   bash scripts/package-backend.sh <output.tgz>
set -euo pipefail
OUT="${1:?usage: package-backend.sh <output.tgz>}"
cd "$(dirname "$0")/.."

STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
cp -r backend/dist "$STAGE/dist"
cp -r backend/migrations "$STAGE/migrations"
node -e '
const p = require("./backend/package.json");
delete p.dependencies["@deep-notes/shared"];
require("fs").writeFileSync(process.argv[1] + "/package.json", JSON.stringify({ name: "deepnotes-api", private: true, type: "module", dependencies: p.dependencies }, null, 1));
' "$STAGE"
tar czf - -C "$STAGE" dist migrations package.json > "$OUT"
