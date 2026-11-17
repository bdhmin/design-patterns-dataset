#!/usr/bin/env bash
# Rebuilds .ui-capture/data from scratch: starts the app on a temp port with
# the fake codex, seeds through the API + on-disk schema, then stops it.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
SEED_PORT="${SEED_PORT:-5401}"
node "$HERE/seed/seed.mjs" --bank-only
rm -rf "$HERE/data" && mkdir -p "$HERE/data"
PORT=$SEED_PORT "$HERE/start.sh" > "$HERE/seed-server.log" 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null || true' EXIT
for i in $(seq 1 60); do curl -sf "http://localhost:$SEED_PORT/api/library" >/dev/null && break; sleep 0.5; done
SEED_URL="http://localhost:$SEED_PORT" GETIT_DATA_DIR="$HERE/data" node "$HERE/seed/seed.mjs"
