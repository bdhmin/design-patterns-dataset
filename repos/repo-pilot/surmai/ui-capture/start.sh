#!/usr/bin/env bash
# Starts Surmai (PocketBase-based Go backend serving the built React UI) on $PORT.
# Everything is pre-built and pre-seeded:
#   .ui-capture/bin/surmai-backend   built by .ui-capture/build.sh
#   .ui-capture/run/pb_public        -> ../../dist (vite production build)
#   .ui-capture/run/pb_data          seeded SQLite data (see .ui-capture/seed/)
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
PORT="${PORT:-4402}"
cd "$HERE/run"
export SURMAI_ADMIN_EMAIL="admin@surmai.net"
export SURMAI_ADMIN_PASSWORD="ChangeMe123"
export PB_DATA_DIRECTORY="$HERE/run/pb_data"
"$HERE/bin/surmai-backend" migrate up >/dev/null
exec "$HERE/bin/surmai-backend" serve --http="0.0.0.0:${PORT}"
