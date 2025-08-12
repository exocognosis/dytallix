#!/usr/bin/env bash
set -euo pipefail
npm audit --omit=dev || true
# License scan (basic): list production deps with license fields
node - <<'NODE'
const fs=require('fs');
const pk=require('../package.json');
const { execSync } = require('child_process');
const prod=Object.keys(pk.dependencies||{});
console.log('Production dependency licenses:');
for (const d of prod){
  try {
    const lp=require(require.resolve(d + '/package.json'));
    console.log(`${d}@${lp.version}: ${lp.license||'UNKNOWN'}`);
  } catch(e){ console.log(`${d}: license lookup failed`); }
}
NODE
