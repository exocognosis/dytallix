#!/usr/bin/env bash
set -euo pipefail
mode="${1:-production}" # usage: bash scripts/verify_env.sh [mode]

required=(VITE_API_URL VITE_FAUCET_API_URL VITE_LCD_HTTP_URL VITE_RPC_HTTP_URL VITE_RPC_WS_URL VITE_CHAIN_ID)
missing=()
for var in "${required[@]}"; do
  if [ -z "${!var:-}" ]; then
    missing+=("$var")
  fi
done

if [ "${#missing[@]}" -gt 0 ]; then
  echo "Missing required variables: ${missing[*]}" >&2
  exit 1
fi

if [ "$mode" = "production" ]; then
  for v in VITE_API_URL VITE_FAUCET_API_URL; do
    val="${!v}"
    if [[ "$val" == *"localhost"* ]] || [[ "$val" == http://* ]]; then
      echo "Refusing production build: $v must be HTTPS non-localhost" >&2
      exit 2
    fi
  done
fi

echo "Env sanity OK for mode=$mode"