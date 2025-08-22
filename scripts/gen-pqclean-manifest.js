#!/usr/bin/env node
const { createHash } = require('crypto');
const { readdirSync, statSync, readFileSync, writeFileSync } = require('fs');
const { join, relative } = require('path');

const VENDOR_ROOT = 'vendor/pqclean';
const OUTPUT = 'artifacts/pqclean-manifest.json';

function listFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full));
    else if (/(\.(c|h|S|s|json|md))$/i.test(entry.name)) out.push(full);
  }
  return out;
}
function sha256(path) { return createHash('sha256').update(readFileSync(path)).digest('hex'); }
function main() {
  let files;
  try { files = listFiles(VENDOR_ROOT); } catch (e) { console.error(`Vendor root not found: ${VENDOR_ROOT}`); process.exit(1); }
  const manifest = { generated_at: new Date().toISOString(), tool: 'scripts/gen-pqclean-manifest.js', note: 'Update only via generation script; used for integrity verification at startup.', files: files.map(f => ({ path: relative(VENDOR_ROOT, f).replace(/\\/g, '/'), sha256: sha256(f) })) };
  writeFileSync(OUTPUT, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`Wrote manifest with ${manifest.files.length} files to ${OUTPUT}`);
}
main();