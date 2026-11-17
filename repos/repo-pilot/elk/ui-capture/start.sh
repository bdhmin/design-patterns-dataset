#!/usr/bin/env bash
# Starts the local Mastodon API stub (Harbor Social, :4410) and Elk's production Nitro server (:$PORT).
set -euo pipefail
cd "$(dirname "$0")/.."
PORT="${PORT:-4400}"
export NUXT_PUBLIC_DEFAULT_SERVER=localhost:4410
export NUXT_PUBLIC_SINGLE_INSTANCE=true
export NUXT_PUBLIC_DISABLE_VERSION_CHECK=true
export NUXT_STORAGE_DRIVER=fs
export NUXT_STORAGE_FS_BASE="$PWD/.ui-capture/cache/elk-storage"
node .ui-capture/stub/server.mjs 4410 &
STUB_PID=$!
trap 'kill $STUB_PID 2>/dev/null || true' EXIT INT TERM
PORT="$PORT" HOST=0.0.0.0 node .output/server/index.mjs
