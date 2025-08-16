#!/usr/bin/env bash
set -euo pipefail
TX_HASH="$1"; SCORE="$2"; SIG="$3"
curl -X POST localhost:3030/oracle/ai_risk -H 'Content-Type: application/json' \
  -d '{"tx_hash":"'"${TX_HASH}"'","score":'"${SCORE}"',"signature":"'"${SIG}"'"}'
