import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import axios from 'axios';
import 'dotenv/config';

const app = express();
const PORT = process.env.EXPLORER_PORT || 3000;
const HOST = process.env.EXPLORER_HOST || '0.0.0.0';
const SERVER_API = process.env.SERVER_API || 'http://localhost:8080';
const NODE_RPC = process.env.NODE_RPC_URL || 'http://localhost:26657';
const NODE_REST = process.env.NODE_REST_URL || 'http://localhost:1317';
const BECH32_PREFIX = process.env.BECH32_PREFIX || 'dytallix';

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'dytallix-explorer', version: '0.1.0', timestamp: new Date().toISOString() });
});

// Root
app.get('/', (req, res) => {
  res.json({
    service: 'Dytallix Explorer',
    version: '0.1.0',
    description: 'Blockchain explorer for Dytallix testnet',
    endpoints: [
      'GET /health',
      'GET /api/blocks',
      'GET /api/transactions',
      'GET /api/transactions/:hash',
      'GET /api/verify/:hash',
      'GET /api/block/:height',
      'GET /api/block-by-hash/:hash',
      'GET /api/address/:address',
      'GET /api/search?query=...',
      'GET /api/status',
      'GET /api/validators'
    ]
  });
});

// Helpers
const getJson = async (url, params) => (await axios.get(url, { params })).data;
const isHex64 = (s) => /^[0-9a-fA-F]{64}$/.test(s);
const isAddress = (s) => typeof s === 'string' && s.startsWith(BECH32_PREFIX);

// Proxy to server stored blocks
app.get('/api/blocks', async (req, res) => {
  try {
    const r = await axios.get(`${SERVER_API}/blocks`, { params: { limit: req.query.limit || 20 } });
    res.json(r.data);
  } catch (e) {
    res.status(502).json({ error: 'Upstream error', message: e.message });
  }
});

// List recent txs
app.get('/api/transactions', async (req, res) => {
  try {
    const r = await axios.get(`${SERVER_API}/txs`, { params: { limit: req.query.limit || 50 } });
    res.json(r.data);
  } catch (e) {
    res.status(502).json({ error: 'Upstream error', message: e.message });
  }
});

// Get tx by hash
app.get('/api/transactions/:hash', async (req, res) => {
  try {
    const r = await axios.get(`${SERVER_API}/txs/${req.params.hash}`);
    res.json(r.data);
  } catch (e) {
    const status = e.response?.status || 500;
    res.status(status).json({ error: 'Not found or upstream error' });
  }
});

// Verify tx by also querying node RPC directly
app.get('/api/verify/:hash', async (req, res) => {
  try {
    const server = await axios.get(`${SERVER_API}/txs/${req.params.hash}`).then(r => r.data).catch(() => null);
    const node = await getJson(`${NODE_RPC}/tx`, { hash: `0x${req.params.hash}` }).catch(() => null);
    res.json({ server, node });
  } catch (e) {
    res.status(500).json({ error: 'Verification failed', message: e.message });
  }
});

// New: block by height
app.get('/api/block/:height', async (req, res) => {
  try {
    const h = parseInt(req.params.height, 10);
    if (!Number.isFinite(h) || h <= 0) return res.status(400).json({ error: 'Invalid height' });
    const block = await getJson(`${NODE_RPC}/block`, { height: h });
    const results = await getJson(`${NODE_RPC}/block_results`, { height: h }).catch(() => null);
    res.json({ block, results });
  } catch (e) {
    res.status(502).json({ error: 'RPC error', message: e.message });
  }
});

// New: block by hash (0x...) or hex64
app.get('/api/block-by-hash/:hash', async (req, res) => {
  try {
    const hash = req.params.hash.startsWith('0x') ? req.params.hash : (isHex64(req.params.hash) ? `0x${req.params.hash}` : req.params.hash);
    const data = await getJson(`${NODE_RPC}/block_by_hash`, { hash });
    res.json(data);
  } catch (e) {
    res.status(502).json({ error: 'RPC error', message: e.message });
  }
});

// New: address summary (balances + account + recent txs)
app.get('/api/address/:address', async (req, res) => {
  const address = req.params.address;
  if (!isAddress(address)) return res.status(400).json({ error: 'Invalid address format' });
  try {
    const balances = await getJson(`${NODE_REST}/cosmos/bank/v1beta1/balances/${address}`).catch(() => ({ balances: [] }));
    const account = await getJson(`${NODE_REST}/cosmos/auth/v1beta1/accounts/${address}`).catch(() => null);
    const txs = await axios.get(`${SERVER_API}/txs`, { params: { address, limit: 50 } }).then(r => r.data).catch(() => ({ data: [] }));
    res.json({ address, balances, account, txs });
  } catch (e) {
    res.status(500).json({ error: 'Address lookup failed', message: e.message });
  }
});

// New: unified search
app.get('/api/search', async (req, res) => {
  const q = (req.query.query || '').toString().trim();
  if (!q) return res.status(400).json({ error: 'Missing query' });
  try {
    // numeric -> block height
    if (/^\d+$/.test(q)) {
      const h = parseInt(q, 10);
      const block = await getJson(`${NODE_RPC}/block`, { height: h }).catch(() => null);
      const results = await getJson(`${NODE_RPC}/block_results`, { height: h }).catch(() => null);
      if (block) return res.json({ type: 'block', block, results });
    }
    // tx or block hash
    if (q.startsWith('0x') || isHex64(q)) {
      const hash0x = q.startsWith('0x') ? q : `0x${q}`;
      // try tx first
      const nodeTx = await getJson(`${NODE_RPC}/tx`, { hash: hash0x }).catch(() => null);
      if (nodeTx) return res.json({ type: 'tx', nodeTx });
      const block = await getJson(`${NODE_RPC}/block_by_hash`, { hash: hash0x }).catch(() => null);
      if (block) return res.json({ type: 'block', block });
    }
    // address
    if (isAddress(q)) {
      const balances = await getJson(`${NODE_REST}/cosmos/bank/v1beta1/balances/${q}`).catch(() => ({ balances: [] }));
      const account = await getJson(`${NODE_REST}/cosmos/auth/v1beta1/accounts/${q}`).catch(() => null);
      const txs = await axios.get(`${SERVER_API}/txs`, { params: { address: q, limit: 50 } }).then(r => r.data).catch(() => ({ data: [] }));
      return res.json({ type: 'address', address: q, balances, account, txs });
    }

    return res.status(404).json({ error: 'No results' });
  } catch (e) {
    res.status(500).json({ error: 'Search failed', message: e.message });
  }
});

// Network status and validators
app.get('/api/status', async (req, res) => {
  try {
    const status = await getJson(`${NODE_RPC}/status`);
    const server = await axios.get(`${SERVER_API}/status`).then(r => r.data).catch(() => null);
    res.json({ status, server, pqc: { enabled: PQC_ENABLED, algorithm: PQC_ALGO } });
  } catch (e) {
    res.status(502).json({ error: 'Status fetch failed', message: e.message });
  }
});

app.get('/api/validators', async (req, res) => {
  try {
    const bonded = await getJson(`${NODE_REST}/cosmos/staking/v1beta1/validators`, { status: 'BOND_STATUS_BONDED' }).catch(() => ({ validators: [] }));
    const unbonding = await getJson(`${NODE_REST}/cosmos/staking/v1beta1/validators`, { status: 'BOND_STATUS_UNBONDING' }).catch(() => ({ validators: [] }));
    const unbonded = await getJson(`${NODE_REST}/cosmos/staking/v1beta1/validators`, { status: 'BOND_STATUS_UNBONDED' }).catch(() => ({ validators: [] }));
    res.json({ bonded, unbonding, unbonded });
  } catch (e) {
    res.status(502).json({ error: 'Validators fetch failed', message: e.message });
  }
});

// Broadcast passthrough (optional)
app.post('/api/broadcast', async (req, res) => {
  try {
    const r = await axios.post(`${SERVER_API}/txs/broadcast`, req.body);
    res.json(r.data);
  } catch (e) {
    const status = e.response?.status || 500;
    res.status(status).json({ error: 'Broadcast failed' });
  }
});

// PQC configuration and helpers
const PQC_ENABLED = process.env.PQC_ENABLED === 'true';
const PQC_ALGO = (process.env.PQC_ALGORITHM || 'dilithium3').toLowerCase();
if (PQC_ENABLED && PQC_ALGO !== 'dilithium3') {
  throw new Error(`Unsupported PQC_ALGORITHM=${PQC_ALGO}. Only dilithium3 is allowed`);
}

let pqc = null;
async function loadPqc() {
  if (!pqc) {
    try {
      pqc = await import('../../packages/pqc/dist/index.js');
    } catch (_) {
      // fallback: try installed package name if published
      try { pqc = await import('@dyt/pqc'); } catch (e2) { throw e2; }
    }
  }
  return pqc;
}

// Add verification endpoint for TX envelopes
app.post('/api/verify-tx', async (req, res) => {
  try {
    if (!PQC_ENABLED) return res.status(400).json({ error: 'PQC not enabled' });
    const body = req.body;
    const signer = body?.signer; // { address, publicKey, algo }
    const sig = body?.signature;
    const signDoc = body?.body;
    if (!signer || !sig || !signDoc) return res.status(400).json({ error: 'Missing signer/signature/body' });
    if (signer.algo !== 'pqc/dilithium3') return res.status(400).json({ error: 'Invalid algo' });
    const { canonicalBytes } = await loadPqc();
    const { verify } = await loadPqc();
    const bytes = canonicalBytes(signDoc);
    const ok = await verify(bytes, sig, signer.publicKey);
    res.json({ ok });
  } catch (e) {
    res.status(500).json({ error: 'Verification failed', message: e.message });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, HOST, () => {
  console.log(`🔍 Dytallix Explorer running on http://${HOST}:${PORT}`);
});

export default app;