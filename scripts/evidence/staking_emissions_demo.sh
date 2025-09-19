#!/usr/bin/env bash
set -euo pipefail

# scripts/evidence/staking_emissions_demo.sh
# Wrapper for staking accrual + claim evidence. Anchors paths and copies artifacts to launch-evidence/staking/.

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOT_DIR=$(cd "$SCRIPT_DIR/../.." && pwd)
HELPER="$ROOT_DIR/scripts/e2e/staking_accrual.sh"
[[ -x "$HELPER" ]] || { echo "Missing helper $HELPER" >&2; exit 1; }

exec "$HELPER" "$@"
