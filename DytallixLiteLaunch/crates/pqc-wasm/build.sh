#!/usr/bin/env bash
set -euo pipefail

if ! command -v wasm-pack >/dev/null 2>&1; then
  echo "wasm-pack not found. Install via: cargo install wasm-pack" >&2
  exit 1
fi

export RUSTFLAGS='--cfg getrandom_backend="wasm_js"'

rm -rf pkg-web pkg-node

# Build for web
wasm-pack build --release --target web --out-dir pkg-web
# Build for Node.js
wasm-pack build --release --target nodejs --out-dir pkg-node

echo "WASM builds complete in pkg-web and pkg-node."
