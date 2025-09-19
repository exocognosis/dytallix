import { describe, it, expect, beforeEach } from 'vitest'
import { assertNotLimited, markGranted, __testResetRateLimiter } from '../server/rateLimit.js'

describe('Enhanced Faucet Rate Limiting', () => {
  beforeEach(() => {
    __testResetRateLimiter()
  })

  it('should allow first request', async () => {
    const ip = '192.168.1.100'
    const address = 'dytallix1test123000'
    const token = 'DGT'
    
    // First request should succeed
    await expect(assertNotLimited(ip, address, token, 60)).resolves.not.toThrow()
  })

  it('should rate limit second immediate request from same IP and address', async () => {
    const ip = '192.168.1.101'
    const address = 'dytallix1test123001'
    const token = 'DGT'
    
    // First request
    await assertNotLimited(ip, address, token, 60)
    await markGranted(ip, address, token, 60)
    
    // Second immediate request should fail
    await expect(assertNotLimited(ip, address, token, 60)).rejects.toThrow(/Rate limit exceeded/)
  })

  it('should enforce different cooldown periods per token', async () => {
    const ip = '192.168.1.102'
    const address = 'dytallix1test123002'
    
    // DGT has 24-hour cooldown, DRT has 6-hour cooldown
    await assertNotLimited(ip, address, 'DGT', 60)
    await markGranted(ip, address, 'DGT', 60)
    
    // Different token on same address/IP should work initially
    await assertNotLimited(ip, address, 'DRT', 60) 
    await markGranted(ip, address, 'DRT', 60)
    
    // Both should be rate limited on immediate retry
    await expect(assertNotLimited(ip, address, 'DGT', 60)).rejects.toThrow(/Rate limit exceeded/)
    await expect(assertNotLimited(ip, address, 'DRT', 60)).rejects.toThrow(/Rate limit exceeded/)
  })

  it('should track IP and address separately for rate limiting', async () => {
    const ip1 = '192.168.1.103'
    const ip2 = '192.168.1.104'
    const address1 = 'dytallix1test123003'
    const address2 = 'dytallix1test123004'
    const token = 'DGT'
    
    // Grant to IP1 + Address1
    await assertNotLimited(ip1, address1, token, 60)
    await markGranted(ip1, address1, token, 60)
    
    // IP1 with different address should be blocked by IP rate limit
    await expect(assertNotLimited(ip1, address2, token, 60)).rejects.toThrow(/Rate limit exceeded/)
    
    // Same IP1 + Address1 should still be blocked
    await expect(assertNotLimited(ip1, address1, token, 60)).rejects.toThrow(/Rate limit exceeded/)
    
    // Different IP and address should succeed
    await expect(assertNotLimited(ip2, address2, token, 60)).resolves.not.toThrow()
  })

  it('should provide retry after seconds in error', async () => {
    const ip = '192.168.1.105'
    const address = 'dytallix1test123005'
    const token = 'DGT'
    
    await assertNotLimited(ip, address, token, 60)
    await markGranted(ip, address, token, 60)
    
    try {
      await assertNotLimited(ip, address, token, 60)
      expect.fail('Should have thrown rate limit error')
    } catch (err) {
      expect(err.code).toBe('RATE_LIMITED')
      expect(err.status).toBe(429)
      expect(err.retryAfter).toBeGreaterThan(0)
      expect(err.token).toBe('DGT')
    }
  })
})