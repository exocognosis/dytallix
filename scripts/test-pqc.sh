#!/usr/bin/env bash
set -euo pipefail
export NODE_ENV="${NODE_ENV:-development}"
echo "[self-test] Running startup security self-test..."
node -e "require('./security/selfTest').runStartupSelfTest().catch(e=>{console.error(e);process.exit(1);})"
echo "[self-test] Completed."