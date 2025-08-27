// Dytallix RPC Client
// Lightweight HTTP client for blockchain RPC operations

import type { SignedTx, Balance } from '../wallet/types'

export interface RpcConfig {
  url: string
  timeout: number
  retries: number
}

export interface TxResponse {
  txHash: string
  height: number
  gasUsed: number
  gasWanted: number
}

export interface QueryTxResponse {
  hash: string
  height: number
  result: any
  timestamp: string
}

export interface QueryBalanceResponse {
  address: string
  balances: Array<{
    denom: string
    amount: string
  }>
}

export class RpcClient {
  private config: RpcConfig

  constructor(config: Partial<RpcConfig> = {}) {
    this.config = {
      url: 'https://rpc-testnet.dytallix.com',
      timeout: 30000,
      retries: 3,
      ...config
    }
  }

  /**
   * Broadcast a signed transaction
   */
  async broadcastTx(signedTx: SignedTx): Promise<TxResponse> {
    const response = await this.request('broadcast_tx_sync', {
      tx: this.encodeTx(signedTx)
    })
    
    if (response.code !== 0) {
      throw new Error(`Transaction failed: ${response.log}`)
    }
    
    return {
      txHash: response.hash,
      height: response.height || 0,
      gasUsed: response.gas_used || 0,
      gasWanted: response.gas_wanted || 0
    }
  }

  /**
   * Query transaction by hash
   */
  async queryTx(hash: string): Promise<QueryTxResponse> {
    const response = await this.request('tx', { hash })
    
    return {
      hash: response.hash,
      height: response.height,
      result: response.tx_result,
      timestamp: response.timestamp || new Date().toISOString()
    }
  }

  /**
   * Query account balances
   */
  async queryBalances(address: string): Promise<Balance> {
    const response = await this.request('bank/balances/' + address, {})
    
    const balance: Balance = {
      address,
      udgt: '0',
      udrt: '0'
    }
    
    if (response.balances) {
      for (const coin of response.balances) {
        if (coin.denom === 'udgt') {
          balance.udgt = coin.amount
        } else if (coin.denom === 'udrt') {
          balance.udrt = coin.amount
        } else {
          balance[coin.denom] = coin.amount
        }
      }
    }
    
    return balance
  }

  /**
   * Query smart contract state
   */
  async queryContract(contract: string, query: any): Promise<any> {
    const response = await this.request('wasm/contract/' + contract + '/smart', {
      query_data: btoa(JSON.stringify(query))
    })
    
    return response.data
  }

  /**
   * Query governance proposals
   */
  async queryGov(proposalId?: string): Promise<any> {
    const endpoint = proposalId 
      ? `gov/proposals/${proposalId}`
      : 'gov/proposals'
    
    return await this.request(endpoint, {})
  }

  /**
   * Make HTTP request with retry logic
   */
  private async request(method: string, params: any): Promise<any> {
    let lastError: Error | null = null
    
    for (let attempt = 0; attempt < this.config.retries; attempt++) {
      try {
        const response = await this.makeRequest(method, params)
        return response
      } catch (error) {
        lastError = error as Error
        
        if (attempt < this.config.retries - 1) {
          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
    
    throw lastError || new Error('Request failed after retries')
  }

  /**
   * Make a single HTTP request
   */
  private async makeRequest(method: string, params: any): Promise<any> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)
    
    try {
      const response = await fetch(`${this.config.url}/${method}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method,
          params,
          id: 1
        }),
        signal: controller.signal
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (data.error) {
        throw new Error(`RPC Error: ${data.error.message}`)
      }
      
      return data.result
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * Encode signed transaction for broadcast
   */
  private encodeTx(signedTx: SignedTx): string {
    // TODO: Implement proper transaction encoding
    // For now, return base64 encoded JSON
    return btoa(JSON.stringify(signedTx))
  }
}