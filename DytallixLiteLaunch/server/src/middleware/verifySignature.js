import 'dotenv/config';

const PQC_ENABLED = process.env.PQC_ENABLED === 'true';
const PQC_ALGO = (process.env.PQC_ALGORITHM || 'dilithium3').toLowerCase();
let pqc = null;
async function loadPqc() {
  if (!pqc) pqc = await import('../../packages/pqc/dist/index.js').catch(() => import('@dyt/pqc'));
  return pqc;
}

export async function verifySignatureMiddleware(req, res, next) {
  if (!PQC_ENABLED) return next();
  try {
    const tx = req.body?.tx;
    if (!tx) return res.status(400).json({ error: 'Missing tx' });
    let obj = typeof tx === 'object' ? tx : (typeof tx === 'string' && tx.startsWith('{') ? JSON.parse(tx) : null);
    if (!obj) return res.status(400).json({ error: 'Expected canonical JSON envelope' });
    const signer = obj.signer, sig = obj.signature, body = obj.body;
    if (!signer || !sig || !body) return res.status(400).json({ error: 'Missing signer/signature/body' });
    if (signer.algo !== 'pqc/dilithium3' || PQC_ALGO !== 'dilithium3') return res.status(400).json({ error: 'Invalid algo' });
    const { canonicalBytes, verify } = await loadPqc();
    const bytes = canonicalBytes(body);
    const ok = await verify(bytes, sig, signer.publicKey);
    if (!ok) return res.status(400).json({ error: 'Invalid signature' });
    next();
  } catch (e) {
    res.status(500).json({ error: 'Verification failed', message: e.message });
  }
}
