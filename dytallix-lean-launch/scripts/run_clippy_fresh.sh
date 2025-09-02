#!/usr/bin/env bash
set -euo pipefail

ROOT="${HOME}/dytallix/dytallix-lean-launch"
OUT="${ROOT}/launch-evidence/build-logs"
ARCHIVE="${OUT}/archive"
mkdir -p "${OUT}" "${ARCHIVE}"

# Define timestamp (was previously missing leading to empty archive name)
stamp="$(date -u +%Y%m%dT%H%M%SZ)"

PREV_MD="${OUT}/CLIPPY_FULL.md"
PREV_LOG="${OUT}/clippy.full.log"

# Allow override of the target file whose error count we want to surface.
# Default is the crypto module referenced in the user request.
TARGET_FILE_REL_DEFAULT="node/src/crypto/mod.rs"
TARGET_FILE_REL="${TARGET_FILE_REL:-$TARGET_FILE_REL_DEFAULT}"
TARGET_FILE_ABS="${ROOT}/${TARGET_FILE_REL}"

# Archive old report if present
if [[ -f "${PREV_MD}" ]]; then
  mv "${PREV_MD}" "${ARCHIVE}/CLIPPY_FULL_${stamp}.md"
fi
rm -f "${PREV_LOG}"

cd "${ROOT}"

echo "==> Running cargo clippy (fresh)"
TMP_LOG="$(mktemp "${OUT}/clippy.full.log.tmp.XXXXXX")"
set +e
cargo clippy --workspace --all-targets --all-features -- -D warnings >"${TMP_LOG}" 2>&1
clippy_exit=$?
set -e
mv "${TMP_LOG}" "${PREV_LOG}"

# Total error & warning counts (lines starting with error[ / error: etc.)
err_count=$(grep -cE '^[[:space:]]*error(\[|:)' "${PREV_LOG}" || true)
warn_count=$(grep -cE '^[[:space:]]*warning(\[|:)' "${PREV_LOG}" || true)

# Derive file-specific error count: count unique primary spans referencing TARGET_FILE within error blocks.
# We scan: when an error header appears, mark in_error=1 until next blank line; if a primary span line (" --> path:line:col")
# matches the target file while in_error, increment and end that error block accounting (avoid double counting secondary spans).
file_err_count=$(awk -v tf="${TARGET_FILE_ABS}" '
  BEGIN { in_error=0; c=0 }
  /^[[:space:]]*error(\[|:)/ { in_error=1; counted=0; next }
  /^[[:space:]]*warning(\[|:)/ { in_error=0; next }
  NF==0 { in_error=0; next }
  in_error && $1=="-->" {
     if (index($0, tf) > 0 && counted==0) { c++; counted=1; }
     next
  }
  END { print c }' "${PREV_LOG}" )

# Compose header with both total and target-file specific counts
{
  echo "# Clippy Report — Errors: ${err_count}, Warnings: ${warn_count}"   
  echo "# Target File (${TARGET_FILE_REL}) Error Count: ${file_err_count}" 
  echo "# Generated: ${stamp} (exit=${clippy_exit})"
  echo
  cat "${PREV_LOG}"
} > "${PREV_MD}"

echo "==> Latest Clippy report: ${PREV_MD}"
echo "    Total Errors: ${err_count}  Warnings: ${warn_count}  Target File Errors (${TARGET_FILE_REL}): ${file_err_count}"

# Optionally open the report
if command -v open >/dev/null 2>&1; then
  open "${PREV_MD}" || true
else
  echo "(Open ${PREV_MD} manually if desired)"
fi

exit "${clippy_exit}"