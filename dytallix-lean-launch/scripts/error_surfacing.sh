#!/usr/bin/env bash
# Fail fast, print commands
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="${ROOT}/launch-evidence/build-logs"
SUMMARY="${LOG_DIR}/ERRORS_SUMMARY.md"

mkdir -p "${LOG_DIR}"

log_step() { echo "==> $1"; }
run_step() {
  local name="$1"; shift
  local out="${LOG_DIR}/${name}.log"
  log_step "Running ${name}"
  # Run the command, tee output, capture exit
  if ( "$@" 2>&1 | tee "${out}" ); then
    echo "✅ ${name} OK" | tee -a "${LOG_DIR}/SUCCESS.md"
    return 0
  else
    local code=$?
    echo "❌ ${name} FAILED (exit ${code})" | tee -a "${LOG_DIR}/SUCCESS.md"
    # Append a concise summary section
    {
      echo ""
      echo "## ${name} FAILED (exit ${code})"
      echo ""
      echo "Last 80 lines of ${out}:"
      echo '```'
      tail -n 80 "${out}" || true
      echo '```'
      echo ""
    } >> "${SUMMARY}"
    return ${code}
  fi
}

# Clean previous success marker
: > "${LOG_DIR}/SUCCESS.md"
# Start a fresh summary (don’t fail if it doesn’t exist)
: > "${SUMMARY}"

# Detect tools (best-effort)
RUSTC="$(command -v rustc || true)"
CARGO="$(command -v cargo || true)"
NODE="$(command -v node || true)"
NPM="$(command -v npm || true)"
DOCKER="$(command -v docker || true)"

{
  echo "# Build & Test Environment"
  echo "- rustc: ${RUSTC:-missing}"
  echo "- cargo: ${CARGO:-missing}"
  echo "- node: ${NODE:-missing}"
  echo "- npm: ${NPM:-missing}"
  echo "- docker: ${DOCKER:-missing}"
  echo "- date: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
} >> "${LOG_DIR}/SUCCESS.md"

# Steps (skip gracefully if tool missing)
if [[ -n "${CARGO}" ]]; then
  run_step fmt_check   bash -lc "cd '${ROOT}' && cargo fmt -- --check"
  run_step clippy      bash -lc "cd '${ROOT}' && cargo clippy --workspace --all-targets -- -D warnings"
  run_step cargo_check bash -lc "cd '${ROOT}' && cargo check --workspace"
  run_step cargo_test  bash -lc "cd '${ROOT}' && cargo test --workspace --no-fail-fast -- --nocapture"
else
  echo "⚠️ cargo not found; skipping Rust steps" | tee -a "${LOG_DIR}/SUCCESS.md"
fi

if [[ -n "${NPM}" ]]; then
  # Skip if no package.json
  if [[ -f "${ROOT}/package.json" || -f "${ROOT}/dytallix-lean-launch/package.json" ]]; then
    run_step web_build bash -lc "cd '${ROOT}' && ( [[ -f package.json ]] && npm ci && npm run build ) || ( cd dytallix-lean-launch && npm ci && npm run build )"
  else
    echo "⚠️ package.json not found; skipping web build" | tee -a "${LOG_DIR}/SUCCESS.md"
  fi
fi

if [[ -n "${DOCKER}" ]]; then
  run_step docker_build bash -lc "cd '${ROOT}' && docker build -t dytallix/node:dev ."
else
  echo "⚠️ docker not found; skipping docker build" | tee -a "${LOG_DIR}/SUCCESS.md"
fi

# Finish: if summary has content, fail the script
if [[ -s "${SUMMARY}" ]]; then
  echo ""
  echo "================== FAILURE SUMMARY =================="
  cat "${SUMMARY}"
  echo "====================================================="
  exit 1
else
  echo "🎉 All steps passed. Logs in ${LOG_DIR}"
fi