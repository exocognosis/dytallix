#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://localhost:8443/api}"
EMAIL="${QV_EMAIL:-hello@dytallix.com}"
PASSWORD="${QV_PASSWORD:-password12345}"

require() { command -v "$1" >/dev/null 2>&1 || { echo "missing dependency: $1" >&2; exit 1; }; }
require curl
require python3

json_get() {
  python3 -c 'import json,sys
obj=json.loads(sys.stdin.read() or "{}")
key=sys.argv[1]
val=obj
for part in key.split("."):
  if not isinstance(val, dict):
    val=None
    break
  val=val.get(part)
print(val if val is not None else "")
' "$1"
}

b64_raw() {
  python3 -c 'import base64,sys
s=sys.stdin.buffer.read()
print(base64.b64encode(s).decode("ascii").rstrip("="))
'
}

echo "[1/7] Waiting for API health..."
for i in $(seq 1 60); do
  if curl -sk "$BASE_URL/health" >/dev/null 2>&1; then
    break
  fi
  sleep 1
  if [ "$i" = "60" ]; then
    echo "API not healthy at $BASE_URL" >&2
    exit 1
  fi
done

echo "[2/7] Login..."
LOGIN_RES=$(curl -sk "$BASE_URL/auth/login" \
  -H 'content-type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
ACCESS=$(printf "%s" "$LOGIN_RES" | json_get access_token)
if [ -z "$ACCESS" ]; then
  echo "Login failed: $LOGIN_RES" >&2
  exit 1
fi

AUTHH=( -H "authorization: Bearer $ACCESS" -H 'content-type: application/json' )

echo "[3/7] Create anchor + activate..."
ANCHOR_ID=$(curl -sk "$BASE_URL/anchors" "${AUTHH[@]}" \
  -d '{"name":"acceptance-anchor","environment":"prod"}' | json_get id)
if [ -n "$ANCHOR_ID" ]; then
  curl -sk "$BASE_URL/anchors/$ANCHOR_ID/activate" "${AUTHH[@]}" -d '{}' >/dev/null
fi

echo "[4/7] Create TLS target + start scan (example.com:443)..."
TARGET_ID=$(curl -sk "$BASE_URL/targets" "${AUTHH[@]}" \
  -d '{"name":"Acceptance TLS","type":"TLS","environment":"prod","address":"example.com","port":443}' | json_get id)
SCAN_ID=$(curl -sk "$BASE_URL/scans" "${AUTHH[@]}" \
  -d "{\"target_id\":\"$TARGET_ID\"}" | json_get scan_id)

echo "[5/7] Wait for scan completion..."
for i in $(seq 1 60); do
  STATUS=$(curl -sk "$BASE_URL/scans/$SCAN_ID" "${AUTHH[@]}" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("status",""))')
  if [ "$STATUS" = "SUCCEEDED" ]; then
    break
  fi
  if [ "$STATUS" = "FAILED" ]; then
    echo "Scan failed: $(curl -sk "$BASE_URL/scans/$SCAN_ID" "${AUTHH[@]}")" >&2
    exit 1
  fi
  sleep 1
  if [ "$i" = "60" ]; then
    echo "Scan did not finish in time" >&2
    exit 1
  fi
done

echo "[6/7] Find scanned asset + upload secret..."
ASSETS=$(curl -sk "$BASE_URL/assets" "${AUTHH[@]}")
ASSET_ID=$(printf "%s" "$ASSETS" | python3 -c 'import json,sys; arr=json.load(sys.stdin); print(arr[0]["id"] if arr else "")')
if [ -z "$ASSET_ID" ]; then
  echo "No assets found after scan" >&2
  exit 1
fi
SECRET_B64=$(printf "super-secret-acceptance" | b64_raw)
curl -sk "$BASE_URL/assets/$ASSET_ID/secrets" "${AUTHH[@]}" \
  -d "{\"secret_b64\":\"$SECRET_B64\",\"secret_type\":\"BLOB\"}" >/dev/null

echo "[7/7] Bulk wrap + bulk attest..."
ATTEST_START_EPOCH=$(python3 -c 'import time; print(int(time.time()))')
WRAP_JOB=$(curl -sk "$BASE_URL/wrap" "${AUTHH[@]}" -d "{\"asset_ids\":[\"$ASSET_ID\"]}" | json_get job_id)
ATTEST_JOB=$(curl -sk "$BASE_URL/attest" "${AUTHH[@]}" -d "{\"asset_ids\":[\"$ASSET_ID\"]}" | json_get job_id)

# wait briefly for attestation list to include a tx hash
for i in $(seq 1 60); do
  TX=$(curl -sk "$BASE_URL/attestations" -H "authorization: Bearer $ACCESS" | python3 -c 'import json,sys,re,datetime
start=int(sys.argv[1])
arr=json.load(sys.stdin)
for a in arr:
  tx=(a.get("tx_hash") or "").strip()
  st=(a.get("status") or "")
  created=(a.get("created_at") or "").strip()
  try:
    ts=int(datetime.datetime.fromisoformat(created.replace("Z","+00:00")).timestamp())
  except Exception:
    ts=0
  if ts < start:
    continue
  if st == "CONFIRMED" and re.fullmatch(r"0x[0-9a-fA-F]{64}", tx) and tx.lower() != ("0x" + "0"*64):
    print(tx)
    break
' "$ATTEST_START_EPOCH")
  if [ -n "$TX" ]; then
    echo "OK: attested tx=$TX (wrap_job=$WRAP_JOB attest_job=$ATTEST_JOB)"
    exit 0
  fi
  sleep 1
  if [ "$i" = "60" ]; then
    echo "Attestation tx not observed in time (wrap_job=$WRAP_JOB attest_job=$ATTEST_JOB)" >&2
    exit 1
  fi
done
