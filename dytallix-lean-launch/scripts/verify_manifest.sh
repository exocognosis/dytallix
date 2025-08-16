#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
MANIFEST="$ROOT_DIR/public/wasm/pqc/manifest.json"
if [[ ! -f "$MANIFEST" ]]; then echo "Manifest not found" >&2; exit 1; fi
status=0
for wasm in "$ROOT_DIR"/public/wasm/pqc/*.wasm; do
  name=$(basename "$wasm")
  want=$(jq -r --arg k "$name" '.[$k]' "$MANIFEST")
  if [[ "$want" == "null" || -z "$want" ]]; then echo "Missing manifest entry for $name" >&2; status=1; continue; fi
  if command -v sha256sum >/dev/null 2>&1; then got=$(sha256sum "$wasm"|awk '{print $1}'); else got=$(shasum -a 256 "$wasm"|awk '{print $1}'); fi
  if [[ "$got" != "$want" ]]; then echo "Hash mismatch $name" >&2; status=1; fi
  echo "OK $name $got" >&2
done
exit $status
