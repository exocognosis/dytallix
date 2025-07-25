import { describe, it, expect, vi, beforeEach } from 'vitest'
import config from '../../services/config'

describe('Configuration Service - Testnet Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should load testnet configuration correctly', () => {
    expect(config.environment).toBe('testnet')
    expect(config.isTestnet).toBe(true)
    expect(config.isDevelopment).toBe(false)
    expect(config.isProduction).toBe(false)
  })

  it('should have correct testnet API endpoints', () => {
    expect(config.blockchainApiUrl).toBe('https://testnet-api.dytallix.io')
    expect(config.aiApiUrl).toBe('https://testnet-ai.dytallix.io')
    expect(config.websocketUrl).toBe('wss://testnet-api.dytallix.io/ws')
  })

  it('should return correct network configuration for MetaMask', () => {
    const networkConfig = config.getNetworkConfig()
    
    expect(networkConfig).toEqual({
      chainId: '0x22B8', // 8888 in hex
      chainName: 'dytallix-testnet',
      nativeCurrency: {
        name: 'Dytallix',
        symbol: 'DYT',
        decimals: 18,
      },
      rpcUrls: ['https://testnet-api.dytallix.io'],
      blockExplorerUrls: ['https://testnet-api.dytallix.io/explorer'],
    })
  })

  it('should validate URLs correctly', () => {
    // Should not throw with valid URLs
    expect(() => {
      new URL(config.blockchainApiUrl)
      new URL(config.aiApiUrl)
      new URL(config.websocketUrl)
    }).not.toThrow()
  })

  it('should have testnet-appropriate settings', () => {
    const cfg = config.get()
    
    expect(cfg.logLevel).toBe('info')
    expect(cfg.enableNetworkLogging).toBe(true)
    expect(cfg.enablePerformanceMonitoring).toBe(true)
    expect(cfg.enableErrorReporting).toBe(true)
    expect(cfg.networkName).toBe('dytallix-testnet')
    expect(cfg.chainId).toBe(8888)
    expect(cfg.confirmationBlocks).toBe(3)
  })

  it('should log messages according to log level', () => {
    const mockLog = vi.spyOn(console, 'info')
    
    config.log('info', 'Test message')
    expect(mockLog).toHaveBeenCalledWith('[TESTNET] Test message')
    
    mockLog.mockRestore()
  })
})