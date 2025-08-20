#!/usr/bin/env bash
# Usage: ORIGIN=https://dytallix.com bash scripts/test_cors.sh https://api.dytallix.com
set -euo pipefail
api="${1:-https://api.dytallix.com}";
origin="${ORIGIN:-https://dytallix.com}";
echo "Preflight OPTIONS...";
curl -i -X OPTIONS "$api/api/health" \
  -H "Origin: $origin" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type";
echo "";
echo "Actual GET...";
curl -i "$api/api/health" -H "Origin: $origin";