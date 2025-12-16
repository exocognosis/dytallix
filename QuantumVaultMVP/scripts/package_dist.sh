#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT_DIR/dist"

mkdir -p "$OUT_DIR"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
TAR="$OUT_DIR/QuantumVaultMVP-$STAMP.tgz"

# Create a client-friendly bundle (excludes bulky build artifacts)
tar \
  --exclude='**/node_modules' \
  --exclude='**/.next' \
  --exclude='**/dist' \
  --exclude='**/.DS_Store' \
  -czf "$TAR" \
  -C "$(dirname "$ROOT_DIR")" \
  "$(basename "$ROOT_DIR")"

echo "Wrote $TAR"
