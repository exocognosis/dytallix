#!/usr/bin/env bash
# e2e_user_flow.sh - Evidence-driven end-to-end USER FLOW with PQC, dual tokens, governance visibility, and PulseGuard
# POSIX-sh compatible (runs with bash). macOS and Ubuntu friendly. No deps beyond: bash, coreutils, curl, jq, awk, sed.
# shellcheck shell=bash
set -euo pipefail
IFS=$'\n\t'

# -----------------------------
# Configuration (override via env)
# -----------------------------
NODE="${NODE:-http://127.0.0.1:3030}"
API="${API:-http://127.0.0.1:8787}"
PG="${PG:-http://127.0.0.1:9091}"
EXPLORER="${EXPLORER:-http://127.0.0.1:5173}"
EVID="${EVID:-launch-evidence}"
STAMP="${STAMP:-$(date -u +%Y%m%dT%H%M%SZ)}"
RUN_DIR="${RUN_DIR:-${EVID}/e2e-user-journey/${STAMP}}"
LATEST_LINK="${EVID}/e2e-user-journey/latest"

# Token/amount knobs
DENOM_DGT="udgt"     # base units
DENOM_DRT="udrt"
FAUCET_UNITS=1000000000   # request 1,000,000,000 base units (e.g., 1e9 = 1000.000000 if 6 decimals)
TRANSFER_DEC="250"       # 250 tokens (human), CLI will convert to base units
POLL_SECS_BAL=60
POLL_SECS_TX=60
POLL_IVL=2

# Wallet labels and passphrase files (for CLI auto-pass)
WALLET_A_LABEL="walletA"
WALLET_B_LABEL="walletB"
PASSFILE_DIR="${HOME}/.dytx/passphrases"
PASSFILE_A="${PASSFILE_DIR}/${WALLET_A_LABEL}.txt"
PASSFILE_B="${PASSFILE_DIR}/${WALLET_B_LABEL}.txt"

# -----------------------------
# Helpers
# -----------------------------
log(){
  printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"
}

banner(){
  echo ""
  echo "============================================================"
  log "$*"
  echo "============================================================"
}

# Extract port from URL (defaults: http->80, https->443)
url_port(){
  local u="$1" v hostport port
  v="${u#*://}"
  if [ "$v" = "$u" ]; then v="$u"; fi
  hostport="${v%%/*}"
  port="${hostport##*:}"
  if [ "$port" = "$hostport" ]; then
    case "$u" in
      https://*) echo 443 ;;
      *) echo 80 ;;
    esac
  else
    echo "$port"
  fi
}

redact_stream(){
  # Mask long base64/hex secrets
  sed -E 's/[A-Za-z0-9+\/=]{32,}/[REDACTED]/g'
}

REQ_SEQ=0
req(){
  # req METHOD URL [BODY]
  local method url body
  method="$1"; url="$2"; body="${3:-}"
  REQ_SEQ=$((REQ_SEQ+1))
  local base="${RUN_DIR}/logs/http_${STAMP}_${REQ_SEQ}"
  local reqf="${base}_req.txt" respf="${base}_resp.txt" meta="${base}.meta" headerf="${base}_headers.txt"
  {
    echo "# $(date -u +%Y-%m-%dT%H:%M:%SZ) REQUEST ${method} ${url}"
    [ -n "$body" ] && echo "$body" | redact_stream
  } >"$reqf"
  local curl_args=(-sS -D "$headerf" -o "$respf" -w '%{http_code}' -X "$method" "$url")
  if [ -n "$body" ]; then
    curl_args=(-sS -D "$headerf" -o "$respf" -w '%{http_code}' -H 'Content-Type: application/json' -X "$method" "$url" --data "$body")
  fi
  set +e
  local http_code
  http_code=$(curl "${curl_args[@]}")
  local rc=$?
  set -e
  {
    echo "# $(date -u +%Y-%m-%dT%H:%M:%SZ) RESPONSE ${http_code}"
    head -n 50 "$respf" | redact_stream || true
    echo "\n# Headers"; head -n 50 "$headerf" || true
  } >"$meta"
  if [ $rc -ne 0 ]; then
    log "ERROR curl failed rc=$rc for $url"
    return $rc
  fi
  if [ "${http_code##*[!0-9]}" != "$http_code" ]; then
    # Not purely numeric (defensive) -> treat as error
    log "ERROR Non-numeric HTTP code for $url: $http_code"
    return 22
  fi
  if [ "$http_code" -ge 400 ]; then
    log "ERROR HTTP ${http_code} for $url"
    return 22
  fi
  cat "$respf"
  return 0
}

save_json(){
  # save_json FILE jq_filter (reads stdin)
  local out="$1"; shift
  jq "$@" >"$out"
}

poll(){
  # poll command timeout_s interval_s
  local cmd="$1" timeout_s="$2" interval_s="$3"
  local start now
  start=$(date +%s)
  while true; do
    # Run in current shell so functions/vars are available
    if eval "$cmd"; then
      return 0
    fi
    now=$(date +%s)
    if [ $((now-start)) -ge "$timeout_s" ]; then
      return 1
    fi
    sleep "$interval_s"
  done
}

assert_jq(){
  # assert_jq FILE jq_filter description
  local file="$1" filter="$2" desc="$3"
  if jq -e "$filter" "$file" >/dev/null 2>&1; then
    log "ASSERT PASS: $desc"
    return 0
  else
    log "ASSERT FAIL: $desc"
    return 1
  fi
}

# Dynamic discovery of dytx CLI
resolve_dytx(){
  if command -v dytx >/dev/null 2>&1; then
    echo "dytx"
    return 0
  fi
  if command -v node >/dev/null 2>&1 && [ -f "${ROOT}/cli/dytx/dist/index.js" ]; then
    echo "node ${ROOT}/cli/dytx/dist/index.js"
    return 0
  fi
  return 1
}

# Balance extraction tolerant of multiple shapes
extract_amount(){
  # extract_amount FILE DENOM -> echoes integer amount (base units) or 0
  local file="$1" den="$2" denUp denNoU
  denUp=$(echo "$den" | tr '[:lower:]' '[:upper:]')
  denNoU=${den#u}
  jq -r --arg d "$den" --arg du "$denUp" --arg dnu "$denNoU" '
    # Common shapes tried in order; default 0
    ( .balances[]? | select((.denom|ascii_downcase)==$d or (.denom|ascii_upcase)==$du or (.denom|ascii_downcase)==$dnu) | (.amount|tostring) ) //
    (.result?.balances?[]? | select((.denom|ascii_downcase)==$d or (.denom|ascii_upcase)==$du or (.denom|ascii_downcase)==$dnu) | (.amount|tostring) ) //
    (.result?.balance?[$d]? // .balance?[$d]? // .[$d]? // .[$dnu]? // .coins?[$d]? // .coins?[$dnu]? // .amounts?[$d]? // .amounts?[$dnu]? // 0 )
  ' "$file" | sed 's/[^0-9]//g' | { read -r v || true; echo "${v:-0}"; }
}

# Try GET one of several paths, return first successful JSON
try_get(){
  local base="$1"; shift
  local path
  for path in "$@"; do
    if out=$(req GET "${base%/}/${path}"); then
      echo "$out"
      return 0
    fi
  done
  return 1
}

# Try POST with either raw JSON body or wrapped {"signed_tx": ...}
try_submit(){
  local base="$1" signed_file="$2"
  local raw; raw=$(cat "$signed_file")
  local wrapped; wrapped=$(jq -c --argjson s "$raw" '{signed_tx: $s}')
  local ep
  for ep in \
    "${base%/}/transactions/submit" \
    "${base%/}/submit" \
    "${base%/}/tx/submit"; do
    if out=$(req POST "$ep" "$raw"); then echo "$out"; return 0; fi || true
    if out=$(req POST "$ep" "$wrapped"); then echo "$out"; return 0; fi || true
  done
  return 1
}

# -----------------------------
# 0. Preconditions
# -----------------------------
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# Clean prior run directory only if same STAMP is reused
if [ -d "$RUN_DIR" ]; then
  rm -rf "$RUN_DIR"
fi
mkdir -p "${RUN_DIR}/" "${RUN_DIR}/logs" "${RUN_DIR}/artifacts" "${RUN_DIR}/screens" "${RUN_DIR}/json"
# Create/refresh latest symlink using absolute path without realpath dependency
abs_run_dir=$(cd "$RUN_DIR" && pwd -P)
ln -sfn "$abs_run_dir" "$LATEST_LINK" || true

# Optional trace tee
if [ "${TRACE:-0}" != "0" ]; then
  mkdir -p "${RUN_DIR}/logs"
  exec > >(tee -a "${RUN_DIR}/logs/trace.log") 2>&1
  set -x
fi

# Enforce one port per role (avoid cross-role ambiguity)
NODE_PORT=$(url_port "$NODE")
API_PORT=$(url_port "$API")
PG_PORT=$(url_port "$PG")
log "Service map (enforced): RPC(NODE)=${NODE} [:${NODE_PORT}] | API=${API} [:${API_PORT}] | PulseGuard=${PG} [:${PG_PORT}] | Explorer=${EXPLORER}"
if [ "$NODE_PORT" = "$API_PORT" ] || [ "$NODE_PORT" = "$PG_PORT" ] || [ "$API_PORT" = "$PG_PORT" ]; then
  log "Preflight FAIL: Port collision between roles (assign distinct ports: NODE:3030, API:8787, PG:9091). Override via env NODE/API/PG."
  exit 1
fi

banner "Preflight checks and service health"
# Dependencies
if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required. On macOS: brew install curl; On Ubuntu: sudo apt-get install -y curl" >&2
  exit 1
fi
if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required. On macOS: brew install jq; On Ubuntu: sudo apt-get install -y jq" >&2
  exit 1
fi

# Health checks (role-specific endpoints only)
api_health_ok=0
node_health_ok=0
pg_health_ok=0

if try_get "$API" api/status >/dev/null 2>&1; then api_health_ok=1; fi
if try_get "$NODE" status >/dev/null 2>&1; then node_health_ok=1; fi
if try_get "$PG" health >/dev/null 2>&1; then pg_health_ok=1; fi

if [ "$api_health_ok" -ne 1 ] && [ "$node_health_ok" -ne 1 ]; then
  log "Preflight FAIL: API and NODE are not responding"
  exit 1
fi
if [ "$pg_health_ok" -ne 1 ]; then
  log "WARN: PulseGuard not responding at $PG (will continue without risk evidence)"
fi

# -----------------------------
# 1. Wallet generation (PQC)
# -----------------------------
banner "Wallet generation (PQC Dilithium)"
DYTX_BIN=""
if DYTX_BIN=$(resolve_dytx); then
  log "Using CLI: $DYTX_BIN"
  # Wallet A
  set +e
  KA_OUT=$($DYTX_BIN --output json keygen --algo dilithium --label "$WALLET_A_LABEL" --auto-passphrase 2>&1)
  rc=$?
  set -e
  echo "$KA_OUT" | redact_stream >"${RUN_DIR}/logs/wallet_keygen.log"
  if [ $rc -ne 0 ]; then
    log "Keygen via CLI failed rc=$rc; will try helper"
  fi
  if [ $rc -eq 0 ]; then
    ADDR_A=$(echo "$KA_OUT" | jq -r '.address')
    KEYSTORE_A=$(echo "$KA_OUT" | jq -r '.keystore')
    PUB_A=$(jq -r '.pubkey_b64 // empty' "$KEYSTORE_A" 2>/dev/null || true)
    jq -n --arg address "$ADDR_A" --arg pubkey_b64 "${PUB_A:-}" '{address:$address, pubkey_b64:$pubkey_b64}' >"${RUN_DIR}/json/wallet_A.json"
  fi
  # Wallet B
  set +e
  KB_OUT=$($DYTX_BIN --output json keygen --algo dilithium --label "$WALLET_B_LABEL" --auto-passphrase 2>&1)
  rc2=$?
  set -e
  echo "$KB_OUT" | redact_stream >>"${RUN_DIR}/logs/wallet_keygen.log"
  if [ $rc2 -eq 0 ]; then
    ADDR_B=$(echo "$KB_OUT" | jq -r '.address')
    KEYSTORE_B=$(echo "$KB_OUT" | jq -r '.keystore')
    PUB_B=$(jq -r '.pubkey_b64 // empty' "$KEYSTORE_B" 2>/dev/null || true)
    jq -n --arg address "$ADDR_B" --arg pubkey_b64 "${PUB_B:-}" '{address:$address, pubkey_b64:$pubkey_b64}' >"${RUN_DIR}/json/wallet_B.json"
  fi
else
  log "dytx CLI not found"
  rc=1; rc2=1
fi

# Fallback helper if CLI keygen failed
if [ "${ADDR_A:-}" = "" ] || [ "${ADDR_B:-}" = "" ]; then
  if command -v node >/dev/null 2>&1 && [ -f "${ROOT}/scripts/gen-pqc-mnemonic.cjs" ]; then
    log "Using helper gen-pqc-mnemonic.cjs to generate addresses"
    # Capture raw (unredacted) for parsing, but redact when logging
    HOUT_A=$(node "${ROOT}/scripts/gen-pqc-mnemonic.cjs" 2>&1 || true)
    echo "$HOUT_A" | redact_stream | tee -a "${RUN_DIR}/logs/wallet_keygen.log" >/dev/null
    ADDR_A=$(echo "$HOUT_A" | awk '/--- PQC ADDRESS ---/{getline; print; exit}')
    jq -n --arg address "$ADDR_A" '{address:$address}' >"${RUN_DIR}/json/wallet_A.json"
    HOUT_B=$(node "${ROOT}/scripts/gen-pqc-mnemonic.cjs" 2>&1 || true)
    echo "$HOUT_B" | redact_stream | tee -a "${RUN_DIR}/logs/wallet_keygen.log" >/dev/null
    ADDR_B=$(echo "$HOUT_B" | awk '/--- PQC ADDRESS ---/{getline; print; exit}')
    jq -n --arg address "$ADDR_B" '{address:$address}' >"${RUN_DIR}/json/wallet_B.json"
    log "NOTE: Helper does not persist private keys. Keep passphrases secure."
  else
    log "No CLI or helper available to generate PQC wallets"
    exit 1
  fi
fi

# Basic presence assertions (will re-check later)
if [ -z "${ADDR_A:-}" ] || [ -z "${ADDR_B:-}" ]; then
  log "Failed to obtain wallet addresses"
  exit 1
fi

# -----------------------------
# 2. Faucet funding (dual token)
# -----------------------------
banner "Faucet funding for Wallet A (${DENOM_DGT}, ${DENOM_DRT})"
FAUCET_REQ="${RUN_DIR}/json/faucet_request_A.json"
FAUCET_RES="${RUN_DIR}/json/faucet_response_A.json"

jq -n --arg addr "$ADDR_A" --argjson amts "[$FAUCET_UNITS,$FAUCET_UNITS]" --argjson denoms "[\"${DENOM_DGT}\",\"${DENOM_DRT}\"]" \
  '{address:$addr, denoms:$denoms, amounts:$amts}' >"$FAUCET_REQ"

# Flexible faucet POST that supports both new and legacy payloads and paths
faucet_post(){
  local addr="$1"
  local req_tokens req_denoms out ep
  req_tokens=$(jq -n --arg address "$addr" '{address:$address, tokens:["DGT","DRT"]}')
  req_denoms=$(jq -n --arg address "$addr" --arg d1 "$DENOM_DGT" --arg d2 "$DENOM_DRT" --argjson amts "[$FAUCET_UNITS,$FAUCET_UNITS]" '{address:$address, denoms:[$d1,$d2], amounts:$amts}')
  for ep in "${API%/}/api/faucet"; do
    if out=$(req POST "$ep" "$req_tokens"); then echo "$out"; return 0; fi || true
    if out=$(req POST "$ep" "$req_denoms"); then echo "$out"; return 0; fi || true
  done
  return 1
}

set +e
FRES=$(faucet_post "$ADDR_A")
rc=$?
set -e
if [ $rc -ne 0 ]; then
  log "Faucet POST failed (rc=$rc)"
  echo "${FRES:-}" >"$FAUCET_RES" || true
else
  echo "$FRES" | jq '.' >"$FAUCET_RES" || echo "$FRES" >"$FAUCET_RES"
fi

# Poll balances for A until both tokens meet minimums
balance_A_pre="${RUN_DIR}/json/balance_A_pre_transfer.json"
balance_B_pre="${RUN_DIR}/json/balance_B_pre_transfer.json"

get_bal_json(){
  local addr="$1"
  local out
  # API is the single source for balances
  if out=$(try_get "$API" "api/balance?address=${addr}" "api/balance/${addr}"); then echo "$out"; return 0; fi
  return 1
}

log "Polling Wallet A balances until funded"
if ! poll 'get_bal_json "$ADDR_A" | save_json "$balance_A_pre" . && [ "$(extract_amount "$balance_A_pre" "$DENOM_DGT")" -ge "$FAUCET_UNITS" ] && [ "$(extract_amount "$balance_A_pre" "$DENOM_DRT")" -ge "$FAUCET_UNITS" ]' "$POLL_SECS_BAL" "$POLL_IVL"; then
  log "Timeout waiting for faucet funding"
  # still save the last seen balances if any
  get_bal_json "$ADDR_A" | save_json "$balance_A_pre" '.' || true
  exit 1
fi

# Also snapshot B pre-transfer (for delta checks)
get_bal_json "$ADDR_B" | save_json "$balance_B_pre" '.' || echo '{}' >"$balance_B_pre"

# -----------------------------
# 3. Create + sign transfer transactions (PQC)
# -----------------------------
banner "Create and sign transfer transactions (A -> B)"

payload_udgt="${RUN_DIR}/artifacts/payload_udgt.json"
payload_udrt="${RUN_DIR}/artifacts/payload_udrt.json"

jq -n --arg to "$ADDR_B" --arg amount "$TRANSFER_DEC" --arg denom "$DENOM_DGT" --arg memo "e2e_udgt_transfer_${STAMP}" \
  '{to:$to, amount:$amount, denom:$denom, memo:$memo}' >"$payload_udgt"

jq -n --arg to "$ADDR_B" --arg amount "$TRANSFER_DEC" --arg denom "$DENOM_DRT" --arg memo "e2e_udrt_transfer_${STAMP}" \
  '{to:$to, amount:$amount, denom:$denom, memo:$memo}' >"$payload_udrt"

signed_udgt="${RUN_DIR}/artifacts/tx_udgt_signed.json"
signed_udrt="${RUN_DIR}/artifacts/tx_udrt_signed.json"
signing_log="${RUN_DIR}/logs/signing.log"
: >"$signing_log"

sign_with_cli(){
  local payload="$1" out="$2" addr="$3" passfile="$4"
  local outjson passarg
  if [ -f "$passfile" ]; then passarg=(--passphrase-file "$passfile"); else passarg=(); fi
  set +e
  outjson=$($DYTX_BIN --rpc "$NODE" --output json sign --address "$addr" --payload "$payload" "${passarg[@]}" --out "$out" 2>&1)
  local rc=$?
  set -e
  echo "$outjson" | redact_stream >>"$signing_log"
  if [ $rc -ne 0 ]; then return $rc; fi
  echo "$outjson" | jq -r '.hash // empty'
}

HASH_UDGT=""; HASH_DRT=""
if [ -n "${DYTX_BIN:-}" ] && command -v "${DYTX_BIN%% *}" >/dev/null 2>&1; then
  HASH_UDGT=$(sign_with_cli "$payload_udgt" "$signed_udgt" "$ADDR_A" "$PASSFILE_A" || true)
  HASH_DRT=$(sign_with_cli "$payload_udrt" "$signed_udrt" "$ADDR_A" "$PASSFILE_A" || true)
else
  log "CLI not available for signing; will attempt RPC-based submission only"
fi

if [ ! -s "$signed_udgt" ] || [ ! -s "$signed_udrt" ]; then
  log "Signed transactions not created. Cannot proceed."
  exit 1
fi

# Signature sizes (best-effort)
for f in "$signed_udgt" "$signed_udrt"; do
  sz=$(jq -r '(.signature_b64 // .signature // .sig // "") | length' "$f") || sz=0
  algo=$(jq -r '(.algorithm // .algo // .sig_algo // "unknown")' "$f") || algo="unknown"
  echo "$(basename "$f"): algo=$algo signature_len=${sz}" >>"$signing_log"
done

# -----------------------------
# 4. Submit transactions
# -----------------------------
banner "Submit transactions"
submit_udgt_json="${RUN_DIR}/json/submit_udgt_response.json"
submit_udrt_json="${RUN_DIR}/json/submit_udrt_response.json"

set +e
SUB_UDGT=$(try_submit "$NODE" "$signed_udgt")
RC1=$?
SUB_DRT=$(try_submit "$NODE" "$signed_udrt")
RC2=$?
set -e

[ -n "${SUB_UDGT:-}" ] && echo "$SUB_UDGT" | jq '.' >"$submit_udgt_json" || echo "${SUB_UDGT:-}" >"$submit_udgt_json"
[ -n "${SUB_DRT:-}" ] && echo "$SUB_DRT" | jq '.' >"$submit_udrt_json" || echo "${SUB_DRT:-}" >"$submit_udrt_json"

if [ $RC1 -ne 0 ] || [ $RC2 -ne 0 ]; then
  log "ERROR: Transaction submission failed"
  exit 2
fi

# Extract tx hashes (prefer response, fallback to sign step)
HASH_UDGT=${HASH_UDGT:-$(jq -r '.hash // .tx_hash // .result.hash // empty' "$submit_udgt_json")}
HASH_DRT=${HASH_DRT:-$(jq -r '.hash // .tx_hash // .result.hash // empty' "$submit_udrt_json")}

if [ -z "$HASH_UDGT" ]; then HASH_UDGT=$(jq -r '.hash // .tx.hash // empty' "$signed_udgt" || true); fi
if [ -z "$HASH_DRT" ]; then HASH_DRT=$(jq -r '.hash // .tx.hash // empty' "$signed_udrt" || true); fi

HASHES_FILE="${RUN_DIR}/artifacts/tx_hashes.txt"
printf "%s\n%s\n" "$HASH_UDGT" "$HASH_DRT" >"$HASHES_FILE"

# -----------------------------
# 5. Wait for inclusion + receipts
# -----------------------------
banner "Wait for inclusion and collect receipts"

fetch_tx(){
  local h="$1"; try_get "$NODE" "transactions/$h" "tx/$h" "transaction/$h"
}

wait_one(){
  local hash="$1" out tmp
  tmp="${RUN_DIR}/json/receipt_${hash}.json"
  if ! poll "fetch_tx $hash | save_json $tmp . && jq -e '(.status|tostring|ascii_downcase) | test(\"success|included\") or (.code==0) or (.ok==true)' $tmp >/dev/null" "$POLL_SECS_TX" "$POLL_IVL"; then
    # Save last seen
    fetch_tx "$hash" | save_json "$tmp" '.' || echo '{}' >"$tmp"
    return 1
  fi
  return 0
}

ok1=0; ok2=0
wait_one "$HASH_UDGT" && ok1=1 || ok1=0
wait_one "$HASH_DRT" && ok2=1 || ok2=0

if [ $ok1 -ne 1 ] || [ $ok2 -ne 1 ]; then
  log "ERROR: One or more transactions not included in time"
  # continue to capture balances to aid diagnostics
fi

# Snapshot balances post-transfer
balance_A_post="${RUN_DIR}/json/balance_A_post_transfer.json"
balance_B_post="${RUN_DIR}/json/balance_B_post_transfer.json"
get_bal_json "$ADDR_A" | save_json "$balance_A_post" '.' || echo '{}' >"$balance_A_post"
get_bal_json "$ADDR_B" | save_json "$balance_B_post" '.' || echo '{}' >"$balance_B_post"

# -----------------------------
# 6. PulseGuard risk evidence (if available)
# -----------------------------
banner "PulseGuard risk capture"
if [ "$pg_health_ok" -eq 1 ]; then
  for h in "$HASH_UDGT" "$HASH_DRT"; do
    [ -z "$h" ] && continue
    if out=$(try_get "$PG" "api/ai/risk/transaction/$h" "risk/tx/$h" "api/risk/$h"); then
      echo "$out" | jq '.' >"${RUN_DIR}/json/risk_${h}.json" || echo "$out" >"${RUN_DIR}/json/risk_${h}.json"
    else
      log "WARN: No risk data for tx $h"
    fi
  done
else
  log "PulseGuard unavailable; skipping risk capture"
fi

# -----------------------------
# 7. Cross-checks + assertions
# -----------------------------
banner "Assertions"

# Extract numeric amounts
A_pre_DGT=$(extract_amount "$balance_A_pre" "$DENOM_DGT")
A_pre_DRT=$(extract_amount "$balance_A_pre" "$DENOM_DRT")
B_pre_DGT=$(extract_amount "$balance_B_pre" "$DENOM_DGT")
B_pre_DRT=$(extract_amount "$balance_B_pre" "$DENOM_DRT")
A_post_DGT=$(extract_amount "$balance_A_post" "$DENOM_DGT")
A_post_DRT=$(extract_amount "$balance_A_post" "$DENOM_DRT")
B_post_DGT=$(extract_amount "$balance_B_post" "$DENOM_DGT")
B_post_DRT=$(extract_amount "$balance_B_post" "$DENOM_DRT")

# Convert transfer amount to base units: assume 6 decimals typical; however CLI already used decimals. For assertions, require >= transfer amount in base units.
transfer_units() { printf '%s' "$1" | awk '{printf "%d", $1*1000000}'; }
XFER_UNITS=$(transfer_units "$TRANSFER_DEC")

# Assertions:
# - A funded >= faucet requested
as_ok=0
if assert_jq "$balance_A_pre" 'true' "Wallet A balance JSON exists" && \
   [ "$A_pre_DGT" -ge "$FAUCET_UNITS" ] && [ "$A_pre_DRT" -ge "$FAUCET_UNITS" ]; then
  as_ok=1
else
  as_ok=0
fi

# - Both receipts success and gas non-zero
rc_ok=1
for h in "$HASH_UDGT" "$HASH_DRT"; do
  f="${RUN_DIR}/json/receipt_${h}.json"
  if ! assert_jq "$f" '(.status|tostring|ascii_downcase)|test("success|included") or (.code==0) or (.ok==true)' "Tx $h succeeded"; then rc_ok=0; fi
  if ! assert_jq "$f" '(.gas_used // .gas // 0) | tonumber? | . > 0' "Tx $h has non-zero gas"; then rc_ok=0; fi
done

# - B increased by >= XFER_UNITS for both denoms
b_ok=1
if [ $((B_post_DGT - B_pre_DGT)) -lt "$XFER_UNITS" ]; then b_ok=0; fi
if [ $((B_post_DRT - B_pre_DRT)) -lt "$XFER_UNITS" ]; then b_ok=0; fi

# - A decreased by >= XFER_UNITS for both denoms
if [ $((A_pre_DGT - A_post_DGT)) -lt "$XFER_UNITS" ]; then b_ok=0; fi
if [ $((A_pre_DRT - A_post_DRT)) -lt "$XFER_UNITS" ]; then b_ok=0; fi

# - Risk JSON contains a score if available
risk_ok=1
for h in "$HASH_UDGT" "$HASH_DRT"; do
  f="${RUN_DIR}/json/risk_${h}.json"
  if [ -f "$f" ]; then
    if ! jq -e '(.score // .risk?.score // .result?.score // empty) as $s | ($s|type)=="number" and ($s>=0 and $s<=100)' "$f" >/dev/null 2>&1; then
      log "WARN: Risk JSON present but no normalized score in $f"
    fi
  fi
done

if [ $as_ok -ne 1 ] || [ $rc_ok -ne 1 ] || [ $b_ok -ne 1 ]; then
  log "Functional assertion failure"
  echo "A_pre: DGT=$A_pre_DGT DRT=$A_pre_DRT; A_post: DGT=$A_post_DGT DRT=$A_post_DRT" >>"${RUN_DIR}/logs/assertions.log"
  echo "B_pre: DGT=$B_pre_DGT DRT=$B_pre_DRT; B_post: DGT=$B_post_DGT DRT=$B_post_DRT" >>"${RUN_DIR}/logs/assertions.log"
  exit 2
fi

# -----------------------------
# 8. Human-readable summary
# -----------------------------
banner "Summary"
SUMMARY="${RUN_DIR}/SUMMARY.md"

# Node version / chain info (best effort)
CHAIN_ID=""; NODE_VER=""
if s=$(try_get "$NODE" api/stats status); then
  CHAIN_ID=$(echo "$s" | jq -r '.chain_id // .result?.node_info?.network // empty')
  NODE_VER=$(echo "$s" | jq -r '.version // .result?.node_info?.version // empty')
fi

cat >"$SUMMARY" <<EOF
# Dytallix E2E User Journey Summary

- Timestamp (UTC): ${STAMP}
- Node RPC: ${NODE}
- API: ${API}
- Chain ID: ${CHAIN_ID:-unknown}
- Node Version: ${NODE_VER:-unknown}
- Wallet A: ${ADDR_A}
- Wallet B: ${ADDR_B}
- Transfer amount: ${TRANSFER_DEC} DGT, ${TRANSFER_DEC} DRT

## Final Balances
- A: DGT ${A_post_DGT} (base), DRT ${A_post_DRT} (base)
- B: DGT ${B_post_DGT} (base), DRT ${B_post_DRT} (base)

## Transactions
| Hash | Status | Height | Gas Used | Risk |
|---|---:|---:|---:|---:|
EOF

row_for(){
  local h="$1"; local f="${RUN_DIR}/json/receipt_${h}.json"; local status height gas risk
  status=$(jq -r '(.status // .result?.tx_result?.code // 0) as $s | ( ($s|tostring|ascii_downcase) // (if $s==0 then "success" else ($s|tostring) end) )' "$f" 2>/dev/null || echo "")
  height=$(jq -r '(.height // .result?.height // .tx?.height // 0)|tostring' "$f" 2>/dev/null || echo "0")
  gas=$(jq -r '(.gas_used // .gas // 0)|tostring' "$f" 2>/dev/null || echo "0")
  riskf="${RUN_DIR}/json/risk_${h}.json"
  if [ -f "$riskf" ]; then
    risk=$(jq -r '(.score // .risk?.score // .result?.score // "n/a")|tostring' "$riskf" 2>/dev/null || echo "n/a")
  else
    risk="n/a"
  fi
  printf '| %s | %s | %s | %s | %s |\n' "$h" "$status" "$height" "$gas" "$risk"
}

row_for "$HASH_UDGT" >>"$SUMMARY" || true
row_for "$HASH_DRT" >>"$SUMMARY" || true

# Explorer links
{
  echo "\n## Explorer Links"
  for h in "$HASH_UDGT" "$HASH_DRT"; do
    [ -z "$h" ] && continue
    echo "- ${EXPLORER%/}/tx/$h"
  done
} >>"$SUMMARY"

log "Summary written to $SUMMARY"

# -----------------------------
# 9. Exit codes
# -----------------------------
log "E2E flow completed successfully"
exit 0
