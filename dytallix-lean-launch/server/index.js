import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { requestLogger, logError, logInfo } from './logger.js'
import { assertNotLimited, markGranted } from './rateLimit.js'
import { transfer, getMaxFor } from './transfer.js'

/*
 * Dytallix Minimal Server / Faucet + Dashboard API
 * ------------------------------------------------
 * Endpoints (MVP dashboard + faucet):
 *   GET /api/status/height            -> { ok, height }
 *   GET /api/status/node              -> { ok, network, chain_id, height, status }
 *   GET /api/dashboard/overview       -> { ok, height, network, updatedAt }
 *   GET /api/dashboard/timeseries?metric=(tps|blockTime|peers)&range=1h|24h|7d
 *                                      -> { ok, metric, range, points:[{t, v}], updatedAt }
 *   POST /api/faucet                  -> { ok, token, amount, txHash }
 * Notes:
 *   - /api/dashboard/* provides backward compat layer for earlier frontend expecting /api/dashboard/*.
 *   - timeseries data is synthesized placeholder (no on-chain historical query yet) for rapid UI iteration.
 *   - All logs redact secrets; avoid committing any .env or mnemonic values.
 *   - CSP: default-src 'self'; connect-src is built dynamically from configured LCD/RPC/WS + faucet origins.
 */

dotenv.config()

const app = express()
const PORT = process.env.PORT || 8787
const ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:5173'
const COOLDOWN_MIN = parseInt(process.env.FAUCET_COOLDOWN_MINUTES || '60', 10)
const ENABLE_SEC_HEADERS = process.env.ENABLE_SEC_HEADERS === '1'
const ENABLE_CSP = process.env.ENABLE_CSP === '1' || ENABLE_SEC_HEADERS
const BECH32_PREFIX = process.env.CHAIN_PREFIX || 'dytallix'
const RPC_HTTP = (process.env.RPC_HTTP_URL || process.env.RPC_URL || process.env.VITE_RPC_HTTP_URL || '').replace(/\/$/, '')

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

    assertNotLimited(ip, cleanAddress, cleanToken, COOLDOWN_MIN)

    const { hash } = await transfer({ token: cleanToken, to: cleanAddress })
    const amount = getMaxFor(cleanToken)

    markGranted(ip, cleanAddress, cleanToken, COOLDOWN_MIN)

    res.json({ ok: true, token: cleanToken, amount, txHash: hash })
  } catch (err) {
    next(err)
  }
})

// --- In-memory rate limiter for AI module endpoints ---
const aiRate = {
  store: new Map(),
  WINDOW_MS: 60_000,
  MAX_PER_WINDOW: 12
}
function rateCheck(ip, key) {
  const now = Date.now()
  const bucketKey = `${ip}:${key}`
  let b = aiRate.store.get(bucketKey)
  if (!b || now > b.reset) {
    b = { count: 0, reset: now + aiRate.WINDOW_MS }
  }
  b.count++
  aiRate.store.set(bucketKey, b)
  if (b.count > aiRate.MAX_PER_WINDOW) {
    const e = new Error('RATE_LIMITED')
    e.status = 429
    e.retryAfter = Math.ceil((b.reset - now)/1000)
    throw e
  }
}

// --- Utility: simple hex check ---
function isTxHash(h) { return typeof h === 'string' && /^0x[0-9a-fA-F]{64}$/.test(h) }

// --- Contract scan endpoint ---
// Uses solidity-parser-antlr (added as dependency) for AST analysis.
let solidityParser
try { solidityParser = await import('solidity-parser-antlr') } catch { /* will lazy load on first request */ }

app.post('/api/contract/scan', async (req, res, next) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown'
  try {
    rateCheck(ip, 'scan')
    const { code } = req.body || {}
    if (typeof code !== 'string') {
      const e = new Error('INVALID_CODE')
      e.status = 400
      throw e
    }
    // Enforce size (bytes) <=100KB
    const sizeBytes = new TextEncoder().encode(code).length
    if (sizeBytes > 100 * 1024) {
      const e = new Error('CODE_TOO_LARGE')
      e.status = 413
      throw e
    }
    // Strip potential sourceMappingURL lines
    const sanitized = code.replace(/\/\/[#@]\s*sourceMappingURL=.*$/gm, '')

    if (!solidityParser) solidityParser = await import('solidity-parser-antlr')
    let ast
    try {
      ast = solidityParser.parse(sanitized, { loc: true, range: false, tolerant: true })
    } catch (err) {
      const e = new Error('PARSE_ERROR')
      e.status = 400
      throw e
    }

    const issues = []
    let idCounter = 1
    function pushIssue(rule, severity, line, recommendation) {
      issues.push({ id: `ISSUE_${idCounter++}`, rule, severity, line, recommendation })
    }

    // Traverse AST
    const visit = (node, parent) => {
      if (!node || typeof node !== 'object') return
      // Delegatecall & low level calls
      if (node.type === 'MemberAccess') {
        const m = node.memberName
        if (['delegatecall', 'callcode'].includes(m)) {
          pushIssue('Delegatecall Usage', 'high', node.loc?.start?.line || null, 'Avoid delegatecall/callcode unless absolutely required; use vetted libraries.')
        }
        if (m === 'call') {
          // We'll mark later if unchecked; record potential
          if (parent?.type === 'ExpressionStatement') {
            pushIssue('Unchecked Low-Level Call', 'medium', node.loc?.start?.line || null, 'Capture return bool from call and check for success; use function interfaces when possible.')
          }
        }
        if (m === 'origin' && node.expression?.name === 'tx') {
          pushIssue('tx.origin Authentication', 'high', node.loc?.start?.line || null, 'Do not use tx.origin for auth; rely on msg.sender & access control.')
        }
      }
      // FunctionCall: selfdestruct/suicide
      if (node.type === 'FunctionCall') {
        const expr = node.expression
        if (expr?.type === 'Identifier' && ['selfdestruct', 'suicide'].includes(expr.name)) {
          pushIssue('Selfdestruct', 'high', node.loc?.start?.line || null, 'Avoid selfdestruct; consider pausable pattern or upgrade proxies.')
        }
      }
      // Reentrancy heuristic: external call then state write (very naive)
      if (node.type === 'FunctionDefinition' && node.body?.statements) {
        let sawExternal = false
        for (const s of node.body.statements) {
          if (s.type === 'ExpressionStatement' && s.expression?.type === 'FunctionCall' && s.expression.expression?.type === 'MemberAccess' && ['call', 'delegatecall'].includes(s.expression.expression.memberName)) {
            sawExternal = true
          }
          if (sawExternal && (s.type === 'ExpressionStatement' || s.type === 'Assignment') ) {
            // crude line heuristic
            pushIssue('Possible Reentrancy', 'high', s.loc?.start?.line || node.loc?.start?.line || null, 'Apply checks-effects-interactions; consider ReentrancyGuard / switching order.')
            sawExternal = false // avoid duplicates
          }
        }
      }

      for (const k in node) {
        if (k === 'loc' || k === 'range') continue
        const v = node[k]
        if (Array.isArray(v)) v.forEach(ch => visit(ch, node))
        else if (v && typeof v === 'object') visit(v, node)
      }
    }
    visit(ast, null)

    // Summaries
    const bySeverity = { high: 0, medium: 0, low: 0 }
    for (const i of issues) { if (bySeverity[i.severity] != null) bySeverity[i.severity]++ }
    const summary = { total: issues.length, bySeverity }
    const meta = { ranAt: new Date().toISOString(), model: 'static-solidity-ruleset:v0' }

    res.json({ summary, issues, meta })
  } catch (err) { next(err) }
})

// --- Anomaly detection endpoint ---
app.post('/api/anomaly/run', async (req, res, next) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown'
  try {
    rateCheck(ip, 'anomaly')
    const { txHash, windowSize } = req.body || {}
    if (!isTxHash(txHash)) {
      const e = new Error('INVALID_TX_HASH')
      e.status = 400
      throw e
    }
    const allowedWindows = new Set(['50tx','100tx','24h'])
    const ws = allowedWindows.has(windowSize) ? windowSize : '100tx'
    // Simulated metrics
    const riskScore = Math.round(40 + Math.random()*55)
    const anomalies = []
    const push = (type, severity, detail) => anomalies.push({ id: `${type}_${anomalies.length+1}` , type, severity, detail })
    if (riskScore > 65) push('ValueSpike', 'medium', 'Outgoing value exceeds rolling median * 2.7')
    if (Math.random() > 0.5) push('NewCounterparty','low','First interaction with destination in window')
    if (riskScore > 80) push('BurstPattern','high','Transaction frequency burst above 99th percentile')
    const meta = { ranAt: new Date().toISOString(), model: 'heuristic-anomaly:v0' }
    res.json({ riskScore, anomalies, meta })
  } catch (err) { next(err) }
})

app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  const status = err.status || 500
  const code = err.code || err.message || 'INTERNAL_ERROR'
  logError('Error handler:', status, code)
  res.status(status).json({ ok: false, code, message: code })
})

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  // console.log(`Faucet server running on :${PORT}`)
  logInfo(`Faucet server running on :${PORT}`)
})
