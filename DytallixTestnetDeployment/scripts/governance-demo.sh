#!/usr/bin/env bash
# 🟢 Deployment copy (wraps upstream governance-demo.sh)
set -euo pipefail
exec bash -lc "$(dirname "$0")/../../dytallix-lean-launch/scripts/governance-demo.sh"
