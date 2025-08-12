#!/usr/bin/env bash
set -euo pipefail
# Wrapper script retained for spec compliance. Calls existing build script.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [[ -x "$SCRIPT_DIR/build_pqc_wasm.sh" ]]; then
  exec "$SCRIPT_DIR/build_pqc_wasm.sh" "$@"
else
  echo "Underlying build_pqc_wasm.sh not found" >&2
  exit 1
fi
