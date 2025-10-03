import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { register } from 'prom-client';
import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import initSqlJs from 'sql.js';
import WebSocket from 'ws';

// PQC config
const PQC_ENABLED = process.env.PQC_ENABLED === 'true';
const PQC_ALGO = (process.env.PQC_ALGORITHM || 'dilithium3').toLowerCase();
if (PQC_ENABLED && PQC_ALGO !== 'dilithium3') {
  throw new Error(`Unsupported PQC_ALGORITHM=${PQC_ALGO}. Only dilithium3 is allowed`);
}
let pqc = null;
async function loadPqc() {
  if (!pqc) {
    try { pqc = await import('../../packages/pqc/dist/index.js'); } catch (_) { try { pqc = await import('@dyt/pqc'); } catch (e2) { throw e2; } }
  }
  return pqc;
}

const app = express();
const PORT = process.env.SERVER_PORT || 8080;
const HOST = process.env.SERVER_HOST || '0.0.0.0';
const NODE_RPC = process.env.NODE_RPC_URL || 'http://localhost:26657';
const NODE_WS = (process.env.NODE_WS_URL || NODE_RPC.replace('http', 'ws')) + '/websocket';

// Load tokenomics configuration
let tokenomicsConfig = {};
try {
  const tokenomicsData = await fs.readFile('./tokenomics.json', 'utf8');
  tokenomicsConfig = JSON.parse(tokenomicsData);
} catch (error) {
  console.error('Failed to load tokenomics.json:', error.message);
}

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.API_RATE_LIMIT || 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Metrics storage (in-memory for demo)
const metrics = {
  oracleRequests: 0,
  oracleErrors: 0,
  totalResponseTime: 0,
  averageResponseTime: 0,
  aiModelCalls: {
    'gpt-4': 0,
    'claude-3': 0,
    'llama-2': 0
  },
  tokenMetrics: {
    DGT: {
      totalSupply: tokenomicsConfig.tokens?.DGT?.total_supply || '1000000000000000',
      circulatingSupply: tokenomicsConfig.tokens?.DGT?.circulating_supply || '600000000000000'
    },
    DRT: {
      totalSupply: '0', // Starts at 0, grows through inflation
      inflationRate: tokenomicsConfig.tokens?.DRT?.inflation_rate || 0.05
    }
  }
};

// --- Persistence: sql.js (pure JS) ---
const SQL = await initSqlJs({ locateFile: (file) => `https://sql.js.org/dist/${file}` });
const dbFilePath = process.env.DB_PATH || path.resolve(process.cwd(), 'data.sqlite');
let dbBuffer = null;
try {
  dbBuffer = await fs.readFile(dbFilePath);
} catch (_) {}
const db = new SQL.Database(dbBuffer || undefined);

db.run(`
CREATE TABLE IF NOT EXISTS blocks (
  height INTEGER PRIMARY KEY,
  hash TEXT,
  time TEXT,
  tx_count INTEGER
);
CREATE TABLE IF NOT EXISTS txs (
  hash TEXT PRIMARY KEY,
  height INTEGER,
  index_in_block INTEGER,
  from_addr TEXT,
  to_addr TEXT,
  amount TEXT,
  denom TEXT,
  raw TEXT,
  status TEXT,
  timestamp TEXT
);
`);

function dbExec(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  stmt.step();
  stmt.free();
  persistDb();
}

function dbAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    rows.push(row);
  }
  stmt.free();
  return rows;
}

function dbGet(sql, params = []) {
  const rows = dbAll(sql, params);
  return rows[0] || null;
}

async function persistDb() {
  try {
    const data = db.export();
    await fs.writeFile(dbFilePath, Buffer.from(data));
  } catch (e) {
    // ignore persistence errors
  }
}

// --- Tendermint WebSocket subscription ---
function startNodeWs() {
  let ws;
  const connect = () => {
    ws = new WebSocket(NODE_WS);
    ws.on('open', () => {
      // Subscribe to new blocks
      ws.send(JSON.stringify({ jsonrpc: '2.0', method: 'subscribe', id: '1', params: { query: "tm.event='NewBlock'" } }));
      // Subscribe to new txs
      ws.send(JSON.stringify({ jsonrpc: '2.0', method: 'subscribe', id: '2', params: { query: "tm.event='Tx'" } }));
      console.log('WS connected to node');
    });
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.result?.data?.type === 'tendermint/event/NewBlock') {
          const block = msg.result.data.value.block;
          const height = parseInt(block.header.height, 10);
          const hash = msg.result.data.value.block_id?.hash || null;
          const time = block.header.time;
          const txs = block.data?.txs || [];
          dbExec('INSERT OR REPLACE INTO blocks(height, hash, time, tx_count) VALUES (?, ?, ?, ?)', [height, hash, time, txs.length]);
        }
        if (msg.result?.events?.['tx.hash']) {
          const hashes = msg.result.events['tx.hash'];
          const heightStr = msg.result.events['tx.height']?.[0];
          const height = heightStr ? parseInt(heightStr, 10) : null;
          hashes.forEach((h, i) => {
            dbExec('INSERT OR IGNORE INTO txs(hash, height, index_in_block, status, timestamp) VALUES (?, ?, ?, ?, ?)', [h, height, i, 'seen', new Date().toISOString()]);
          });
        }
      } catch (e) {
        // ignore
      }
    });
    ws.on('close', () => {
      console.log('WS disconnected, retrying in 3s');
      setTimeout(connect, 3000);
    });
    ws.on('error', () => {
      // handled by close
    });
  };
  connect();
}
startNodeWs();

// --- Broadcast endpoint via Tendermint RPC ---
app.post('/txs/broadcast', async (req, res) => {
  try {
    const { tx, meta } = req.body; // meta optional
    if (!tx) return res.status(400).json({ error: 'Missing tx' });

    if (PQC_ENABLED) {
      // Expect canonical envelope JSON with signer and signature
      let obj;
      if (typeof tx === 'string' && (tx.startsWith('{') || tx.startsWith('['))) {
        obj = JSON.parse(tx);
      } else if (typeof tx === 'object') {
        obj = tx;
      } else if (typeof tx === 'string' && tx.startsWith('0x')) {
        try { obj = JSON.parse(Buffer.from(tx.slice(2), 'hex').toString('utf8')); } catch (_) {}
      }
      if (!obj) return res.status(400).json({ error: 'Expected canonical JSON envelope when PQC enabled' });
      const signer = obj?.signer, sig = obj?.signature, body = obj?.body;
      if (!signer || !sig || !body) return res.status(400).json({ error: 'Missing signer/signature/body' });
      if (signer.algo !== 'pqc/dilithium3') return res.status(400).json({ error: 'Invalid algo' });
      const { canonicalBytes, verify } = await loadPqc();
      const bytes = canonicalBytes(body);
      const ok = await verify(bytes, sig, signer.publicKey);
      if (!ok) return res.status(400).json({ error: 'Invalid signature' });
      // On success, continue broadcasting the serialized tx object as JSON base64
    }

    // Normalize to base64 for Tendermint RPC
    let txParam;
    if (typeof tx === 'string') {
      const s = tx.trim();
      if (s.startsWith('0x')) {
        txParam = Buffer.from(s.slice(2), 'hex').toString('base64');
      } else if (/^[A-Za-z0-9+/=]+$/.test(s)) {
        // looks like base64 already
        txParam = s;
      } else if (s.startsWith('{') || s.startsWith('[')) {
        txParam = Buffer.from(s).toString('base64');
      } else {
        return res.status(400).json({ error: 'Unsupported tx format' });
      }
    } else if (tx && typeof tx === 'object') {
      txParam = Buffer.from(JSON.stringify(tx)).toString('base64');
    } else {
      return res.status(400).json({ error: 'Invalid tx' });
    }

    const url = `${NODE_RPC}/broadcast_tx_commit?tx=${encodeURIComponent(txParam)}`;
    const r = await axios.get(url);
    const result = r.data?.result;

    const txHash = result?.hash || result?.txhash || result?.deliver_tx?.hash || null;
    const height = result?.height ? parseInt(result.height, 10) : null;

    if (txHash) {
      const now = new Date().toISOString();
      dbExec(
        'INSERT OR IGNORE INTO txs(hash, height, status, timestamp, raw, from_addr, to_addr, amount, denom) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          txHash,
          height,
          'broadcast',
          now,
          JSON.stringify(result),
          meta?.from || null,
          meta?.to || null,
          meta?.amount || null,
          meta?.denom || null,
        ]
      );
    }

    return res.json({ success: true, result });
  } catch (e) {
    return res.status(500).json({ error: 'Broadcast failed', message: e.message });
  }
});

// --- Query endpoints ---
app.get('/blocks', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
  const rows = dbAll('SELECT height, hash, time, tx_count FROM blocks ORDER BY height DESC LIMIT ?', [limit]);
  res.json({ data: rows });
});

app.get('/txs/:hash', async (req, res) => {
  const { hash } = req.params;
  const row = dbGet('SELECT * FROM txs WHERE hash = ?', [hash]);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ data: row });
});

app.get('/txs', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
  const address = req.query.address;
  if (address) {
    const rows = dbAll(
      'SELECT hash, height, status, timestamp, from_addr, to_addr, amount, denom FROM txs WHERE from_addr = ? OR to_addr = ? ORDER BY rowid DESC LIMIT ?',
      [address, address, limit]
    );
    return res.json({ data: rows });
  }
  const rows = dbAll('SELECT hash, height, status, timestamp FROM txs ORDER BY rowid DESC LIMIT ?', [limit]);
  res.json({ data: rows });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '0.1.0',
    services: {
      oracle: 'operational',
      metrics: 'operational',
      tokenomics: 'loaded'
    }
  });
});

// AI Oracle endpoint
app.post('/oracle', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { prompt, model = 'gpt-4', max_tokens = 150 } = req.body;
    
    if (!prompt) {
      return res.status(400).json({
        error: 'Missing required field: prompt'
      });
    }

    // Simulate AI model processing
    const response = await simulateAIResponse(prompt, model, max_tokens);
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // Update metrics
    metrics.oracleRequests++;
    metrics.totalResponseTime += responseTime;
    metrics.averageResponseTime = metrics.totalResponseTime / metrics.oracleRequests;
    metrics.aiModelCalls[model] = (metrics.aiModelCalls[model] || 0) + 1;
    
    res.json({
      response: response,
      model: model,
      tokens_used: max_tokens,
      response_time_ms: responseTime,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    metrics.oracleErrors++;
    console.error('Oracle error:', error);
    
    res.status(500).json({
      error: 'Oracle processing failed',
      message: error.message
    });
  }
});

// Metrics endpoint (Prometheus format)
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Custom metrics endpoint (JSON)
app.get('/metrics/json', (req, res) => {
  res.json({
    oracle: {
      total_requests: metrics.oracleRequests,
      total_errors: metrics.oracleErrors,
      average_response_time_ms: Math.round(metrics.averageResponseTime),
      model_usage: metrics.aiModelCalls
    },
    tokens: metrics.tokenMetrics,
    system: {
      uptime_seconds: Math.floor(process.uptime()),
      memory_usage: process.memoryUsage(),
      node_version: process.version
    },
    timestamp: new Date().toISOString()
  });
});

// Tokenomics endpoint
app.get('/tokenomics', (req, res) => {
  res.json(tokenomicsConfig);
});

// DRT emissions calculation endpoint
app.post('/emissions/calculate', (req, res) => {
  const { blocks = 1 } = req.body;
  const emissionConfig = tokenomicsConfig.emissions;
  
  if (!emissionConfig?.enabled) {
    return res.status(400).json({
      error: 'Emissions not enabled'
    });
  }
  
  const blocksPerYear = emissionConfig.blocks_per_year || 5256000;
  const drtPerYear = emissionConfig.drt_per_year || '52560000000000';
  const drtPerBlock = Math.floor(parseInt(drtPerYear) / blocksPerYear);
  
  const totalEmission = drtPerBlock * blocks;
  const distribution = emissionConfig.distribution || {};
  
  res.json({
    blocks_processed: blocks,
    drt_per_block: drtPerBlock.toString(),
    total_emission: totalEmission.toString(),
    distribution: {
      validators: Math.floor(totalEmission * (distribution.validators || 0.6)),
      delegators: Math.floor(totalEmission * (distribution.delegators || 0.25)),
      ai_services: Math.floor(totalEmission * (distribution.ai_services || 0.10)),
      bridge_ops: Math.floor(totalEmission * (distribution.bridge_ops || 0.05))
    },
    timestamp: new Date().toISOString()
  });
});

// Status endpoint
app.get('/status', (req, res) => {
  res.json({
    service: 'dytallix-server',
    status: 'running',
    version: '0.1.0',
    chain_id: process.env.CHAIN_ID || 'dytallix-testnet-1',
    endpoints: {
      health: '/health',
      oracle: '/oracle',
      metrics: '/metrics',
      tokenomics: '/tokenomics',
      emissions: '/emissions/calculate',
      broadcast: '/txs/broadcast',
      blocks: '/blocks',
      txs: '/txs'
    },
    timestamp: new Date().toISOString()
  });
});

// Default route
app.get('/', (req, res) => {
  res.json({
    service: 'Dytallix Server',
    version: '0.1.0',
    description: 'AI Oracle and Metrics Server for Dytallix Testnet',
    documentation: '/status'
  });
});

// Simulate AI response (replace with actual AI service integration)
async function simulateAIResponse(prompt, model, maxTokens) {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 500));
  
  const responses = {
    'gpt-4': `AI Response (GPT-4): Processing "${prompt.substring(0, 50)}..." - This is a simulated response for testing purposes.`,
    'claude-3': `AI Response (Claude-3): Analyzing "${prompt.substring(0, 50)}..." - This is a simulated response for testing purposes.`,
    'llama-2': `AI Response (LLaMA-2): Understanding "${prompt.substring(0, 50)}..." - This is a simulated response for testing purposes.`
  };
  
  return responses[model] || responses['gpt-4'];
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Start server
app.listen(PORT, HOST, () => {
  console.log(`🚀 Dytallix Server running on http://${HOST}:${PORT}`);
  console.log(`📊 Metrics available at http://${HOST}:${PORT}/metrics`);
  console.log(`🤖 AI Oracle available at http://${HOST}:${PORT}/oracle`);
  console.log(`💰 Tokenomics data at http://${HOST}:${PORT}/tokenomics`);
});

export default app;