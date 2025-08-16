import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { requestLogger, logError, logInfo } from './logger.js'
import { assertNotLimited, markGranted } from './rateLimit.js'
import { transfer, getMaxFor } from './transfer.js'
import fs from 'fs'

/*
 * Dytallix Minimal Server / Faucet + Dashboard API (merged)
 * Contains security headers + dashboard endpoints + faucet logic.
 */

dotenv.config()

const app = express()
const PORT = process.env.PORT || 8787
const ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:5173'
const COOLDOWN_MIN = parseInt(process.env.FAUCET_COOLDOWN_MINUTES || '60', 10)
const ENABLE_SEC_HEADERS = process.env.ENABLE_SEC_HEADERS === '1'
const ENABLE_CSP = process.env.ENABLE_CSP === '1' || ENABLE_SEC_HEADERS
const BECH32_PREFIX = process.env.CHAIN_PREFIX || process.env.BECH32_PREFIX || 'dytallix'

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
    process.env.FAUCET_URL // (frontend may call faucet directly in some deployments)
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

// Minimal Cosmos-backed status endpoints (existing)
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
    const { address, token } = req.body || {}

    const cleanAddress = typeof address === 'string' ? address.trim() : ''
    const cleanToken = sanitizeToken(token)

    if (!isBech32Address(cleanAddress)) {
      const err = new Error('INVALID_ADDRESS')
      err.status = 400
      throw err
    }

    if (!['DGT', 'DRT'].includes(cleanToken)) {
      const err = new Error('INVALID_TOKEN')
      err.status = 400
      throw err
    }

    // Optional: reject if prefix mismatch vs loaded tokenomics file requirement
    if (process.env.ENFORCE_PREFIX === '1' && !cleanAddress.startsWith(`${BECH32_PREFIX}1`)) {
      const err = new Error('PREFIX_MISMATCH')
      err.status = 400
      throw err
    }

    assertNotLimited(ip, cleanAddress, cleanToken, COOLDOWN_MIN)

    const { hash } = await transfer({ token: cleanToken, to: cleanAddress })
    const amount = getMaxFor(cleanToken)

    markGranted(ip, cleanAddress, cleanToken, COOLDOWN_MIN)

    res.json({ ok: true, token: cleanToken, amount, txHash: hash })
  } catch (err) {
    next(err)
  }
})

// Simple AI demo rate-limited endpoint placeholder
const aiRate = { store: new Map(), WINDOW_MS: 60_000, MAX_PER_WINDOW: 12 }
function aiRateCheck(ip, key){ const now=Date.now(); const bucketKey=`${ip}:${key}`; let b=aiRate.store.get(bucketKey); if(!b|| now>b.reset){ b={count:0, reset: now+aiRate.WINDOW_MS} } b.count++; if(b.count>aiRate.MAX_PER_WINDOW){ const e=new Error('RATE_LIMITED'); e.status=429; throw e } aiRate.store.set(bucketKey,b) }

app.post('/api/ai/anomaly', (req,res,next)=>{ try { const ip=req.socket.remoteAddress||'unknown'; aiRateCheck(ip,'anomaly'); res.json({ ok:true, anomaly:false, score:Number((Math.random()*0.4).toFixed(3)) }) } catch(e){ next(e) } })

app.get('/health', (req,res)=> res.json({ ok:true, ts:new Date().toISOString() }))

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || 500
  logError(err.message, { status, stack: process.env.NODE_ENV === 'production' ? undefined : err.stack })
  res.status(status).json({ ok: false, error: err.message })
})

app.listen(PORT, () => { logInfo('Server started', { PORT, ORIGIN }) })

export default app
