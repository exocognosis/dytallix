// Dytallix REST Client  
// HTTP client for faucet, staking, and governance REST endpoints

export interface RestConfig {
  baseUrl: string
  timeout: number
}

export interface FaucetRequest {
  address: string
  tokens: string[]
}

export interface FaucetResponse {
  success: boolean
  txHash?: string
  message?: string
  cooldowns?: Record<string, number>
}

export interface StakingInfo {
  validator: string
  delegator: string
  shares: string
  tokens: string
}

export interface ProposalInfo {
  id: string
  title: string
  description: string
  status: string
  votingEndTime: string
}

export class RestClient {
  private config: RestConfig

  constructor(config: Partial<RestConfig> = {}) {
    this.config = {
      baseUrl: 'https://lcd-testnet.dytallix.com',
      timeout: 30000,
      ...config
    }
  }

  /**
   * Request tokens from faucet
   */
  async requestFaucet(request: FaucetRequest): Promise<FaucetResponse> {
    const response = await this.post('/faucet', request)
    
    return {
      success: response.success || false,
      txHash: response.txHash || response.tx_hash,
      message: response.message,
      cooldowns: response.cooldowns
    }
  }

  /**
   * Get staking information
   */
  async getStakingInfo(delegator?: string, validator?: string): Promise<StakingInfo[]> {
    let endpoint = '/staking/delegations'
    const params = new URLSearchParams()
    
    if (delegator) {
      params.append('delegator', delegator)
    }
    if (validator) {
      params.append('validator', validator)
    }
    
    if (params.toString()) {
      endpoint += '?' + params.toString()
    }
    
    const response = await this.get(endpoint)
    return response.delegations || []
  }

  /**
   * Get validator information
   */
  async getValidators(): Promise<any[]> {
    const response = await this.get('/staking/validators')
    return response.validators || []
  }

  /**
   * Get governance proposals
   */
  async getProposals(): Promise<ProposalInfo[]> {
    const response = await this.get('/gov/proposals')
    return response.proposals || []
  }

  /**
   * Get specific proposal
   */
  async getProposal(proposalId: string): Promise<ProposalInfo> {
    const response = await this.get(`/gov/proposals/${proposalId}`)
    return response.proposal
  }

  /**
   * Vote on proposal
   */
  async voteProposal(proposalId: string, voter: string, option: string): Promise<any> {
    return await this.post(`/gov/proposals/${proposalId}/votes`, {
      voter,
      option
    })
  }

  /**
   * Get account information
   */
  async getAccount(address: string): Promise<any> {
    const response = await this.get(`/auth/accounts/${address}`)
    return response.account
  }

  /**
   * Get transaction by hash
   */
  async getTx(hash: string): Promise<any> {
    const response = await this.get(`/txs/${hash}`)
    return response
  }

  /**
   * Search transactions
   */
  async searchTxs(params: Record<string, string>): Promise<any[]> {
    const searchParams = new URLSearchParams(params)
    const response = await this.get(`/txs?${searchParams.toString()}`)
    return response.txs || []
  }

  /**
   * Make GET request
   */
  private async get(endpoint: string): Promise<any> {
    return await this.request('GET', endpoint)
  }

  /**
   * Make POST request
   */
  private async post(endpoint: string, body?: any): Promise<any> {
    return await this.request('POST', endpoint, body)
  }

  /**
   * Make HTTP request
   */
  private async request(method: string, endpoint: string, body?: any): Promise<any> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)
    
    try {
      const url = `${this.config.baseUrl}${endpoint}`
      
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        signal: controller.signal
      }
      
      if (body && method !== 'GET') {
        options.body = JSON.stringify(body)
      }
      
      const response = await fetch(url, options)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      return data
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout')
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }
}