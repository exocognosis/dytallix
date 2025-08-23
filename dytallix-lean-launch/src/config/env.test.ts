import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Simple environment mock for Node.js testing
function mockProcessEnv(env: Record<string, string>) {
  const originalEnv = process.env
  process.env = { ...originalEnv, ...env }
  return () => {
    process.env = originalEnv
  }
}

describe('Environment Loader', () => {
  let resetEnv: () => void
  
  beforeEach(() => {
    vi.resetModules()
    // Clear warnings
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })
  
  afterEach(() => {
    resetEnv?.()
    vi.restoreAllMocks()
  })
  
  describe('getFaucetBaseUrl', () => {
    it('should derive faucet URL from VITE_API_URL + /faucet', async () => {
      resetEnv = mockProcessEnv({
        VITE_API_URL: 'https://api.example.com',
        NODE_ENV: 'production'
      })
      
      const { getFaucetBaseUrl } = await import('./env.ts')
      expect(getFaucetBaseUrl()).toBe('https://api.example.com/faucet')
    })
    
    it('should use explicit VITE_FAUCET_URL when provided', async () => {
      resetEnv = mockProcessEnv({
        VITE_API_URL: 'https://api.example.com',
        VITE_FAUCET_URL: 'https://faucet.special.com/api',
        NODE_ENV: 'production'
      })
      
      const { getFaucetBaseUrl } = await import('./env.ts')
      expect(getFaucetBaseUrl()).toBe('https://faucet.special.com/api')
    })
    
    it('should fallback to /api/faucet in development when VITE_API_URL missing', async () => {
      resetEnv = mockProcessEnv({
        NODE_ENV: 'development',
        VITE_DEV_MODE: 'true'
      })
      
      const { getFaucetBaseUrl } = await import('./env.ts')
      const result = getFaucetBaseUrl()
      
      expect(result).toBe('/api/faucet')
      expect(console.warn).toHaveBeenCalledWith(
        'Neither VITE_FAUCET_URL nor VITE_API_URL set, falling back to /api/faucet'
      )
    })
    
    it('should normalize URLs by trimming trailing slashes', async () => {
      resetEnv = mockProcessEnv({
        VITE_API_URL: 'https://api.example.com////',
        NODE_ENV: 'production'
      })
      
      const { getFaucetBaseUrl } = await import('./env.ts')
      expect(getFaucetBaseUrl()).toBe('https://api.example.com/faucet')
    })
  })
  
  describe('getApiBaseUrl', () => {
    it('should return VITE_API_URL when set', async () => {
      resetEnv = mockProcessEnv({
        VITE_API_URL: 'https://api.example.com/',
        NODE_ENV: 'production'
      })
      
      const { getApiBaseUrl } = await import('./env.ts')
      expect(getApiBaseUrl()).toBe('https://api.example.com')
    })
    
    it('should return empty string in development with warning when not set', async () => {
      resetEnv = mockProcessEnv({
        NODE_ENV: 'development',
        VITE_DEV_MODE: 'true'
      })
      
      const { getApiBaseUrl } = await import('./env.ts')
      const result = getApiBaseUrl()
      
      expect(result).toBe('')
      expect(console.warn).toHaveBeenCalledWith(
        'VITE_API_URL not set, API calls may fail in dev mode'
      )
    })
  })
  
  describe('assertEnv', () => {
    it('should not throw in production when VITE_API_URL is set', async () => {
      resetEnv = mockProcessEnv({
        VITE_API_URL: 'https://api.example.com',
        NODE_ENV: 'production'
      })
      
      const { assertEnv } = await import('./env.ts')
      expect(() => assertEnv()).not.toThrow()
    })
    
    it('should warn in development when both URLs are missing', async () => {
      resetEnv = mockProcessEnv({
        NODE_ENV: 'development',
        VITE_DEV_MODE: 'true'
      })
      
      const { assertEnv } = await import('./env.ts')
      assertEnv()
      
      expect(console.warn).toHaveBeenCalledWith(
        'Missing VITE_API_URL and VITE_FAUCET_URL - using fallback endpoints'
      )
    })
  })
})