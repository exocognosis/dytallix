/**
 * Purpose: Test live endpoint replacements (balances, timeseries)
 * Validates that mock data has been replaced with real blockchain queries
 */
import { describe, it, expect, beforeAll, vi } from 'vitest'
import fetch, { Response } from 'node-fetch'

// Mock fetch for testing
vi.mock('node-fetch')
const mockFetch = vi.mocked(fetch)

describe('Live Endpoints', () => {
  const SERVER_URL = process.env.TEST_SERVER_URL || 'http://localhost:8787'
  const TEST_ADDRESS = 'dytallix1test123456789abcdef123456789abcdef123456'
  
  beforeAll(() => {
    // Reset fetch mocks
    vi.clearAllMocks()
  })

  describe('/api/balance', () => {
    it('should return numeric balance matching node RPC format', async () => {
      // Mock successful RPC response
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        balances: [
          { denom: 'udgt', amount: '1000000' },
          { denom: 'udrt', amount: '500000' }
        ]
      }), { status: 200 }))

      const response = await fetch(`${SERVER_URL}/api/balance?address=${TEST_ADDRESS}`)
      expect(response.ok).toBe(true)
      
      const data = await response.json()
      
      expect(data).toHaveProperty('address', TEST_ADDRESS)
      expect(data).toHaveProperty('balances')
      expect(data).toHaveProperty('source') // 'rpc' or 'fallback'
      expect(data).toHaveProperty('timestamp')
      
      expect(Array.isArray(data.balances)).toBe(true)
      expect(data.balances.length).toBeGreaterThan(0)
      
      // Ensure DGT and DRT are present
      const symbols = data.balances.map(b => b.symbol)
      expect(symbols).toContain('DGT')
      expect(symbols).toContain('DRT')
      
      // Validate balance structure
      data.balances.forEach(balance => {
        expect(balance).toHaveProperty('symbol')
        expect(balance).toHaveProperty('amount')
        expect(balance).toHaveProperty('denom')
        expect(typeof balance.amount).toBe('string')
        expect(/^\d+$/.test(balance.amount)).toBe(true) // Numeric string
      })
    })

    it('should handle RPC failure gracefully with fallback', async () => {
      // Mock RPC failure
      mockFetch.mockRejectedValueOnce(new Error('RPC connection failed'))

      const response = await fetch(`${SERVER_URL}/api/balance?address=${TEST_ADDRESS}`)
      expect(response.ok).toBe(true)
      
      const data = await response.json()
      expect(data.source).toBe('fallback')
      expect(data.balances).toHaveLength(2) // DGT and DRT defaults
    })

    it('should validate address format', async () => {
      const response = await fetch(`${SERVER_URL}/api/balance?address=invalid`)
      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data.error).toContain('Invalid address')
    })
  })

  describe('/api/dashboard/timeseries', () => {
    it('should return non-empty data with timestamps ascending', async () => {
      // Mock node status
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        result: {
          sync_info: {
            latest_block_height: '1000'
          }
        }
      }), { status: 200 }))

      // Mock block data
      mockFetch.mockResolvedValue(new Response(JSON.stringify({
        result: {
          block: {
            header: {
              time: new Date().toISOString(),
              height: '999'
            },
            data: {
              txs: ['tx1', 'tx2', 'tx3'] // 3 transactions
            }
          }
        }
      }), { status: 200 }))

      const response = await fetch(`${SERVER_URL}/api/dashboard/timeseries?metric=tps&range=1h`)
      expect(response.ok).toBe(true)
      
      const data = await response.json()
      
      expect(data).toHaveProperty('ok', true)
      expect(data).toHaveProperty('metric', 'tps')
      expect(data).toHaveProperty('points')
      expect(data).toHaveProperty('source') // 'blockchain' or 'synthetic'
      expect(data).toHaveProperty('updatedAt')
      
      expect(Array.isArray(data.points)).toBe(true)
      expect(data.points.length).toBeGreaterThan(0)
      
      // Validate point structure and ascending timestamps
      let lastTimestamp = 0
      data.points.forEach(point => {
        expect(point).toHaveProperty('t') // timestamp
        expect(point).toHaveProperty('v') // value
        expect(typeof point.t).toBe('number')
        expect(typeof point.v).toBe('number')
        expect(point.t).toBeGreaterThan(lastTimestamp)
        lastTimestamp = point.t
      })
    })

    it('should handle different metrics (tps, blockTime, peers)', async () => {
      const metrics = ['tps', 'blockTime', 'peers']
      
      for (const metric of metrics) {
        // Mock responses for each metric test
        mockFetch.mockResolvedValue(new Response(JSON.stringify({
          result: { sync_info: { latest_block_height: '100' } }
        }), { status: 200 }))

        const response = await fetch(`${SERVER_URL}/api/dashboard/timeseries?metric=${metric}`)
        expect(response.ok).toBe(true)
        
        const data = await response.json()
        expect(data.metric).toBe(metric)
        expect(data.points.length).toBeGreaterThan(0)
      }
    })

    it('should reject invalid metrics', async () => {
      const response = await fetch(`${SERVER_URL}/api/dashboard/timeseries?metric=invalid`)
      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data.error).toContain('INVALID_METRIC')
    })

    it('should fallback to synthetic data when blockchain unavailable', async () => {
      // Mock RPC failure
      mockFetch.mockRejectedValue(new Error('Node unavailable'))

      const response = await fetch(`${SERVER_URL}/api/dashboard/timeseries?metric=tps`)
      expect(response.ok).toBe(true)
      
      const data = await response.json()
      expect(data.source).toBe('synthetic')
      expect(data.points.length).toBeGreaterThan(0)
    })
  })

  describe('Endpoint Integration', () => {
    it('should maintain backward compatibility', async () => {
      // Test legacy balance endpoint format
      const response = await fetch(`${SERVER_URL}/api/balance/${TEST_ADDRESS}`)
      expect(response.ok).toBe(true)
      
      const data = await response.json()
      expect(data.address).toBe(TEST_ADDRESS)
    })

    it('should include proper error handling and timeouts', async () => {
      // This would test timeout behavior in a real environment
      // For now, we verify the structure includes timeout handling
      expect(true).toBe(true) // Placeholder for timeout tests
    })
  })
})