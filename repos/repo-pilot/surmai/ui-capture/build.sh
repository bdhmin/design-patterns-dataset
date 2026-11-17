#!/usr/bin/env bash
# Reproduce the build inside the capture sandbox (no proxy.golang.org / dl.google.com).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
mise install
# pnpm 12 (the packageManager pin) can't open its named store lock in the sandbox;
# pnpm 11 reads the same lockfile. pm-on-fail=ignore stops it re-launching pnpm 12.
pnpm --config.pm-on-fail=ignore install --frozen-lockfile
pnpm --config.pm-on-fail=ignore run build
# Go modules from GitHub mirrors (+ sqlite shim), wired up with a go.work file.
python3 .ui-capture/gomods/fetch.py
# The sandbox rejects sendfile(2); net/http would truncate static files after 512 bytes.
# Overlay the stdlib file that enables it (see gomods/overlay/).
cat > "$ROOT/.ui-capture/gomods/overlay.json" <<JSON
{"Replace":{"$(go env GOROOT)/src/net/sendfile_nonwindows.go":"$ROOT/.ui-capture/gomods/overlay/sendfile_nonwindows.go"}}
JSON
cd backend
GOWORK="$ROOT/.ui-capture/gomods/go.work" GOPROXY=off GOSUMDB=off CGO_ENABLED=1 \
  go build -overlay "$ROOT/.ui-capture/gomods/overlay.json" -o "$ROOT/.ui-capture/bin/surmai-backend" .
mkdir -p "$ROOT/.ui-capture/run"
rm -rf "$ROOT/.ui-capture/run/pb_public.new" && cp -R "$ROOT/dist" "$ROOT/.ui-capture/run/pb_public.new" && ([ -d "$ROOT/.ui-capture/run/pb_public/_stub" ] && cp -R "$ROOT/.ui-capture/run/pb_public/_stub" "$ROOT/.ui-capture/run/pb_public.new/" || true) && rm -rf "$ROOT/.ui-capture/run/pb_public" && mv "$ROOT/.ui-capture/run/pb_public.new" "$ROOT/.ui-capture/run/pb_public"
ln -sfn ../../backend/datasets "$ROOT/.ui-capture/run/datasets"
