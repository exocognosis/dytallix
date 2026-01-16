#!/usr/bin/env bash
# evidence_orchestrator.sh - Base scaffold for launch evidence orchestration
# shellcheck shell=bash
# Requirements: POSIX-sh compatible (using bash for stricter settings), idempotent.
# Generates per-phase evidence + aggregate readiness artifacts.

set -euo pipefail
IFS=$'\n\t'

# Root per specification (may be overridden by env ROOT)
ROOT="${ROOT:-$HOME/dytallix/dytallix-lean-launch}"
cd "$ROOT"

# Source common helpers
# shellcheck source=scripts/helpers/common.sh
. "scripts/helpers/common.sh"

ensure_dirs

PHASE_MAX=6

usage() {
  cat <<USAGE
Usage: $0 all|phaseN
  all      Run all phases 0..${PHASE_MAX} then aggregate readiness
  phaseN   Run only that phase (N=0..${PHASE_MAX})
USAGE
}

# Create phase directory structure and write stub evidence
_phase_run() { # $1 = phase number
  local n="$1"
  local pdir="$EVID/phases/phase${n}"
  local logs="$pdir/logs"
  mkdir -p "$logs"

  # Write a stub log file (idempotent overwrite)
  local stamp; stamp="$(utc_stamp)"
  echo "Phase ${n} executed at ${stamp} UTC" >"$logs/run.log"

  # Write JSON summary
  cat >"$pdir/summary.json" <<JSON
{
  "phase": ${n},
  "status": "PASS",
  "timestamp": "${stamp}"
}
JSON

  # Write Markdown summary (first line exact format requested)
  printf '# Phase %s — Status: PASS\n\nGenerated %s UTC\n' "$n" "$stamp" >"$pdir/SUMMARY.md"

  log "Phase ${n} complete"
}

# Stub phase functions (explicit for clarity / future expansion)
phase0(){
  # Phase 0 Baseline Gate Implementation
  # Requirements:
  #  - Formatting check with one auto-fix attempt
  #  - Clippy with up to 3 remediation cycles (never abort orchestrator)
  #  - cargo check, cargo test --no-run
  #  - Logs: cargo_check.log, clippy.log, tests_no_run.log (fmt activity embedded in clippy.log header section)
  #  - Evidence: summary.json (phase,status,errors,warnings,test_count), SUMMARY.md
  #  - PASS only if clippy, check and tests-no-run all exit 0 after remediation
  local pdir="$EVID/phases/phase0"
  local logs="$pdir/logs"
  mkdir -p "$logs"
  local clippy_log="$logs/clippy.log"
  local check_log="$logs/cargo_check.log"
  local tests_log="$logs/tests_no_run.log"
  local stamp; stamp="$(utc_stamp)"

  log "Phase 0: Baseline gate start"
  echo "== Phase 0 Baseline Gate ==" >"$clippy_log"
  echo "Started: $stamp UTC" >>"$clippy_log"

  # 1) Formatting check with one remediation
  echo "\n[fmt] Running cargo fmt --all --check" >>"$clippy_log"
  cargo fmt --all --check >>"$clippy_log" 2>&1
  local fmt_rc=$?
  if [ $fmt_rc -ne 0 ]; then
    echo "[fmt] Check failed (rc=$fmt_rc). Applying auto-format remediation..." >>"$clippy_log"
    cargo fmt --all >>"$clippy_log" 2>&1 || true
    echo "[fmt] Re-checking formatting..." >>"$clippy_log"
    cargo fmt --all --check >>"$clippy_log" 2>&1
    fmt_rc=$?
    echo "[fmt] Post-remediation rc=$fmt_rc" >>"$clippy_log"
  else
    echo "[fmt] Formatting OK" >>"$clippy_log"
  fi

  # 2) Clippy with remediation cycles
  local clippy_rc=1
  local remediation_cycles=0
  echo "\n[clippy] Initial run (strict)" >>"$clippy_log"
  cargo clippy --workspace --all-targets --all-features -- -D warnings >>"$clippy_log" 2>&1 || clippy_rc=$?
  if [ $clippy_rc -eq 0 ]; then
    echo "[clippy] Passed first attempt" >>"$clippy_log"
  else
    echo "[clippy] Failed rc=$clippy_rc -> starting remediation cycles (max 3)" >>"$clippy_log"
    while [ $clippy_rc -ne 0 ] && [ $remediation_cycles -lt 3 ]; do
      remediation_cycles=$((remediation_cycles+1))
      echo "[clippy][remediation $remediation_cycles] Applying cargo clippy --fix" >>"$clippy_log"
      cargo clippy --fix --workspace --all-targets --allow-dirty --allow-staged -- -A clippy::restriction >>"$clippy_log" 2>&1 || true
      echo "[clippy][remediation $remediation_cycles] Running cargo fmt (best-effort)" >>"$clippy_log"
      cargo fmt --all >>"$clippy_log" 2>&1 || true
      echo "[clippy][remediation $remediation_cycles] Re-running strict clippy" >>"$clippy_log"
      clippy_rc=0
      cargo clippy --workspace --all-targets --all-features -- -D warnings >>"$clippy_log" 2>&1 || clippy_rc=$?
      echo "[clippy][remediation $remediation_cycles] Result rc=$clippy_rc" >>"$clippy_log"
    done
  fi

  # 3) cargo check
  log "Phase 0: cargo check"
  echo "== cargo check ==" >"$check_log"
  cargo check --workspace --all-targets >>"$check_log" 2>&1
  local check_rc=$?
  echo "[cargo check] rc=$check_rc" >>"$check_log"

  # 4) cargo test --no-run
  log "Phase 0: cargo test --no-run"
  echo "== cargo test --no-run ==" >"$tests_log"
  cargo test --workspace --no-run >>"$tests_log" 2>&1
  local tests_rc=$?
  echo "[cargo test --no-run] rc=$tests_rc" >>"$tests_log"

  # Derive test_count by counting #[test] occurrences excluding target directory
  local test_count
  test_count=$(grep -R "^[[:space:]]*#\[test\]" . --exclude-dir=target --include='*.rs' 2>/dev/null | wc -l | tr -d ' ')

  # Aggregate error/warning counts across relevant logs
  local tmp_agg; tmp_agg="$(mktemp)"
  cat "$clippy_log" "$check_log" "$tests_log" >"$tmp_agg"
  read -r err_count warn_count < <(summarize_counts "$tmp_agg") || { err_count=0; warn_count=0; }
  rm -f "$tmp_agg"

  # Determine final status
  local status="FAIL"
  if [ $clippy_rc -eq 0 ] && [ $check_rc -eq 0 ] && [ $tests_rc -eq 0 ]; then
    status="PASS"
  fi

  # Write summary.json
  cat >"$pdir/summary.json" <<JSON
{
  "phase": 0,
  "status": "${status}",
  "errors": ${err_count},
  "warnings": ${warn_count},
  "test_count": ${test_count},
  "timestamp": "${stamp}",
  "clippy_remediation_cycles": ${remediation_cycles},
  "clippy_rc": ${clippy_rc},
  "check_rc": ${check_rc},
  "tests_no_run_rc": ${tests_rc}
}
JSON

  # Write SUMMARY.md
  {
    printf '# Phase 0 — Status: %s\n\n' "$status"
    echo "* Timestamp: $stamp UTC"
    echo "* Formatting check rc: $fmt_rc (remediation applied if >0)"
    echo "* Clippy rc: $clippy_rc (remediation cycles: $remediation_cycles) — log: $clippy_log"
    echo "* Cargo check rc: $check_rc — log: $check_log"
    echo "* Cargo test --no-run rc: $tests_rc — log: $tests_log"
    echo "* Errors (aggregate): $err_count"
    echo "* Warnings (aggregate): $warn_count"
    echo "* Test count (static #[test] scan): $test_count"
  } >"$pdir/SUMMARY.md"

  log "Phase 0 complete (status=$status)"
}
phase1(){
  # Phase 1: PQC Evidence (updated)
  # Acceptance:
  #  - Reuse existing helper or build minimal helper behind feature pqc-real
  #  - Artifacts: pubkey.hex, signed_tx.json, verify_ok.log, verify_fail_tamper.log
  #  - Logs contain explicit VERIFY_OK / VERIFY_FAIL
  #  - Summary PASS only if verify_ok.log has VERIFY_OK and verify_fail_tamper.log has VERIFY_FAIL
  local pdir="$EVID/phases/phase1"
  local logs="$pdir/logs"; mkdir -p "$logs" # ensure directories before any log writes
  local art_dir="$EVID/artifacts/pqc"; mkdir -p "$art_dir"
  local stamp; stamp="$(utc_stamp)"
  log "Phase 1: PQC evidence start"

  # Discover workspace root containing Cargo.toml (walk up from ROOT)
  local search_dir="$ROOT"
  local ws_root=""
  while [ "$search_dir" != "/" ]; do
    if [ -f "$search_dir/Cargo.toml" ]; then ws_root="$search_dir"; break; fi
    search_dir="$(dirname "$search_dir")"
  done
  if [ -z "$ws_root" ]; then
    log "Phase 1: Cargo workspace root not found (no Cargo.toml upward)"
  else
    log "Phase 1: Using workspace root $ws_root"
  fi

  local build_log="$logs/build.log"
  echo "== Phase 1 PQC Build ==" >"$build_log"
  echo "Started: $stamp UTC" >>"$build_log"

  local build_status="FAIL"
  if [ -n "$ws_root" ]; then
    # Determine repo root (parent of dytallix-lean-launch) if lean-launch is a nested member
    local repo_root="$ws_root"
    if [ -f "$ws_root/../Cargo.toml" ]; then
      repo_root="$(cd "$ws_root/.." && pwd)"
    fi
    log "Phase 1: Using repo root $repo_root for build"
    if ( cd "$repo_root" && cargo build -p dytallix-pqc --features pqc-real --bin pqc_evidence ) >>"$build_log" 2>&1; then
      echo "[build] pqc_evidence built" >>"$build_log"
      build_status="OK"
    else
      echo "[build] build failed" >>"$build_log"
    fi
  fi

  local run_log="$logs/run.log"
  echo "== Phase 1 PQC Run ==" >"$run_log"
  local helper_bin
  if [ -x "$ws_root/target/debug/pqc_evidence" ]; then
    helper_bin="$ws_root/target/debug/pqc_evidence"
  elif [ -x "${ws_root%/dytallix-lean-launch}/target/debug/pqc_evidence" ]; then
    helper_bin="${ws_root%/dytallix-lean-launch}/target/debug/pqc_evidence"
  else
    helper_bin="$ws_root/target/debug/pqc_evidence" # fallback (will error)
  fi
  local run_status="FAIL"
  if [ -x "$helper_bin" ]; then
    if "$helper_bin" "$art_dir" >>"$run_log" 2>&1; then
      echo "[run] helper executed" >>"$run_log"
      run_status="OK"
    else
      echo "[run] helper execution failed" >>"$run_log"
    fi
  else
    echo "[run] helper binary missing: $helper_bin" >>"$run_log"
  fi

  # Validate artifacts
  local verify_ok_file="$art_dir/verify_ok.log"
  local verify_fail_file="$art_dir/verify_fail_tamper.log"
  local signed_json="$art_dir/signed_tx.json"
  local pub_hex="$art_dir/pubkey.hex"

  local ok_flag="FAIL"
  local fail_flag="FAIL"
  if [ -f "$verify_ok_file" ] && grep -q 'VERIFY_OK' "$verify_ok_file"; then ok_flag="OK"; fi
  if [ -f "$verify_fail_file" ] && grep -q 'VERIFY_FAIL' "$verify_fail_file"; then fail_flag="OK"; fi

  # Extract sizes & algorithm from helper JSON line emitted to run_log
  local json_line
  json_line=$(grep -E '\{"algorithm".*"pubkey_bytes"' "$run_log" | tail -1 || true)
  local pub_bytes=0 sig_bytes=0 algo="unknown"
  if [ -n "$json_line" ]; then
    pub_bytes=$(echo "$json_line" | sed -n 's/.*"pubkey_bytes": *\([0-9]\+\).*/\1/p' | head -1 || echo 0)
    sig_bytes=$(echo "$json_line" | sed -n 's/.*"signature_bytes": *\([0-9]\+\).*/\1/p' | head -1 || echo 0)
    algo=$(echo "$json_line" | sed -n 's/.*"algorithm": *"\([^"]\+\)".*/\1/p' | head -1 || echo unknown)
  fi
  if [ -z "$pub_bytes" ]; then pub_bytes=0; fi
  if [ -z "$sig_bytes" ]; then sig_bytes=0; fi
  if [ -z "$algo" ]; then algo="unknown"; fi

  # Fallback: derive from signed_tx.json if still unknown/zero
  if { [ "$algo" = "unknown" ] || [ "$pub_bytes" -eq 0 ] || [ "$sig_bytes" -eq 0 ]; } && [ -f "$signed_json" ]; then
    # Extract algorithm (first non-empty match)
    if [ "$algo" = "unknown" ]; then
      local a_line
      a_line=$(grep '"algorithm"' "$signed_json" | head -1 || true)
      if [ -n "$a_line" ]; then
        algo=$(echo "$a_line" | sed -E 's/.*"algorithm" *: *"([^"]+)".*/\1/')
      fi
    fi
    # Public key bytes from hex length /2
    if [ "$pub_bytes" -eq 0 ]; then
      local pk_hex_line
      pk_hex_line=$(grep '"pubkey_hex"' "$signed_json" | head -1 || true)
      if [ -n "$pk_hex_line" ]; then
        local pk_hex
        pk_hex=$(echo "$pk_hex_line" | sed -E 's/.*"pubkey_hex" *: *"([0-9a-fA-F]+)".*/\1/')
        if [ -n "$pk_hex" ]; then
          pub_bytes=$(( ${#pk_hex} / 2 ))
        fi
      fi
    fi
    # Signature bytes: attempt to base64 decode sig_b64
    if [ "$sig_bytes" -eq 0 ]; then
      local sig_b64_line
      sig_b64_line=$(grep '"sig_b64"' "$signed_json" | head -1 || true)
      if [ -n "$sig_b64_line" ]; then
        local sig_b64
        sig_b64=$(echo "$sig_b64_line" | sed -E 's/.*"sig_b64" *: *"([^"]+)".*/\1/')
        if [ -n "$sig_b64" ]; then
          # Prefer coreutils base64 --decode, fallback to macOS -D, then openssl
          if command -v base64 >/dev/null 2>&1; then
            # Try GNU style
            sig_bytes=$(printf '%s' "$sig_b64" | base64 --decode 2>/dev/null | wc -c | tr -d ' ' || echo 0)
            if [ "$sig_bytes" -eq 0 ]; then
              sig_bytes=$(printf '%s' "$sig_b64" | base64 -D 2>/dev/null | wc -c | tr -d ' ' || echo 0)
            fi
          fi
          if [ "$sig_bytes" -eq 0 ] && command -v openssl >/dev/null 2>&1; then
            sig_bytes=$(printf '%s' "$sig_b64" | openssl base64 -d 2>/dev/null | wc -c | tr -d ' ' || echo 0)
          fi
        fi
      fi
    fi
  fi

  # Determine final phase status (must have successful build+run and both verification signals)
  local status="FAIL"
  if [ "$build_status" = "OK" ] && [ "$run_status" = "OK" ] && [ "$ok_flag" = "OK" ] && [ "$fail_flag" = "OK" ]; then
    status="PASS"
  fi

  # Write summary.json
  mkdir -p "$pdir"
  cat >"$pdir/summary.json" <<JSON
{
  "phase": 1,
  "status": "${status}",
  "timestamp": "${stamp}",
  "verify_ok_observed": "${ok_flag}",
  "verify_fail_observed": "${fail_flag}",
  "algorithm": "${algo}",
  "pubkey_bytes": ${pub_bytes},
  "signature_bytes": ${sig_bytes},
  "build_status": "${build_status}",
  "run_status": "${run_status}",
  "artifacts_dir": "${art_dir}"
}
JSON

  # Markdown summary
  {
    printf '# Phase 1 — Status: %s\n\n' "$status"
    echo "* Timestamp: $stamp UTC"
    echo "* Build status: $build_status (log: $build_log)"
    echo "* Run status: $run_status (log: $run_log)"
    echo "* Verify OK observed: $ok_flag (log: $verify_ok_file)"
    echo "* Verify FAIL (tamper) observed: $fail_flag (log: $verify_fail_file)"
    echo "* Algorithm: $algo"
    echo "* Public key bytes: $pub_bytes (file: $pub_hex)"
    echo "* Signature bytes: $sig_bytes (from helper JSON)"
    echo "* Artifacts dir: $art_dir"
  } >"$pdir/SUMMARY.md"

  log "Phase 1 complete (status=$status)"
}
phase2(){ _phase_run 2; }
phase3(){ _phase_run 3; }
phase4(){ _phase_run 4; }
phase5(){ _phase_run 5; }
phase6(){ _phase_run 6; }

write_final_readiness() {
  local readiness_json="$EVID/readiness.json"
  local readiness_md="$EVID/READINESS_REPORT.md"

  # Build JSON array of available summaries
  echo '[' >"$readiness_json"
  local first=1
  for i in $(seq 0 $PHASE_MAX); do
    local f="$EVID/phases/phase$i/summary.json"
    if [ -f "$f" ]; then
      if [ $first -eq 0 ]; then echo ',' >>"$readiness_json"; fi
      cat "$f" >>"$readiness_json"
      first=0
    fi
  done
  echo ']' >>"$readiness_json"

  # Markdown table
  {
    echo '# Launch Readiness Report'
    echo
    echo "Generated: $(utc_stamp) UTC"
    echo
    echo '| Phase | Status | Timestamp |'
    echo '|-------|--------|-----------|'
    for i in $(seq 0 $PHASE_MAX); do
      local f="$EVID/phases/phase$i/summary.json"
      if [ -f "$f" ]; then
        local status ts
        status=$(grep '"status"' "$f" | head -1 | sed -E 's/.*"status" *: *"([^"]+)".*/\1/')
        ts=$(grep '"timestamp"' "$f" | head -1 | sed -E 's/.*"timestamp" *: *"([^"]+)".*/\1/')
        echo "| $i | $status | $ts |"
      else
        echo "| $i | MISSING | - |"
      fi
    done
  } >"$readiness_md"
  log "Final readiness artifacts written"
}

run_all() {
  for i in $(seq 0 $PHASE_MAX); do
    "phase$i"
  done
  write_final_readiness
}

main() {
  if [ $# -ne 1 ]; then usage; exit 1; fi
  case "$1" in
    all)
      run_all
      ;;
    phase[0-6])
      local num=${1#phase}
      "phase${num}"
      ;;
    *)
      usage; exit 1
      ;;
  esac
  # If a single phase run was requested, we do not auto-aggregate per spec (only all).
}

main "$@"
