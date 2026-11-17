#!/usr/bin/env bash
# Starts Get It. (Next standalone server) with a local fake Codex CLI.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
export PORT="${PORT:-4401}"
export HOSTNAME="::"
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1
export GETIT_DATA_DIR="$HERE/data"
# Fake codex CLI (exec / app-server) + fake ~/.codex/auth.json under a local HOME.
export CODEX_BINARY_PATH="$HERE/stubs/fake-codex.mjs"
export HOME="$HERE/home"
cd "$ROOT/.next/standalone"
exec node server.js
