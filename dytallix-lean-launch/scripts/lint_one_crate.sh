#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# Lint / Fix a single crate in the workspace.
# Usage: scripts/lint_one_crate.sh <PKG_NAME> [--max-retries=N]
# Behavior:
#   1. cargo check (fast fail)
#   2. clippy --fix (machine applicable) (Pass 1)
#   3. cargo fmt
#   4. strict clippy (deny warnings)
#   5. If still failing, up to N more remediation cycles: fix+fmt+strict clippy
# Produces logs and a human LATEST.md summary under launch-evidence/build-logs/lint/<crate>/

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"
EVID_DIR="${ROOT_DIR}/launch-evidence/build-logs/lint"
mkdir -p "${EVID_DIR}" || true

if ! command -v cargo >/dev/null 2>&1; then
  echo "error: cargo not found in PATH" >&2
  exit 2
fi

usage() { echo "Usage: $0 <PKG_NAME> [--max-retries=N]"; }

if [ $# -lt 1 ]; then usage; exit 1; fi
PKG="$1"; shift || true
MAX_RETRIES=2
for arg in "$@"; do
  case "$arg" in
    --max-retries=*) MAX_RETRIES="${arg#*=}" ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown arg: $arg" >&2; usage; exit 1 ;;
  esac
done

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
CRATE_DIR="${EVID_DIR}/${PKG}"
mkdir -p "${CRATE_DIR}" || true

log() { printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" | tee -a "${CRATE_DIR}/${STAMP}_run.log"; }

run_log() { # file cmd...
  local outfile="$1"; shift
  ("$@") >"${outfile}" 2>&1 || return $?
}

CHECK_LOG="${CRATE_DIR}/${STAMP}_check.log"
FIX_LOG="${CRATE_DIR}/${STAMP}_fix.log"
FMT_LOG="${CRATE_DIR}/${STAMP}_fmt.log"
FINAL_LOG="${CRATE_DIR}/${STAMP}_final.log"

STATUS=FAIL

log "==> Linting crate: ${PKG} (retries max=${MAX_RETRIES})"

# Pass 0: cargo check (fast fail but we keep going capturing rc)
CHECK_RC=0
if ! run_log "${CHECK_LOG}" cargo check -p "${PKG}" --all-targets; then CHECK_RC=$?; fi
log "cargo check exit=${CHECK_RC}"

attempt=0
final_rc=1

run_fix_cycle() {
  local cyc="$1"
  log "-- Cycle ${cyc}: clippy --fix"
  # Pass 1 style fix; we allow failures (continue)
  cargo clippy --fix -p "${PKG}" --all-targets --allow-dirty --allow-staged -- -A clippy::restriction >>"${FIX_LOG}" 2>&1 || true
  log "-- Cycle ${cyc}: cargo fmt"
  cargo fmt --all >>"${FMT_LOG}" 2>&1 || true
  log "-- Cycle ${cyc}: strict clippy verify"
  if cargo clippy -p "${PKG}" --all-targets --all-features -- -D warnings >"${FINAL_LOG}" 2>&1; then
    final_rc=0; return 0
  else
    final_rc=$?; return 1
  fi
}

# Initial fix/verify cycle (cycle 1)
: >"${FIX_LOG}"; : >"${FMT_LOG}"; : >"${FINAL_LOG}" || true
attempt=1
run_fix_cycle "${attempt}" || true

# Extra remediation cycles if still failing
while [ ${final_rc} -ne 0 ] && [ ${attempt} -le ${MAX_RETRIES} ]; do
  attempt=$((attempt+1))
  run_fix_cycle "${attempt}" || true
  [ ${final_rc} -eq 0 ] && break
done

if [ ${final_rc} -eq 0 ]; then STATUS=PASS; fi

# Count errors & warnings from FINAL_LOG
ERRORS=$(grep -cE '^[[:space:]]*error(:|\[)' "${FINAL_LOG}" 2>/dev/null || true)
WARNINGS=$(grep -cE '^[[:space:]]*warning(:|\[)' "${FINAL_LOG}" 2>/dev/null || true)

LATEST_MD="${CRATE_DIR}/LATEST.md"
if [ -f "${LATEST_MD}" ]; then mv "${LATEST_MD}" "${CRATE_DIR}/LATEST_${STAMP}.md" || true; fi

# Attempt a tiny heuristic summary of improvements (optional)
TAKEAWAYS=""
if grep -q "unused import" "${FIX_LOG}" 2>/dev/null; then TAKEAWAYS+="- Removed unused imports\n"; fi
if grep -q "redundant clone" "${FINAL_LOG}" 2>/dev/null; then TAKEAWAYS+="- Identified redundant clones (consider .clone() removals)\n"; fi
if grep -q "unwrap" "${FINAL_LOG}" 2>/dev/null; then TAKEAWAYS+="- Remaining unwrap calls flagged; evaluate error handling\n"; fi
if [ -z "${TAKEAWAYS}" ]; then TAKEAWAYS="- No specific high-level patterns auto-detected.\n"; fi

{
  echo "# Clippy Summary — ${PKG} — Errors: ${ERRORS}, Warnings: ${WARNINGS}";
  echo;
  echo "* Status: ${STATUS}";
  echo "* Timestamp: ${STAMP}";
  echo "* cargo check rc: ${CHECK_RC}";
  echo "* Final clippy rc: ${final_rc}";
  echo "* Attempts (incl initial): ${attempt}";
  echo;
  echo "## Key Takeaways";
  printf '%b' "${TAKEAWAYS}";
  echo;
  echo "## Log Files";
  echo "- Check: ${CHECK_LOG}";
  echo "- Fix: ${FIX_LOG}";
  echo "- Fmt: ${FMT_LOG}";
  echo "- Final: ${FINAL_LOG}";
} >"${LATEST_MD}"

log "==> ${PKG}: Status=${STATUS} Errors=${ERRORS} Warnings=${WARNINGS} (attempts=${attempt})"

[ ${final_rc} -eq 0 ]
