#!/usr/bin/env bash
set -euo pipefail

# Auto-fix Clippy lints across all crates in the workspace.
# - Applies machine-applicable fixes using nightly cargo clippy --fix
# - Runs twice to catch cascading suggestions
# - Verifies with a final strict clippy pass (denies warnings)
# - Writes detailed logs under launch-evidence/build-logs
#
# Env vars:
#   FEATURES: cargo feature flags (default: --all-features)
#   BROKEN:   set to 1 to allow applying fixes even if code is temporarily broken
#   TOOLCHAIN: rust toolchain (default: nightly)
#
# Usage:
#   ./scripts/fix_clippy_all.sh

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

FEATURES_DEFAULT="--all-features"
FEATURES="${FEATURES:-$FEATURES_DEFAULT}"
TOOLCHAIN="${TOOLCHAIN:-nightly}"
ALLOW_BROKEN="${BROKEN:-0}"

LOG_DIR="${ROOT_DIR}/launch-evidence/build-logs"
ARCHIVE_DIR="${LOG_DIR}/archive"
mkdir -p "${LOG_DIR}" "${ARCHIVE_DIR}"

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
FIX_LOG="${LOG_DIR}/clippy.fix.${stamp}.log"
FIX_MD="${LOG_DIR}/CLIPPY_FIX_${stamp}.md"

echo "==> Workspace root: ${ROOT_DIR}"
echo "==> Using toolchain: +${TOOLCHAIN}"
echo "==> Feature flags: ${FEATURES}"

# Ensure toolchain is available
if ! command -v rustup >/dev/null 2>&1; then
  echo "error: rustup not found; install Rust toolchains first" >&2
  exit 2
fi

if ! rustup run "${TOOLCHAIN}" cargo -V >/dev/null 2>&1; then
  echo "==> Installing toolchain '${TOOLCHAIN}' (once)"
  rustup toolchain install "${TOOLCHAIN}"
fi

FIX_FLAGS=("+${TOOLCHAIN}" clippy --fix -Z unstable-options --workspace --all-targets)
VERIFY_CMD=(cargo clippy --workspace --all-targets ${FEATURES} -- -D warnings)

if [[ "${FEATURES}" != "" ]]; then
  FIX_FLAGS+=( ${FEATURES} )
fi

# Allow editing even with local changes
FIX_FLAGS+=(--allow-dirty --allow-staged)

# Optionally allow broken code when applying fixes
if [[ "${ALLOW_BROKEN}" == "1" ]]; then
  FIX_FLAGS+=(--broken-code)
fi

echo "==> Applying Clippy fixes (pass 1)"
set +e
cargo "${FIX_FLAGS[@]}" -- -D warnings >"${FIX_LOG}" 2>&1
pass1=$?
set -e

echo "==> Applying Clippy fixes (pass 2)"
set +e
cargo "${FIX_FLAGS[@]}" -- -D warnings >>"${FIX_LOG}" 2>&1
pass2=$?
set -e

echo "==> Verifying with strict clippy"
set +e
"${VERIFY_CMD[@]}" >>"${FIX_LOG}" 2>&1
verify=$?
set -e

# Summarize results into a Markdown report
total_errors=$(grep -cE '^[[:space:]]*error(\[|:)' "${FIX_LOG}" || true)
total_warnings=$(grep -cE '^[[:space:]]*warning(\[|:)' "${FIX_LOG}" || true)

{
  echo "# Clippy Auto-Fix Report"
  echo "- Timestamp: ${stamp}"
  echo "- Toolchain: ${TOOLCHAIN}"
  echo "- Features: ${FEATURES}"
  echo "- Allow Broken: ${ALLOW_BROKEN}"
  echo "- Pass1 Exit: ${pass1}"
  echo "- Pass2 Exit: ${pass2}"
  echo "- Verify Exit: ${verify}"
  echo "- Errors: ${total_errors}"
  echo "- Warnings: ${total_warnings}"
  echo
  echo '```'
  cat "${FIX_LOG}"
  echo '```'
} >"${FIX_MD}"

echo "==> Logs: ${FIX_LOG}"
echo "==> Report: ${FIX_MD}"

if [[ ${verify} -ne 0 ]]; then
  echo "error: clippy verification failed (exit ${verify}). See report above." >&2
  exit ${verify}
fi

echo "==> Clippy fixes applied and verified successfully."

