import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'
import { api } from '../../services/api'

// Mock axios
vi.mock('axios')
const mockedAxios = vi.mocked(axios, true)

describe('API Service - Testnet Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock axios create method
    mockedAxios.create = vi.fn().mockImplementation(() => ({
      get: vi.fn(),
      post: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    }))
  })

  it('should initialize with testnet configuration', () => {
    expect(mockedAxios.create).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: '/api',
        headers: expect.objectContaining({
          'X-Environment': 'testnet',
        }),
      })
    )
  })

  it('should test connection to both APIs', async () => {
    const mockBlockchainInstance = {
      get: vi.fn().mockResolvedValue({ data: { success: true, data: 'healthy' } }),
      post: vi.fn(),
      interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
    }
    
    const mockAiInstance = {
      get: vi.fn().mockResolvedValue({ data: { status: 'healthy' } }),
      post: vi.fn(),
      interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
    }

    mockedAxios.create = vi.fn()
      .mockReturnValueOnce(mockBlockchainInstance)
      .mockReturnValueOnce(mockAiInstance)

    const testResults = await api.testConnection()
    
    expect(testResults).toEqual({
      blockchain: true,
      ai: true,
    })
  })

  it('should return connection info for testnet', () => {
    const connectionInfo = api.getConnectionInfo()
    
    expect(connectionInfo).toEqual({
      environment: 'testnet',
      blockchainEndpoint: 'https://testnet-api.dytallix.io',
      aiEndpoint: 'https://testnet-ai.dytallix.io',
      websocketEndpoint: 'wss://testnet-api.dytallix.io/ws',
      networkName: 'dytallix-testnet',
      chainId: 8888,
    })
  })

  it('should handle API errors gracefully', async () => {
    const mockInstance = {
      get: vi.fn().mockRejectedValue(new Error('Network error')),
      post: vi.fn(),
      interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
    }

    mockedAxios.create = vi.fn().mockReturnValue(mockInstance)

    await expect(api.getHealth()).rejects.toThrow('Network error')
  })

  it('should include environment headers in requests', () => {
    const createCalls = mockedAxios.create.mock.calls
    
    // Check blockchain API headers
    expect(createCalls[0][0].headers).toEqual(
      expect.objectContaining({
        'X-Environment': 'testnet',
        'X-Client-Version': '1.0.0',
      })
    )
    
    // Check AI API headers
    expect(createCalls[1][0].headers).toEqual(
      expect.objectContaining({
        'X-Environment': 'testnet',
        'X-Client-Version': '1.0.0',
      })
    )
  })

  it('should respect AI timeout configuration', () => {
    const aiCreateCall = mockedAxios.create.mock.calls[1]
    expect(aiCreateCall[0].timeout).toBe(30000) // testnet AI timeout
  })
})