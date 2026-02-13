#!/usr/bin/env bash
set -euo pipefail

API_BASE="${QVC_API_BASE:-http://localhost:13000/api/v1}"
ADMIN_EMAIL="${QVC_ADMIN_EMAIL:-admin@quantumvault.local}"
ADMIN_PASSWORD="${QVC_ADMIN_PASSWORD:-QuantumVault2024!}"
TARGET="${1:-all}" # attestation | transport | all
REASON="${QVC_REASON:-scheduled_rotation}"
CHANGE_TICKET="${QVC_CHANGE_TICKET:-}"
REQUESTED_BY="${QVC_REQUESTED_BY:-security-admin}"
EVIDENCE_DIR="${QVC_EVIDENCE_DIR:-./rotation-evidence/$(date +%Y%m%d_%H%M%S)}"

if [[ "$TARGET" != "attestation" && "$TARGET" != "transport" && "$TARGET" != "all" ]]; then
  echo "Usage: $0 [attestation|transport|all]" >&2
  exit 2
fi

for tool in curl jq awk sed; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "Missing required dependency: $tool" >&2
    exit 1
  fi
done

mkdir -p "$EVIDENCE_DIR"

echo "Authenticating as $ADMIN_EMAIL against $API_BASE..."
LOGIN_RESPONSE="$(
  curl -si -H 'Content-Type: application/json' \
    -X POST "$API_BASE/auth/login" \
    --data "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}"
)"
LOGIN_STATUS="$(printf '%s\n' "$LOGIN_RESPONSE" | awk 'NR==1 {print $2}')"
COOKIE_LINE="$(printf '%s\n' "$LOGIN_RESPONSE" | awk '/^set-cookie:/I {print $0; exit}')"
COOKIE_VALUE="$(printf '%s' "$COOKIE_LINE" | sed -E 's/^[Ss]et-[Cc]ookie:[[:space:]]*([^;]+).*/\1/')"

if [[ "$LOGIN_STATUS" != "200" ]]; then
  echo "Login failed with status $LOGIN_STATUS" >&2
  printf '%s\n' "$LOGIN_RESPONSE" | sed -n '1,20p' >&2
  exit 1
fi

if [[ -z "$COOKIE_VALUE" ]]; then
  echo "Failed to retrieve auth cookie from login response." >&2
  exit 1
fi

run_get() {
  local path="$1"
  curl -sS -H "Cookie: $COOKIE_VALUE" "$API_BASE$path"
}

run_post() {
  local path="$1"
  local payload="$2"
  curl -sS -H 'Content-Type: application/json' -H "Cookie: $COOKIE_VALUE" \
    -X POST "$API_BASE$path" \
    --data "$payload"
}

echo "Checking key governance status before ceremony..."
STATUS_BEFORE="$(run_get "/admin/keys/status")"
printf '%s\n' "$STATUS_BEFORE" >"$EVIDENCE_DIR/status-before.json"
printf '%s\n' "$STATUS_BEFORE" | jq '.'

ATT_PRIOR_KEY_ID="$(printf '%s\n' "$STATUS_BEFORE" | jq -r '.attestation.signerKeyId // empty')"
TR_PRIOR_KEM_KEY_ID="$(printf '%s\n' "$STATUS_BEFORE" | jq -r '.transport.kem.keyId // empty')"
TR_PRIOR_IDENTITY_KEY_ID="$(printf '%s\n' "$STATUS_BEFORE" | jq -r '.transport.identity.keyId // empty')"

if [[ "$TARGET" == "attestation" || "$TARGET" == "all" ]]; then
  echo ""
  echo "Running attestation signer rotation ceremony..."
  ATT_PAYLOAD="$(jq -cn \
    --arg reason "$REASON" \
    --arg changeTicket "$CHANGE_TICKET" \
    --arg requestedBy "$REQUESTED_BY" \
    --arg expectedPriorKeyId "$ATT_PRIOR_KEY_ID" \
    '{
      reason: $reason,
      changeTicket: (if ($changeTicket | length) > 0 then $changeTicket else null end),
      requestedBy: $requestedBy,
      expectedPriorKeyId: $expectedPriorKeyId,
      runRecoveryTest: true
    }')"
  ATT_ROTATION_RESULT="$(run_post "/admin/keys/attestation/rotate" "$ATT_PAYLOAD")"
  printf '%s\n' "$ATT_ROTATION_RESULT" >"$EVIDENCE_DIR/attestation-rotation.json"
  printf '%s\n' "$ATT_ROTATION_RESULT" | jq '.'
fi

if [[ "$TARGET" == "transport" || "$TARGET" == "all" ]]; then
  echo ""
  echo "Running transport key rotation ceremony..."
  TR_PAYLOAD="$(jq -cn \
    --arg reason "$REASON" \
    --arg changeTicket "$CHANGE_TICKET" \
    --arg requestedBy "$REQUESTED_BY" \
    --arg expectedPriorKemKeyId "$TR_PRIOR_KEM_KEY_ID" \
    --arg expectedPriorIdentityKeyId "$TR_PRIOR_IDENTITY_KEY_ID" \
    '{
      reason: $reason,
      changeTicket: (if ($changeTicket | length) > 0 then $changeTicket else null end),
      requestedBy: $requestedBy,
      expectedPriorKemKeyId: $expectedPriorKemKeyId,
      expectedPriorIdentityKeyId: $expectedPriorIdentityKeyId,
      runRecoveryTest: true
    }')"
  TR_ROTATION_RESULT="$(run_post "/admin/keys/transport/rotate" "$TR_PAYLOAD")"
  printf '%s\n' "$TR_ROTATION_RESULT" >"$EVIDENCE_DIR/transport-rotation.json"
  printf '%s\n' "$TR_ROTATION_RESULT" | jq '.'
fi

echo ""
echo "Running post-rotation recovery verification..."
RECOVERY_PAYLOAD="$(jq -cn --arg requestedBy "$REQUESTED_BY" '{scope:"all", requestedBy:$requestedBy}')"
RECOVERY_RESULT="$(run_post "/admin/keys/recovery-test" "$RECOVERY_PAYLOAD")"
printf '%s\n' "$RECOVERY_RESULT" >"$EVIDENCE_DIR/recovery-test.json"
printf '%s\n' "$RECOVERY_RESULT" | jq '.'

echo ""
echo "Checking key governance status after ceremony..."
STATUS_AFTER="$(run_get "/admin/keys/status")"
printf '%s\n' "$STATUS_AFTER" >"$EVIDENCE_DIR/status-after.json"
printf '%s\n' "$STATUS_AFTER" | jq '.'

echo ""
echo "Key rotation ceremony complete."
echo "Ceremony evidence saved to: $EVIDENCE_DIR"
