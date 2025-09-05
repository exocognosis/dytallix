#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# Lint all crates in the workspace using lint_one_crate.sh
# Usage: scripts/lint_all_crates.sh [--halt-on-error]
# Discovers crate names via cargo metadata (preferred) with a fallback parser.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"
SCRIPT_DIR="${ROOT_DIR}/scripts"
EVID_DIR="${ROOT_DIR}/launch-evidence/build-logs/lint"
mkdir -p "${EVID_DIR}" || true

HALT_ON_ERROR=0
for arg in "$@"; do
  case "$arg" in
    --halt-on-error) HALT_ON_ERROR=1 ;;
    -h|--help) echo "Usage: $0 [--halt-on-error]"; exit 0 ;;
    *) echo "Unknown arg: $arg" >&2; exit 1 ;;
  esac
done

have_jq=1; command -v jq >/dev/null 2>&1 || have_jq=0

crate_list_via_metadata() {
  if [ ${have_jq} -eq 1 ]; then
    cargo metadata --no-deps --format-version 1 2>/dev/null | \
      jq -r --arg root "${ROOT_DIR}/" '.packages[] | select(.manifest_path | startswith($root)) | .name'
  else
    # Minimal awk parser: capture last seen name then manifest_path; if path starts with root emit name.
    cargo metadata --no-deps --format-version 1 2>/dev/null | awk -v root="${ROOT_DIR}/" '
      /"name":/ { gsub(/^[ \t]*"name": "|",?$/ , ""); n=$0 }
      /"manifest_path":/ { mp=$0; gsub(/^[ \t]*"manifest_path": "|",?$/ , "", mp); if (index(mp, root)==1) { print n } }
    ' | sort -u
  fi
}

crate_list_fallback_find() {
  find . -name Cargo.toml -not -path "./target/*" -not -path "./node_modules/*" | while read -r f; do
    awk -F= 'BEGIN{found=0} /^\[package\]/ {pkg=1} pkg==1 && /^[Nn]ame[ ]*=/ { gsub(/"/ , "", $2); gsub(/ /, "", $2); print $2; exit }' "$f"
  done | sort -u
}

get_crates() {
  if crates=$(crate_list_via_metadata); then
    if [ -n "${crates}" ]; then
      printf '%s\n' "${crates}"; return 0
    fi
  fi
  crate_list_fallback_find
}

CRATES=$(get_crates)
if [ -z "${CRATES}" ]; then
  echo "error: could not discover any crates" >&2
  exit 2
fi

SUMMARY_MD="${EVID_DIR}/WORKSPACE_SUMMARY.md"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
PASS_CT=0
FAIL_CT=0

printf '# Workspace Lint Summary — %s\n\n' "${STAMP}" >"${SUMMARY_MD}"
printf '| Crate | Status | Errors | Warnings | Summary |\n' >>"${SUMMARY_MD}"
printf '|-------|--------|--------|----------|---------|\n' >>"${SUMMARY_MD}"

for crate in ${CRATES}; do
  echo "==> Linting ${crate}" >&2
  if bash "${SCRIPT_DIR}/lint_one_crate.sh" "${crate}"; then
    status=PASS
  else
    status=FAIL
  fi
  # Extract counts from LATEST.md
  LATEST_DIR="${EVID_DIR}/${crate}"
  LATEST_FILE="${LATEST_DIR}/LATEST.md"
  errors="?"; warnings="?"
  if [ -f "${LATEST_FILE}" ]; then
    header_line=$(grep -E '^# Clippy Summary' "${LATEST_FILE}" || true)
    # Header format: # Clippy Summary — <pkg> — Errors: X, Warnings: Y
    if printf '%s' "${header_line}" | grep -q 'Errors:'; then
      errors=$(printf '%s' "${header_line}" | sed -E 's/.*Errors: ([0-9]+), Warnings: ([0-9]+).*/\1/' ) || errors="?"
      warnings=$(printf '%s' "${header_line}" | sed -E 's/.*Errors: ([0-9]+), Warnings: ([0-9]+).*/\2/' ) || warnings="?"
    fi
    # More authoritative status line
    if grep -q '* Status: PASS' "${LATEST_FILE}" 2>/dev/null; then status=PASS; fi
  fi
  if [ "${status}" = "PASS" ]; then PASS_CT=$((PASS_CT+1)); else FAIL_CT=$((FAIL_CT+1)); fi
  summary_rel="lint/${crate}/LATEST.md"
  printf '| %s | %s | %s | %s | %s |\n' "${crate}" "${status}" "${errors}" "${warnings}" "${summary_rel}" >>"${SUMMARY_MD}"
  if [ ${HALT_ON_ERROR} -eq 1 ] && [ "${status}" = "FAIL" ]; then
    echo "-- halt-on-error: stopping after failing crate ${crate}" >&2
    break
  fi
done

echo >>"${SUMMARY_MD}"
printf 'PASS: %s  FAIL: %s\n' "${PASS_CT}" "${FAIL_CT}" >>"${SUMMARY_MD}"
printf '\nArtifacts root: %s\n' "${EVID_DIR}" >>"${SUMMARY_MD}"

echo "==> Workspace summary: ${SUMMARY_MD}" >&2

echo "PASS=${PASS_CT} FAIL=${FAIL_CT} SUMMARY=${SUMMARY_MD}" >&2
