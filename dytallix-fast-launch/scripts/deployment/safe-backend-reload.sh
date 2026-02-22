#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-http://127.0.0.1:8787/api/status}"
FAUCET_URL="${FAUCET_URL:-http://127.0.0.1:3004/health}"
QUANTUMVAULT_URL="${QUANTUMVAULT_URL:-http://127.0.0.1:3031/health}"
WAIT_SECONDS="${WAIT_SECONDS:-45}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $*"; }
warn() { echo -e "${YELLOW}[$(date '+%H:%M:%S')]${NC} ⚠️  $*"; }
err() { echo -e "${RED}[$(date '+%H:%M:%S')]${NC} ❌ $*"; }

wait_for_http() {
  local name="$1"
  local url="$2"
  local max_wait="$3"

  for i in $(seq 1 "$max_wait"); do
    if curl -sf "$url" >/dev/null 2>&1; then
      log "${name} healthy at ${url}"
      return 0
    fi
    sleep 1
  done

  return 1
}

find_pm2_process() {
  for name in "$@"; do
    if pm2 describe "$name" >/dev/null 2>&1; then
      echo "$name"
      return 0
    fi
  done
  return 1
}

reload_with_health_gate() {
  local label="$1"
  local url="$2"
  shift 2
  local process_name=""

  if process_name="$(find_pm2_process "$@")"; then
    log "Reloading ${process_name} (${label})"
    pm2 reload "$process_name" --update-env
  else
    warn "pm2 process for ${label} not found (tried: $*)"
  fi

  if ! wait_for_http "$label" "$url" "$WAIT_SECONDS"; then
    err "${label} did not become healthy after reload"
    if [ -n "$process_name" ]; then
      pm2 logs "$process_name" --lines 80 --nostream || true
    fi
    exit 1
  fi
}

if ! command -v pm2 >/dev/null 2>&1; then
  err "pm2 not found. Install/enable pm2 before using this script."
  exit 1
fi

log "Reloading dytallix backend services with health gates"

reload_with_health_gate "API" "$API_URL" dytallix-api
reload_with_health_gate "Faucet" "$FAUCET_URL" faucet-api
reload_with_health_gate "QuantumVault API" "$QUANTUMVAULT_URL" qv-wallet-api quantumvault-api quantumvault

log "Reload completed without a hard-stop window"
