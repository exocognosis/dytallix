import { verify, canonicalBytes, keygen, sign } from '../src/index';

// Placeholder test harness; fill with real vectors in tests/pqc_vectors
const vectors: Array<{msg: string; pk: string; sig: string}> = [];

// Dynamically generated smoke vector using runtime keygen/sign to validate end-to-end path
// This is not a NIST KAT but ensures WASM-backed Dilithium3 works in CI.
test('runtime sign/verify smoke', async () => {
  const kpJson = await keygen();
  const { pk, sk } = JSON.parse(kpJson);
  const msg = canonicalBytes({ a: 1, b: 2, note: 'pqc-e2e' });
  const sig = await sign(msg, sk);
  const ok = await verify(msg, sig, pk);
  expect(ok).toBe(true);
});

test('verify vectors', async () => {
  for (const v of vectors) {
    const ok = await verify(Buffer.from(v.msg, 'base64'), v.sig, v.pk);
    expect(ok).toBe(true);
  }
});

test('canonical stringify deterministic', () => {
  const a = { b: 2, a: 1 } as any;
  const b = { a: 1, b: 2 } as any;
  const pa = canonicalBytes(a);
  const pb = canonicalBytes(b);
  expect(Buffer.compare(Buffer.from(pa), Buffer.from(pb))).toBe(0);
});
