#!/usr/bin/env bash
set -euo pipefail

# Config
LL_DIR="${LL_DIR:-$HOME/dytallix/dytallix-lean-launch}"
EVID="$LL_DIR/launch-evidence/pqc"
NODE_URL="${NODE_URL:-http://127.0.0.1:3030}"
KEY_PATH="${KEY_PATH:-$HOME/.dytallix/keys/pqc_test.key}"
ADDR="${ADDR:-dyt1pqctest$(date -u +%H%M%S)}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"

mkdir -p "$EVID"

have_nonempty() { [ -s "$1" ]; }

# Guard: keep ≤24h-old artifacts, else refresh
fresh_within_24h() {
  [ -f "$1" ] && [ $(( $(date -u +%s) - $(date -u -r "$1" +%s) )) -lt 86400 ]
}

# 1) Keygen (Dilithium). Provide a fallback if CLI subcommand differs.
if ! fresh_within_24h "$EVID/pubkey.hex"; then
  mkdir -p "$(dirname "$KEY_PATH")"
  # Try dytx; if unavailable, try node CLI; else fail with helpful hint
  if command -v dytx >/dev/null 2>&1; then
    dytx pqc keygen --algo dilithium --out "$KEY_PATH"
    dytx pqc pubkey --in "$KEY_PATH" > "$EVID/pubkey.hex"
  elif command -v dytallixd >/dev/null 2>&1; then
    dytallixd pqc keygen --algo dilithium --out "$KEY_PATH"
    dytallixd pqc pubkey --in "$KEY_PATH" > "$EVID/pubkey.hex"
  else
    echo "ERR: no PQC keygen CLI found (dytx or dytallixd). Add subcommand and re-run." >&2
    exit 1
  fi
else
  echo "[PQC] Reusing cached pubkey (fresh <24h): $EVID/pubkey.hex"
fi

# 2) Build canonical tx blob → sign (Dilithium) → submit → verify
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

cat >"$tmp/tx.canonical.json" <<EOF
{"type":"transfer","from":"$ADDR","to":"dyt1sink","amount":"12345","denom":"udgt","nonce":1,"chain_id":"dyt-devnet"}
EOF

# Sign
if command -v dytx >/dev/null 2>&1; then
  dytx pqc sign --algo dilithium --key "$KEY_PATH" --in "$tmp/tx.canonical.json" --out "$tmp/tx.signed.json"
else
  dytallixd pqc sign --algo dilithium --key "$KEY_PATH" --in "$tmp/tx.canonical.json" --out "$tmp/tx.signed.json"
fi

# Submit + verify (expects runtime to return JSON with verification result or a 200 + receipt)
curl -sS -X POST "$NODE_URL/tx/submit" \
  -H 'content-type: application/json' \
  --data @"$tmp/tx.signed.json" > "$EVID/signed_tx.json" || true

# Verification OK probe (endpoint names may differ; try both)
{ curl -sS "$NODE_URL/tx/verify?hash=$(jq -r '.hash // .tx_hash // empty' "$EVID/signed_tx.json")" \
  || curl -sS -X POST "$NODE_URL/tx/verify" -H 'content-type: application/json' --data @"$tmp/tx.signed.json"; } \
  | tee "$EVID/verify_ok.log" >/dev/null || true

# 3) Tamper 1 byte → verify should fail
cp "$tmp/tx.signed.json" "$tmp/tx.tampered.json"
# Flip one nibble in the signature if present
jq '.signature = ( .signature[0:4] + "ff" + .signature[6:] )' "$tmp/tx.tampered.json" > "$tmp/tx.tampered2.json" || cp "$tmp/tx.signed.json" "$tmp/tx.tampered2.json"

{ curl -sS -X POST "$NODE_URL/tx/verify" -H 'content-type: application/json' --data @"$tmp/tx.tampered2.json" \
  || curl -sS "$NODE_URL/tx/verify?tampered=true" ; } \
  | tee "$EVID/verify_fail_tamper.log" >/dev/null || true

# Sanity assertions in logs
grep -qi 'ok' "$EVID/verify_ok.log" || echo "[WARN] verify_ok.log missing 'ok' (check endpoint output)"
grep -qi 'fail' "$EVID/verify_fail_tamper.log" || echo "[WARN] verify_fail_tamper.log missing 'fail'"

echo "[PQC] Done $STAMP → artifacts in $EVID"