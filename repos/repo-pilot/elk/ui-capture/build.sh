#!/usr/bin/env bash
# Production build of Elk with the built-in mock-user mode pointing at the local Mastodon stub.
set -euo pipefail
cd "$(dirname "$0")/.."
export MOCK_USER="$(node .ui-capture/stub/mock-user.mjs)"
export NUXT_PUBLIC_DEFAULT_SERVER=localhost:4410
export NUXT_PUBLIC_SINGLE_INSTANCE=true
export NUXT_PUBLIC_DISABLE_VERSION_CHECK=true
export NUXT_STORAGE_DRIVER=fs
export NUXT_TELEMETRY_DISABLED=1
export HOME="$PWD/.ui-capture/home"
# (pnpm run would re-verify deps against the lockfile; call nuxt directly)
./node_modules/.bin/nuxt build
