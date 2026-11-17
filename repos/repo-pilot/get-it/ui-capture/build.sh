#!/usr/bin/env bash
# One-time build: install deps, produce the Next standalone server, copy assets.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
ELECTRON_SKIP_BINARY_DOWNLOAD=1 PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci --no-audit --no-fund
GETIT_DATA_DIR="$ROOT/.ui-capture/build-data" NEXT_TELEMETRY_DISABLED=1 npx next build
rm -rf .next/standalone/.next/static && cp -R .next/static .next/standalone/.next/static
