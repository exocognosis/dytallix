import axios, { AxiosInstance } from 'axios'
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
      },
    })

    this.aiServices = axios.create({
      baseURL: '/ai-api',
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Add request/response interceptors for error handling
    this.setupInterceptors()
  }

  private setupInterceptors() {
    // Blockchain API interceptors
    this.blockchain.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('Blockchain API Error:', error)
        return Promise.reject(error)
      }
    )

    // AI Services interceptors
    this.aiServices.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('AI Services API Error:', error)
        return Promise.reject(error)
      }
    )
  }

  // Blockchain Core API methods
  async getHealth(): Promise<ApiResponse<string>> {
    const response = await this.blockchain.get('/health')
    return response.data
  }

  async getStats(): Promise<ApiResponse<BlockchainStats>> {
    const response = await this.blockchain.get('/stats')
    return response.data
  }

  async getBalance(address: string): Promise<ApiResponse<number>> {
    const response = await this.blockchain.get(`/balance/${address}`)
    return response.data
  }

  async submitTransaction(tx: TransactionRequest): Promise<ApiResponse<Transaction>> {
    const response = await this.blockchain.post('/submit', tx)
    return response.data
  }

  async getTransaction(hash: string): Promise<ApiResponse<Transaction>> {
    const response = await this.blockchain.get(`/transaction/${hash}`)
    return response.data
  }

  async listTransactions(account?: string, limit: number = 10): Promise<ApiResponse<Transaction[]>> {
    const params = new URLSearchParams()
    if (account) params.append('account', account)
    params.append('limit', limit.toString())
    
    const response = await this.blockchain.get(`/transactions?${params}`)
    return response.data
  }

  async getBlocks(limit: number = 10): Promise<ApiResponse<Block[]>> {
    const response = await this.blockchain.get(`/blocks?limit=${limit}`)
    return response.data
  }

  async getBlock(hashOrNumber: string | number): Promise<ApiResponse<Block>> {
    const response = await this.blockchain.get(`/block/${hashOrNumber}`)
    return response.data
  }

  // Wallet API methods
  async generateKeyPair(algorithm: 'dilithium' | 'falcon' | 'sphincs'): Promise<ApiResponse<any>> {
    const response = await this.blockchain.post('/wallet/generate', { algorithm })
    return response.data
  }

  async getAccounts(): Promise<ApiResponse<WalletAccount[]>> {
    const response = await this.blockchain.get('/wallet/accounts')
    return response.data
  }

  // Smart Contract API methods
  async deployContract(code: string, abi: any[]): Promise<ApiResponse<SmartContract>> {
    const response = await this.blockchain.post('/contracts/deploy', { code, abi })
    return response.data
  }

  async callContract(call: ContractCall): Promise<ApiResponse<any>> {
    const response = await this.blockchain.post('/contracts/call', call)
    return response.data
  }

  async getContract(address: string): Promise<ApiResponse<SmartContract>> {
    const response = await this.blockchain.get(`/contracts/${address}`)
    return response.data
  }

  async listContracts(): Promise<ApiResponse<SmartContract[]>> {
    const response = await this.blockchain.get('/contracts')
    return response.data
  }

  // AI Services API methods
  async analyzeFraud(transaction: Transaction): Promise<AIAnalysisResult> {
    const response = await this.aiServices.post('/analyze/fraud', transaction)
    return response.data
  }

  async analyzeRisk(address: string): Promise<AIAnalysisResult> {
    const response = await this.aiServices.post('/analyze/risk', { address })
    return response.data
  }

  async auditContract(contract: SmartContract): Promise<AIAnalysisResult> {
    const response = await this.aiServices.post('/analyze/contract', contract)
    return response.data
  }

  async getAIHealth(): Promise<any> {
    const response = await this.aiServices.get('/health')
    return response.data
  }

  async getAIStatistics(): Promise<any> {
    const response = await this.aiServices.get('/statistics')
    return response.data
  }
}

export const api = new DytallixAPI()
export default api
