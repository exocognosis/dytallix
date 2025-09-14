#!/usr/bin/env bash
set -euo pipefail
: "${COSIGN_PUBKEY:?Set COSIGN_PUBKEY path or value}"

file="$1"
if [[ ! -f "$file" ]]; then
  echo "Usage: $0 <artifact.{json|sarif}>" >&2
  exit 2
fi

echo "Verifying signature for $file"
cosign verify-blob --key "$COSIGN_PUBKEY" --signature "$file.sig" "$file"
