#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="artifacts/security"
OUT_FILE="$OUT_DIR/audit.txt"
mkdir -p "$OUT_DIR"

{
  echo "==== Dytallix Security Audit $(date -Iseconds) ===="
  echo "Node: $(node -v)" || true
  echo "NPM: $(npm -v)" || true
  echo
  echo "-- Production Dependency Audit (npm audit --omit=dev) --"
  npm audit --omit=dev || true
  echo
  echo "-- Production Dependency Licenses --"
  node - <<'NODE'
const pk=require('../package.json');
const prod=Object.keys(pk.dependencies||{}).sort();
for (const d of prod){
  try { const lp=require(require.resolve(d + '/package.json')); console.log(`${d}@${lp.version}: ${lp.license||'UNKNOWN'}`); }
  catch(e){ console.log(`${d}: license lookup failed`); }
}
NODE
  echo
  echo "==== End Audit ===="
} | tee "$OUT_FILE"

echo "Wrote audit report to $OUT_FILE"
