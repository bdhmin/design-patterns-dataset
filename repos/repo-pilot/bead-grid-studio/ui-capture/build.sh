#!/usr/bin/env bash
# Builds the static production bundle into .ui-capture/out and injects the seed-draft loader.
set -euo pipefail
cd "$(dirname "$0")/.."
npm ci --ignore-scripts
npx vite build
rm -rf .ui-capture/out && cp -R dist .ui-capture/out
node .ui-capture/gen-pattern.mjs .ui-capture/seed > /dev/null
node .ui-capture/make-seed-loader.mjs .ui-capture/seed/draft.bead.json .ui-capture/out
echo "built .ui-capture/out"
