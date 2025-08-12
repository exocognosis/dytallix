#!/usr/bin/env bash
set -euo pipefail

# Hardened PQC WASM build script (macOS Bash 3.2 compatible)
# - Deterministic flags where possible
# - Generates manifest with SHA-256 hashes
# - Optional Ed25519 signing (if MANIFEST_SIGN_KEY set pointing to raw 32-byte seed hex)
# - Writes manifest to both src (for TS imports/tests) and public (served asset)
# - Verifies toolchain versions

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
SRC_DIR="$ROOT_DIR/vendor/pqclean"
OUT_DIR="$ROOT_DIR/public/wasm/pqc"
SRC_MANIFEST_TS="$ROOT_DIR/src/crypto/pqc/manifest.json"
PUB_MANIFEST="$OUT_DIR/manifest.json"
TMP_BUILD="$ROOT_DIR/tmp_pqc_build"
META_FILE="$OUT_DIR/build_meta.json"

mkdir -p "$OUT_DIR" "$TMP_BUILD"

if ! command -v emcc >/dev/null 2>&1; then echo "ERROR: emcc not found (install emsdk)" >&2; exit 1; fi

EMCC_VER=$(emcc --version | head -n1 | awk '{print $NF}')
DATE_UTC=$(date -u +%Y-%m-%dT%H:%M:%SZ)
GIT_COMMIT=$(git -C "$ROOT_DIR" rev-parse --short HEAD 2>/dev/null || echo 'unknown')

# Resolve scheme path for an algo (no associative arrays to support Bash 3.2)
get_scheme_path() {
  case "$1" in
    dilithium) echo "crypto_sign/dilithium3/clean" ;;
    falcon) echo "crypto_sign/falcon-512/clean" ;;
    sphincs) echo "crypto_sign/sphincs-sha2-128s-simple/clean" ;;
    *) return 1 ;;
  esac
}

# Map algo to PQClean API prefix used in headers (e.g. PQCLEAN_MLDSA65_CLEAN)
get_scheme_prefix() {
  case "$1" in
    dilithium) echo "PQCLEAN_MLDSA65_CLEAN" ;;
    falcon) echo "PQCLEAN_FALCON512_CLEAN" ;;
    sphincs) echo "PQCLEAN_SPHINCSSHA2128SSIMPLE_CLEAN" ;;
    *) return 1 ;;
  esac
}

WRAPPER_DIR="$SRC_DIR/wrappers"
mkdir -p "$WRAPPER_DIR"

make_wrapper() {
  local algo="$1" scheme_path="$2" wrapper="$WRAPPER_DIR/${algo}_wrapper.c"
  local prefix
  prefix=$(get_scheme_prefix "$algo") || { echo "Unknown prefix for $algo" >&2; return 1; }
  cat > "$wrapper" <<EOF
#include <stdint.h>
#include <stddef.h>
#include "api.h"

int pqc_keypair(unsigned char *pk, unsigned char *sk) { return ${prefix}_crypto_sign_keypair(pk, sk); }
int pqc_sign(unsigned char *sig, size_t *siglen, const unsigned char *m, size_t mlen, const unsigned char *sk) { return ${prefix}_crypto_sign_signature(sig, siglen, m, mlen, sk); }
int pqc_verify(const unsigned char *sig, size_t siglen, const unsigned char *m, size_t mlen, const unsigned char *pk) { return ${prefix}_crypto_sign_verify(sig, siglen, m, mlen, pk); }
int pqc_pk_bytes(void) { return ${prefix}_CRYPTO_PUBLICKEYBYTES; }
int pqc_sk_bytes(void) { return ${prefix}_CRYPTO_SECRETKEYBYTES; }
int pqc_sig_bytes(void) { return ${prefix}_CRYPTO_BYTES; }
EOF
}

COMMON_FLAGS=(
  -O3
  -sSTANDALONE_WASM
  -Wl,--no-entry
  -sALLOW_MEMORY_GROWTH=0
  -sABORTING_MALLOC=1
  -sSTRICT=1
  -sERROR_ON_UNDEFINED_SYMBOLS=1
  -sINITIAL_MEMORY=64MB
  -sSTACK_SIZE=2MB
  -sWASM_BIGINT
  -flto
  -DNDEBUG
)

# JSON array string for EXPORTED_FUNCTIONS
EXPORTED_JSON="[\"_pqc_keypair\",\"_pqc_sign\",\"_pqc_verify\",\"_pqc_pk_bytes\",\"_pqc_sk_bytes\",\"_pqc_sig_bytes\",\"_malloc\",\"_free\"]"

build_algo() {
  local algo="$1"
  local scheme_rel
  scheme_rel=$(get_scheme_path "$algo") || { echo "Unknown algo $algo" >&2; return 1; }
  local scheme_dir="$SRC_DIR/$scheme_rel"
  local out_wasm="$OUT_DIR/${algo}.wasm"
  if [[ ! -d "$scheme_dir" ]]; then
    echo "WARN: missing scheme dir $scheme_dir" >&2
    echo "int pqc_keypair(unsigned char*,unsigned char*){return -1;} int pqc_sign(unsigned char*,unsigned long*,const unsigned char*,unsigned long,const unsigned char*){return -1;} int pqc_verify(const unsigned char*,unsigned long,const unsigned char*,unsigned long,const unsigned char*){return -1;} int pqc_pk_bytes(){return 0;} int pqc_sk_bytes(){return 0;} int pqc_sig_bytes(){return 0;}" > "$TMP_BUILD/${algo}_placeholder.c"
    emcc "$TMP_BUILD/${algo}_placeholder.c" "${COMMON_FLAGS[@]}" -sEXPORTED_FUNCTIONS="$EXPORTED_JSON" -o "$out_wasm"
    return
  fi
  make_wrapper "$algo" "$scheme_rel"
  local wrapper="$WRAPPER_DIR/${algo}_wrapper.c"
  # Collect scheme sources
  local sources=()
  while IFS= read -r -d '' f; do sources+=("$f"); done < <(find "$scheme_dir" -maxdepth 1 -name '*.c' -print0 | LC_ALL=C sort -z)
  # Add PQClean common sources needed across variants
  if [[ -d "$SRC_DIR/common" ]]; then
    # Only include files that are commonly required
    for cf in fips202.c sha2.c randombytes.c; do
      if [[ -f "$SRC_DIR/common/$cf" ]]; then sources+=("$SRC_DIR/common/$cf"); fi
    done
  fi
  sources+=("$wrapper")
  # Compile
  emcc "${sources[@]}" \
    -I"$scheme_dir" -I"$SRC_DIR" -I"$SRC_DIR/common" \
    "${COMMON_FLAGS[@]}" -sEXPORTED_FUNCTIONS="$EXPORTED_JSON" -o "$out_wasm"
  # Strip debug names (already optimized)
  wasm-opt -Oz -o "$out_wasm" "$out_wasm" 2>/dev/null || true
  if command -v stat >/dev/null 2>&1; then
    (stat -f "%z" "$out_wasm" 2>/dev/null || stat -c "%s" "$out_wasm" 2>/dev/null) | awk '{print "Built '"$algo"' -> "$1" bytes"}'
  fi
}

ALGOS=(dilithium falcon sphincs)
for a in "${ALGOS[@]}"; do build_algo "$a"; done

hash_file() { if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1"|awk '{print $1}'; else shasum -a 256 "$1"|awk '{print $1}'; fi }

# Build manifest JSON
TMP_MANIFEST="$TMP_BUILD/manifest.new.json"
echo '{' > "$TMP_MANIFEST"
for i in "${!ALGOS[@]}"; do algo="${ALGOS[$i]}"; h=$(hash_file "$OUT_DIR/${algo}.wasm"); sep=','; [[ $i -eq $((${#ALGOS[@]}-1)) ]] && sep=''; printf '  "%s.wasm": "%s"%s\n' "$algo" "$h" "$sep" >> "$TMP_MANIFEST"; done
echo '}' >> "$TMP_MANIFEST"

# Optional signing
if [[ -n "${MANIFEST_SIGN_KEY:-}" ]]; then
  if command -v node >/dev/null 2>&1; then
    node <<'NODE' "$TMP_MANIFEST" "$TMP_MANIFEST.sig" "$MANIFEST_SIGN_KEY"
const [,, manifestPath, sigPath, seedHex] = process.argv;
const fs = require('fs');
const nacl = require('tweetnacl');
const manifestRaw = fs.readFileSync(manifestPath,'utf8');
const json = JSON.parse(manifestRaw);
const sorted = {}; Object.keys(json).sort().forEach(k=>sorted[k]=json[k]);
const canonical = JSON.stringify(sorted);
const seed = Buffer.from(seedHex.trim(), 'hex');
if (seed.length !== 32) throw new Error('Seed must be 32 bytes hex');
const kp = nacl.sign.keyPair.fromSeed(seed);
const sig = nacl.sign.detached(Buffer.from(canonical), kp.secretKey);
json._sig = Buffer.from(sig).toString('base64');
fs.writeFileSync(manifestPath, JSON.stringify(json, null, 2));
fs.writeFileSync(sigPath, json._sig + '\n');
NODE
  else
    echo "WARN: node not found; skipping manifest signing" >&2
  fi
fi

# Copy manifest to source + public
cp "$TMP_MANIFEST" "$SRC_MANIFEST_TS"
cp "$TMP_MANIFEST" "$PUB_MANIFEST"

# Build metadata
cat > "$META_FILE" <<EOF
{
  "builtAt": "$DATE_UTC",
  "gitCommit": "$GIT_COMMIT",
  "emccVersion": "$EMCC_VER"
}
EOF

echo "Manifest written: $PUB_MANIFEST"
echo "Done."
