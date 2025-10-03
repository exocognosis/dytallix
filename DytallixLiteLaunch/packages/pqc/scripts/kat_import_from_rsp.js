#!/usr/bin/env node
/*
  Import NIST Dilithium3 KAT .rsp into curated JSON fixture for Node/Browser tests.
  Usage:
    node scripts/kat_import_from_rsp.js <path/to/PQCsignKAT_Dilithium3.rsp | path/to/Dilithium-Round3/> [out.json] [limit]

  Notes:
  - Only the fields {count, pk, sm, msg} are used. All values are emitted as base64.
  - The source .rsp contains hex strings without 0x prefix.
  - This tool emits a compact JSON fixture suitable for test/vectors/dilithium3.kat.min.json
  - If you pass the root of the unzipped NIST archive, the script will look for
    Dilithium/dilithium/KAT/dilithium3/PQCsignKAT_4016.rsp automatically.
  - Set env KAT_WRITE_PIN=1 to also write a sibling .sha256 pin file next to the JSON output.
*/
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const DEFAULT_INNER_RSP = path.join('Dilithium','dilithium','KAT','dilithium3','PQCsignKAT_4016.rsp');
const ALT_RSP_REGEX = /^PQCsignKAT_.*\.rsp$/i;

function hexToB64(hex) {
  if (!hex) return '';
  const clean = hex.trim().toLowerCase();
  if (!clean) return '';
  return Buffer.from(clean, 'hex').toString('base64');
}

function parseRsp(rspText, limit = Infinity) {
  const lines = rspText.split(/\r?\n/);
  const entries = [];
  let cur = {};
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^(\w+)\s*=\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    const val = m[2].trim();
    if (key === 'count') {
      if (Object.keys(cur).length && entries.length < limit) {
        // finalize previous record if not pushed
        if (cur.pk && cur.sm && (cur.msg || cur.m)) {
          entries.push({
            count: cur.count ?? entries.length,
            pk_b64: hexToB64(cur.pk),
            sm_b64: hexToB64(cur.sm),
            msg_b64: hexToB64(cur.msg || cur.m)
          });
        }
      }
      cur = { count: Number(val) };
    } else if (['seed','mlen','smlen','pk','sk','msg','m','sm'].includes(key)) {
      cur[key] = val;
    }
  }
  // push last
  if (Object.keys(cur).length && entries.length < limit) {
    if (cur.pk && cur.sm && (cur.msg || cur.m)) {
      entries.push({
        count: cur.count ?? entries.length,
        pk_b64: hexToB64(cur.pk),
        sm_b64: hexToB64(cur.sm),
        msg_b64: hexToB64(cur.msg || cur.m)
      });
    }
  }
  return entries;
}

function findFirstRsp(rootDir) {
  // Try the known inner path first
  const candidate = path.join(rootDir, DEFAULT_INNER_RSP);
  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  // Fallback: shallow recursive search for PQCsignKAT_*.rsp (limit depth ~4)
  const maxDepth = 4;
  const stack = [{ dir: rootDir, depth: 0 }];
  while (stack.length) {
    const { dir, depth } = stack.pop();
    if (depth > maxDepth) continue;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      const fp = path.join(dir, e.name);
      if (e.isFile() && ALT_RSP_REGEX.test(e.name)) return fp;
      if (e.isDirectory()) stack.push({ dir: fp, depth: depth + 1 });
    }
  }
  return null;
}

function main() {
  const [,, rspPathArg, outArg, limitArg] = process.argv;
  if (!rspPathArg) {
    console.error('Usage: node scripts/kat_import_from_rsp.js <path/to/PQCsignKAT_*.rsp | path/to/Dilithium-Round3/> [out.json] [limit]');
    process.exit(2);
  }
  let resolved = path.resolve(rspPathArg);
  if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
    const found = findFirstRsp(resolved);
    if (found) {
      console.error('Detected archive root; using RSP:', found);
      resolved = found;
    }
  }
  const outPath = path.resolve(outArg || path.join(process.cwd(), 'test', 'vectors', 'dilithium3.kat.min.json'));
  const limit = limitArg ? Number(limitArg) : Infinity;
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    console.error('KAT .rsp not found:', resolved);
    process.exit(1);
  }
  const text = fs.readFileSync(resolved, 'utf8');
  const entries = parseRsp(text, limit);
  const out = { source: 'NIST PQC Dilithium3 (curated)', entries };
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const jsonStr = JSON.stringify(out, null, 2) + '\n';
  fs.writeFileSync(outPath, jsonStr);
  const sha = crypto.createHash('sha256').update(jsonStr).digest('hex');
  // Optional pin file
  if (process.env.KAT_WRITE_PIN === '1') {
    const pinPath = outPath.replace(/\.json$/i, '.sha256');
    fs.writeFileSync(pinPath, sha + '\n');
    console.error('Pinned sha256 to', pinPath);
  }
  console.error('Wrote', outPath, 'entries=', entries.length, 'sha256=', sha);
}

main();
