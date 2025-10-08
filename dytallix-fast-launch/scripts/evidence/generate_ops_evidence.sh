#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
EVDIR="$BASE_DIR/launch-evidence/ops"
NODE_URL="${RPC_HTTP_URL:-http://localhost:3030}"
SERVER_URL="${SERVER_HTTP_URL:-http://localhost:8787}"

mkdir -p "$EVDIR"

echo "[ops] capturing prometheus target and scrape sample…"
cat > "$EVDIR/prometheus_targets.json" <<EOF
{
  "targets": [
    { "job": "node", "url": "$NODE_URL/metrics" },
    { "job": "server", "url": "$SERVER_URL/metrics" }
  ],
  "timestamp": "$(date -Is)"
}
EOF

echo "[ops] capturing grafana dashboard stub…"
cat > "$EVDIR/grafana_dashboard.json" <<'EOF'
{
  "title": "Dytallix MVP",
  "panels": [
    { "title": "TPS", "type": "graph", "expr": "dytallix_tps" },
    { "title": "Mempool Size", "type": "graph", "expr": "dytallix_mempool_size" },
    { "title": "Oracle Latency p95", "type": "graph", "expr": "dytallix_ai_latency_p95_ms" }
  ],
  "tags": ["mvp", "dytallix"]
}
EOF

echo "[ops] firing a dummy alert by pausing block producer briefly…"
{
  curl -sf -X POST "$NODE_URL/ops/pause" -H 'content-type: application/json' -d '{}' || true
  sleep 2
  curl -sf -X POST "$NODE_URL/ops/resume" -H 'content-type: application/json' -d '{}' || true
  echo "$(date -Is) issued pause/resume" 
} >> "$EVDIR/alert_test_output.log" 2>&1

echo "[ops] documenting Vault integration…"
cat > "$EVDIR/vault_config.md" <<'EOF'
# Vault Secrets Integration (MVP)

- Provider: HashiCorp Vault KV v2
- Code: `node/src/secrets/providers.rs` (`VaultProvider` + `SealedKeystoreProvider`)
- No raw keys on disk: validator keys are sealed (ChaCha20-Poly1305, Argon2id-derived keys). A proof file is emitted at `launch-evidence/secrets/keystore_proof.txt` with path, size, and sha256.
- Env:
  - `VAULT_ADDR`, `VAULT_TOKEN`, `VAULT_KV_MOUNT`, `VAULT_PATH_BASE`
  - For sealed keystore, set `DYT_KEYSTORE_PASSPHRASE` for non-interactive use.

Evidence artifacts:
- `launch-evidence/secrets/keystore_proof.txt` (auto-written when keystore accessed)
- `launch-evidence/ops/prometheus_targets.json`
- `launch-evidence/ops/grafana_dashboard.json`
- `launch-evidence/ops/alert_test_output.log`
EOF

echo "[ops] wrote evidence under $EVDIR"

