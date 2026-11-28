#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
REAL_CP="$(command -v cp)"
TEST_ROOT="$(mktemp -d)"
trap 'rm -rf "$TEST_ROOT"' EXIT

export REAL_CP
export FAKE_COMMIT=0123456789abcdef0123456789abcdef01234567
export FAKE_ARCHIVE="$TEST_ROOT/backend.tgz"
export FAKE_SUM

mkdir -p "$TEST_ROOT/app/dist" "$TEST_ROOT/app/migrations" \
  "$TEST_ROOT/state" "$TEST_ROOT/fake-bin" "$TEST_ROOT/release/dist" \
  "$TEST_ROOT/release/migrations"
printf 'old release\n' >"$TEST_ROOT/app/dist/server.js"
printf 'old migration\n' >"$TEST_ROOT/app/migrations/0001.sql"
printf '{"name":"old-backend"}\n' >"$TEST_ROOT/app/package.json"
printf 'new release\n' >"$TEST_ROOT/release/dist/server.js"
printf 'new migration\n' >"$TEST_ROOT/release/migrations/0001.sql"
printf '{"name":"new-backend"}\n' >"$TEST_ROOT/release/package.json"
tar czf "$FAKE_ARCHIVE" -C "$TEST_ROOT/release" dist migrations package.json
FAKE_SUM="$(sha256sum "$FAKE_ARCHIVE" | cut -d ' ' -f1)"
export FAKE_SUM

cat >"$TEST_ROOT/fake-bin/curl" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
output=""
url=""
while (($#)); do
  case "$1" in
    -o) output="$2"; shift 2 ;;
    --max-time) shift 2 ;;
    -*) shift ;;
    *) url="$1"; shift ;;
  esac
done
case "$url" in
  */manifest.txt) printf '%s %s\n' "$FAKE_COMMIT" "$FAKE_SUM" ;;
  */backend.tgz) cp "$FAKE_ARCHIVE" "$output" ;;
  http://127.0.0.1:4000/api/v1/health) exit 0 ;;
  *) echo "unexpected URL: $url" >&2; exit 22 ;;
esac
SH
cat >"$TEST_ROOT/fake-bin/cp" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
if [[ "${1:-}" == -r && "${2:-}" == */new/dist ]]; then
  echo "injected release dist copy failure" >&2
  exit 1
fi
exec "$REAL_CP" "$@"
SH
cat >"$TEST_ROOT/fake-bin/flock" <<'SH'
#!/usr/bin/env bash
exit 0
SH
cat >"$TEST_ROOT/fake-bin/npm" <<'SH'
#!/usr/bin/env bash
exit 0
SH
cat >"$TEST_ROOT/fake-bin/pm2" <<'SH'
#!/usr/bin/env bash
exit 0
SH
cat >"$TEST_ROOT/fake-bin/sleep" <<'SH'
#!/usr/bin/env bash
exit 0
SH
chmod +x "$TEST_ROOT/fake-bin/"*

set +e
APP="$TEST_ROOT/app" STATE="$TEST_ROOT/state" BASE=https://release.invalid \
  HEALTH=http://127.0.0.1:4000/api/v1/health \
  PATH="$TEST_ROOT/fake-bin:$PATH" bash "$ROOT/scripts/server-update.sh" \
  >"$TEST_ROOT/output.log" 2>&1
status=$?
set -e

if [[ $status -eq 0 ]]; then
  echo "FAIL: updater succeeded despite the injected staging failure"
  cat "$TEST_ROOT/output.log"
  exit 1
fi
for file in \
  "$TEST_ROOT/app/dist/server.js" \
  "$TEST_ROOT/app/migrations/0001.sql" \
  "$TEST_ROOT/app/package.json"; do
  if [[ ! -f "$file" ]]; then
    echo "FAIL: previous release file was not restored: $file"
    echo "Updater exit status: $status"
    find "$TEST_ROOT/app" -maxdepth 3 -type f -print
    cat "$TEST_ROOT/output.log"
    exit 1
  fi
done
grep -q 'old release' "$TEST_ROOT/app/dist/server.js"
grep -q 'old migration' "$TEST_ROOT/app/migrations/0001.sql"
grep -q 'old-backend' "$TEST_ROOT/app/package.json"
grep -q "$FAKE_COMMIT" "$TEST_ROOT/state/failed"
echo "PASS: failed staging restored the previous release and recorded the failed commit"
