import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import express from 'express'

// Mock Redis module before importing our modules
vi.mock('redis', () => ({
  createClient: vi.fn(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    ttl: vi.fn().mockResolvedValue(-1),
    setEx: vi.fn().mockResolvedValue('OK'),
    isReady: true,
    on: vi.fn()
  }))
}))

// Mock logger to avoid console output during tests
vi.mock('../../server/logger.js', () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
  requestLogger: (req, res, next) => next()
}))

// Mock transfer module
vi.mock('../../server/transfer.js', () => ({
  transfer: vi.fn().mockResolvedValue({ hash: 'mock-tx-hash' }),
  getMaxFor: vi.fn().mockReturnValue('1000000')
}))

describe('Rate Limiting', () => {
  let app

  beforeEach(async () => {
    // Import app after mocks are set up
    const appModule = await import('../../server/index.js')
    app = appModule.default
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should allow initial faucet request', async () => {
    const response = await request(app)
      .post('/api/faucet')
      .send({
        address: 'dytallix1test1234567890abcdef',
        tokens: ['DGT']
      })

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
  })

  it('should enforce rate limits for subsequent requests', async () => {
    const testAddress = 'dytallix1test1234567890abcdef'
    
    // First request should succeed
    await request(app)
      .post('/api/faucet')
      .send({
        address: testAddress,
        tokens: ['DGT']
      })

    // Second request should be rate limited
    const response = await request(app)
      .post('/api/faucet')
      .send({
        address: testAddress,
        tokens: ['DGT']
      })

    expect(response.status).toBe(429)
    expect(response.body.error).toBe('RATE_LIMIT')
  })

  it('should handle different tokens independently', async () => {
    const testAddress = 'dytallix1test1234567890abcdef'
    
    // Request DGT
    const dgtResponse = await request(app)
      .post('/api/faucet')
      .send({
        address: testAddress,
        tokens: ['DGT']
      })

    expect(dgtResponse.status).toBe(200)

    // Request DRT (should work independently)
    const drtResponse = await request(app)
      .post('/api/faucet')
      .send({
        address: testAddress,
        tokens: ['DRT']
      })

    expect(drtResponse.status).toBe(200)
  })

  it('should validate address format', async () => {
    const response = await request(app)
      .post('/api/faucet')
      .send({
        address: 'invalid-address',
        tokens: ['DGT']
      })

    expect(response.status).toBe(400)
    expect(response.body.error).toBe('INVALID_ADDRESS')
  })

  it('should validate token types', async () => {
    const response = await request(app)
      .post('/api/faucet')
      .send({
        address: 'dytallix1test1234567890abcdef',
        tokens: ['INVALID']
      })

    expect(response.status).toBe(400)
    expect(response.body.error).toBe('INVALID_TOKEN')
  })
})

describe('Metrics', () => {
  let app

  beforeEach(async () => {
    const appModule = await import('../../server/index.js')
    app = appModule.default
  })

  it('should expose Prometheus metrics', async () => {
    const response = await request(app).get('/metrics')
    
    expect(response.status).toBe(200)
    expect(response.text).toContain('rate_limit_hits_total')
    expect(response.text).toContain('faucet_requests_total')
  })

  it('should increment metrics on rate limit hits', async () => {
    const testAddress = 'dytallix1test1234567890abcdef'
    
    // Make initial request
    await request(app)
      .post('/api/faucet')
      .send({
        address: testAddress,
        tokens: ['DGT']
      })

    // Make rate limited request
    await request(app)
      .post('/api/faucet')
      .send({
        address: testAddress,
        tokens: ['DGT']
      })

    // Check metrics
    const metricsResponse = await request(app).get('/metrics')
    expect(metricsResponse.text).toContain('rate_limit_hits_total{token="DGT"}')
  })
})

describe('Status Endpoint', () => {
  let app

  beforeEach(async () => {
    const appModule = await import('../../server/index.js')
    app = appModule.default
  })

  it('should return status with rate limit info', async () => {
    const response = await request(app).get('/api/status')
    
    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty('rateLimit')
    expect(response.body.rateLimit.dgtWindowHours).toBe(24)
    expect(response.body.rateLimit.drtWindowHours).toBe(6)
    expect(response.body.rateLimit.maxRequests).toBe(1)
  })
})