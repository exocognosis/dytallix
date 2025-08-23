// Faucet client schema validation tests
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  FaucetClient,
  FaucetRequestError,
  FaucetValidationError,
  validateFaucetResponseSchema,
  requestFaucetTokens
} from '../faucetClient'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('Faucet Client Schema Validation', () => {
  let client: FaucetClient

  beforeEach(() => {
    client = new FaucetClient('/api')
    mockFetch.mockClear()
  })

  describe('Request Validation', () => {
    it('should reject empty address', async () => {
      await expect(client.requestTokens({ address: '', token: 'DGT' }))
        .rejects.toThrow(FaucetRequestError)
      
      await expect(client.requestTokens({ address: '', token: 'DGT' }))
        .rejects.toThrow('Address is required')
    })

    it('should reject invalid address format', async () => {
      await expect(client.requestTokens({ address: 'invalid-address', token: 'DGT' }))
        .rejects.toThrow('Address must be a valid Dytallix bech32 address')
    })

    it('should reject missing token specification', async () => {
      await expect(client.requestTokens({ address: 'dytallix1test123456789012345678901234567890' }))
        .rejects.toThrow('Either tokens array or token string must be specified')
    })

    it('should reject both tokens and token specified', async () => {
      await expect(client.requestTokens({
        address: 'dytallix1test123456789012345678901234567890',
        token: 'DGT',
        tokens: ['DRT']
      })).rejects.toThrow('Cannot specify both tokens array and token string')
    })

    it('should reject invalid token values', async () => {
      await expect(client.requestTokens({
        address: 'dytallix1test123456789012345678901234567890',
        token: 'INVALID' as any
      })).rejects.toThrow('Invalid token. Valid tokens are: DGT, DRT')
    })

    it('should reject invalid tokens in array', async () => {
      await expect(client.requestTokens({
        address: 'dytallix1test123456789012345678901234567890',
        tokens: ['DGT', 'INVALID'] as any
      })).rejects.toThrow('Invalid tokens: INVALID')
    })
  })

  describe('Response Schema Validation - Success Cases', () => {
    it('should validate successful dual-token response', async () => {
      const validResponse = {
        success: true,
        dispensed: [
          {
            symbol: 'DGT',
            amount: '10',
            txHash: '0x' + 'a'.repeat(64)
          },
          {
            symbol: 'DRT',
            amount: '100',
            txHash: '0x' + 'b'.repeat(64)
          }
        ],
        message: 'Successfully dispensed DGT + DRT tokens'
      }

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(validResponse)
      })

      const result = await client.requestTokens({
        address: 'dytallix1test123456789012345678901234567890',
        tokens: ['DGT', 'DRT']
      })

      expect(result).toEqual(validResponse)
    })

    it('should validate successful single-token response with legacy fields', async () => {
      const validResponse = {
        success: true,
        dispensed: [
          {
            symbol: 'DGT',
            amount: '10',
            txHash: '0x' + 'a'.repeat(64)
          }
        ],
        message: 'Successfully dispensed DGT tokens',
        // Legacy compatibility fields
        ok: true,
        token: 'DGT',
        amount: '10',
        txHash: '0x' + 'a'.repeat(64)
      }

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(validResponse)
      })

      const result = await client.requestTokens({
        address: 'dytallix1test123456789012345678901234567890',
        token: 'DGT'
      })

      expect(result).toEqual(validResponse)
    })

    it('should validate response with optional timestamp', async () => {
      const validResponse = {
        success: true,
        dispensed: [
          {
            symbol: 'DRT',
            amount: '50',
            txHash: '0x' + 'c'.repeat(64)
          }
        ],
        message: 'Successfully dispensed DRT tokens',
        timestamp: new Date().toISOString()
      }

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(validResponse)
      })

      const result = await client.requestTokens({
        address: 'dytallix1test123456789012345678901234567890',
        token: 'DRT'
      })

      expect(result).toEqual(validResponse)
    })
  })

  describe('Response Schema Validation - Error Cases', () => {
    it('should validate error response structure', async () => {
      const errorResponse = {
        success: false,
        error: 'INVALID_ADDRESS',
        message: 'Please enter a valid Dytallix bech32 address'
      }

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(errorResponse)
      })

      const result = await client.requestTokens({
        address: 'dytallix1test123456789012345678901234567890',
        token: 'DGT'
      })

      expect(result).toEqual(errorResponse)
    })

    it('should validate rate limit error', async () => {
      const errorResponse = {
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded. Please try again later.'
      }

      const validation = validateFaucetResponseSchema(errorResponse)
      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })
  })

  describe('Response Schema Validation - Rejection Cases', () => {
    it('should reject response missing required success field', async () => {
      const invalidResponse = {
        dispensed: [{ symbol: 'DGT', amount: '10', txHash: '0x' + 'a'.repeat(64) }],
        message: 'Test'
      }

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(invalidResponse)
      })

      await expect(client.requestTokens({
        address: 'dytallix1test123456789012345678901234567890',
        token: 'DGT'
      })).rejects.toThrow(FaucetValidationError)
    })

    it('should reject response with invalid token symbol', async () => {
      const invalidResponse = {
        success: true,
        dispensed: [
          {
            symbol: 'INVALID_TOKEN',
            amount: '10',
            txHash: '0x' + 'a'.repeat(64)
          }
        ],
        message: 'Test'
      }

      const validation = validateFaucetResponseSchema(invalidResponse)
      expect(validation.valid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(0)
    })

    it('should reject response with invalid transaction hash format', async () => {
      const invalidResponse = {
        success: true,
        dispensed: [
          {
            symbol: 'DGT',
            amount: '10',
            txHash: 'invalid-hash-format'
          }
        ],
        message: 'Test'
      }

      const validation = validateFaucetResponseSchema(invalidResponse)
      expect(validation.valid).toBe(false)
      expect(validation.errors.some(e => e.field.includes('txHash'))).toBe(true)
    })

    it('should reject response with invalid amount format', async () => {
      const invalidResponse = {
        success: true,
        dispensed: [
          {
            symbol: 'DGT',
            amount: -10, // Should be string, not negative number
            txHash: '0x' + 'a'.repeat(64)
          }
        ],
        message: 'Test'
      }

      const validation = validateFaucetResponseSchema(invalidResponse)
      expect(validation.valid).toBe(false)
    })

    it('should reject success response missing dispensed field', async () => {
      const invalidResponse = {
        success: true,
        message: 'Successfully dispensed tokens'
        // Missing dispensed field
      }

      const validation = validateFaucetResponseSchema(invalidResponse)
      expect(validation.valid).toBe(false)
      expect(validation.errors.some(e => e.message.includes('dispensed'))).toBe(true)
    })

    it('should reject error response missing error field', async () => {
      const invalidResponse = {
        success: false,
        message: 'Error occurred'
        // Missing error field
      }

      const validation = validateFaucetResponseSchema(invalidResponse)
      expect(validation.valid).toBe(false)
      expect(validation.errors.some(e => e.message.includes('error'))).toBe(true)
    })

    it('should reject response with invalid error code', async () => {
      const invalidResponse = {
        success: false,
        error: 'UNKNOWN_ERROR_CODE',
        message: 'Error occurred'
      }

      const validation = validateFaucetResponseSchema(invalidResponse)
      expect(validation.valid).toBe(false)
    })
  })

  describe('Network Error Handling', () => {
    it('should handle fetch network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(client.requestTokens({
        address: 'dytallix1test123456789012345678901234567890',
        token: 'DGT'
      })).rejects.toThrow('Faucet request failed: Network error')
    })

    it('should handle JSON parsing errors', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.reject(new Error('Invalid JSON'))
      })

      await expect(client.requestTokens({
        address: 'dytallix1test123456789012345678901234567890',
        token: 'DGT'
      })).rejects.toThrow('Faucet request failed: Invalid JSON')
    })
  })

  describe('Convenience Functions', () => {
    it('should work with requestFaucetTokens convenience function', async () => {
      const validResponse = {
        success: true,
        dispensed: [
          {
            symbol: 'DGT',
            amount: '10',
            txHash: '0x' + 'a'.repeat(64)
          }
        ],
        message: 'Successfully dispensed DGT tokens'
      }

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(validResponse)
      })

      const result = await requestFaucetTokens({
        address: 'dytallix1test123456789012345678901234567890',
        token: 'DGT'
      })

      expect(result).toEqual(validResponse)
    })
  })

  describe('Schema Validation Function', () => {
    it('should validate correct schema directly', () => {
      const validResponse = {
        success: true,
        dispensed: [
          {
            symbol: 'DGT',
            amount: '10.5',
            txHash: '0x' + 'a'.repeat(64)
          }
        ],
        message: 'Test'
      }

      const { valid, errors } = validateFaucetResponseSchema(validResponse)
      expect(valid).toBe(true)
      expect(errors).toHaveLength(0)
    })

    it('should report validation errors directly', () => {
      const invalidResponse = {
        success: 'not-boolean', // Should be boolean
        message: 'Test'
      }

      const { valid, errors } = validateFaucetResponseSchema(invalidResponse)
      expect(valid).toBe(false)
      expect(errors.length).toBeGreaterThan(0)
    })
  })
})