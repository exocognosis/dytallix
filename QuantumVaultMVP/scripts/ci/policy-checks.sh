#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

FAILURES=0

run_check() {
  local description="$1"
  local regex="$2"

  local matches
  matches="$(
    rg -n --pcre2 "$regex" \
      --glob '!audit/**' \
      --glob '!docs/**' \
      --glob '!**/*.md' \
      --glob '!**/*.example' \
      --glob '!**/*.bak' \
      --glob '!**/package-lock.json' \
      --glob '!backend/src/main.ts' \
      --glob '!scripts/ci/policy-checks.sh' \
      . || true
  )"

  if [[ -n "$matches" ]]; then
    echo "❌ $description"
    echo "$matches"
    echo
    FAILURES=1
  fi
}

echo "Running QuantumVault policy checks..."

# Block known weak/default JWT secrets in committed runtime config.
run_check \
  "Disallowed JWT secret detected" \
  '^\s*JWT_SECRET\s*[:=]\s*["\x27]?(your-super-secret-jwt-key-change-in-production|production_secure_jwt_secret_change_me|changeme|change_me)["\x27]?\s*$'

# Block known Hardhat/dev private keys when assigned to blockchain signer config.
run_check \
  "Known development blockchain private key detected" \
  '^\s*BLOCKCHAIN_PRIVATE_KEY\s*[:=]\s*["\x27]?(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80|0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff81|0x59c6995e998f97a5a004497e5f4d6f2a2d3526f8f66d74fd9f5bff831f5f3f03)["\x27]?\s*$'

# Block default Vault root token values in runtime config.
run_check \
  "Disallowed Vault token detected" \
  '^\s*(VAULT_TOKEN|VAULT_DEV_ROOT_TOKEN_ID)\s*[:=]\s*["\x27]?(root|local-dev-token-change-me)["\x27]?\s*$'

# Block docker-compose fallback to the known static dev Vault token.
run_check \
  "Insecure docker-compose Vault token fallback detected" \
  'VAULT_DEV_ROOT_TOKEN_ID\s*:\s*\$\{VAULT_DEV_ROOT_TOKEN_ID:-local-dev-token-change-me\}'

if [[ "$FAILURES" -ne 0 ]]; then
  echo "Policy checks failed."
  exit 1
fi

echo "Policy checks passed."
