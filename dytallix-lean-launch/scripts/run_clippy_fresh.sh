#!/usr/bin/env bash
set -euo pipefail

ROOT="${HOME}/dytallix/dytallix-lean-launch"
OUT="${ROOT}/launch-evidence/build-logs"
ARCHIVE="${OUT}/archive"
mkdir -p "${OUT}" "${ARCHIVE}"

PREV_MD="${OUT}/CLIPPY_FULL.md"
PREV_LOG="${OUT}/clippy.full.log"

# Archive old report
if [[ -f "${PREV_MD}" ]]; then
  stamp="$(date -r "${PREV_MD}" +%Y%m%dT%H%M%SZ 2>/dev/null || date -u +%Y%m%dT%H%M%SZ)"
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

# Count errors and warnings from the log
err_count=$(grep -c "error\[" "${PREV_LOG}" || true)
warn_count=$(grep -c "warning\[" "${PREV_LOG}" || true)

# Prepend counts to new .md
{
  echo "# Clippy Report — Errors: ${err_count}, Warnings: ${warn_count}"
  echo
  cat "${PREV_LOG}"
} > "${OUT}/CLIPPY_FULL.md"

echo "Clippy exit code: ${clippy_exit}"
echo "==> Latest Clippy report: ${OUT}/CLIPPY_FULL.md"

if command -v open >/dev/null 2>&1; then
  open "${OUT}/CLIPPY_FULL.md" || true
else
  less +G "${OUT}/CLIPPY_FULL.md"
fi

exit "${clippy_exit}"