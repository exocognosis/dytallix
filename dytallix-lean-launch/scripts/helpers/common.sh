#!/usr/bin/env bash
# common.sh - shared helpers for evidence orchestrator
# Quality Gates: POSIX-sh compatible subset using bash for arrays; passes shellcheck.
# shellcheck shell=bash
set -euo pipefail
IFS=$'\n\t'

EVID="launch-evidence"

utc_stamp(){ date -u +"%Y%m%dT%H%M%SZ"; }

log(){ printf "%s %s\n" "$(utc_stamp)" "$*" >&2; }

ensure_dirs(){
  mkdir -p "$EVID/phases" "$EVID/artifacts" "$EVID/build-logs"
}

# run_with_capture <command> <output_file>
# Runs command via sh -c capturing stdout+stderr, writes RC to sidecar .rc file
run_with_capture(){
  if [ "$#" -ne 2 ]; then
    echo "usage: run_with_capture <cmd> <outfile>" >&2
    return 2
  fi
  cmd="$1"; out="$2"
  ( sh -c "$cmd" ) >"$out" 2>&1 || true
  rc=$?
  echo "$rc" >"$out.rc"
  return 0
}

# summarize_counts <file>
# Echo: "<error_count> <warning_count>"
summarize_counts(){
  if [ "$#" -ne 1 ]; then
    echo "usage: summarize_counts <file>" >&2
    return 2
  fi
  f="$1"
  # Grep patterns allow 'error:' or 'error[' forms, similar for warnings.
  e=$(grep -cE '^[[:space:]]*error(:|\\[)' "$f" 2>/dev/null || true)
  w=$(grep -cE '^[[:space:]]*warning(:|\\[)' "$f" 2>/dev/null || true)
  echo "$e $w"
}
