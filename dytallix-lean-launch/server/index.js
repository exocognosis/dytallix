import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { requestLogger, logError, logInfo } from './logger.js'
import { assertNotLimited, markGranted } from './rateLimit.js'
import { transfer, getMaxFor } from './transfer.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 8787
const ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:5173'
const COOLDOWN_MIN = parseInt(process.env.FAUCET_COOLDOWN_MINUTES || '60', 10)
const ENABLE_SEC_HEADERS = process.env.ENABLE_SEC_HEADERS === '1'
const ENABLE_CSP = process.env.ENABLE_CSP === '1' || ENABLE_SEC_HEADERS
const BECH32_PREFIX = process.env.CHAIN_PREFIX || 'dytallix'
const RPC_HTTP = (process.env.RPC_HTTP_URL || process.env.RPC_URL || process.env.VITE_RPC_HTTP_URL || '').replace(/\/$/, '')

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
      res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; connect-src 'self' wss:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'")
    }
    next()
  })
  logInfo('Security headers enabled', { ENABLE_CSP })
}

app.use(cors({ origin: ORIGIN }))
app.use(express.json({ limit: '25kb' }))
app.use(requestLogger)

const sanitizeToken = (t) => (typeof t === 'string' ? t.trim().toUpperCase() : '')

function isBech32Address(addr) {
  return typeof addr === 'string' && addr.startsWith(`${BECH32_PREFIX}1`) && addr.length >= (BECH32_PREFIX.length + 10)
}

// Minimal Cosmos-backed dashboard endpoints
app.get('/api/status/height', async (req, res, next) => {
  try {
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
    const j = await r.json()
    const heightStr = j?.result?.sync_info?.latest_block_height || j?.result?.sync_info?.latest_block_height
    const height = Number(heightStr || 0)
    res.json({ ok: true, height })
  } catch (err) { next(err) }
})

app.get('/api/status/node', async (req, res, next) => {
  try {
    if (!RPC_HTTP) {
      const e = new Error('RPC_NOT_CONFIGURED')
      e.status = 500
      throw e
    }
    const r = await fetch(`${RPC_HTTP}/status`)
    const j = await r.json().catch(() => ({}))
    res.json({ ok: true, status: j })
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

app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  const status = err.status || 500
  const code = err.code || err.message || 'INTERNAL_ERROR'
  logError('Error handler:', status, code)
  res.status(status).json({ ok: false, code, message: code })
})

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Faucet server running on :${PORT}`)
})
