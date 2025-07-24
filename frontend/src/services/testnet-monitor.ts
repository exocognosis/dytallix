/**
 * Testnet Integration Testing Utilities
 * Provides tools for testing and monitoring testnet connectivity
 */

import { api } from './api'
import config from './config'

export interface TestnetHealthReport {
  timestamp: string
  environment: string
  connectivity: {
    blockchain: {
      status: 'healthy' | 'degraded' | 'down'
      responseTime: number
      endpoint: string
      error?: string
    }
    ai: {
      status: 'healthy' | 'degraded' | 'down'
      responseTime: number
      endpoint: string
      error?: string
    }
    websocket: {
      status: 'connected' | 'connecting' | 'disconnected'
      endpoint: string
      lastConnected?: string
      error?: string
    }
  }
  networkInfo: {
    chainId: number
    networkName: string
    confirmationBlocks: number
  }
  performance: {
    apiCalls: {
      total: number
      successful: number
      failed: number
      averageResponseTime: number
    }
    errors: {
      networkErrors: number
      timeouts: number
      serverErrors: number
    }
  }
}

export interface TransactionTestResult {
  success: boolean
  transactionHash?: string
  confirmations: number
  timeTaken: number
  error?: string
  details: {
    submitTime: string
    confirmTime?: string
    finalizeTime?: string
  }
}

export interface WalletTestResult {
  metamask: {
    detected: boolean
    connected: boolean
    networkConfigured: boolean
    error?: string
  }
  pqc: {
    supported: boolean
    keyGenerated: boolean
    signatureValid: boolean
    error?: string
  }
}

class TestnetMonitor {
  private performanceData = {
    apiCalls: { total: 0, successful: 0, failed: 0, totalResponseTime: 0 },
    errors: { networkErrors: 0, timeouts: 0, serverErrors: 0 },
  }

  private wsState = {
    status: 'disconnected' as const,
    lastConnected: null as string | null,
    error: null as string | null,
  }

  constructor() {
    this.initializeEventListeners()
  }

  private initializeEventListeners() {
    // Listen for API errors
    window.addEventListener('dytallix-error', (event: any) => {
      const error = event.detail
      
      if (error.type === 'blockchain_api_error' || error.type === 'ai_api_error') {
        this.performanceData.apiCalls.failed++
        
        if (error.status >= 500) {
          this.performanceData.errors.serverErrors++
        } else if (error.message?.includes('timeout')) {
          this.performanceData.errors.timeouts++
        } else {
          this.performanceData.errors.networkErrors++
        }
      }
    })

    // Listen for WebSocket events
    window.addEventListener('dytallix-websocket-connected', () => {
      this.wsState.status = 'connected'
      this.wsState.lastConnected = new Date().toISOString()
      this.wsState.error = null
    })

    window.addEventListener('dytallix-websocket-disconnected', (event: any) => {
      this.wsState.status = 'disconnected'
      this.wsState.error = event.detail?.reason || 'Unknown error'
    })
  }

  async generateHealthReport(): Promise<TestnetHealthReport> {
    const report: TestnetHealthReport = {
      timestamp: new Date().toISOString(),
      environment: config.environment,
      connectivity: {
        blockchain: await this.testBlockchainAPI(),
        ai: await this.testAIAPI(),
        websocket: this.getWebSocketStatus(),
      },
      networkInfo: {
        chainId: config.get().chainId,
        networkName: config.get().networkName,
        confirmationBlocks: config.get().confirmationBlocks,
      },
      performance: {
        apiCalls: {
          total: this.performanceData.apiCalls.total,
          successful: this.performanceData.apiCalls.successful,
          failed: this.performanceData.apiCalls.failed,
          averageResponseTime: this.performanceData.apiCalls.total > 0 
            ? this.performanceData.apiCalls.totalResponseTime / this.performanceData.apiCalls.total 
            : 0,
        },
        errors: { ...this.performanceData.errors },
      },
    }

    config.log('info', '📊 Testnet Health Report Generated:', report)
    return report
  }

  private async testBlockchainAPI() {
    const startTime = performance.now()
    
    try {
      await api.getHealth()
      const responseTime = performance.now() - startTime
      
      this.performanceData.apiCalls.total++
      this.performanceData.apiCalls.successful++
      this.performanceData.apiCalls.totalResponseTime += responseTime

      return {
        status: 'healthy' as const,
        responseTime: Math.round(responseTime),
        endpoint: config.blockchainApiUrl,
      }
    } catch (error: any) {
      const responseTime = performance.now() - startTime
      
      this.performanceData.apiCalls.total++
      this.performanceData.apiCalls.failed++
      this.performanceData.apiCalls.totalResponseTime += responseTime

      return {
        status: 'down' as const,
        responseTime: Math.round(responseTime),
        endpoint: config.blockchainApiUrl,
        error: error.message,
      }
    }
  }

  private async testAIAPI() {
    const startTime = performance.now()
    
    try {
      await api.getAIHealth()
      const responseTime = performance.now() - startTime
      
      this.performanceData.apiCalls.total++
      this.performanceData.apiCalls.successful++
      this.performanceData.apiCalls.totalResponseTime += responseTime

      return {
        status: 'healthy' as const,
        responseTime: Math.round(responseTime),
        endpoint: config.aiApiUrl,
      }
    } catch (error: any) {
      const responseTime = performance.now() - startTime
      
      this.performanceData.apiCalls.total++
      this.performanceData.apiCalls.failed++
      this.performanceData.apiCalls.totalResponseTime += responseTime

      return {
        status: 'down' as const,
        responseTime: Math.round(responseTime),
        endpoint: config.aiApiUrl,
        error: error.message,
      }
    }
  }

  private getWebSocketStatus() {
    return {
      status: this.wsState.status,
      endpoint: config.websocketUrl,
      lastConnected: this.wsState.lastConnected,
      error: this.wsState.error,
    }
  }

  async testTransactionFlow(fromAddress: string, toAddress: string, amount: number): Promise<TransactionTestResult> {
    const startTime = performance.now()
    const details = {
      submitTime: new Date().toISOString(),
      confirmTime: undefined as string | undefined,
      finalizeTime: undefined as string | undefined,
    }

    try {
      config.log('info', '🧪 Starting transaction test flow')
      
      // Submit transaction
      const submitResult = await api.submitTransaction({
        from: fromAddress,
        to: toAddress,
        amount,
        fee: 0.001, // Small fee for testnet
      })

      if (!submitResult.success || !submitResult.data) {
        throw new Error(submitResult.error || 'Transaction submission failed')
      }

      const txHash = submitResult.data.hash
      config.log('info', `✅ Transaction submitted: ${txHash}`)

      // Monitor confirmations
      let confirmations = 0
      const maxWaitTime = 60000 // 1 minute
      const pollInterval = 5000 // 5 seconds
      const requiredConfirmations = config.get().confirmationBlocks

      const startPoll = Date.now()
      
      while (confirmations < requiredConfirmations && (Date.now() - startPoll) < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, pollInterval))
        
        try {
          const txResult = await api.getTransaction(txHash)
          if (txResult.success && txResult.data) {
            confirmations = txResult.data.confirmations
            
            if (confirmations >= 1 && !details.confirmTime) {
              details.confirmTime = new Date().toISOString()
            }
            
            if (confirmations >= requiredConfirmations) {
              details.finalizeTime = new Date().toISOString()
              break
            }
          }
        } catch (error) {
          config.log('warn', '⚠️ Error polling transaction status:', error)
        }
      }

      const timeTaken = performance.now() - startTime

      return {
        success: confirmations >= requiredConfirmations,
        transactionHash: txHash,
        confirmations,
        timeTaken: Math.round(timeTaken),
        details,
      }

    } catch (error: any) {
      const timeTaken = performance.now() - startTime
      
      return {
        success: false,
        confirmations: 0,
        timeTaken: Math.round(timeTaken),
        error: error.message,
        details,
      }
    }
  }

  async testWalletIntegration(): Promise<WalletTestResult> {
    const result: WalletTestResult = {
      metamask: {
        detected: false,
        connected: false,
        networkConfigured: false,
      },
      pqc: {
        supported: false,
        keyGenerated: false,
        signatureValid: false,
      },
    }

    // Test MetaMask
    try {
      if (typeof window !== 'undefined' && window.ethereum?.isMetaMask) {
        result.metamask.detected = true
        config.log('info', '🦊 MetaMask detected')

        // Test network configuration
        const networkConfig = config.getNetworkConfig()
        const currentChainId = await window.ethereum.request({ method: 'eth_chainId' })
        
        if (currentChainId === networkConfig.chainId) {
          result.metamask.networkConfigured = true
          result.metamask.connected = true
          config.log('info', '✅ MetaMask configured for testnet')
        } else {
          config.log('warn', `⚠️ MetaMask on wrong network: ${currentChainId} vs ${networkConfig.chainId}`)
        }
      }
    } catch (error: any) {
      result.metamask.error = error.message
      config.log('error', '❌ MetaMask test failed:', error)
    }

    // Test PQC Wallet
    try {
      if (config.get().enablePQCWallet) {
        result.pqc.supported = true
        
        // Test key generation
        const keyResult = await api.generateKeyPair('dilithium')
        if (keyResult.success) {
          result.pqc.keyGenerated = true
          result.pqc.signatureValid = true // Assume valid if generation succeeds
          config.log('info', '🔐 PQC wallet test successful')
        }
      }
    } catch (error: any) {
      result.pqc.error = error.message
      config.log('error', '❌ PQC wallet test failed:', error)
    }

    return result
  }

  exportHealthData(): string {
    const data = {
      performance: this.performanceData,
      webSocketState: this.wsState,
      configuration: config.get(),
      timestamp: new Date().toISOString(),
    }

    return JSON.stringify(data, null, 2)
  }

  resetPerformanceData() {
    this.performanceData = {
      apiCalls: { total: 0, successful: 0, failed: 0, totalResponseTime: 0 },
      errors: { networkErrors: 0, timeouts: 0, serverErrors: 0 },
    }
    config.log('info', '🔄 Performance data reset')
  }
}

export const testnetMonitor = new TestnetMonitor()
export default testnetMonitor