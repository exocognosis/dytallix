import axios, { AxiosInstance, AxiosError } from 'axios'
import config from './config'
import {
  ApiResponse,
  BlockchainStats,
  Transaction,
  TransactionRequest,
  Block,
  WalletAccount,
  AIAnalysisResult,
  SmartContract,
  ContractCall
} from '../types'

class DytallixAPI {
  private blockchain: AxiosInstance
  private aiServices: AxiosInstance

  constructor() {
    this.blockchain = axios.create({
      baseURL: '/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Version': '1.0.0',
        'X-Environment': config.environment,
      },
    })

    this.aiServices = axios.create({
      baseURL: '/ai-api',
      timeout: config.get().aiTimeout,
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Version': '1.0.0',
        'X-Environment': config.environment,
      },
    })

    // Add request/response interceptors for error handling and logging
    this.setupInterceptors()
  }

  private setupInterceptors() {
    // Blockchain API interceptors
    this.blockchain.interceptors.request.use(
      (request) => {
        if (config.get().enableNetworkLogging) {
          config.log('debug', `🔵 Blockchain API Request: ${request.method?.toUpperCase()} ${request.url}`, request)
        }
        return request
      },
      (error) => {
        config.log('error', '🔴 Blockchain API Request Error:', error)
        return Promise.reject(error)
      }
    )

    this.blockchain.interceptors.response.use(
      (response) => {
        if (config.get().enableNetworkLogging) {
          config.log('debug', `🟢 Blockchain API Response: ${response.status} ${response.config.url}`, response.data)
        }
        return response
      },
      (error: AxiosError) => {
        const errorMsg = this.formatApiError('Blockchain API', error)
        config.log('error', errorMsg, error)
        
        // Emit custom error event for monitoring
        if (config.get().enableErrorReporting) {
          this.reportError('blockchain_api_error', error)
        }
        
        return Promise.reject(error)
      }
    )

    // AI Services interceptors
    this.aiServices.interceptors.request.use(
      (request) => {
        if (config.get().enableNetworkLogging) {
          config.log('debug', `🔵 AI API Request: ${request.method?.toUpperCase()} ${request.url}`, request)
        }
        return request
      },
      (error) => {
        config.log('error', '🔴 AI API Request Error:', error)
        return Promise.reject(error)
      }
    )

    this.aiServices.interceptors.response.use(
      (response) => {
        if (config.get().enableNetworkLogging) {
          config.log('debug', `🟢 AI API Response: ${response.status} ${response.config.url}`, response.data)
        }
        return response
      },
      (error: AxiosError) => {
        const errorMsg = this.formatApiError('AI Services API', error)
        config.log('error', errorMsg, error)
        
        // Emit custom error event for monitoring
        if (config.get().enableErrorReporting) {
          this.reportError('ai_api_error', error)
        }
        
        return Promise.reject(error)
      }
    )
  }

  private formatApiError(service: string, error: AxiosError): string {
    if (error.response) {
      return `🔴 ${service} Error: ${error.response.status} ${error.response.statusText} - ${error.config?.url}`
    } else if (error.request) {
      return `🔴 ${service} Network Error: No response received - ${error.config?.url}`
    } else {
      return `🔴 ${service} Error: ${error.message}`
    }
  }

  private reportError(type: string, error: any) {
    // Custom error reporting for monitoring
    const errorReport = {
      type,
      environment: config.environment,
      timestamp: new Date().toISOString(),
      message: error.message,
      url: error.config?.url,
      status: error.response?.status,
      userAgent: navigator.userAgent,
    }
    
    config.log('info', '📊 Error Report:', errorReport)
    
    // In a real implementation, this would send to a monitoring service
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('dytallix-error', { detail: errorReport }))
    }
  }

  // Enhanced method with performance monitoring
  private async performanceWrapper<T>(
    name: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now()
    
    try {
      const result = await operation()
      
      if (config.get().enablePerformanceMonitoring) {
        const duration = performance.now() - startTime
        config.log('debug', `⚡ ${name} completed in ${duration.toFixed(2)}ms`)
      }
      
      return result
    } catch (error) {
      const duration = performance.now() - startTime
      config.log('error', `⚡ ${name} failed after ${duration.toFixed(2)}ms`, error)
      throw error
    }
  }

  // Blockchain Core API methods with enhanced monitoring
  async getHealth(): Promise<ApiResponse<string>> {
    return this.performanceWrapper('getHealth', async () => {
      const response = await this.blockchain.get('/health')
      return response.data
    })
  }

  async getStats(): Promise<ApiResponse<BlockchainStats>> {
    return this.performanceWrapper('getStats', async () => {
      const response = await this.blockchain.get('/stats')
      return response.data
    })
  }

  async getBalance(address: string): Promise<ApiResponse<number>> {
    return this.performanceWrapper(`getBalance(${address})`, async () => {
      const response = await this.blockchain.get(`/balance/${address}`)
      return response.data
    })
  }

  async submitTransaction(tx: TransactionRequest): Promise<ApiResponse<Transaction>> {
    return this.performanceWrapper('submitTransaction', async () => {
      config.log('info', '📤 Submitting transaction:', tx)
      const response = await this.blockchain.post('/submit', tx)
      config.log('info', '✅ Transaction submitted:', response.data)
      return response.data
    })
  }

  async getTransaction(hash: string): Promise<ApiResponse<Transaction>> {
    return this.performanceWrapper(`getTransaction(${hash})`, async () => {
      const response = await this.blockchain.get(`/transaction/${hash}`)
      return response.data
    })
  }

  async listTransactions(account?: string, limit: number = 10): Promise<ApiResponse<Transaction[]>> {
    return this.performanceWrapper('listTransactions', async () => {
      const params = new URLSearchParams()
      if (account) params.append('account', account)
      params.append('limit', limit.toString())
      
      const response = await this.blockchain.get(`/transactions?${params}`)
      return response.data
    })
  }

  async getBlocks(limit: number = 10): Promise<ApiResponse<Block[]>> {
    return this.performanceWrapper('getBlocks', async () => {
      const response = await this.blockchain.get(`/blocks?limit=${limit}`)
      return response.data
    })
  }

  async getBlock(hashOrNumber: string | number): Promise<ApiResponse<Block>> {
    return this.performanceWrapper(`getBlock(${hashOrNumber})`, async () => {
      const response = await this.blockchain.get(`/block/${hashOrNumber}`)
      return response.data
    })
  }

  // Wallet API methods
  async generateKeyPair(algorithm: 'dilithium' | 'falcon' | 'sphincs'): Promise<ApiResponse<any>> {
    return this.performanceWrapper(`generateKeyPair(${algorithm})`, async () => {
      const response = await this.blockchain.post('/wallet/generate', { algorithm })
      return response.data
    })
  }

  async getAccounts(): Promise<ApiResponse<WalletAccount[]>> {
    return this.performanceWrapper('getAccounts', async () => {
      const response = await this.blockchain.get('/wallet/accounts')
      return response.data
    })
  }

  // Smart Contract API methods
  async deployContract(code: string, abi: any[]): Promise<ApiResponse<SmartContract>> {
    return this.performanceWrapper('deployContract', async () => {
      config.log('info', '📜 Deploying contract')
      const response = await this.blockchain.post('/contracts/deploy', { code, abi })
      config.log('info', '✅ Contract deployed:', response.data)
      return response.data
    })
  }

  async callContract(call: ContractCall): Promise<ApiResponse<any>> {
    return this.performanceWrapper('callContract', async () => {
      const response = await this.blockchain.post('/contracts/call', call)
      return response.data
    })
  }

  async getContract(address: string): Promise<ApiResponse<SmartContract>> {
    return this.performanceWrapper(`getContract(${address})`, async () => {
      const response = await this.blockchain.get(`/contracts/${address}`)
      return response.data
    })
  }

  async listContracts(): Promise<ApiResponse<SmartContract[]>> {
    return this.performanceWrapper('listContracts', async () => {
      const response = await this.blockchain.get('/contracts')
      return response.data
    })
  }

  // AI Services API methods with enhanced monitoring
  async analyzeFraud(transaction: Transaction): Promise<AIAnalysisResult> {
    if (!config.get().aiAnalysisEnabled) {
      throw new Error('AI analysis is disabled in current environment')
    }
    
    return this.performanceWrapper('analyzeFraud', async () => {
      const response = await this.aiServices.post('/analyze/fraud', transaction)
      return response.data
    })
  }

  async analyzeRisk(address: string): Promise<AIAnalysisResult> {
    if (!config.get().aiAnalysisEnabled) {
      throw new Error('AI analysis is disabled in current environment')
    }
    
    return this.performanceWrapper(`analyzeRisk(${address})`, async () => {
      const response = await this.aiServices.post('/analyze/risk', { address })
      return response.data
    })
  }

  async auditContract(contract: SmartContract): Promise<AIAnalysisResult> {
    if (!config.get().aiAnalysisEnabled) {
      throw new Error('AI analysis is disabled in current environment')
    }
    
    return this.performanceWrapper('auditContract', async () => {
      const response = await this.aiServices.post('/analyze/contract', contract)
      return response.data
    })
  }

  async getAIHealth(): Promise<any> {
    return this.performanceWrapper('getAIHealth', async () => {
      const response = await this.aiServices.get('/health')
      return response.data
    })
  }

  async getAIStatistics(): Promise<any> {
    return this.performanceWrapper('getAIStatistics', async () => {
      const response = await this.aiServices.get('/statistics')
      return response.data
    })
  }

  // Testnet-specific utility methods
  async testConnection(): Promise<{ blockchain: boolean; ai: boolean }> {
    const results = { blockchain: false, ai: false }
    
    try {
      await this.getHealth()
      results.blockchain = true
      config.log('info', '✅ Blockchain API connection successful')
    } catch (error) {
      config.log('error', '❌ Blockchain API connection failed:', error)
    }
    
    try {
      await this.getAIHealth()
      results.ai = true
      config.log('info', '✅ AI API connection successful')
    } catch (error) {
      config.log('error', '❌ AI API connection failed:', error)
    }
    
    return results
  }

  getConnectionInfo() {
    return {
      environment: config.environment,
      blockchainEndpoint: config.blockchainApiUrl,
      aiEndpoint: config.aiApiUrl,
      websocketEndpoint: config.websocketUrl,
      networkName: config.get().networkName,
      chainId: config.get().chainId,
    }
  }
}

export const api = new DytallixAPI()
export default api
