#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT_DIR="$ROOT_DIR/launch-evidence/secrets"
REPORT="$OUT_DIR/secret-scan-report.json"

mkdir -p "$OUT_DIR"

run_gitleaks() {
  if command -v gitleaks >/dev/null 2>&1; then
    gitleaks detect --report-format json --report-path "$REPORT" --no-git
  elif command -v docker >/dev/null 2>&1; then
    docker run --rm -v "$ROOT_DIR:/repo" zricethezav/gitleaks:latest \
      detect -s /repo --report-format json --report-path /repo/launch-evidence/secrets/secret-scan-report.json --no-git
  else
    echo "gitleaks not found (and docker missing). Install gitleaks to run CI secret scan." >&2
    exit 2
  fi
}

echo "[secrets] Running secret scan..."
run_gitleaks

echo "[secrets] Scan complete: $REPORT"

# Fail if findings present (non-empty report and contains occurrences)
if [ -s "$REPORT" ] && jq -e '. | length > 0' "$REPORT" >/dev/null 2>&1; then
  echo "[secrets] Findings detected. Failing CI." >&2
  exit 1
fi
exit 0

