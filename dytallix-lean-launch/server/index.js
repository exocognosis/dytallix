import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { requestLogger, logError, logInfo } from './logger.js'
import { assertNotLimited, markGranted } from './rateLimit.js'
import { transfer, getMaxFor } from './transfer.js'
import { register, rateLimitHitsTotal, faucetRequestsTotal } from './metrics.js'
import { ContractScanner } from './src/scanner/index.js'
import fs from 'fs'

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
    const { height } = await fetchNodeStatus()
    res.json({ ok: true, height })
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
    const { network, height } = await fetchNodeStatus()
    const payload = { ok: true, height, network, updatedAt: new Date().toISOString() }
    res.setHeader('Cache-Control', 'no-store')
    res.json(payload)
    logInfo('dashboard.overview', { ms: Date.now() - started, height, network })
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
    const anomalies = [] // Empty for normal operations
    res.json({
      ok: true,
      timestamp,
      anomalies,
      status: 'healthy'
    })
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

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || 500
  logError(err.message, { status, stack: process.env.NODE_ENV === 'production' ? undefined : err.stack })
  res.status(status).json({ ok: false, error: err.message })
})

app.listen(PORT, () => { logInfo('Server started', { PORT, ORIGIN }) })

export default app
