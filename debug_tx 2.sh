#!/usr/bin/env bash
set -Eeuo pipefail
LOG=tx_$(date +%s).log
trap 'ec=$?; echo "[END] exit=$ec line=$LINENO" | tee -a "$LOG"' EXIT
exec > >(tee -a "$LOG") 2>&1

echo "[START] $(date)"
export RUST_LOG=dcli=debug
export DYL_KEY_TIMEOUT_SECS=1800

if ! command -v jq >/dev/null 2>&1; then
  echo "[WARN] jq not found; installing attempt (macOS brew)" || true
fi

echo "[BUILD]"
cargo build -p dcli

PW_FILE=$(mktemp)
printf pw > "$PW_FILE"

echo "[KEY LIST pre]"
# Disable logs so stdout is pure JSON
if ! RUST_LOG=off target/debug/dcli keys list --output json > /tmp/keys_pre.json 2>/dev/null; then
  echo '[]' > /tmp/keys_pre.json
fi
cat /tmp/keys_pre.json

if ! grep -q '"name": "test2"' /tmp/keys_pre.json; then
  echo "[CREATE key test2]"
  target/debug/dcli keys new --name test2 --algo pqc --password-file "$PW_FILE" --output json || true
fi

echo "[UNLOCK test2]"
( target/debug/dcli keys unlock test2 --password-file "$PW_FILE" --output json ) || true

echo "[KEY LIST post]"
if ! RUST_LOG=off target/debug/dcli keys list --output json > /tmp/keys_post.json 2>/dev/null; then
  echo '[]' > /tmp/keys_post.json
fi
cat /tmp/keys_post.json

ADDR=$(jq -r '.[] | select(.name=="test2").address' /tmp/keys_post.json || echo '')
if [ -z "$ADDR" ] || [ "$ADDR" = 'null' ]; then
  echo "[ERROR] Could not extract address for test2"; exit 1
fi

echo "[ADDR] $ADDR"

echo "[TRANSFER attempt]"
set +e
TRANSFER_OUT=$(target/debug/dcli tx transfer --from test2 --to "$ADDR" --denom DGT --amount 10 --fee 1000 --gas-price 1000 2>&1)
RC=$?
set -e
echo "[TRANSFER EXIT] $RC"
printf '%s\n' "$TRANSFER_OUT"

ALG_LINE=$(printf '%s\n' "$TRANSFER_OUT" | grep -i 'algorithm=' || true)
if [ -n "$ALG_LINE" ]; then
  echo "[ALGO DETECTED] $ALG_LINE"
else
  echo "[ALGO] not explicitly printed (expected if logging at info only)"
fi

rm -f "$PW_FILE"
echo "[LOG SAVED] $LOG"
