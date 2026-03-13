#!/usr/bin/env bash
set -euo pipefail

# Builds the sample counter contract to WASM and copies the artifact
# into dytallix-lean-launch/artifacts/counter.wasm

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
CONTRACT_DIR="$ROOT_DIR/../smart-contracts/examples/counter"
OUT_DIR="$ROOT_DIR/artifacts"

echo "[build] Target dir: $CONTRACT_DIR"

if ! command -v cargo >/dev/null 2>&1; then
  echo "error: cargo not found in PATH" >&2
  exit 1
fi

rustup target add wasm32-unknown-unknown >/dev/null 2>&1 || true

pushd "$CONTRACT_DIR" >/dev/null
  echo "[build] Compiling counter.wasm (release, opt-level=z)"
  RUSTFLAGS="-C link-arg=-s" cargo build --release --target wasm32-unknown-unknown
popd >/dev/null

mkdir -p "$OUT_DIR"
SRC_WASM="$CONTRACT_DIR/target/wasm32-unknown-unknown/release/counter.wasm"
if [ ! -f "$SRC_WASM" ]; then
  echo "error: build succeeded but artifact not found: $SRC_WASM" >&2
  exit 1
fi
cp "$SRC_WASM" "$OUT_DIR/counter.wasm"
echo "[build] Wrote $OUT_DIR/counter.wasm"

