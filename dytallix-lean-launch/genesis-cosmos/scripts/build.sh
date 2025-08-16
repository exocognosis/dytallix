#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
OUT_DIR="$ROOT_DIR/outputs"
FRAMEWORK_MD="$ROOT_DIR/framework.md"
BINARY_NAME="dytallixd"
FALLBACK_BINARY="simd"

mkdir -p "$OUT_DIR"

have_binary() {
  command -v "$1" >/dev/null 2>&1
}

if have_binary "$BINARY_NAME"; then
  BINARY="$BINARY_NAME"
elif have_binary "$FALLBACK_BINARY"; then
  BINARY="$FALLBACK_BINARY"
else
  echo "Binary not found: $BINARY_NAME or $FALLBACK_BINARY. Attempting to install simd..."
  if ! command -v go >/dev/null 2>&1; then
    echo "Go is not installed. Please install Go 1.22+ and re-run." >&2
    exit 1
  fi
  GO_BIN_DIR="$(go env GOPATH)/bin"
  go install cosmossdk.io/simapp/simd@latest
  export PATH="$GO_BIN_DIR:$PATH"
  if ! command -v simd >/dev/null 2>&1; then
    echo "Failed to install simd. Aborting." >&2
    exit 1
  fi
  BINARY="simd"
fi

echo "Using binary: $BINARY"

# Record versions
{
  echo "\n--- Version Snapshot ($(date -Iseconds)) ---"
  echo "Binary: $BINARY"
  "$BINARY" version --long || "$BINARY" version || true
} >> "$FRAMEWORK_MD"

# Save for later scripts
echo "$BINARY" > "$OUT_DIR/binary_name.txt"

echo "build.sh complete"
