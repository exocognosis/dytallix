#!/usr/bin/env bash
set -euo pipefail

echo "Running secrets preflight scan..."

BLOCK_PATTERNS=(
  "BEGIN PRIVATE KEY"
  "BEGIN RSA PRIVATE KEY"
  "BEGIN EC PRIVATE KEY"
  "PRIVATE KEY-----"
  "mnemonic"
)

fail=0
for pat in "${BLOCK_PATTERNS[@]}"; do
  if git ls-files -z | xargs -0 grep -I -n "$pat" >/dev/null 2>&1; then
    echo "❌ Found forbidden secret pattern: $pat"
    fail=1
  fi
done

if git ls-files '*key' '*_key' '*.pem' '*.der' 2>/dev/null | grep -q .; then
  echo "❌ Found files with suspicious key-like extensions"
  git ls-files '*key' '*_key' '*.pem' '*.der'
  fail=1
fi

if [ $fail -eq 1 ]; then
  echo "Preflight failed. Remove secrets and rely on Vault injection."
  exit 1
fi

echo "✅ Secrets preflight passed"