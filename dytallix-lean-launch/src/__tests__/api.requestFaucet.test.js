// Unit tests for requestFaucet API function
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { requestFaucet } from '../lib/api.js'

// Mock fetch
global.fetch = vi.fn()

describe('requestFaucet API', () => {
  beforeEach(() => {
    // Reset fetch mock before each test
    fetch.mockClear()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Success scenarios', () => {
    it('should handle successful dual-token response', async () => {
      const mockResponse = {
        success: true,
        dispensed: [
          { symbol: 'DGT', amount: '2', txHash: '0xabc123' },
          { symbol: 'DRT', amount: '50', txHash: '0xdef456' }
        ],
        message: 'Successfully dispensed DGT + DRT tokens'
      }

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
        headers: new Map()
      })

      const result = await requestFaucet({
        address: 'dytallix1example123456789abcdef123456789',
        tokens: ['DGT', 'DRT']
      })

      expect(fetch).toHaveBeenCalledWith('/api/faucet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: 'dytallix1example123456789abcdef123456789',
          tokens: ['DGT', 'DRT']
        })
      })

      expect(result).toEqual({
        success: true,
        dispensed: [
          { symbol: 'DGT', amount: '2', txHash: '0xabc123' },
          { symbol: 'DRT', amount: '50', txHash: '0xdef456' }
        ],
        cooldowns: null,
        message: 'Successfully dispensed DGT + DRT tokens',
        error: null,
        retryAfterSeconds: null
      })
    })

    it('should handle single token response', async () => {
      const mockResponse = {
        success: true,
        dispensed: [
          { symbol: 'DGT', amount: '2', txHash: '0xabc123' }
        ]
      }

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
        headers: new Map()
      })

      const result = await requestFaucet({
        address: 'dytallix1example123456789abcdef123456789',
        tokens: ['DGT']
      })

      expect(result.success).toBe(true)
      expect(result.dispensed).toHaveLength(1)
      expect(result.dispensed[0].symbol).toBe('DGT')
      expect(result.dispensed[0].amount).toBe('2')
    })

    it('should handle legacy response format', async () => {
      const mockResponse = {
        ok: true,
        token: 'DGT',
        amount: 2,
        txHash: '0xabc123'
      }

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
        headers: new Map()
      })

      const result = await requestFaucet({
        address: 'dytallix1example123456789abcdef123456789',
        tokens: ['DGT']
      })

      expect(result.success).toBe(true)
      expect(result.dispensed).toHaveLength(1)
      expect(result.dispensed[0]).toEqual({
        symbol: 'DGT',
        amount: '2',
        txHash: '0xabc123'
      })
    })

    it('should normalize different txHash field names', async () => {
      const mockResponse = {
        success: true,
        dispensed: [
          { symbol: 'DGT', amount: '2', tx_hash: '0xabc123' },
          { symbol: 'DRT', amount: '50', hash: '0xdef456' }
        ]
      }

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
        headers: new Map()
      })

      const result = await requestFaucet({
        address: 'dytallix1example123456789abcdef123456789',
        tokens: ['DGT', 'DRT']
      })

      expect(result.dispensed[0].txHash).toBe('0xabc123')
      expect(result.dispensed[1].txHash).toBe('0xdef456')
    })

    it('should handle cooldowns in response', async () => {
      const mockResponse = {
        success: true,
        dispensed: [
          { symbol: 'DGT', amount: '2', txHash: '0xabc123' }
        ],
        cooldowns: {
          tokens: {
            DGT: { nextAllowedAt: 1672531200 }, // timestamp in seconds
            DRT: { nextAllowedAt: 1672534800000 } // timestamp in milliseconds
          }
        }
      }

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
        headers: new Map()
      })

      const result = await requestFaucet({
        address: 'dytallix1example123456789abcdef123456789',
        tokens: ['DGT']
      })

      expect(result.cooldowns).toEqual({
        DGT: 1672531200000, // converted to milliseconds
        DRT: 1672534800000  // already in milliseconds
      })
    })
  })

  describe('Error scenarios', () => {
    it('should handle rate limit (429) response', async () => {
      const mockResponse = {
        success: false,
        error: 'RATE_LIMIT',
        message: 'Rate limit exceeded. Please wait 30 minutes.',
        cooldowns: {
          tokens: {
            DGT: { nextAllowedAt: 1672531200 }
          }
        }
      }

      fetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.resolve(mockResponse),
        headers: new Map([['retry-after', '1800']])
      })

      const result = await requestFaucet({
        address: 'dytallix1example123456789abcdef123456789',
        tokens: ['DGT']
      })

      expect(result).toEqual({
        success: false,
        error: 'RATE_LIMIT',
        message: 'Rate limit exceeded. Please wait 30 minutes.',
        dispensed: [],
        cooldowns: {
          tokens: {
            DGT: { nextAllowedAt: 1672531200 }
          }
        },
        retryAfterSeconds: 1800
      })
    })

    it('should handle server errors (500)', async () => {
      const mockResponse = {
        success: false,
        error: 'SERVER_ERROR',
        message: 'Internal server error'
      }

      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve(mockResponse),
        headers: new Map()
      })

      const result = await requestFaucet({
        address: 'dytallix1example123456789abcdef123456789',
        tokens: ['DGT']
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('SERVER_ERROR')
      expect(result.message).toBe('Internal server error')
      expect(result.dispensed).toEqual([])
    })

    it('should handle network errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Network connection failed'))

      const result = await requestFaucet({
        address: 'dytallix1example123456789abcdef123456789',
        tokens: ['DGT']
      })

      expect(result).toEqual({
        success: false,
        error: 'NETWORK_ERROR',
        message: 'Network connection failed',
        dispensed: [],
        cooldowns: null,
        retryAfterSeconds: null
      })
    })

    it('should handle invalid JSON response', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.reject(new Error('Invalid JSON')),
        headers: new Map()
      })

      const result = await requestFaucet({
        address: 'dytallix1example123456789abcdef123456789',
        tokens: ['DGT']
      })

      expect(result).toEqual({
        success: false,
        error: 'INVALID_RESPONSE',
        message: 'Server returned invalid JSON response',
        dispensed: [],
        cooldowns: null,
        retryAfterSeconds: null
      })
    })

    it('should handle empty response', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(null),
        headers: new Map()
      })

      const result = await requestFaucet({
        address: 'dytallix1example123456789abcdef123456789',
        tokens: ['DGT']
      })

      expect(result).toEqual({
        success: false,
        error: 'EMPTY_RESPONSE',
        message: 'Empty response from server',
        dispensed: [],
        cooldowns: null,
        retryAfterSeconds: null
      })
    })
  })

  describe('Input validation', () => {
    beforeEach(() => {
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, dispensed: [] }),
        headers: new Map()
      })
    })

    it('should handle single token as string', async () => {
      await requestFaucet({
        address: 'dytallix1example123456789abcdef123456789',
        tokens: 'DGT'
      })

      expect(fetch).toHaveBeenCalledWith(expect.any(String), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: 'dytallix1example123456789abcdef123456789',
          tokens: ['DGT']
        })
      })
    })

    it('should trim address whitespace', async () => {
      await requestFaucet({
        address: '  dytallix1example123456789abcdef123456789  ',
        tokens: ['DGT']
      })

      expect(fetch).toHaveBeenCalledWith(expect.any(String), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: 'dytallix1example123456789abcdef123456789',
          tokens: ['DGT']
        })
      })
    })
  })
})