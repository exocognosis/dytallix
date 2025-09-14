#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

modules=(PulseGuard CodeShield)

status=0
for m in "${modules[@]}"; do
  if [ -d "$m" ]; then
    echo "[ModuleTests] Checking $m..."
    if [ -f "$m/Makefile" ]; then
      tgt=""
      if grep -qE "^smoke:" "$m/Makefile" 2>/dev/null; then
        tgt=smoke
      elif grep -qE "^test-pulseguard:" "$m/Makefile" 2>/dev/null; then
        tgt=test-pulseguard
      elif grep -qE "^test:" "$m/Makefile" 2>/dev/null; then
        tgt=test
      fi
      if [ -n "$tgt" ]; then
        echo "[ModuleTests] Running $tgt for $m..."
        if make -C "$m" "$tgt"; then
          echo "[ModuleTests] $m OK"
        else
          echo "[ModuleTests] $m FAILED"
          status=1
        fi
      else
        echo "[ModuleTests] Skipping $m (no known test target)"
      fi
    else
      echo "[ModuleTests] Skipping $m (no Makefile)"
    fi
  fi
done
exit $status
