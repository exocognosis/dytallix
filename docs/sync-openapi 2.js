#!/usr/bin/env node
// Sync OpenAPI spec from source repo path into static directory for docs consumption.
const fs = require('fs');
const path = require('path');

const source = path.resolve(__dirname, '../dytallix-lean-launch/openapi/openapi.yaml');
const destDir = path.resolve(__dirname, 'static/openapi');
const dest = path.join(destDir, 'openapi.yaml');

if (!fs.existsSync(source)) {
  console.error('[sync-openapi] Source spec not found at', source);
  process.exit(0); // non-fatal
}
fs.mkdirSync(destDir, { recursive: true });
const content = fs.readFileSync(source, 'utf8');
const header = '# Synced ' + new Date().toISOString() + '\n';
fs.writeFileSync(dest, header + content);
console.log('[sync-openapi] Copied spec to', path.relative(process.cwd(), dest));
