#!/usr/bin/env bash
set -euo pipefail

curl_json() {
  # Fail fast on network errors and avoid indefinite hangs.
  # Usage: curl_json <curl args...>
  curl -fsS --connect-timeout 5 --max-time 20 "$@"
}

API_BASE="http://localhost:13000/api/v1"

# Polling settings (override via env)
SCAN_POLL_SECS="${SCAN_POLL_SECS:-2}"
SCAN_MAX_POLLS="${SCAN_MAX_POLLS:-60}"
WRAP_POLL_SECS="${WRAP_POLL_SECS:-2}"
WRAP_MAX_POLLS="${WRAP_MAX_POLLS:-60}"
ATTEST_POLL_SECS="${ATTEST_POLL_SECS:-2}"
ATTEST_MAX_POLLS="${ATTEST_MAX_POLLS:-80}"

json_get() {
  local key="$1"
  python3 -c "import sys, json; print(json.load(sys.stdin).get('$key',''))"
}

TOKEN="$(
  curl_json -X POST "$API_BASE/auth/login" \
    -H 'Content-Type: application/json' \
    -d '{"email":"admin@quantumvault.local","password":"QuantumVault2024!"}' \
  | python3 -c 'import sys, json; print(json.load(sys.stdin)["access_token"])'
)"

auth_header() {
  printf 'Authorization: Bearer %s' "$TOKEN"
}

echo "JWT acquired"

TARGET_ID="$(
  curl_json -X POST "$API_BASE/scans/targets" \
    -H "$(auth_header)" \
    -H 'Content-Type: application/json' \
    -d '{"name":"Google TLS Endpoint","type":"TLS_ENDPOINT","host":"google.com","port":443,"protocol":"https","metadata":{"note":"e2e attestation test"}}' \
  | python3 -c 'import sys, json; print(json.load(sys.stdin)["id"])'
)"

echo "Target: $TARGET_ID"

SCAN_ID="$(
  curl_json -X POST "$API_BASE/scans/trigger/$TARGET_ID" \
    -H "$(auth_header)" \
  | python3 -c 'import sys, json; print(json.load(sys.stdin)["id"])'
)"

echo "Scan: $SCAN_ID"

ASSET_ID=""
LAST_SCAN_JSON=""
for _ in $(seq 1 "$SCAN_MAX_POLLS"); do
  SCAN_JSON="$(curl_json "$API_BASE/scans/status/$SCAN_ID" -H "$(auth_header)")"
  LAST_SCAN_JSON="$SCAN_JSON"
  STATUS="$(printf '%s' "$SCAN_JSON" | python3 -c 'import sys, json; print(json.load(sys.stdin).get("status"))')"
  echo "Scan status: $STATUS"

  if [[ "$STATUS" == "COMPLETED" ]]; then
    ASSET_ID="$(
      printf '%s' "$SCAN_JSON" \
      | python3 -c 'import sys, json; data=json.load(sys.stdin); sa=data.get("scanAssets") or []; print(sa[0]["assetId"] if sa else "")'
    )"
    break
  fi

  if [[ "$STATUS" == "FAILED" ]]; then
    echo "Scan failed" >&2
    printf '%s\n' "$SCAN_JSON" | python3 -m json.tool || true
    exit 1
  fi

  sleep "$SCAN_POLL_SECS"
done

if [[ -z "$ASSET_ID" ]]; then
  echo "Timed out waiting for scan to complete" >&2
  if [[ -n "$LAST_SCAN_JSON" ]]; then
    printf '%s\n' "$LAST_SCAN_JSON" | python3 -m json.tool || true
  fi
  exit 1
fi

echo "Asset: $ASSET_ID"

ANCHOR_ID="$(
  curl_json -X POST "$API_BASE/anchors" \
    -H "$(auth_header)" \
    -H 'Content-Type: application/json' \
    -d '{"name":"E2E Test Anchor","algorithm":"Kyber1024"}' \
  | python3 -c 'import sys, json; print(json.load(sys.stdin)["id"])'
)"

echo "Anchor: $ANCHOR_ID"

KEY_MATERIAL="$(python3 -c 'import os, base64; print(base64.b64encode(os.urandom(32)).decode())')"

curl_json -X POST "$API_BASE/assets/$ASSET_ID/key-material" \
  -H "$(auth_header)" \
  -H 'Content-Type: application/json' \
  -d "{\"keyMaterial\":\"$KEY_MATERIAL\",\"keyType\":\"TLS_PRIVATE_KEY\"}" \
  >/dev/null

echo "Key material ingested"

WRAP_JOB_ID="$(
  curl_json -X POST "$API_BASE/wrapping/wrap" \
    -H "$(auth_header)" \
    -H 'Content-Type: application/json' \
    -d "{\"assetId\":\"$ASSET_ID\",\"anchorId\":\"$ANCHOR_ID\"}" \
  | python3 -c 'import sys, json; print(json.load(sys.stdin)["id"])'
)"

echo "Wrap job: $WRAP_JOB_ID"

WRAP_STATUS=""
WRAP_JSON=""
for _ in $(seq 1 "$WRAP_MAX_POLLS"); do
  WRAP_JSON="$(curl_json "$API_BASE/wrapping/job-status/$WRAP_JOB_ID" -H "$(auth_header)")"
  WRAP_STATUS="$(printf '%s' "$WRAP_JSON" | python3 -c 'import sys, json; print(json.load(sys.stdin).get("status"))')"
  echo "Wrap status: $WRAP_STATUS"

  if [[ "$WRAP_STATUS" == "COMPLETED" ]]; then
    break
  fi

  if [[ "$WRAP_STATUS" == "FAILED" ]]; then
    echo "Wrap failed" >&2
    printf '%s\n' "$WRAP_JSON" | python3 -m json.tool || true
    exit 1
  fi

  sleep "$WRAP_POLL_SECS"
done

if [[ "$WRAP_STATUS" != "COMPLETED" ]]; then
  echo "Timed out waiting for wrap job to complete" >&2
  printf '%s\n' "$WRAP_JSON" | python3 -m json.tool || true
  exit 1
fi

ATT_JOB_ID="$(
  curl_json -X POST "$API_BASE/attestation/create-job" \
    -H "$(auth_header)" \
    -H 'Content-Type: application/json' \
    -d "{\"assetIds\":[\"$ASSET_ID\"]}" \
  | python3 -c 'import sys, json; print(json.load(sys.stdin)["id"])'
)"

echo "Attestation job: $ATT_JOB_ID"

ATTEST_HASH=""
ATTEST_TX=""
ATTEST_BLOCK=""
LAST_JOB_JSON=""
for _ in $(seq 1 "$ATTEST_MAX_POLLS"); do
  JOB_JSON="$(curl_json "$API_BASE/attestation/job-status/$ATT_JOB_ID" -H "$(auth_header)")"
  LAST_JOB_JSON="$JOB_JSON"
  JOB_STATUS="$(printf '%s' "$JOB_JSON" | python3 -c 'import sys, json; print(json.load(sys.stdin).get("status"))')"
  echo "Attestation job status: $JOB_STATUS"

  ATTEST_HASH="$(printf '%s' "$JOB_JSON" | python3 -c 'import sys, json; data=json.load(sys.stdin); at=data.get("attestations") or []; print(at[0].get("attestationHash","") if at else "")')"
  ATTEST_TX="$(printf '%s' "$JOB_JSON" | python3 -c 'import sys, json; data=json.load(sys.stdin); at=data.get("attestations") or []; print(at[0].get("txHash","") if at else "")')"
  ATTEST_BLOCK="$(printf '%s' "$JOB_JSON" | python3 -c 'import sys, json; data=json.load(sys.stdin); at=data.get("attestations") or []; print(at[0].get("blockNumber","") if at else "")')"

  if [[ -n "$ATTEST_TX" ]]; then
    break
  fi

  if [[ "$JOB_STATUS" == "FAILED" ]]; then
    echo "Attestation job failed" >&2
    printf '%s\n' "$JOB_JSON" | python3 -m json.tool || true
    exit 1
  fi

  sleep "$ATTEST_POLL_SECS"
done

if [[ -z "$ATTEST_TX" ]]; then
  echo "Timed out waiting for attestation to be submitted (txHash missing)" >&2
  printf '%s\n' "$LAST_JOB_JSON" | python3 -m json.tool || true
  exit 1
fi

echo "Attestation hash: $ATTEST_HASH"
echo "Dytallix tx_hash: $ATTEST_TX"
echo "Dytallix block_height: $ATTEST_BLOCK"

echo "Dytallix verify response:"
VERIFY_PAYLOAD="$(python3 -c "import json; print(json.dumps({'params':['$ATTEST_HASH']}))")"

curl_json -X POST 'http://127.0.0.1:3030/asset/verify' \
  -H 'Content-Type: application/json' \
  -d "$VERIFY_PAYLOAD" \
  | python3 -m json.tool || true
