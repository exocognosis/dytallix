#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONTRACTS_DIR="$ROOT_DIR/contracts"
BACKEND_ENV="$ROOT_DIR/backend/.env"
INFRA_ENV="$ROOT_DIR/infra/.env"

check_rpc() {
  curl -sS -m 2 http://127.0.0.1:8545 \
    -H 'content-type: application/json' \
    --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' >/dev/null
}

if ! check_rpc; then
  echo "Local RPC at http://127.0.0.1:8545 is not available."
  echo "Start one first (example):"
  echo "  cd $CONTRACTS_DIR && npx hardhat node"
  exit 1
fi

DEPLOY_JSON="$(cd "$CONTRACTS_DIR" && npx hardhat run scripts/redeploy_secure_owner.js --network localhost)"

OWNER_PRIVATE_KEY="$(printf "%s" "$DEPLOY_JSON" | node -e "const fs=require('fs'); const d=JSON.parse(fs.readFileSync(0,'utf8')); process.stdout.write(d.owner.privateKey)")"
CONTRACT_ADDRESS="$(printf "%s" "$DEPLOY_JSON" | node -e "const fs=require('fs'); const d=JSON.parse(fs.readFileSync(0,'utf8')); process.stdout.write(d.attestationContract.address)")"
CHAIN_ID="$(printf "%s" "$DEPLOY_JSON" | node -e "const fs=require('fs'); const d=JSON.parse(fs.readFileSync(0,'utf8')); process.stdout.write(String(d.network.chainId))")"

JWT_SECRET="$(openssl rand -base64 48 | tr -d '\n')"
DYTALLIX_API_TOKEN="$(openssl rand -hex 32)"

cat >"$BACKEND_ENV" <<EOF
# QuantumVault backend runtime config (generated)
DATABASE_URL="postgresql://quantumvault:changeme_secure_password@localhost:5432/quantumvault?schema=public"

PORT=3031
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=24h

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

VAULT_ADDR=http://127.0.0.1:8200
VAULT_AUTH_METHOD=approle
VAULT_ROLE_ID=REPLACE_WITH_ROLE_ID
VAULT_SECRET_ID=REPLACE_WITH_SECRET_ID
VAULT_TOKEN=
VAULT_NAMESPACE=quantumvault

ANCHORING_BACKEND=evm
BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545
BLOCKCHAIN_PRIVATE_KEY=$OWNER_PRIVATE_KEY
BLOCKCHAIN_CHAIN_ID=$CHAIN_ID
ATTESTATION_CONTRACT_ADDRESS=$CONTRACT_ADDRESS

DYTALLIX_API_URL=https://dytallix.example.com
DYTALLIX_API_TOKEN=$DYTALLIX_API_TOKEN

TLS_SCAN_TIMEOUT=30000
TLS_SCAN_CONCURRENT_LIMIT=5

PQC_ALGORITHM=ML-KEM-1024
PQC_SYMMETRIC_CIPHER=AES-256-GCM

ATTESTATION_KEY_BOOTSTRAP_ALLOWED=false
TRANSPORT_KEYS_BOOTSTRAP_ALLOWED=false
ATTESTATION_SIGNER_KEY_ID_PIN=
ATTESTATION_SIGNER_KEY_HASH_PIN=
TRANSPORT_KEM_KEY_ID_PIN=
TRANSPORT_KEM_KEY_HASH_PIN=
TRANSPORT_IDENTITY_KEY_ID_PIN=
TRANSPORT_IDENTITY_KEY_HASH_PIN=
LOG_LEVEL=info
EOF

cat >"$INFRA_ENV" <<EOF
# QuantumVault compose runtime config (generated)
JWT_SECRET=$JWT_SECRET
BLOCKCHAIN_PRIVATE_KEY=$OWNER_PRIVATE_KEY
BLOCKCHAIN_RPC_URL=http://host.docker.internal:8545
ATTESTATION_CONTRACT_ADDRESS=$CONTRACT_ADDRESS

ANCHORING_BACKEND=evm

VAULT_ADDR=http://vault:8200
VAULT_AUTH_METHOD=approle
VAULT_ROLE_ID=REPLACE_WITH_ROLE_ID
VAULT_SECRET_ID=REPLACE_WITH_SECRET_ID
VAULT_TOKEN=

ATTESTATION_KEY_BOOTSTRAP_ALLOWED=false
TRANSPORT_KEYS_BOOTSTRAP_ALLOWED=false
ATTESTATION_SIGNER_KEY_ID_PIN=
ATTESTATION_SIGNER_KEY_HASH_PIN=
TRANSPORT_KEM_KEY_ID_PIN=
TRANSPORT_KEM_KEY_HASH_PIN=
TRANSPORT_IDENTITY_KEY_ID_PIN=
TRANSPORT_IDENTITY_KEY_HASH_PIN=

DYTALLIX_API_URL=https://dytallix.example.com
DYTALLIX_API_TOKEN=$DYTALLIX_API_TOKEN
EOF

chmod 600 "$BACKEND_ENV" "$INFRA_ENV"

echo "Runtime files rotated:"
echo "  - $BACKEND_ENV"
echo "  - $INFRA_ENV"
echo
echo "New contract deployed:"
echo "  - ATTESTATION_CONTRACT_ADDRESS=$CONTRACT_ADDRESS"
echo
echo "Next step for Vault scoped auth:"
echo "  1) Bootstrap AppRole credentials and replace VAULT_ROLE_ID / VAULT_SECRET_ID"
echo "  2) Keep VAULT_TOKEN empty for normal operation"
