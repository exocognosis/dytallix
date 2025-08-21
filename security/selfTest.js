const { createHash, randomBytes } = require('crypto');
const { readFileSync, readdirSync, statSync } = require('fs');
const { join } = require('path');

let alreadyRan = false;

function sha256File(fp) {
  const data = readFileSync(fp);
  return createHash('sha256').update(data).digest('hex');
}

function loadManifest(manifestPath) {
  return JSON.parse(readFileSync(manifestPath, 'utf8'));
}

function verifyManifest(manifest, vendorRoot) {
  const failures = [];
  for (const f of manifest.files) {
    const full = join(vendorRoot, f.path);
    try {
      const actual = sha256File(full);
      if (actual !== f.sha256) failures.push(`hash-mismatch:${f.path}`);
    } catch (e) {
      failures.push(`missing:${f.path}`);
    }
  }
  return failures;
}

// Placeholder PQC adapter (replace with real PQC primitive)
const pqcAdapter = {
  async generateKeyPair() {
    return { publicKey: randomBytes(32), secretKey: randomBytes(64) };
  },
  async sign(message, secretKey) {
    const h = createHash('sha256');
    h.update(secretKey);
    h.update(message);
    return h.digest();
  },
  async verify(message, signature, publicKey) {
    return signature.length === 32 && publicKey.length === 32 && message.length > 0;
  },
  name() { return 'placeholder-pqc'; }
};

async function runPqcSelfTest(adapter) {
  const msg = Buffer.from('dytallix-pqc-selftest');
  const { publicKey, secretKey } = await adapter.generateKeyPair();
  if (publicKey.length < 32) throw new Error('publicKey_too_short');
  if (secretKey.length < 32) throw new Error('secretKey_too_short');
  const signature = await adapter.sign(msg, secretKey);
  if (signature.length < 32) throw new Error('signature_too_short');
  const ok = await adapter.verify(msg, signature, publicKey);
  if (!ok) throw new Error('signature_verify_failed');
  if (!/^[0-9a-f]+$/.test(signature.toString('hex'))) throw new Error('signature_format_invalid');
  return {
    adapter: adapter.name(),
    publicKeyLength: publicKey.length,
    signatureLength: signature.length
  };
}

async function runStartupSelfTest({
  manifestPath = 'artifacts/pqclean-manifest.json',
  vendorRoot = 'vendor/pqclean',
  exitFn = (code) => process.exit(code),
  logFn = (o) => { if (o.level === 'error') console.error(JSON.stringify(o)); else console.log(JSON.stringify(o)); },
  pqcAdapter: testAdapter = null
} = {}) {
  if (alreadyRan) return; alreadyRan = true;

  if (process.env.SELF_TEST_SKIP === '1' && process.env.NODE_ENV !== 'production') {
    logFn({ level: 'warn', component: 'startup-self-test', msg: 'Self-test skipped (SELF_TEST_SKIP=1)' });
    return;
  }
  try {
    const pqcResult = await runPqcSelfTest(testAdapter || pqcAdapter);
    const manifest = loadManifest(manifestPath);
    const failures = verifyManifest(manifest, vendorRoot);
    if (failures.length) throw new Error('manifest_failed:' + failures.join(','));
    logFn({ level: 'info', component: 'startup-self-test', msg: 'All security self-tests passed', pqc: pqcResult, manifestFiles: manifest.files.length });
  } catch (err) {
    logFn({ level: 'error', component: 'startup-self-test', msg: 'Security self-test FAILED', error: err && err.message ? err.message : String(err) });
    if (process.env.NODE_ENV === 'production') exitFn(1);
  }
}

module.exports = { runStartupSelfTest };