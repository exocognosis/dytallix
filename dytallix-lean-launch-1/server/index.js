import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { requestLogger, logError } from './logger.js'
import { assertNotLimited, markGranted } from './rateLimit.js'
import { transfer, getMaxFor } from './transfer.js'
import { ethers } from 'ethers'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 8787
const ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:5173'
const COOLDOWN_MIN = parseInt(process.env.FAUCET_COOLDOWN_MINUTES || '60', 10)

app.use(cors({ origin: ORIGIN }))
app.use(express.json({ limit: '25kb' }))
app.use(requestLogger)

const sanitizeToken = (t) => (typeof t === 'string' ? t.trim().toUpperCase() : '')

app.post('/api/faucet', async (req, res, next) => {
  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown'
    const { address, token } = req.body || {}

    const cleanAddress = typeof address === 'string' ? address.trim() : ''
    const cleanToken = sanitizeToken(token)

    let checksum
    try {
      checksum = ethers.getAddress(cleanAddress)
    } catch {
      const err = new Error('INVALID_ADDRESS')
      err.status = 400
      throw err
    }

    if (!['DGT', 'DRT'].includes(cleanToken)) {
      const err = new Error('INVALID_TOKEN')
      err.status = 400
      throw err
    }

    assertNotLimited(ip, checksum, cleanToken, COOLDOWN_MIN)

    const { hash } = await transfer({ token: cleanToken, to: checksum })
    const amount = getMaxFor(cleanToken)

    markGranted(ip, checksum, cleanToken, COOLDOWN_MIN)

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
