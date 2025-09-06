import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { requestLogger, logError, logInfo } from './logger.js'
import { WebSocketServer } from 'ws'
import { assertNotLimited, markGranted } from './rateLimit.js'
import { transfer, getMaxFor } from './transfer.js'
import { register, rateLimitHitsTotal, faucetRequestsTotal } from './metrics.js'
import { ContractScanner } from './src/scanner/index.js'
import { AnomalyDetectionEngine } from '../backend/pulsescan/anomaly_engine.js'
import fs from 'fs'
import os from 'os'

/*
 * Dytallix Minimal Server / Faucet + Dashboard API (merged)
 * Contains security headers + dashboard endpoints + faucet logic.
 */

dotenv.config()

// Production environment validation
if (process.env.NODE_ENV === 'production') {
  const requiredSecrets = ['FAUCET_MNEMONIC']
  const missing = requiredSecrets.filter(secret => !process.env[secret] || process.env[secret].includes('placeholder'))
  
  if (missing.length > 0) {
    logError('Production startup failed: missing required secrets', { missing })
    process.exit(1)
  }
  
  logInfo('Production environment validation passed')
}

const app = express()
const PORT = process.env.PORT || 8787
const ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:5173'
const COOLDOWN_MIN = parseInt(process.env.FAUCET_COOLDOWN_MINUTES || '60', 10)
const ENABLE_SEC_HEADERS = process.env.ENABLE_SEC_HEADERS === '1'
const ENABLE_CSP = process.env.ENABLE_CSP === '1' || ENABLE_SEC_HEADERS
const BECH32_PREFIX = process.env.CHAIN_PREFIX || process.env.BECH32_PREFIX || 'dytallix'

// Initialize contract scanner
const contractScanner = new ContractScanner({
  timeout: 30000,
  maxConcurrency: 3,
  useMocks: true // Use mocks for now until tools are installed
})

// Initialize anomaly detection engine
const anomalyEngine = new AnomalyDetectionEngine({
  configPath: null, // Skip YAML loading for now
  storage: {
    type: 'memory',
    maxPoints: 5000, // Reduced for demo
    retentionMs: 4 * 60 * 60 * 1000 // 4 hours
  },
  detectors: {
    tx_spike: {
      enabled: true,
      windowSize: 60, // 1 minute window for demo
      zThreshold: 3.0, // Lower threshold for demo
      minRate: 5
    },
    validator_downtime: {
      enabled: true,
      missThreshold: 2, // Lower threshold for demo
      criticalMissThreshold: 5
    },
    double_sign: {
      enabled: true
    }
  },
  collectors: {
    mempool: {
      enabled: true,
      pollInterval: 2000 // 2 seconds for demo
    },
    block: {
      enabled: true,
      pollInterval: 6000 // 6 seconds for demo
    }
  },
  alerts: {
    minSeverity: 'medium',
    webhook: {
      enabled: false
    },
    slack: {
      enabled: false
    }
  }
})

// Start anomaly detection engine
anomalyEngine.start().catch(err => {
  logError('Failed to start anomaly detection engine', err)
})

// Load tokenomics metadata (non-fatal if missing)
let tokenomicsMeta = null
try { tokenomicsMeta = JSON.parse(fs.readFileSync(new URL('./tokenomics.json', import.meta.url), 'utf8')) } catch { /* optional */ }

// Collect external connectivity exceptions for CSP connect-src
function collectConnectSrc() {
  const candidates = [
    process.env.VITE_LCD_HTTP_URL,
    process.env.VITE_RPC_HTTP_URL,
    process.env.VITE_RPC_WS_URL,
    process.env.RPC_HTTP_URL,
    process.env.RPC_URL,
    process.env.VITE_API_URL, // New unified API endpoint
    process.env.VITE_FAUCET_URL // Optional explicit faucet endpoint  
  ].filter(Boolean)
  const origins = new Set(["'self'" ])
  for (const c of candidates) {
    try {
      const u = new URL(c)
      origins.add(u.origin)
    } catch { /* ignore malformed */ }
  }
  // Always allow websocket scheme for same host (HMR / Tendermint RPC WS) – explicit origins already added
  return Array.from(origins).join(' ')
}

// Optional security headers (safe for API responses)
if (ENABLE_SEC_HEADERS) {
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Referrer-Policy', 'no-referrer')
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site')
    if (ENABLE_CSP) {
      const connectSrc = collectConnectSrc()
      // No inline/eval scripts; no remote scripts/styles; images/fonts inherit default-src self.
      // Add additional origins ONLY via env vars above – do not edit the string directly.
      const csp = [
        "default-src 'self'", // strict baseline
        "script-src 'self'", // bundler outputs only
        `connect-src ${connectSrc} ws: wss:`, // ws:/wss: needed for local dev + Tendermint events
        "img-src 'self' data:", // allow data for small inline icons / QR codes
        "style-src 'self' 'unsafe-inline'", // React inlined styles (can be tightened with hashing later)
        "object-src 'none'",
        "base-uri 'none'",
        "frame-ancestors 'none'",
        "form-action 'self'"
      ].join('; ')
      res.setHeader('Content-Security-Policy', csp)
    }
    next()
  })
  logInfo('Security headers enabled', { ENABLE_CSP })
}

app.use(cors({ origin: ORIGIN }))
app.use(express.json({ limit: '110kb' }))
app.use(requestLogger)

const sanitizeToken = (t) => (typeof t === 'string' ? t.trim().toUpperCase() : '')

function isBech32Address(addr) {
  return typeof addr === 'string' && addr.startsWith(`${BECH32_PREFIX}1`) && addr.length >= (BECH32_PREFIX.length + 10)
}

const RPC_HTTP = process.env.VITE_RPC_HTTP_URL || process.env.RPC_HTTP_URL
async function fetchNodeStatus() {
  if (!RPC_HTTP) {
    const e = new Error('RPC_NOT_CONFIGURED')
    e.status = 500
    throw e
  }
  const r = await fetch(`${RPC_HTTP}/status`)
  if (!r.ok) {
    const e = new Error(`RPC_STATUS_FAILED_${r.status}`)
    e.status = 502
    throw e
  }
  const j = await r.json().catch(() => ({}))
  const network = j?.result?.node_info?.network || null
  const heightStr = j?.result?.sync_info?.latest_block_height
  const height = Number(heightStr || 0)
  return { network, height, raw: j }
}

// Standardized API status endpoint
app.get('/api/status', async (req, res, next) => {
  try {
    const started = Date.now()
    let network = 'unknown'
    let nodeStatus = false
    
    try {
      const nodeInfo = await fetchNodeStatus()
      network = nodeInfo.network || 'dytallix-testnet-1'
      nodeStatus = true
    } catch (nodeErr) {
      logError('Node status check failed', nodeErr)
    }

    const response = {
      ok: nodeStatus,
      network,
      redis: !!process.env.DLX_RATE_LIMIT_REDIS_URL, // Redis availability
      rateLimit: {
        dgtWindowHours: 24,
        drtWindowHours: 6,
        maxRequests: 1 // One request per window per token
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }
    
    res.json(response)
    logInfo('api.status', { ms: Date.now() - started, network, redis: response.redis })
  } catch (err) { 
    next(err) 
  }
})

// -------------------------
// Explorer proxy to Node (port 3030)
// -------------------------
const NODE_BASE = process.env.RPC_HTTP_URL || 'http://localhost:3030'

async function nodeGet(path) {
  const r = await fetch(NODE_BASE + path)
  if (!r.ok) {
    const e = new Error(`NODE_${r.status}`)
    e.status = r.status
    throw e
  }
  return r.json()
}

// Recent blocks
app.get('/api/blocks', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit || 10), 50)
    const list = await nodeGet(`/blocks?limit=${limit}`)
    // Enrich with timestamps by fetching full blocks in parallel (bounded)
    const blocks = await Promise.all((list.blocks || []).map(async (b) => {
      try {
        const full = await nodeGet(`/block/${b.height}`)
        return {
          height: full.height,
          hash: full.hash,
          time: full.timestamp || full.time || null,
          txCount: Array.isArray(full.txs) ? full.txs.length : (Array.isArray(b.txs) ? b.txs.length : 0)
        }
      } catch {
        return {
          height: b.height,
          hash: b.hash,
          time: null,
          txCount: Array.isArray(b.txs) ? b.txs.length : 0
        }
      }
    }))
    res.json({ blocks })
  } catch (err) { next(err) }
})

// Block by height/hash
app.get('/api/blocks/:id', async (req, res, next) => {
  try {
    const id = req.params.id
    const b = await nodeGet(`/block/${encodeURIComponent(id)}`)
    const txs = Array.isArray(b.txs) ? b.txs.map((t) => ({
      hash: t.hash,
      from: t.from,
      to: t.to,
      amount: t.amount,
      fee: t.fee,
      status: 'confirmed'
    })) : []
    res.json({ hash: b.hash, height: b.height, time: b.timestamp, txs })
  } catch (err) { next(err) }
})

// Transactions (flatten recent blocks)
app.get('/api/transactions', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit || 20), 200)
    // Fetch last ~5 blocks and flatten txs until we collect limit
    const head = await nodeGet('/blocks?limit=8')
    const heights = (head.blocks || []).map((b) => b.height)
    const out = []
    for (const h of heights) {
      if (out.length >= limit) break
      try {
        const b = await nodeGet(`/block/${h}`)
        for (const t of (b.txs || [])) {
          if (out.length >= limit) break
          out.push({
            hash: t.hash,
            from: t.from,
            to: t.to,
            amount: t.amount,
            height: b.height,
            time: b.timestamp || null,
            status: 'confirmed'
          })
        }
      } catch {/* ignore per-block errors */}
    }
    res.json({ transactions: out })
  } catch (err) { next(err) }
})

// Transaction by hash (with AI risk if present)
app.get('/api/transactions/:hash', async (req, res, next) => {
  try {
    const h = req.params.hash
    const r = await nodeGet(`/tx/${encodeURIComponent(h)}`)
    res.json(r)
  } catch (err) { next(err) }
})

// Address overview + balances
app.get('/api/addresses/:addr', async (req, res, next) => {
  try {
    const a = req.params.addr
    const acc = await nodeGet(`/account/${encodeURIComponent(a)}`)
    const b = await nodeGet(`/balance/${encodeURIComponent(a)}`)
    const udgt = Number(b?.balances?.udgt?.balance || 0)
    const udrt = Number(b?.balances?.udrt?.balance || 0)
    res.json({
      address: a,
      balance: `${Math.floor(udgt/1_000_000)} DGT / ${Math.floor(udrt/1_000_000)} DRT`,
      balances: b?.balances || {},
      nonce: acc?.nonce || 0,
      firstSeen: null,
      lastSeen: null
    })
  } catch (err) { next(err) }
})

// Address tx history (scan recent blocks)
app.get('/api/addresses/:addr/transactions', async (req, res, next) => {
  try {
    const a = req.params.addr
    const limit = Math.min(Number(req.query.limit || 20), 200)
    const head = await nodeGet('/blocks?limit=20')
    const heights = (head.blocks || []).map((b) => b.height)
    const out = []
    for (const h of heights) {
      if (out.length >= limit) break
      try {
        const b = await nodeGet(`/block/${h}`)
        for (const t of (b.txs || [])) {
          if (out.length >= limit) break
          if (t.from === a || t.to === a) {
            out.push({ hash: t.hash, to: t.to, from: t.from, amount: t.amount, height: b.height, time: b.timestamp, status: 'confirmed' })
          }
        }
      } catch {/* continue */}
    }
    res.json({ transactions: out })
  } catch (err) { next(err) }
})

// Search helper (block|transaction|address)
app.get('/api/search/:q', async (req, res) => {
  const q = String(req.params.q || '').trim()
  const results = []
  if (/^\d+$/.test(q)) results.push({ type: 'block', data: { height: Number(q) } })
  if (/^0x[a-fA-F0-9]{64}$/.test(q)) results.push({ type: 'transaction', data: { hash: q } })
  if (/^dyt[a-z0-9]+$/.test(q)) results.push({ type: 'address', data: { address: q } })
  res.json({ results })
})

// Governance proxies
app.get('/api/governance/proposals', async (req, res, next) => {
  try { res.json(await nodeGet('/api/governance/proposals')) } catch (e) { next(e) }
})
app.get('/api/governance/proposals/:id', async (req, res, next) => {
  try { res.json(await nodeGet(`/gov/proposal/${encodeURIComponent(req.params.id)}`)) } catch (e) { next(e) }
})
app.get('/api/governance/proposals/:id/tally', async (req, res, next) => {
  try { res.json(await nodeGet(`/gov/tally/${encodeURIComponent(req.params.id)}`)) } catch (e) { next(e) }
})
app.post('/api/governance/submit', async (req, res, next) => {
  try {
    const r = await fetch(NODE_BASE + '/gov/submit', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(req.body || {}) })
    const j = await r.json().catch(() => null)
    if (!r.ok) return next(Object.assign(new Error('NODE_'+r.status), { status: r.status }))
    res.json(j)
  } catch (e) { next(e) }
})
app.post('/api/governance/deposit', async (req, res, next) => {
  try {
    const r = await fetch(NODE_BASE + '/gov/deposit', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(req.body || {}) })
    const j = await r.json().catch(() => null)
    if (!r.ok) return next(Object.assign(new Error('NODE_'+r.status), { status: r.status }))
    res.json(j)
  } catch (e) { next(e) }
})
app.post('/api/governance/vote', async (req, res, next) => {
  try {
    const r = await fetch(NODE_BASE + '/gov/vote', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(req.body || {}) })
    const j = await r.json().catch(() => null)
    if (!r.ok) return next(Object.assign(new Error('NODE_'+r.status), { status: r.status }))
    res.json(j)
  } catch (e) { next(e) }
})

// Staking (minimal): accrued + APR placeholder
app.get('/api/staking/accrued/:address', async (req, res, next) => {
  try { res.json(await nodeGet(`/api/staking/accrued/${encodeURIComponent(req.params.address)}`)) } catch (e) { next(e) }
})

// Contracts: list, deploy, execute
app.get('/api/contracts', async (req, res, next) => {
  try { res.json(await nodeGet('/api/contracts')) } catch (e) { next(e) }
})
app.post('/api/contracts/deploy', async (req, res, next) => {
  try {
    const codeHex = String(req.body?.code_hex || '')
    const gasLimit = Number(req.body?.gas_limit || 100000)
    if (!codeHex) return res.status(400).json({ error: 'missing code_hex' })
    const body = { jsonrpc: '2.0', id: 1, method: 'contract_deploy', params: [{ code: codeHex, gas_limit: gasLimit }] }
    const r = await fetch(NODE_BASE + '/rpc', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    const j = await r.json().catch(() => null)
    if (!r.ok) return next(Object.assign(new Error('NODE_'+r.status), { status: r.status }))
    res.json(j?.result || j)
  } catch (e) { next(e) }
})
app.post('/api/contracts/:address/execute', async (req, res, next) => {
  try {
    const address = req.params.address
    const func = String(req.body?.function || 'get')
    const gasLimit = Number(req.body?.gas_limit || 100000)
    const body = { jsonrpc: '2.0', id: 1, method: 'contract_execute', params: [{ contract_address: address, function: func, gas_limit: gasLimit }] }
    const r = await fetch(NODE_BASE + '/rpc', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    const j = await r.json().catch(() => null)
    if (!r.ok) return next(Object.assign(new Error('NODE_'+r.status), { status: r.status }))
    res.json(j?.result || j)
  } catch (e) { next(e) }
})
app.get('/api/staking/apr', (req, res) => {
  res.json({ apr: 0.12, asOf: new Date().toISOString() }) // placeholder 12%
})

// AI risk passthrough for a transaction (if present on node receipts)
app.get('/api/ai/risk/transaction/:hash', async (req, res) => {
  try {
    const r = await nodeGet(`/tx/${encodeURIComponent(req.params.hash)}`)
    if (r && (r.ai_risk_score != null)) {
      const level = r.ai_risk_score < 0.3 ? 'low' : (r.ai_risk_score < 0.7 ? 'medium' : 'high')
      return res.json({ score: r.ai_risk_score, level, model: r.ai_model_id || 'default' })
    }
    res.status(404).json({ error: 'NO_RISK_DATA' })
  } catch { res.status(404).json({ error: 'NO_RISK_DATA' }) }
})

// Enhanced balance endpoint - support query parameter format
app.get('/api/balance', async (req, res, next) => {
  try {
    const address = req.query.address || req.params.address
    
    if (!address || !isBech32Address(address)) {
      return res.status(400).json({
        error: 'Invalid address parameter'
      })
    }

    // Mock balance response - in production this would query the blockchain
    const balances = [
      { symbol: 'DGT', amount: '0', denom: 'udgt' },
      { symbol: 'DRT', amount: '0', denom: 'udrt' }
    ]

    res.json({
      address,
      balances
    })
  } catch (err) {
    next(err)
  }
})

// Legacy balance endpoint for compatibility
app.get('/api/balance/:address', async (req, res, next) => {
  req.query.address = req.params.address
  return app._router.handle(req, res, next)
})

// Minimal Cosmos-backed status endpoints (existing - keep for compatibility)
app.get('/api/status/height', async (req, res, next) => {
  try {
    // Prefer RPC if available
    try {
      const { height } = await fetchNodeStatus()
      return res.json({ ok: true, height })
    } catch {
      // Fallback to local node stats to avoid 500 for dashboard
      const stats = await fetchNodeStats()
      const height = Number(stats.height || stats.block_height || stats.latest_block_height || 0)
      return res.json({ ok: Number.isFinite(height), height })
    }
  } catch (err) { next(err) }
})

app.get('/api/status/node', async (req, res, next) => {
  try {
    const { network, height, raw } = await fetchNodeStatus()
    // Include normalized fields and keep raw status for back-compat
    res.json({ ok: true, network, chain_id: network || null, height, status: raw })
  } catch (err) { next(err) }
})

// New dashboard endpoints (backward compat for earlier frontend calls expecting /api/dashboard/*)
app.get('/api/dashboard/overview', async (req, res, next) => {
  try {
    const started = Date.now()
    let network = 'dytallix-local'
    let heightFromRpc = undefined
    try {
      const rpc = await fetchNodeStatus()
      network = rpc.network || network
      heightFromRpc = rpc.height
    } catch (e) {
      // Non-fatal: RPC not configured or down; fall back to local samples
      logError('dashboard.overview.rpc_unavailable', e)
    }

    const sampled = await sampleMetrics()
    const cpu = computeCpuPercent()
    const memory = computeMemoryPercent()
    const payload = {
      ok: true,
      height: Number.isFinite(heightFromRpc) ? heightFromRpc : (Number.isFinite(sampled.height) ? sampled.height : undefined),
      network,
      tps: sampled.tps,
      blockTime: sampled.blockTime,
      peers: sampled.peers,
      validators: undefined,
      finality: undefined,
      mempool: Number.isFinite(sampled.mempool) ? sampled.mempool : undefined,
      cpu,
      memory,
      diskIO: undefined,
      updatedAt: new Date().toISOString()
    }
    res.setHeader('Cache-Control', 'no-store')
    res.json(payload)
    logInfo('dashboard.overview', { ms: Date.now() - started, height: payload.height, network })
  } catch (err) { next(err) }
})

function synthesizeSeries(metric, range) {
  const now = Date.now()
  const normRange = (range || '').toLowerCase()
  let pointsWanted = 15
  let intervalMs = 60_000 // 1m
  if (normRange === '1h') { pointsWanted = 12; intervalMs = 5 * 60_000 }
  else if (normRange === '24h') { pointsWanted = 24; intervalMs = 60 * 60_000 }
  else if (normRange === '7d') { pointsWanted = 28; intervalMs = 6 * 60 * 60_000 }

  const series = []
  for (let i = pointsWanted - 1; i >= 0; i--) {
    const t = now - (i * intervalMs)
    let base
    if (metric === 'tps') base = 5
    else if (metric === 'blockTime') base = 6 // seconds
    else if (metric === 'peers') base = 8
    else base = 1
    const variance = metric === 'blockTime' ? 1 : metric === 'tps' ? 2 : 3
    const v = Number((base + (Math.random() - 0.5) * variance).toFixed(2))
    series.push({ t, v })
  }
  return series
}

app.get('/api/dashboard/timeseries', async (req, res, next) => {
  try {
    const { metric, range } = req.query || {}
    if (!metric || !['tps', 'blockTime', 'peers'].includes(metric)) {
      const e = new Error('INVALID_METRIC')
      e.status = 400
      throw e
    }
    const started = Date.now()
    // Optionally include latest height for alignment
    let height = null
    try {
      const status = await fetchNodeStatus()
      height = status.height
    } catch { /* ignore for placeholder series */ }
    const points = synthesizeSeries(metric, range)
    const payload = { ok: true, metric, range: range || 'default', points, height, updatedAt: new Date().toISOString() }
    res.setHeader('Cache-Control', 'no-store')
    res.json(payload)
    logInfo('dashboard.timeseries', { metric, range, count: points.length, ms: Date.now() - started })
  } catch (err) { next(err) }
})

app.post('/api/faucet', async (req, res, next) => {
  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown'
    const { address, token, tokens } = req.body || {}

    const cleanAddress = typeof address === 'string' ? address.trim() : ''
    
    // Support both legacy single token and new dual-token requests
    let requestedTokens = []
    if (tokens && Array.isArray(tokens)) {
      // New format: { address, tokens: ['DGT', 'DRT'] }
      requestedTokens = tokens.map(sanitizeToken).filter(t => ['DGT', 'DRT'].includes(t))
    } else if (token) {
      // Legacy format: { address, token: 'DGT' }
      const cleanToken = sanitizeToken(token)
      if (['DGT', 'DRT'].includes(cleanToken)) {
        requestedTokens = [cleanToken]
      }
    }

    if (!isBech32Address(cleanAddress)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_ADDRESS',
        message: 'Please enter a valid Dytallix bech32 address'
      })
    }

    if (requestedTokens.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Please specify valid token(s): DGT, DRT, or both'
      })
    }

    // Optional: reject if prefix mismatch vs loaded tokenomics file requirement
    if (process.env.ENFORCE_PREFIX === '1' && !cleanAddress.startsWith(`${BECH32_PREFIX}1`)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_ADDRESS',
        message: 'Address prefix mismatch'
      })
    }

    // Check rate limits for all requested tokens
    for (const tokenSymbol of requestedTokens) {
      try {
        await assertNotLimited(ip, cleanAddress, tokenSymbol, COOLDOWN_MIN)
      } catch (rateLimitError) {
        // Record rate limit hit metric
        rateLimitHitsTotal.inc({ token: tokenSymbol })
        
        // Record request outcome metric  
        faucetRequestsTotal.inc({ token: tokenSymbol, outcome: 'denied' })
        
        throw rateLimitError
      }
    }

    // Dispense all requested tokens
    const dispensed = []
    for (const tokenSymbol of requestedTokens) {
      try {
        const { hash } = await transfer({ token: tokenSymbol, to: cleanAddress })
        const amount = getMaxFor(tokenSymbol)
        dispensed.push({
          symbol: tokenSymbol,
          amount,
          txHash: hash
        })
        await markGranted(ip, cleanAddress, tokenSymbol, COOLDOWN_MIN)
        
        // Record successful request metric
        faucetRequestsTotal.inc({ token: tokenSymbol, outcome: 'allow' })
      } catch (transferError) {
        logError(`Transfer failed for ${tokenSymbol}`, transferError)
        // If one token fails, still report the others that succeeded
        if (dispensed.length === 0) {
          throw transferError // If first token fails, propagate error
        }
      }
    }

    if (dispensed.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'SERVER_ERROR',
        message: 'Failed to dispense any tokens'
      })
    }

    // Return new format response
    const response = {
      success: true,
      dispensed,
      message: `Successfully dispensed ${dispensed.map(d => d.symbol).join(' + ')} tokens`
    }

    // Legacy compatibility: if single token requested, include legacy fields
    if (dispensed.length === 1 && token) {
      response.ok = true
      response.token = dispensed[0].symbol
      response.amount = dispensed[0].amount
      response.txHash = dispensed[0].txHash
    }

    res.json(response)
  } catch (err) {
    if (err.message?.includes('Rate limit exceeded') || err.code === 'RATE_LIMITED') {
      return res.status(429).json({
        success: false,
        error: 'RATE_LIMIT',
        message: err.message,
        retryAfterSeconds: err.retryAfter
      })
    }
    
    if (err.message === 'INVALID_ADDRESS' || err.message === 'INVALID_TOKEN') {
      return res.status(400).json({
        success: false,
        error: err.message,
        message: err.message
      })
    }
    
    logError('Faucet request failed', err)
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Internal server error'
    })
  }
})

// Simple AI demo rate-limited endpoint placeholder
const aiRate = { store: new Map(), WINDOW_MS: 60_000, MAX_PER_WINDOW: 12 }
function aiRateCheck(ip, key){ const now=Date.now(); const bucketKey=`${ip}:${key}`; let b=aiRate.store.get(bucketKey); if(!b|| now>b.reset){ b={count:0, reset: now+aiRate.WINDOW_MS} } b.count++; if(b.count>aiRate.MAX_PER_WINDOW){ const e=new Error('RATE_LIMITED'); e.status=429; throw e } aiRate.store.set(bucketKey,b) }

app.post('/api/ai/anomaly', (req,res,next)=>{ try { const ip=req.socket.remoteAddress||'unknown'; aiRateCheck(ip,'anomaly'); res.json({ ok:true, anomaly:false, score:Number((Math.random()*0.4).toFixed(3)) }) } catch(e){ next(e) } })

// GET version of anomaly endpoint for testing purposes
app.get('/anomaly', (req, res, next) => {
  try {
    const timestamp = new Date().toISOString()
    
    // Extract query parameters
    const since = req.query.since ? parseInt(req.query.since) : undefined
    const limit = req.query.limit ? parseInt(req.query.limit) : 100
    const type = req.query.type
    const severity = req.query.severity
    
    // Get anomalies from detection engine
    const anomalies = anomalyEngine.getRecentAnomalies({
      since,
      limit,
      type,
      severity
    })
    
    // Determine overall status
    const criticalCount = anomalies.filter(a => a.severity === 'critical').length
    const highCount = anomalies.filter(a => a.severity === 'high').length
    
    let status = 'healthy'
    if (criticalCount > 0) {
      status = 'critical'
    } else if (highCount > 0) {
      status = 'warning'
    } else if (anomalies.length > 0) {
      status = 'degraded'
    }
    
    res.json({
      ok: true,
      timestamp,
      anomalies,
      status
    })
  } catch (e) {
    next(e)
  }
})

// POST endpoint to force anomaly detection
app.post('/api/anomaly/run', (req, res, next) => {
  try {
    // Trigger force detection
    anomalyEngine.forceDetection()
      .then(anomalies => {
        res.json({
          ok: true,
          timestamp: new Date().toISOString(),
          triggered: true,
          anomalies: anomalies.length,
          message: `Force detection completed: ${anomalies.length} anomalies found`
        })
      })
      .catch(err => {
        res.status(500).json({
          ok: false,
          error: 'DETECTION_FAILED',
          message: err.message
        })
      })
  } catch (e) {
    next(e)
  }
})

// Anomaly engine status endpoint
app.get('/api/anomaly/status', (req, res, next) => {
  try {
    const stats = anomalyEngine.getStats()
    res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      stats
    })
  } catch (e) {
    next(e)
  }
})

// Test alerting system
app.post('/api/anomaly/test-alerts', async (req, res, next) => {
  try {
    const results = await anomalyEngine.testAlerting()
    res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      results,
      message: 'Alerting test completed'
    })
  } catch (e) {
    next(e)
  }
})

// Send test alert
app.post('/api/anomaly/send-test-alert', async (req, res, next) => {
  try {
    const results = await anomalyEngine.sendTestAlert()
    res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      results,
      message: 'Test alert sent'
    })
  } catch (e) {
    next(e)
  }
})

// --- Emission Information API ---
app.get('/api/emission', (req, res, next) => {
  try {
    // Get current blockchain height (mock for now)
    const currentBlock = 100000;
    const blocksPerEpoch = 210000; // Bitcoin-style halving
    const currentEpoch = Math.floor(currentBlock / blocksPerEpoch);
    
    // Calculate emission rate (starts at 50 DGT per block, halves each epoch)
    const baseEmissionRate = 50;
    const currentEmissionRate = baseEmissionRate / Math.pow(2, currentEpoch);
    
    // Calculate total supply
    let totalSupply = 0;
    for (let epoch = 0; epoch <= currentEpoch; epoch++) {
      const epochRate = baseEmissionRate / Math.pow(2, epoch);
      const blocksInThisEpoch = epoch === currentEpoch 
        ? currentBlock % blocksPerEpoch 
        : blocksPerEpoch;
      totalSupply += epochRate * blocksInThisEpoch;
    }
    
    // Next reduction calculations
    const nextReductionBlock = (currentEpoch + 1) * blocksPerEpoch;
    const blocksUntilReduction = nextReductionBlock - currentBlock;
    
    res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      current_emission_rate: currentEmissionRate,
      total_supply: Math.round(totalSupply * 100) / 100,
      circulating_supply: Math.round(totalSupply * 0.95 * 100) / 100, // 95% circulating
      next_reduction_block: nextReductionBlock,
      blocks_until_reduction: blocksUntilReduction,
      reduction_factor: 0.5,
      current_block: currentBlock,
      current_epoch: currentEpoch,
      blocks_per_epoch: blocksPerEpoch
    });
  } catch (e) {
    next(e)
  }
})

// Alternative endpoint for consistency with other patterns
app.get('/emission', (req, res, next) => {
  try {
    // Redirect to API endpoint for consistency
    res.redirect('/api/emission');
  } catch (e) {
    next(e)
  }
})

// --- Contract Security Scanner API ---
app.post('/api/contract/scan', async (req, res, next) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown'
  
  try {
    // Rate limiting for scanner endpoint
    aiRateCheck(ip, 'scan')
    
    const { code } = req.body || {}
    
    // Validate input
    if (typeof code !== 'string') {
      const e = new Error('INVALID_CODE')
      e.status = 400
      throw e
    }
    
    if (!code.trim()) {
      const e = new Error('CODE_REQUIRED')
      e.status = 400
      throw e
    }
    
    // Check size limit (100KB)
    const sizeBytes = new TextEncoder().encode(code).length
    if (sizeBytes > 100 * 1024) {
      const e = new Error('CODE_TOO_LARGE')
      e.status = 413
      throw e
    }

    logInfo('Contract scan initiated', { ip, sizeBytes })
    
    // Run the scan
    const result = await contractScanner.scanContract(code)
    
    // Update performance metrics
    if (result.summary && result.summary.performance) {
      result.summary.performance.seconds = result.meta.durationMs / 1000
    }
    
    logInfo('Contract scan completed', { 
      scanId: result.meta.scanId, 
      duration: result.meta.durationMs,
      findings: result.summary.total
    })
    
    res.json(result)
    
  } catch (err) {
    if (err.message === 'SCANNER_BUSY') {
      err.status = 503
      err.message = 'Scanner is busy, please try again later'
    }
    
    logError('Contract scan failed', { ip, error: err.message })
    next(err)
  }
})

app.get('/health', (req,res)=> res.json({ ok:true, ts:new Date().toISOString() }))

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType)
    res.end(await register.metrics())
  } catch (err) {
    res.status(500).end(err)
  }
})

// PQC status endpoint used by dashboard Security & PQC card
app.get('/api/pqc/status', (req, res, next) => {
  try {
    const enabled = (process.env.VITE_PQC_ENABLED === 'true') || (process.env.PQC_ENABLED === 'true') || false
    const algo = process.env.VITE_PQC_ALGO || process.env.PQC_ALGO || 'dilithium'
    const runtime = process.env.VITE_PQC_RUNTIME || process.env.PQC_RUNTIME || (enabled ? 'mock' : 'disabled')

    // Best-effort detection of WASM modules presence (non-fatal)
    let wasmModules = false
    try {
      const p1 = new URL('../vendor/pqclean/', import.meta.url)
      const p2 = new URL('../vendor/pqclean_upstream/', import.meta.url)
      wasmModules = fs.existsSync(p1) || fs.existsSync(p2)
    } catch { /* ignore */ }

    // Status classification
    // - active: PQC enabled and runtime is wasm/native
    // - degraded: PQC enabled but using mock runtime
    // - disabled: PQC not enabled
    let status = 'disabled'
    if (enabled) {
      status = (runtime === 'wasm' || runtime === 'native') ? 'active' : 'degraded'
    }

    const payload = {
      status,              // 'active' | 'degraded' | 'disabled'
      enabled,             // boolean flag
      algorithm: algo,     // e.g., 'dilithium'
      runtime,             // 'wasm' | 'native' | 'mock' | 'disabled'
      wasmModules,         // best-effort presence indicator
      walletSupport: enabled ? 'active' : 'disabled',
      version: '1.0',
      updatedAt: new Date().toISOString()
    }

    res.setHeader('Cache-Control', 'no-store')
    res.json(payload)
  } catch (e) {
    next(e)
  }
})

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || 500
  logError(err.message, { status, stack: process.env.NODE_ENV === 'production' ? undefined : err.stack })
  res.status(status).json({ ok: false, error: err.message })
})

// Start HTTP server and attach WebSocket server for realtime dashboard updates
const server = app.listen(PORT, () => { logInfo('Server started', { PORT, ORIGIN }) })

let wss = null
try {
  // Accept upgrades on any path; we'll filter inside handler to be resilient
  wss = new WebSocketServer({ server })
  wss.on('connection', (ws, req) => {
    const reqPath = req?.url || ''
    if (!reqPath.startsWith('/api/ws')) {
      try { ws.close() } catch {}
      return
    }
    logInfo('ws.connection', { path: reqPath, remote: req.socket.remoteAddress })
    // Send an immediate snapshot on connect
    sampleMetrics().then((m) => {
      try { ws.send(JSON.stringify({ type: 'overview', data: { ...m, updatedAt: new Date().toISOString() } })) } catch {}
    }).catch(() => {})
  })
  logInfo('WebSocket server attached', { path: '/api/ws' })
} catch (e) {
  logError('Failed to start WebSocket server', e)
}

export default app

// In-memory metrics sampling store (no random placeholders)
const METRIC_SAMPLE_INTERVAL_MS = 5000
const SERIES_MAX_POINTS = 500
const seriesStore = {
  tps: [],
  blockTime: [],
  peers: []
}
let lastBlockHeight = null
let lastBlockTime = null
let lastTxCount = null

const NODE_STATS_BASE = process.env.NODE_METRICS_URL || process.env.REACT_APP_NODE_URL || 'http://localhost:3030'

async function fetchNodeStats() {
  try {
    const r = await fetch(`${NODE_STATS_BASE.replace(/\/$/, '')}/stats`)
    if (!r.ok) throw new Error(`NODE_STATS_${r.status}`)
    const j = await r.json().catch(()=>null)
    return j || {}
  } catch (e) {
    logError('node.stats.fetch_failed', { error: e.message })
    return {}
  }
}

function pushSeries(metric, value){
  if(!Number.isFinite(value)) return
  const arr = seriesStore[metric]
  if(!arr) return
  arr.push({ ts: Date.now(), value })
  if(arr.length > SERIES_MAX_POINTS) arr.splice(0, arr.length - SERIES_MAX_POINTS)
}

function computeCpuPercent(){
  // Approximate: 1m load avg / number of cores *100
  try {
    const cores = os.cpus()?.length || 1
    const load = os.loadavg()?.[0] || 0
    return Number(((load / cores) * 100).toFixed(2))
  } catch { return undefined }
}
function computeMemoryPercent(){
  try {
    const total = os.totalmem()
    const free = os.freemem()
    return Number((((total - free)/total)*100).toFixed(2))
  } catch { return undefined }
}

async function sampleMetrics(){
  const stats = await fetchNodeStats()
  // Heights / block time
  const height = Number(stats.height || stats.block_height || stats.latest_block_height)
  let blockTime = undefined
  const now = Date.now()
  if(Number.isFinite(height)){
    if(lastBlockHeight != null && height > lastBlockHeight){
      const elapsedMs = now - lastBlockTime
      if(elapsedMs > 0) blockTime = Number((elapsedMs / 1000).toFixed(2))
      lastBlockTime = now
      lastBlockHeight = height
    } else if(lastBlockHeight == null){
      lastBlockHeight = height
      lastBlockTime = now
    }
  }
  // Peers (not yet exposed by node -> undefined retains UI placeholder)
  const peers = Number(stats.peers || stats.peer_count || stats.p2p_peers)
  // Mempool size (real value from node stats)
  const mempool = Number(stats.mempool_size || stats.mempool || stats.mempoolSize)
  // Transactions per second (delta of cumulative tx count)
  const txTotal = Number(stats.total_txs || stats.tx_count || stats.txs_total || stats.txs)
  let tps = undefined
  if(Number.isFinite(txTotal)){
    if(lastTxCount != null && lastBlockTime){
      const delta = txTotal - lastTxCount
      const elapsedSec = (now - lastBlockTime)/1000
      if(delta >= 0 && elapsedSec > 0){
        tps = Number((delta/elapsedSec).toFixed(2))
      }
    }
    lastTxCount = txTotal
  }
  if(Number.isFinite(tps)) pushSeries('tps', tps)
  if(Number.isFinite(blockTime)) pushSeries('blockTime', blockTime)
  if(Number.isFinite(peers)) pushSeries('peers', peers)

  return { height, tps, blockTime, peers, mempool }
}

function broadcastOverview(data){
  if (!wss || !wss.clients) return
  const payload = JSON.stringify({ type: 'overview', data })
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      try { client.send(payload) } catch { /* ignore */ }
    }
  }
}

setInterval(async () => {
  try {
    const m = await sampleMetrics()
    broadcastOverview({ ...m, updatedAt: new Date().toISOString() })
    sseBroadcast({ ...m, updatedAt: new Date().toISOString() })
  } catch (e) {
    logError('metrics.sample.interval_error', e)
  }
}, METRIC_SAMPLE_INTERVAL_MS).unref()

// Server-Sent Events fallback for environments where WS is blocked
const sseClients = new Set()
app.get('/api/sse', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders?.()
  const client = { res }
  sseClients.add(client)
  req.on('close', () => { sseClients.delete(client) })
  // immediate snapshot
  sampleMetrics().then((m)=>{
    try { res.write(`data: ${JSON.stringify({ type:'overview', data:{...m, updatedAt:new Date().toISOString()} })}\n\n`) } catch {}
  })
})

function sseBroadcast(data){
  const line = `data: ${JSON.stringify({ type:'overview', data })}\n\n`
  for(const {res} of sseClients){
    try { res.write(line) } catch {}
  }
}

function rangeToMs(range){
  switch(range){
    case '15m': return 15*60*1000
    case '1h': return 60*60*1000
    case '24h': return 24*60*60*1000
    default: return 60*60*1000
  }
}

function filterSeries(metric, range){
  const arr = seriesStore[metric] || []
  const cutoff = Date.now() - rangeToMs(range)
  return arr.filter(p => p.ts >= cutoff)
}

async function handleTimeseries(req, res, next){
  try {
    const { metric, range='1h' } = req.query || {}
    if(!metric || !['tps','blockTime','peers'].includes(metric)){
      const e = new Error('INVALID_METRIC')
      e.status = 400
      throw e
    }
    const points = filterSeries(metric, range)
    res.setHeader('Cache-Control','no-store')
    return res.json({ ok:true, metric, range, points, updatedAt:new Date().toISOString() })
  } catch(e){ next(e) }
}

// Alias endpoints (new preferred path /api/timeseries)
app.get('/api/timeseries', handleTimeseries)
app.get('/api/dashboard/timeseries', handleTimeseries)

// -------------------------------
// WASM Contracts REST facade
// -------------------------------
// Bridges to the Rust node JSON-RPC contract API (running on 3030 by default)
const NODE_RPC = process.env.NODE_STATS_BASE || process.env.CONTRACT_NODE_URL || 'http://localhost:3030'

async function rpcCall(method, params){
  const r = await fetch(`${NODE_RPC.replace(/\/$/, '')}/rpc`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params: [params] })
  })
  const j = await r.json().catch(()=>null)
  return j?.result || j
}

function hexOf(buf){ return Buffer.from(buf).toString('hex') }
function b64ToBytes(b64){ return Buffer.from(b64, 'base64') }
function nowIso(){ return new Date().toISOString() }
function ensureDir(p){ try { fs.mkdirSync(p, { recursive: true }) } catch{} }

const EVIDENCE_DIR = new URL('../launch-evidence/wasm', import.meta.url)
function writeEvidence(name, obj){ try { ensureDir(EVIDENCE_DIR); fs.writeFileSync(new URL(name, EVIDENCE_DIR), typeof obj==='string'?obj:JSON.stringify(obj,null,2)) } catch(e){ logError('evidence.write_failed', e) } }

// POST /contract/deploy
// body: { code_base64? , from?, gas_limit?, initial_state? }
app.post('/contract/deploy', async (req, res, next) => {
  try {
    const { code_base64, from='api_deployer', gas_limit=100000, initial_state } = req.body || {}
    let codeBuf
    if (code_base64) {
      codeBuf = b64ToBytes(code_base64)
    } else {
      // default to bundled counter.wasm if present
      try {
        const p = new URL('../artifacts/counter.wasm', import.meta.url)
        codeBuf = fs.readFileSync(p)
      } catch {
        return res.status(400).json({ ok:false, error:'NO_CODE', message:'Provide code_base64 or build artifacts/counter.wasm' })
      }
    }

    // Evidence: persist contract.wasm
    writeEvidence('contract.wasm', codeBuf)

    const codeHex = hexOf(codeBuf)
    const result = await rpcCall('contract_deploy', { code: codeHex, from, gas_limit, initial_state })
    if (result?.error) return res.status(400).json({ ok:false, error:'DEPLOY_FAILED', message:String(result.error) })

    const deploy_tx = { ts: nowIso(), from, gas_limit, code_hash: result.code_hash, address: result.address }
    writeEvidence('deploy_tx.json', deploy_tx)

    res.json({ ok:true, address: result.address, code_hash: result.code_hash })
  } catch (e) { next(e) }
})

// POST /contract/call
// body: { address, method, params?, gas_limit? }
app.post('/contract/call', async (req, res, next) => {
  try {
    const { address, method='get', params={}, gas_limit=100000, from='api_caller' } = req.body || {}
    if(!address) return res.status(400).json({ ok:false, error:'MISSING_ADDRESS' })
    const result = await rpcCall('contract_execute', { contract_address: address, function: method, args: params, gas_limit, from })
    if (result?.error) return res.status(400).json({ ok:false, error:'EXEC_FAILED', message:String(result.error) })

    // Collect call evidence
    const call = { ts: nowIso(), address, method, params, gas_used: result.gas_used }
    // append to calls.json
    try {
      ensureDir(EVIDENCE_DIR)
      const f = new URL('calls.json', EVIDENCE_DIR)
      let arr = []
      if (fs.existsSync(f)) arr = JSON.parse(fs.readFileSync(f,'utf8'))
      arr.push(call)
      fs.writeFileSync(f, JSON.stringify(arr, null, 2))
      writeEvidence('gas_report.json', { updated_at: nowIso(), last_call: call })
    } catch(e){ logError('evidence.calls_write_failed', e) }

    res.json({ ok:true, result: result.return_value, gas_used: result.gas_used, events: result.events || [] })
  } catch (e) { next(e) }
})

// GET /contract/state/:addr/get -> call "get" and parse value
app.get('/contract/state/:addr/get', async (req, res, next) => {
  try {
    const address = req.params.addr
    const result = await rpcCall('contract_execute', { contract_address: address, function:'get', args:{}, gas_limit: 50000, from:'api_reader' })
    if (result?.error) return res.status(404).json({ ok:false, error:'NOT_FOUND', message:String(result.error) })
    // persist final state snapshot
    writeEvidence('final_state.json', { ts: nowIso(), address, value_hex: result.return_value })
    res.json({ ok:true, value_hex: result.return_value, gas_used: result.gas_used })
  } catch (e) { next(e) }
})
