/**
 * Environment Configuration Service
 * Manages environment-specific settings for development, testnet, and production
 */

interface ImportMetaEnv {
  VITE_ENVIRONMENT?: string
  VITE_APP_NAME?: string
  VITE_BLOCKCHAIN_API_URL?: string
  VITE_AI_API_URL?: string
  VITE_WEBSOCKET_URL?: string
  VITE_LOG_LEVEL?: string
  VITE_ENABLE_DEBUG_TOOLS?: string
  VITE_ENABLE_MOCK_DATA?: string
  VITE_NETWORK_NAME?: string
  VITE_CHAIN_ID?: string
  VITE_CONFIRMATION_BLOCKS?: string
  VITE_AI_ANALYSIS_ENABLED?: string
  VITE_AI_TIMEOUT?: string
  VITE_ENABLE_METAMASK?: string
  VITE_ENABLE_PQC_WALLET?: string
  VITE_ETHEREUM_TESTNET_RPC?: string
  VITE_ETHEREUM_CHAIN_ID?: string
  VITE_COSMOS_TESTNET_RPC?: string
  VITE_ENABLE_PERFORMANCE_MONITORING?: string
  VITE_ENABLE_NETWORK_LOGGING?: string
  VITE_ENABLE_ERROR_REPORTING?: string
}
interface ImportMeta {
  env: ImportMetaEnv
}

export interface EnvironmentConfig {
  environment: string
  appName: string
  
  // API Endpoints
  blockchainApiUrl: string
  aiApiUrl: string
  websocketUrl: string
  
  // Logging & Debug
  logLevel: 'debug' | 'info' | 'warn' | 'error'
  enableDebugTools: boolean
  enableMockData: boolean
  
  // Blockchain Settings
  networkName: string
  // Accept either numeric or string chain IDs (Cosmos-style e.g. "dockerchain")
  chainId: number | string
  confirmationBlocks: number
  
  // AI Services
  aiAnalysisEnabled: boolean
  aiTimeout: number
  
  // Wallet Configuration
  enableMetaMask: boolean
  enablePQCWallet: boolean
  
  // External Chain Integration
  ethereumTestnetRpc?: string
  ethereumChainId?: number
  cosmosTestnetRpc?: string
  
  // Monitoring
  enablePerformanceMonitoring: boolean
  enableNetworkLogging: boolean
  enableErrorReporting: boolean
}

class ConfigService {
  private config: EnvironmentConfig

  constructor() {
    this.config = this.loadEnvironmentConfig()
    this.validateConfig()
    
    if (this.config.enableDebugTools) {
      console.log('🔧 Dytallix Config Loaded:', this.config)
    }
  }

  private parseChainId(raw: any): number | string {
    if (!raw) return 1337 // default dev id
    const str = String(raw).trim()
    if (/^\d+$/.test(str)) {
      // purely numeric -> number
      const n = Number(str)
      return Number.isNaN(n) ? 1337 : n
    }
    return str // cosmos-style string id
  }

  private loadEnvironmentConfig(): EnvironmentConfig {
    return {
      environment: import.meta.env.VITE_ENVIRONMENT || 'development',
      appName: import.meta.env.VITE_APP_NAME || 'Dytallix',
      
      // API Endpoints
      blockchainApiUrl: import.meta.env.VITE_BLOCKCHAIN_API_URL || 'http://localhost:3030',
      aiApiUrl: import.meta.env.VITE_AI_API_URL || 'http://localhost:8000',
      websocketUrl: import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:3030/ws',
      
      // Logging & Debug
      logLevel: (import.meta.env.VITE_LOG_LEVEL as any) || 'info',
      enableDebugTools: import.meta.env.VITE_ENABLE_DEBUG_TOOLS === 'true',
      enableMockData: import.meta.env.VITE_ENABLE_MOCK_DATA === 'true',
      
      // Blockchain Settings
      networkName: import.meta.env.VITE_NETWORK_NAME || 'development',
      chainId: this.parseChainId(import.meta.env.VITE_CHAIN_ID),
      confirmationBlocks: parseInt(import.meta.env.VITE_CONFIRMATION_BLOCKS) || 1,
      
      // AI Services
      aiAnalysisEnabled: import.meta.env.VITE_AI_ANALYSIS_ENABLED !== 'false',
      aiTimeout: parseInt(import.meta.env.VITE_AI_TIMEOUT) || 15000,
      
      // Wallet Configuration
      enableMetaMask: import.meta.env.VITE_ENABLE_METAMASK !== 'false',
      enablePQCWallet: import.meta.env.VITE_ENABLE_PQC_WALLET !== 'false',
      
      // External Chain Integration
      ethereumTestnetRpc: import.meta.env.VITE_ETHEREUM_TESTNET_RPC,
      ethereumChainId: parseInt(import.meta.env.VITE_ETHEREUM_CHAIN_ID) || undefined,
      cosmosTestnetRpc: import.meta.env.VITE_COSMOS_TESTNET_RPC,
      
      // Monitoring
      enablePerformanceMonitoring: import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING === 'true',
      enableNetworkLogging: import.meta.env.VITE_ENABLE_NETWORK_LOGGING === 'true',
      enableErrorReporting: import.meta.env.VITE_ENABLE_ERROR_REPORTING === 'true',
    }
  }

  private validateConfig(): void {
    const required = ['blockchainApiUrl', 'aiApiUrl', 'websocketUrl']
    
    for (const key of required) {
      if (!this.config[key as keyof EnvironmentConfig]) {
        throw new Error(`Missing required configuration: ${key}`)
      }
    }

    // Validate URLs
    try {
      new URL(this.config.blockchainApiUrl)
      new URL(this.config.aiApiUrl)
      new URL(this.config.websocketUrl)
    } catch (error) {
      throw new Error(`Invalid URL configuration: ${error}`)
    }
  }

  // Getters for easy access
  get(): EnvironmentConfig {
    return { ...this.config }
  }

  get environment(): string {
    return this.config.environment
  }

  get isTestnet(): boolean {
    return this.config.environment === 'testnet'
  }

  get isProduction(): boolean {
    return this.config.environment === 'production'
  }

  get isDevelopment(): boolean {
    return this.config.environment === 'development'
  }

  get blockchainApiUrl(): string {
    return this.config.blockchainApiUrl
  }

  get aiApiUrl(): string {
    return this.config.aiApiUrl
  }

  get websocketUrl(): string {
    return this.config.websocketUrl
  }

  get logLevel(): string {
    return this.config.logLevel
  }

  // Network configuration for MetaMask
  getNetworkConfig() {
    // Only meaningful for EVM networks; we keep previous behaviour for numeric IDs.
    const numericChainId = typeof this.config.chainId === 'number' ? this.config.chainId : 1337
    return {
      chainId: `0x${numericChainId.toString(16)}`,
      chainName: this.config.networkName,
      nativeCurrency: {
        name: 'Dytallix Governance Token',
        symbol: 'DGT',
        decimals: 6,
      },
      rpcUrls: [this.config.blockchainApiUrl],
      blockExplorerUrls: [`${this.config.blockchainApiUrl}/explorer`],
    }
  }

  // Logging helper
  log(level: 'debug' | 'info' | 'warn' | 'error', message: string, ...args: any[]): void {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 }
    const configLevel = levels[this.config.logLevel]
    const messageLevel = levels[level]

    if (messageLevel >= configLevel) {
      const prefix = `[${this.config.environment.toUpperCase()}]`
      console[level](`${prefix} ${message}`, ...args)
    }
  }
}

export const config = new ConfigService()
export default config