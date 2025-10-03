#!/usr/bin/env bash
# Fetch NIST Dilithium Round3 KAT (ref), import to curated JSON, pin checksum, and run tests.
# Usage:
#   bash scripts/fetch_and_import_dilithium3_kat.sh [optional_out_json] [optional_limit]
# Notes:
#   - Builds only the portable "ref" KAT generator (no AVX2). Works on macOS (arm64/x86_64) and Linux.
#   - Requires: git, make, clang (or cc), node, npm. On macOS, OpenSSL via Homebrew is recommended.
#   - Set KAT_WRITE_PIN=1 (default in this script) to write a .sha256 pin next to the JSON.
set -euo pipefail

REPO_URL="https://github.com/pq-crystals/dilithium.git"
LIMIT="${2:-}"  # optional cap on entries

# Resolve paths relative to this script (packages/pqc)
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd -P)"
PKC_DIR="$(cd -- "${SCRIPT_DIR}/.." &>/dev/null && pwd -P)"  # packages/pqc
OUT_JSON_DEFAULT="${PKC_DIR}/test/vectors/dilithium3.kat.min.json"
OUT_JSON="${1:-${OUT_JSON_DEFAULT}}"

# Temp clone dir
TMP_BASE="${TMPDIR:-/tmp}"
CLONE_DIR="${TMP_BASE%/}/dilithium-kat-$$"
cleanup() { rm -rf "$CLONE_DIR" 2>/dev/null || true; }
trap cleanup EXIT

# Basic prerequisites
need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing dependency: $1" >&2; exit 2; }; }
need git; need make; need node; need npm; need sed
CC_BIN="${CC:-cc}"
if ! command -v "$CC_BIN" >/dev/null 2>&1; then echo "Missing C compiler (cc/clang)" >&2; exit 2; fi

# Clone (shallow)
echo "Cloning Dilithium repo (shallow)..."
git clone --depth 1 "$REPO_URL" "$CLONE_DIR" 1>/dev/null

# Build ref KAT generator (DILITHIUM_MODE=3)
echo "Building ref/nistkat/PQCgenKAT_sign3..."
(
  cd "$CLONE_DIR/ref"
  EXTRA_NISTFLAGS=""
  EXTRA_LDFLAGS=""
  # Prefer pkg-config if available
  if command -v pkg-config >/dev/null 2>&1; then
    PC_CFLAGS="$(pkg-config --cflags openssl 2>/dev/null || true)"
    PC_LIBS="$(pkg-config --libs-only-L openssl 2>/dev/null || true)"  # only -L paths
    EXTRA_NISTFLAGS+=" ${PC_CFLAGS}"
    EXTRA_LDFLAGS+=" ${PC_LIBS}"
  fi
  # macOS Homebrew OpenSSL (fallback)
  if [[ "$(uname)" == "Darwin" ]] && command -v brew >/dev/null 2>&1; then
    OPENSSL_PREFIX="$(brew --prefix openssl@3 2>/dev/null || true)"
    if [[ -n "$OPENSSL_PREFIX" && -d "$OPENSSL_PREFIX" ]]; then
      EXTRA_NISTFLAGS+=" -I${OPENSSL_PREFIX}/include"
      EXTRA_LDFLAGS+=" -L${OPENSSL_PREFIX}/lib"
    fi
  fi
  # Run make, injecting include paths via NISTFLAGS and lib paths via LDFLAGS
  make -s NISTFLAGS="${EXTRA_NISTFLAGS} ${NISTFLAGS:-}" LDFLAGS="${EXTRA_LDFLAGS} ${LDFLAGS:-}" nistkat/PQCgenKAT_sign3
)

# Generate KAT .rsp (writes PQCsignKAT_Dilithium3.rsp in ref/)
echo "Generating KAT response file (PQCsignKAT_Dilithium3.rsp)..."
(
  cd "$CLONE_DIR/ref"
  ./nistkat/PQCgenKAT_sign3 >/dev/null
)

# Locate .rsp
RSP_PATH="${CLONE_DIR}/ref/PQCsignKAT_Dilithium3.rsp"
if [[ ! -s "$RSP_PATH" ]]; then
  echo "KAT .rsp not found or empty: $RSP_PATH" >&2
  exit 1
fi

# Import into curated JSON and write pin
mkdir -p "$(dirname "$OUT_JSON")"
echo "Importing and pinning to: $OUT_JSON"
KAT_WRITE_PIN=1 node "${PKC_DIR}/scripts/kat_import_from_rsp.js" "$RSP_PATH" "$OUT_JSON" ${LIMIT:+"$LIMIT"}

# Show pin
PIN_FILE="${OUT_JSON%.json}.sha256"
if [[ -s "$PIN_FILE" ]]; then
  echo "Pinned sha256: $(tr -d '\n\r ' < "$PIN_FILE")"
else
  echo "No pin file generated." >&2
fi

# Build and run vector tests for @dyt/pqc
(
  cd "$PKC_DIR"
  echo "Installing deps..."; npm ci --silent || npm install --silent
  echo "Building package..."; npm run -s build
  echo "Running KAT tests..."; node --test test/dilithium3.vectors.test.js
)

echo "Done."
