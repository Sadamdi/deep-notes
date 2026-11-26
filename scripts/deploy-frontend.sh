#!/usr/bin/env bash
# Build the frontend here and publish only the built files to Vercel. Run from anywhere (Git Bash on Windows works):
#
#   bash scripts/deploy-frontend.sh
#
# Needs a logged-in Vercel CLI. Only frontend/dist is uploaded, so no source or .env file leaves this machine.
# Settings (environment variables, defaults in brackets):
#   VERCEL_PROJECT [deepnotes-app]  VERCEL [vercel]
set -euo pipefail

PROJECT="${VERCEL_PROJECT:-deepnotes-app}"
VERCEL="${VERCEL:-vercel}"

cd "$(dirname "$0")/.."
pnpm install --frozen-lockfile
pnpm --filter @deep-notes/frontend build
cp frontend/vercel.json frontend/dist/vercel.json
cd frontend/dist
"$VERCEL" link --yes --project "$PROJECT"
"$VERCEL" deploy --prod --yes
