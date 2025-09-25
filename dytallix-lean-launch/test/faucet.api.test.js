import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { __testResetRateLimiter } from '../server/rateLimit.js'

// Helper to generate unique test addresses for each test
function generateTestAddress() {
  const suffix = Math.random().toString(36).slice(2, 15).padEnd(13, '0')
  return `dytallix1test${suffix}456789abcdef123456`
}

describe('Enhanced Faucet API Integration', () => {
  let app
  
  beforeEach(async () => {
    // Reset rate limiter before each test
    __testResetRateLimiter()
    
    // Import app after rate limiter reset to ensure clean state
    const { default: testApp } = await import('../server/index.js')
    app = testApp
  })
  
  afterEach(() => {
    // Clean up after each test
    __testResetRateLimiter()
  })

  it('should successfully dispense tokens and return transaction hashes', async () => {
    const testAddress = generateTestAddress()
    const testHash1 = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
    const testHash2 = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
    
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
        expect.objectContaining({
          symbol: 'DGT',
          amount: '2',
          txHash: expect.stringMatching(/^0x[a-f0-9]{64}$/)
        }),
        expect.objectContaining({
          symbol: 'DRT',
          amount: '50', 
          txHash: expect.stringMatching(/^0x[a-f0-9]{64}$/)
        })
      ]),
      message: 'Successfully dispensed DGT + DRT tokens',
      requestId: expect.stringMatching(/^faucet-\d+-[a-z0-9]+$/)
    })
  })

  it('should enforce rate limiting on second request', async () => {
    const testAddress = generateTestAddress()
    
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
    const testAddress = generateTestAddress()
    
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
    const testAddress = 'generateTestAddress()'
    
    // Mock transfer failure
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
    const testAddress = generateTestAddress()
    
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
      txHash: expect.stringMatching(/^0x[a-f0-9]{64}$/), // Legacy field
      dispensed: [
        {
          symbol: 'DGT',
          amount: '2',
          txHash: expect.stringMatching(/^0x[a-f0-9]{64}$/)
        }
      ]
    })
  })

  it('should include proper headers and user agent in logs', async () => {
    const testAddress = generateTestAddress()
    
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