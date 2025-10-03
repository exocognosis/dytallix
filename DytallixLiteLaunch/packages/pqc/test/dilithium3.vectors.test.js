import assert from 'node:assert/strict';
import test from 'node:test';
import { verify, verifySm, canonicalBytes, keygen, sign, dilithiumAvailable } from '../dist/index.js';
import fs from 'node:fs';
import path from 'node:path';

const vectorsPath = path.join(path.dirname(new URL(import.meta.url).pathname), 'vectors', 'dilithium3.kat.min.json');
let kat;
try {
  kat = JSON.parse(fs.readFileSync(vectorsPath, 'utf8'));
} catch (_) {
  kat = { entries: [] };
}

const vectors = kat.entries || [];

// Dilithium3 sizes from PQClean META.yml
const D3_SIG_LEN = 3309; // length-signature
const D3_PK_LEN = 1952;  // length-public-key (not strictly required here)

let available = false;
await (async () => { try { available = await dilithiumAvailable(); } catch {} })();

if (!available) {
  test.skip('runtime sign/verify smoke', () => {});
  test.skip('dilithium3 KAT vectors (signed message, strict)', () => {});
} else {
  test('runtime sign/verify smoke', async () => {
    const kpJson = await keygen();
    const { pk, sk } = JSON.parse(kpJson);
    const msg = canonicalBytes({ a: 1, b: 2, note: 'pqc-e2e' });
    const sig = await sign(msg, sk);
    const ok = await verify(msg, sig, pk);
    assert.equal(ok, true);
  });

  test('dilithium3 KAT vectors (signed message, strict)', async () => {
    assert.ok(Array.isArray(vectors), 'vectors array present');
    let count = 0;
    for (const v of vectors) {
      // Decode base64 values
      const pk = Buffer.from(v.pk_b64 || '', 'base64');
      const sm = Buffer.from(v.sm_b64 || '', 'base64');
      const msg = Buffer.from(v.msg_b64 || '', 'base64');

      // Basic presence
      assert.ok(pk.length === D3_PK_LEN, `pk length mismatch for count=${v.count}`);
      assert.ok(sm.length >= D3_SIG_LEN, `sm too short for count=${v.count}`);

      // Structure: sm = sig || msg
      assert.equal(sm.length, D3_SIG_LEN + msg.length, `sm length != sig_len + mlen (count=${v.count})`);
      assert.equal(Buffer.compare(sm.slice(D3_SIG_LEN), msg), 0, `sm tail != msg bytes (count=${v.count})`);

      // Verify as signed message
      const ok1 = await verifySm(v.sm_b64, v.pk_b64);
      assert.equal(ok1, true, `verify_sm failed (count=${v.count})`);

      // Reconstruct detached signature (first 3309 bytes) and verify against msg
      const sigDetachedB64 = sm.slice(0, D3_SIG_LEN).toString('base64');
      const ok2 = await verify(msg, sigDetachedB64, v.pk_b64);
      assert.equal(ok2, true, `detached verify failed (count=${v.count})`);
      count++;
    }
    // Ensure we actually ran vectors
    assert.ok(count > 0, 'no KAT vectors loaded (populate test/vectors/dilithium3.kat.min.json)');
  });
}

test('canonical stringify deterministic', () => {
  const a = { b: 2, a: 1 };
  const b = { a: 1, b: 2 };
  const pa = canonicalBytes(a);
  const pb = canonicalBytes(b);
  assert.equal(Buffer.compare(Buffer.from(pa), Buffer.from(pb)), 0);
});
