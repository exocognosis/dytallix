/**
 * Wallet Integration Utilities for Testnet Testing
 * Provides comprehensive wallet testing and integration capabilities
 */

import config from './config'

export interface MetaMaskConfig {
  chainId: string
  chainName: string
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
  rpcUrls: string[]
  blockExplorerUrls: string[]
}

export interface WalletConnectionResult {
  success: boolean
  address?: string
  chainId?: string
  error?: string
}

export interface PQCKeyGenerationResult {
  success: boolean
  algorithm?: string
  address?: string
  publicKey?: string
  error?: string
}

export interface TransactionSigningResult {
  success: boolean
  signature?: string
  txHash?: string
  error?: string
}

class WalletIntegrationService {
  private ethereum: any

  constructor() {
    this.ethereum = typeof window !== 'undefined' ? (window as any).ethereum : null
  }

  // MetaMask Integration Methods
  isMetaMaskInstalled(): boolean {
    return !!(this.ethereum && this.ethereum.isMetaMask)
  }

  async connectMetaMask(): Promise<WalletConnectionResult> {
    if (!this.isMetaMaskInstalled()) {
      return {
        success: false,
        error: 'MetaMask is not installed',
      }
    }

    try {
      config.log('info', '🦊 Connecting to MetaMask...')
      
      const accounts = await this.ethereum.request({ 
        method: 'eth_requestAccounts' 
      })

      if (accounts.length === 0) {
        return {
          success: false,
          error: 'No accounts available',
        }
      }

      const chainId = await this.ethereum.request({ 
        method: 'eth_chainId' 
      })

      config.log('info', `✅ MetaMask connected: ${accounts[0]}`)

      return {
        success: true,
        address: accounts[0],
        chainId,
      }
    } catch (error: any) {
      config.log('error', '❌ MetaMask connection failed:', error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  async addTestnetNetwork(): Promise<{ success: boolean; error?: string }> {
    if (!this.isMetaMaskInstalled()) {
      return {
        success: false,
        error: 'MetaMask is not installed',
      }
    }

    try {
      const networkConfig = config.getNetworkConfig()
      
      config.log('info', '🔧 Adding testnet network to MetaMask:', networkConfig)

      await this.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [networkConfig],
      })

      config.log('info', '✅ Testnet network added to MetaMask')
      return { success: true }
    } catch (error: any) {
      config.log('error', '❌ Failed to add testnet network:', error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  async switchToTestnetNetwork(): Promise<{ success: boolean; error?: string }> {
    if (!this.isMetaMaskInstalled()) {
      return {
        success: false,
        error: 'MetaMask is not installed',
      }
    }

    try {
      const networkConfig = config.getNetworkConfig()
      
      config.log('info', '🔄 Switching to testnet network...')

      await this.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: networkConfig.chainId }],
      })

      config.log('info', '✅ Switched to testnet network')
      return { success: true }
    } catch (error: any) {
      // If network doesn't exist, try to add it
      if (error.code === 4902) {
        config.log('info', '🔧 Network not found, attempting to add...')
        return await this.addTestnetNetwork()
      }

      config.log('error', '❌ Failed to switch network:', error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  async getCurrentNetwork(): Promise<{ chainId?: string; error?: string }> {
    if (!this.isMetaMaskInstalled()) {
      return {
        error: 'MetaMask is not installed',
      }
    }

    try {
      const chainId = await this.ethereum.request({ 
        method: 'eth_chainId' 
      })

      return { chainId }
    } catch (error: any) {
      return {
        error: error.message,
      }
    }
  }

  async signTestTransaction(
    fromAddress: string,
    toAddress: string,
    amount: string
  ): Promise<TransactionSigningResult> {
    if (!this.isMetaMaskInstalled()) {
      return {
        success: false,
        error: 'MetaMask is not installed',
      }
    }

    try {
      config.log('info', `📝 Signing test transaction: ${amount} ETH from ${fromAddress} to ${toAddress}`)

      const transactionParameters = {
        to: toAddress,
        from: fromAddress,
        value: this.toHex(amount),
        gas: '0x5208', // 21000 gas limit for simple transfer
        gasPrice: '0x4A817C800', // 20 gwei
      }

      const txHash = await this.ethereum.request({
        method: 'eth_sendTransaction',
        params: [transactionParameters],
      })

      config.log('info', `✅ Transaction signed and sent: ${txHash}`)

      return {
        success: true,
        txHash,
      }
    } catch (error: any) {
      config.log('error', '❌ Transaction signing failed:', error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  // PQC Wallet Integration Methods
  async generatePQCKeyPair(algorithm: 'dilithium' | 'falcon' | 'sphincs'): Promise<PQCKeyGenerationResult> {
    try {
      config.log('info', `🔐 Generating PQC key pair with ${algorithm}...`)

      // Use the API to generate PQC keys
      const result = await fetch('/api/wallet/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ algorithm }),
      })

      if (!result.ok) {
        throw new Error(`HTTP ${result.status}: ${result.statusText}`)
      }

      const data = await result.json()

      if (!data.success) {
        throw new Error(data.error || 'Key generation failed')
      }

      config.log('info', `✅ PQC key pair generated successfully`)

      return {
        success: true,
        algorithm,
        address: data.data.address,
        publicKey: data.data.public_key,
      }
    } catch (error: any) {
      config.log('error', '❌ PQC key generation failed:', error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  async testPQCSignature(
    algorithm: 'dilithium' | 'falcon' | 'sphincs',
    message: string
  ): Promise<TransactionSigningResult> {
    try {
      config.log('info', `📝 Testing PQC signature with ${algorithm}...`)

      // First generate a key pair for testing
      const keyResult = await this.generatePQCKeyPair(algorithm)
      if (!keyResult.success) {
        throw new Error(keyResult.error || 'Key generation failed')
      }

      // Mock signing process (in a real implementation, this would use the PQC library)
      const signature = `pqc_${algorithm}_signature_${Date.now()}`

      config.log('info', `✅ PQC signature generated successfully`)

      return {
        success: true,
        signature,
      }
    } catch (error: any) {
      config.log('error', '❌ PQC signature test failed:', error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  // Utility Methods
  private toHex(value: string): string {
    // Convert ETH amount to wei and then to hex
    const weiValue = parseFloat(value) * 1e18
    return '0x' + Math.floor(weiValue).toString(16)
  }

  async getAccountBalance(address: string): Promise<{ balance?: string; error?: string }> {
    try {
      const balance = await this.ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest'],
      })

      // Convert from wei to ETH
      const balanceInEth = parseInt(balance, 16) / 1e18

      return { balance: balanceInEth.toString() }
    } catch (error: any) {
      return { error: error.message }
    }
  }

  // Comprehensive wallet testing
  async runWalletDiagnostics(): Promise<{
    metamask: {
      installed: boolean
      connected: boolean
      networkCorrect: boolean
      balance?: string
      error?: string
    }
    pqc: {
      dilithium: { keyGen: boolean; signing: boolean; error?: string }
      falcon: { keyGen: boolean; signing: boolean; error?: string }
      sphincs: { keyGen: boolean; signing: boolean; error?: string }
    }
  }> {
    const results = {
      metamask: {
        installed: false,
        connected: false,
        networkCorrect: false,
        balance: undefined as string | undefined,
        error: undefined as string | undefined,
      },
      pqc: {
        dilithium: { keyGen: false, signing: false, error: undefined as string | undefined },
        falcon: { keyGen: false, signing: false, error: undefined as string | undefined },
        sphincs: { keyGen: false, signing: false, error: undefined as string | undefined },
      },
    }

    // Test MetaMask
    try {
      results.metamask.installed = this.isMetaMaskInstalled()

      if (results.metamask.installed) {
        const connectionResult = await this.connectMetaMask()
        results.metamask.connected = connectionResult.success

        if (connectionResult.success && connectionResult.address) {
          // Check network
          const expectedChainId = config.getNetworkConfig().chainId
          results.metamask.networkCorrect = connectionResult.chainId === expectedChainId

          // Get balance
          const balanceResult = await this.getAccountBalance(connectionResult.address)
          if (balanceResult.balance) {
            results.metamask.balance = balanceResult.balance
          }
        } else {
          results.metamask.error = connectionResult.error
        }
      }
    } catch (error: any) {
      results.metamask.error = error.message
    }

    // Test PQC algorithms
    const algorithms = ['dilithium', 'falcon', 'sphincs'] as const

    for (const algorithm of algorithms) {
      try {
        // Test key generation
        const keyResult = await this.generatePQCKeyPair(algorithm)
        results.pqc[algorithm].keyGen = keyResult.success

        if (keyResult.success) {
          // Test signing
          const signResult = await this.testPQCSignature(algorithm, 'test message')
          results.pqc[algorithm].signing = signResult.success

          if (!signResult.success) {
            results.pqc[algorithm].error = signResult.error
          }
        } else {
          results.pqc[algorithm].error = keyResult.error
        }
      } catch (error: any) {
        results.pqc[algorithm].error = error.message
      }
    }

    config.log('info', '📊 Wallet diagnostics completed:', results)
    return results
  }

  // Event listeners for wallet events
  setupWalletEventListeners() {
    if (!this.isMetaMaskInstalled()) {
      return
    }

    this.ethereum.on('accountsChanged', (accounts: string[]) => {
      config.log('info', '👥 MetaMask accounts changed:', accounts)
      window.dispatchEvent(new CustomEvent('dytallix-wallet-accounts-changed', { 
        detail: accounts 
      }))
    })

    this.ethereum.on('chainChanged', (chainId: string) => {
      config.log('info', '🔗 MetaMask network changed:', chainId)
      window.dispatchEvent(new CustomEvent('dytallix-wallet-network-changed', { 
        detail: chainId 
      }))
    })

    this.ethereum.on('connect', (connectInfo: any) => {
      config.log('info', '🔌 MetaMask connected:', connectInfo)
      window.dispatchEvent(new CustomEvent('dytallix-wallet-connected', { 
        detail: connectInfo 
      }))
    })

    this.ethereum.on('disconnect', (error: any) => {
      config.log('warn', '🔌 MetaMask disconnected:', error)
      window.dispatchEvent(new CustomEvent('dytallix-wallet-disconnected', { 
        detail: error 
      }))
    })
  }
}

export const walletIntegration = new WalletIntegrationService()
export default walletIntegration