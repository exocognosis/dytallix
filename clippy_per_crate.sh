#!/usr/bin/env bash
# Run Clippy on each workspace member individually, failing on any warnings (promoted to errors).
# Creates per-crate log files under clippy_logs/.
# Optional env:
#   CLIPPY_ARGS   Extra args passed before the "--" (e.g. "--all-features")
#   CLIPPY_LINTS  Extra lints after the "--" (e.g. "-W clippy::pedantic")
#   PARALLEL      Number of parallel jobs (default 1)
#
# Usage: ./clippy_per_crate.sh

set -euo pipefail

ROOT_DIR=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$ROOT_DIR"

LOG_DIR="$ROOT_DIR/clippy_logs"
mkdir -p "$LOG_DIR"

PARALLEL="${PARALLEL:-1}"
CLIPPY_ARGS="${CLIPPY_ARGS:-"--all-targets --all-features"}"
CLIPPY_LINTS="${CLIPPY_LINTS:-"-D warnings"}"

# Extract workspace members robustly from Cargo.toml (simple parser good enough for standard formatting)
WORKSPACE_MEMBERS_RAW=$(awk '
  $0 ~ /^members[[:space:]]*=/ {in_list=1; next}
  in_list {
    if ($0 ~ /\]/) { in_list=0; next }
    gsub(/#.*/,"")
    gsub(/[",]/," ")
    for (i=1; i<=NF; i++) if ($i != "") print $i
  }
' Cargo.toml | sed '/^$/d')
CRATES=()
if type -t mapfile >/dev/null 2>&1; then
  # Newer bash
  while IFS= read -r line; do CRATES+=("$line"); done < <(printf '%s\n' "$WORKSPACE_MEMBERS_RAW")
else
  # Portable fallback for old macOS bash (no mapfile)
  while IFS= read -r line; do [ -n "$line" ] && CRATES+=("$line"); done <<EOF
$WORKSPACE_MEMBERS_RAW
EOF
fi

if [[ ${#CRATES[@]} -eq 0 ]]; then
  echo "No workspace members found." >&2
  exit 1
fi

echo "Discovered ${#CRATES[@]} crates:" >&2
printf '  - %s\n' "${CRATES[@]}"

echo "Logs will be written to: $LOG_DIR"

declare -A PIDS
STATUS=0

run_clippy() {
  local crate="$1"
  local log_file="$LOG_DIR/${crate//\//_}.log"
  (
    set -e
    cd "$ROOT_DIR/$crate"
    echo "[START] $crate" >"$log_file"
    if cargo clippy $CLIPPY_ARGS -- $CLIPPY_LINTS ${EXTRA_LINTS:-} >>"$log_file" 2>&1; then
      echo "[OK]    $crate" | tee -a "$log_file"
    else
      echo "[FAIL]  $crate" | tee -a "$log_file"
      exit 1
    fi
  )
}

if [[ "$PARALLEL" -le 1 ]]; then
  for c in "${CRATES[@]}"; do
    if ! run_clippy "$c"; then
      STATUS=1
    fi
  done
else
  echo "Running up to $PARALLEL jobs in parallel"
  running=0
  for c in "${CRATES[@]}"; do
    run_clippy "$c" &
    PIDS["$!"]="$c"
    ((running++))
    if [[ $running -ge $PARALLEL ]]; then
      wait -n || STATUS=1
      ((running--))
    fi
  done
  # Wait for remaining
  for pid in "${!PIDS[@]}"; do
    wait "$pid" || STATUS=1
  done
fi

# Summary
echo
echo "Clippy summary:" 
for c in "${CRATES[@]}"; do
  log_file="$LOG_DIR/${c//\//_}.log"
if [[ $STATUS -ne 0 ]]; then
  echo "One or more crates failed clippy. See logs above (stored in $LOG_DIR)." >&2
else
  echo "All crates passed clippy." >&2
fi
exit $STATUS
