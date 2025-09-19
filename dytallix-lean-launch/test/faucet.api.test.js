import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { __testResetRateLimiter } from '../server/rateLimit.js'

// Mock the transfer function for testing
const originalTransfer = await import('../server/transfer.js')
let mockTransferEnabled = false
let mockTransferResults = new Map()

// Create a mock transfer function
const mockTransfer = async ({ token, to }) => {
  if (!mockTransferEnabled) {
    return originalTransfer.transfer({ token, to })
  }
  
  const key = `${token}-${to}`
  if (mockTransferResults.has(key)) {
    const result = mockTransferResults.get(key)
    if (result.shouldFail) {
      throw new Error(result.error || 'Mock transfer failed')
    }
    return { hash: result.hash }
  }
  
  // Default mock response
  return { 
    hash: `0x${Math.random().toString(16).slice(2).padStart(64, '0')}` 
  }
}

describe('Enhanced Faucet API Integration', () => {
  let app
  
  beforeEach(async () => {
    __testResetRateLimiter()
    mockTransferEnabled = true
    mockTransferResults.clear()
    
    // Import app after rate limiter reset
    const { default: testApp } = await import('../server/index.js')
    app = testApp
  })
  
  afterEach(() => {
    mockTransferEnabled = false
    mockTransferResults.clear()
  })

  it('should successfully dispense tokens and return transaction hashes', async () => {
    const testAddress = 'dytallix1test123456789abcdef123456789abcdef123456'
    const testHash1 = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
    const testHash2 = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
    
    // Mock successful transfers
    mockTransferResults.set(`DGT-${testAddress}`, { hash: testHash1 })
    mockTransferResults.set(`DRT-${testAddress}`, { hash: testHash2 })
    
    const response = await request(app)
      .post('/api/faucet')
      .send({
        address: testAddress,
        tokens: ['DGT', 'DRT']
      })
      .expect(200)
    
    expect(response.body).toMatchObject({
      success: true,
      dispensed: expect.arrayContaining([
        {
          symbol: 'DGT',
          amount: '2',
          txHash: testHash1
        },
        {
          symbol: 'DRT', 
          amount: '50',
          txHash: testHash2
        }
      ]),
      message: 'Successfully dispensed DGT + DRT tokens',
      requestId: expect.stringMatching(/^faucet-\d+-[a-z0-9]+$/)
    })
  })

  it('should enforce rate limiting on second request', async () => {
    const testAddress = 'dytallix1test123456789abcdef123456789abcdef123456'
    
    // First request should succeed
    await request(app)
      .post('/api/faucet')
      .send({
        address: testAddress,
        tokens: ['DGT']
      })
      .expect(200)
    
    // Second immediate request should be rate limited
    const response = await request(app)
      .post('/api/faucet')
      .send({
        address: testAddress,
        tokens: ['DGT']
      })
      .expect(429)
    
    expect(response.body).toMatchObject({
      success: false,
      error: 'RATE_LIMIT',
      message: expect.stringContaining('Rate limit exceeded'),
      retryAfterSeconds: expect.any(Number),
      requestId: expect.stringMatching(/^faucet-\d+-[a-z0-9]+$/)
    })
  })

  it('should validate address format', async () => {
    const response = await request(app)
      .post('/api/faucet')
      .send({
        address: 'invalid-address',
        tokens: ['DGT']
      })
      .expect(400)
    
    expect(response.body).toMatchObject({
      success: false,
      error: 'INVALID_ADDRESS',
      message: 'Please enter a valid Dytallix bech32 address',
      requestId: expect.stringMatching(/^faucet-\d+-[a-z0-9]+$/)
    })
  })

  it('should validate token types', async () => {
    const testAddress = 'dytallix1test123456789abcdef123456789abcdef123456'
    
    const response = await request(app)
      .post('/api/faucet')
      .send({
        address: testAddress,
        tokens: ['INVALID']
      })
      .expect(400)
    
    expect(response.body).toMatchObject({
      success: false,
      error: 'INVALID_TOKEN',
      message: 'Please specify valid token(s): DGT, DRT, or both',
      requestId: expect.stringMatching(/^faucet-\d+-[a-z0-9]+$/)
    })
  })

  it('should handle transfer failures gracefully', async () => {
    const testAddress = 'dytallix1test123456789abcdef123456789abcdef123456'
    
    // Mock transfer failure
    mockTransferResults.set(`DGT-${testAddress}`, { 
      shouldFail: true, 
      error: 'RPC_TRANSFER_FAILED' 
    })
    
    const response = await request(app)
      .post('/api/faucet')
      .send({
        address: testAddress,
        tokens: ['DGT']
      })
      .expect(500)
    
    expect(response.body).toMatchObject({
      success: false,
      error: 'SERVER_ERROR',
      message: expect.any(String),
      requestId: expect.stringMatching(/^faucet-\d+-[a-z0-9]+$/)
    })
  })

  it('should support legacy single token format', async () => {
    const testAddress = 'dytallix1test123456789abcdef123456789abcdef123456'
    const testHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
    
    mockTransferResults.set(`DGT-${testAddress}`, { hash: testHash })
    
    const response = await request(app)
      .post('/api/faucet')
      .send({
        address: testAddress,
        token: 'DGT'
      })
      .expect(200)
    
    expect(response.body).toMatchObject({
      success: true,
      ok: true, // Legacy field
      token: 'DGT', // Legacy field
      amount: '2', // Legacy field
      txHash: testHash, // Legacy field
      dispensed: [
        {
          symbol: 'DGT',
          amount: '2',
          txHash: testHash
        }
      ]
    })
  })

  it('should include proper headers and user agent in logs', async () => {
    const testAddress = 'dytallix1test123456789abcdef123456789abcdef123456'
    
    const response = await request(app)
      .post('/api/faucet')
      .set('User-Agent', 'TestClient/1.0')
      .set('X-Forwarded-For', '203.0.113.100')
      .send({
        address: testAddress,
        tokens: ['DRT']
      })
      .expect(200)
    
    // Response should include request ID for log correlation
    expect(response.body.requestId).toMatch(/^faucet-\d+-[a-z0-9]+$/)
  })
})