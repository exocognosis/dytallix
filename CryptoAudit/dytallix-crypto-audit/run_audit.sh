#!/bin/bash
# Dytallix Cryptographic Audit Execution Script
# Run this script to build and execute the audit

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AUDIT_DIR="${SCRIPT_DIR}"
OUTPUT_DIR="/Users/rickglenn/Desktop/dytallix/CryptoAudit/01052026Audit"
TARGET_DIR="/Users/rickglenn/Desktop/dytallix/dytallix-fast-launch"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     DYTALLIX CRYPTOGRAPHIC AUDIT - BUILD & RUN                 ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check for Rust
if ! command -v cargo &> /dev/null; then
    echo "ERROR: Rust/Cargo not found. Please install Rust from https://rustup.rs"
    exit 1
fi

echo "[1/4] Cleaning previous build artifacts..."
cd "${AUDIT_DIR}"
cargo clean 2>/dev/null || true

echo "[2/4] Building audit tool in release mode..."
cargo build --release

echo "[3/4] Creating output directory..."
mkdir -p "${OUTPUT_DIR}"

echo "[4/4] Running cryptographic audit..."
echo ""

# Run the audit
./target/release/dytallix-audit \
    --target "${TARGET_DIR}" \
    --output "${OUTPUT_DIR}" \
    --seed 20260105

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    AUDIT COMPLETE                              ║"
echo "╠════════════════════════════════════════════════════════════════╣"
echo "║  Reports: ${OUTPUT_DIR}/reports/"
echo "║  Artifacts: ${OUTPUT_DIR}/artifacts/"
echo "║  Metrics: ${OUTPUT_DIR}/metrics/"
echo "╚════════════════════════════════════════════════════════════════╝"
