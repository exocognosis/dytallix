#!/usr/bin/env bash
set -euo pipefail

echo "Running secrets preflight scan..."

BLOCK_PATTERNS=(
  "BEGIN PRIVATE KEY"
  "BEGIN RSA PRIVATE KEY" 
  "BEGIN EC PRIVATE KEY"
  "PRIVATE KEY-----"
)

fail=0
for pat in "${BLOCK_PATTERNS[@]}"; do
  matches=$(git ls-files -z | xargs -0 grep -l -I "$pat" 2>/dev/null | grep -v "scripts/preflight_secrets.sh" || true)
  if [ -n "$matches" ]; then
    echo "❌ Found forbidden secret pattern: $pat"
    echo "$matches"
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