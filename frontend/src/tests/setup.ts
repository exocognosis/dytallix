// Test setup file
import { vi } from 'vitest'

// Mock browser APIs
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock WebSocket
global.WebSocket = vi.fn().mockImplementation(() => ({
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  close: vi.fn(),
  send: vi.fn(),
  readyState: 1, // OPEN
}))

// Mock performance API
global.performance = {
  ...global.performance,
  now: vi.fn(() => Date.now()),
}

// Mock environment variables for tests
vi.mock('../services/config', () => ({
  default: {
    environment: 'testnet',
    isTestnet: true,
    isDevelopment: false,
    isProduction: false,
    blockchainApiUrl: 'https://testnet-api.dytallix.io',
    aiApiUrl: 'https://testnet-ai.dytallix.io',
    websocketUrl: 'wss://testnet-api.dytallix.io/ws',
    logLevel: 'info',
    get: () => ({
      environment: 'testnet',
      enableNetworkLogging: true,
      enablePerformanceMonitoring: true,
      enableErrorReporting: true,
      aiAnalysisEnabled: true,
      aiTimeout: 30000,
      networkName: 'dytallix-testnet',
      chainId: 8888,
      confirmationBlocks: 3,
    }),
    log: vi.fn(),
    getNetworkConfig: () => ({
      chainId: '0x22B8',
      chainName: 'dytallix-testnet',
      nativeCurrency: { name: 'Dytallix', symbol: 'DYT', decimals: 18 },
      rpcUrls: ['https://testnet-api.dytallix.io'],
      blockExplorerUrls: ['https://testnet-api.dytallix.io/explorer'],
    }),
  },
}))

// Console methods for testing
global.console = {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}