// Tests for dual-token faucet functionality
import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'

// Mock the transfer function for testing
const mockTransfer = async ({ token, to }) => {
  return { hash: `0x${'a'.repeat(64)}` }
}

// Basic test for dual-token API
describe('Dual-Token Faucet API', () => {
  let app

  beforeEach(() => {
    // Create test express app with just the faucet endpoint
    app = express()
    app.use(express.json())
    
    // Simplified faucet endpoint for testing
    app.post('/api/faucet', async (req, res) => {
      try {
        const { address, token, tokens } = req.body || {}
        const cleanAddress = typeof address === 'string' ? address.trim() : ''
        
        let requestedTokens = []
        if (tokens && Array.isArray(tokens)) {
          requestedTokens = tokens.filter(t => ['DGT', 'DRT'].includes(t))
        } else if (token) {
          if (['DGT', 'DRT'].includes(token)) {
            requestedTokens = [token]
          }
        }

        if (!cleanAddress.startsWith('dytallix1')) {
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

        const dispensed = []
        for (const tokenSymbol of requestedTokens) {
          const { hash } = await mockTransfer({ token: tokenSymbol, to: cleanAddress })
          const amount = tokenSymbol === 'DGT' ? '2' : '50'
          dispensed.push({
            symbol: tokenSymbol,
            amount,
            txHash: hash
          })
        }

        const response = {
          success: true,
          dispensed,
          message: `Successfully dispensed ${dispensed.map(d => d.symbol).join(' + ')} tokens`
        }

        // Legacy compatibility
        if (dispensed.length === 1 && token) {
          response.ok = true
          response.token = dispensed[0].symbol
          response.amount = dispensed[0].amount
          response.txHash = dispensed[0].txHash
        }

        res.json(response)
      } catch (err) {
        res.status(500).json({
          success: false,
          error: 'SERVER_ERROR',
          message: 'Internal server error'
        })
      }
    })
  })

  it('should handle legacy single token request', async () => {
    const response = await request(app)
      .post('/api/faucet')
      .send({
        address: 'dytallix1example123456789abcdef123456789',
        token: 'DGT'
      })

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.dispensed).toHaveLength(1)
    expect(response.body.dispensed[0].symbol).toBe('DGT')
    expect(response.body.dispensed[0].amount).toBe('2')
    
    // Legacy compatibility fields
    expect(response.body.ok).toBe(true)
    expect(response.body.token).toBe('DGT')
    expect(response.body.amount).toBe('2')
  })

  it('should handle dual token request', async () => {
    const response = await request(app)
      .post('/api/faucet')
      .send({
        address: 'dytallix1example123456789abcdef123456789',
        tokens: ['DGT', 'DRT']
      })

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.dispensed).toHaveLength(2)
    
    const dgtToken = response.body.dispensed.find(d => d.symbol === 'DGT')
    const drtToken = response.body.dispensed.find(d => d.symbol === 'DRT')
    
    expect(dgtToken).toBeDefined()
    expect(dgtToken.amount).toBe('2')
    expect(drtToken).toBeDefined()
    expect(drtToken.amount).toBe('50')
    expect(response.body.message).toContain('DGT + DRT')
  })

  it('should reject invalid address', async () => {
    const response = await request(app)
      .post('/api/faucet')
      .send({
        address: 'invalid-address',
        tokens: ['DGT']
      })

    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
    expect(response.body.error).toBe('INVALID_ADDRESS')
  })

  it('should reject invalid tokens', async () => {
    const response = await request(app)
      .post('/api/faucet')
      .send({
        address: 'dytallix1example123456789abcdef123456789',
        tokens: ['INVALID']
      })

    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
    expect(response.body.error).toBe('INVALID_TOKEN')
  })

  it('should handle empty token array', async () => {
    const response = await request(app)
      .post('/api/faucet')
      .send({
        address: 'dytallix1example123456789abcdef123456789',
        tokens: []
      })

    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
    expect(response.body.error).toBe('INVALID_TOKEN')
  })
})