import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock Redis before importing
const mockRedisClient = {
  connect: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn().mockResolvedValue(undefined),
  ttl: vi.fn(),
  setEx: vi.fn().mockResolvedValue('OK'),
  isReady: true,
  on: vi.fn()
}

vi.mock('redis', () => ({
  createClient: vi.fn(() => mockRedisClient)
}))

vi.mock('../../server/logger.js', () => ({
  logInfo: vi.fn(),
  logError: vi.fn()
}))

describe('Redis Rate Limiter', () => {
  let rateLimitModule

  beforeEach(async () => {
    vi.clearAllMocks()
    // Force module reload to reset singleton
    vi.resetModules()
    rateLimitModule = await import('../../server/rateLimit.js')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should use Redis when DLX_RATE_LIMIT_REDIS_URL is set', async () => {
    const originalEnv = process.env.DLX_RATE_LIMIT_REDIS_URL
    process.env.DLX_RATE_LIMIT_REDIS_URL = 'redis://localhost:6379'
    
    // Mock Redis client methods
    mockRedisClient.ttl.mockResolvedValue(-1) // Key doesn't exist
    
    try {
      await rateLimitModule.assertNotLimited('127.0.0.1', 'dytallix1test', 'DGT', 60)
      // Should not throw since key doesn't exist
    } catch (err) {
      // This is unexpected
      throw err
    } finally {
      process.env.DLX_RATE_LIMIT_REDIS_URL = originalEnv
    }
  })

  it('should fallback to in-memory when Redis is not available', async () => {
    const originalEnv = process.env.DLX_RATE_LIMIT_REDIS_URL
    process.env.DLX_RATE_LIMIT_REDIS_URL = undefined
    
    try {
      await rateLimitModule.assertNotLimited('127.0.0.1', 'dytallix1test', 'DGT', 60)
      await rateLimitModule.markGranted('127.0.0.1', 'dytallix1test', 'DGT', 60)
      
      // Second call should be rate limited (in-memory)
      await expect(
        rateLimitModule.assertNotLimited('127.0.0.1', 'dytallix1test', 'DGT', 60)
      ).rejects.toThrow('Rate limit exceeded')
    } finally {
      process.env.DLX_RATE_LIMIT_REDIS_URL = originalEnv
    }
  })

  it('should use token-specific cooldown periods', async () => {
    const originalEnv = process.env.DLX_RATE_LIMIT_REDIS_URL
    process.env.DLX_RATE_LIMIT_REDIS_URL = 'redis://localhost:6379'
    
    mockRedisClient.ttl.mockResolvedValue(-1)
    
    try {
      await rateLimitModule.markGranted('127.0.0.1', 'dytallix1test', 'DGT', 60)
      
      // Verify Redis setEx was called with DGT cooldown (24 hours = 1440 minutes)
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        expect.stringContaining('DGT'),
        1440 * 60, // 24 hours in seconds
        'granted'
      )
    } finally {
      process.env.DLX_RATE_LIMIT_REDIS_URL = originalEnv
    }
  })

  it('should handle Redis connection errors gracefully', async () => {
    const originalEnv = process.env.DLX_RATE_LIMIT_REDIS_URL
    process.env.DLX_RATE_LIMIT_REDIS_URL = 'redis://localhost:6379'
    
    // Make Redis operations fail
    mockRedisClient.ttl.mockRejectedValue(new Error('Redis connection failed'))
    mockRedisClient.isReady = false
    
    try {
      // Should not throw, should fallback gracefully
      await rateLimitModule.assertNotLimited('127.0.0.1', 'dytallix1test', 'DGT', 60)
      // This should succeed as it falls back to allowing the request
    } finally {
      process.env.DLX_RATE_LIMIT_REDIS_URL = originalEnv
    }
  })
})