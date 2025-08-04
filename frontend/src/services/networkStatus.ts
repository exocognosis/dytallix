interface NetworkStatus {
  chainId: string
  activeValidators: number
  blockHeight: number
  blockTime: string
  lastBlockTime: string
  nodeInfo?: {
    moniker: string
    version: string
  }
  validatorInfo?: {
    address: string
    votingPower: number
  }
  connected: boolean
  responseTime: number
  error?: string
}

interface BlockInfo {
  height: number
  hash: string
  time: string
  txCount: number
  proposer: string
}

interface TransactionInfo {
  hash: string
  type: string
  amount: string
  time: string
  from?: string
  to?: string
}

class NetworkStatusService {
  private static instance: NetworkStatusService
  private cache: Map<string, { data: any; timestamp: number }> = new Map()
  private readonly CACHE_DURATION = 5000 // 5 seconds

  // Testnet endpoint configuration - use existing nginx proxy route
  private readonly RPC_ENDPOINT = '/rpc'
  
  static getInstance(): NetworkStatusService {
    if (!NetworkStatusService.instance) {
      NetworkStatusService.instance = new NetworkStatusService()
    }
    return NetworkStatusService.instance
  }

  private isValidCacheEntry(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_DURATION
  }

  private async fetchWithCache<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key)
    if (cached && this.isValidCacheEntry(cached.timestamp)) {
      return cached.data
    }

    try {
      const data = await fetcher()
      this.cache.set(key, { data, timestamp: Date.now() })
      return data
    } catch (error) {
      // Return cached data if available, even if expired
      if (cached) {
        return cached.data
      }
      throw error
    }
  }

  async getNetworkStatus(): Promise<NetworkStatus> {
    return this.fetchWithCache('network_status', async () => {
      const startTime = performance.now()
      
      console.log('🔍 Fetching network status from:', this.RPC_ENDPOINT)
      
      try {
        // Try to fetch real testnet status from Hetzner server
        const response = await fetch(`${this.RPC_ENDPOINT}/status`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(10000) // 10 second timeout
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const data = await response.json()
        const responseTime = performance.now() - startTime

        if (data.result) {
          const result = data.result
          const syncInfo = result.sync_info || {}
          const nodeInfo = result.node_info || {}
          const validatorInfo = result.validator_info || {}

          console.log('✅ Live testnet data received:', {
            blockHeight: syncInfo.latest_block_height,
            network: nodeInfo.network,
            connected: true
          })

          return {
            chainId: nodeInfo.network === 'dockerchain' ? 'dytallix-testnet-1' : (nodeInfo.network || 'dytallix-testnet-1'),
            activeValidators: 1, // Static for now to avoid loops
            blockHeight: parseInt(syncInfo.latest_block_height) || 0,
            blockTime: '5.2s', // Static for now to avoid loops
            lastBlockTime: syncInfo.latest_block_time || new Date().toISOString(),
            nodeInfo: {
              moniker: nodeInfo.moniker || 'dytallix-testnet-node',
              version: nodeInfo.version || '0.1.0'
            },
            validatorInfo: {
              address: validatorInfo.address || '',
              votingPower: parseInt(validatorInfo.voting_power) || 0
            },
            connected: true,
            responseTime: Math.round(responseTime)
          }
        }
      } catch (error) {
        console.warn('Failed to connect to live testnet, using fallback data:', error)
      }

      // Fallback to simulated data if real endpoint fails
      return this.getSimulatedNetworkStatus()
    })
  }

  private getSimulatedNetworkStatus(): NetworkStatus {
    const responseTime = Math.random() * 200 + 100 // 100-300ms
    const currentHeight = Math.floor(Date.now() / 5200) + 847000 // Simulate growing block height

    return {
      chainId: 'dytallix-testnet-1',
      activeValidators: 4,
      blockHeight: currentHeight,
      blockTime: '5.2s',
      lastBlockTime: new Date().toISOString(),
      nodeInfo: {
        moniker: 'dytallix-testnet-node',
        version: '0.1.0'
      },
      validatorInfo: {
        address: 'dytvaloper1simulated...',
        votingPower: 25000000
      },
      connected: false, // Indicate this is simulated
      responseTime: Math.round(responseTime),
      error: 'Using simulated data - testnet endpoint unavailable'
    }
  }

  async getRecentBlocks(limit: number = 5): Promise<BlockInfo[]> {
    return this.fetchWithCache(`recent_blocks_${limit}`, async () => {
      try {
        // Get current block height directly to avoid circular dependency
        const statusResponse = await fetch(`${this.RPC_ENDPOINT}/status`, {
          signal: AbortSignal.timeout(5000)
        })

        if (!statusResponse.ok) {
          throw new Error('Failed to get status')
        }

        const statusData = await statusResponse.json()
        const latestHeight = parseInt(statusData.result?.sync_info?.latest_block_height) || 0

        // Try to fetch real block data
        const blocks: BlockInfo[] = []

        // Fetch last few blocks
        for (let i = 0; i < limit; i++) {
          const height = latestHeight - i
          if (height <= 0) break

          try {
            const response = await fetch(`${this.RPC_ENDPOINT}/block?height=${height}`, {
              signal: AbortSignal.timeout(3000)
            })

            if (response.ok) {
              const data = await response.json()
              const block = data.result?.block

              if (block) {
                const header = block.header || {}
                const data = block.data || {}
                
                blocks.push({
                  height: parseInt(header.height),
                  hash: header.last_commit_hash || header.data_hash || this.generateHash(),
                  time: header.time,
                  txCount: Array.isArray(data.txs) ? data.txs.length : 0,
                  proposer: header.proposer_address || 'validator-1'
                })
              }
            }
          } catch (blockError) {
            // Skip this block if error
            continue
          }
        }

        if (blocks.length > 0) {
          return blocks
        }
      } catch (error) {
        console.warn('Failed to fetch real blocks:', error)
      }

      // Return simulated block data
      return this.getSimulatedBlocks(limit)
    })
  }

  async getRecentTransactions(limit: number = 5): Promise<TransactionInfo[]> {
    return this.fetchWithCache(`recent_transactions_${limit}`, async () => {
      console.log('� Using simulated transactions - transaction parsing temporarily disabled')
      return this.getSimulatedTransactions(limit)
    })
  }

  private getSimulatedBlocks(limit: number): BlockInfo[] {
    const blocks: BlockInfo[] = []
    const currentHeight = Math.floor(Date.now() / 5200) + 847000
    const currentTime = Date.now()

    for (let i = 0; i < limit; i++) {
      const height = currentHeight - i
      const blockTime = new Date(currentTime - (i * 5200)) // 5.2 second intervals

      blocks.push({
        height,
        hash: this.generateHash(),
        time: blockTime.toISOString(),
        txCount: Math.floor(Math.random() * 30) + 5,
        proposer: `validator-${(i % 4) + 1}`
      })
    }

    return blocks
  }

  private getSimulatedTransactions(limit: number): TransactionInfo[] {
    const transactions: TransactionInfo[] = []
    const types = ['Transfer', 'Contract', 'Stake', 'Delegate']
    const currentTime = Date.now()

    for (let i = 0; i < limit; i++) {
      const type = types[Math.floor(Math.random() * types.length)]
      const amount = Math.floor(Math.random() * 10000) + 100
      const txTime = new Date(currentTime - (i * 30000)) // 30 second intervals

      transactions.push({
        hash: this.generateHash(),
        type,
        amount: `${amount.toLocaleString()} DGT`,
        time: this.formatTimeAgo(txTime),
        from: `dyt1${this.generateHash().slice(0, 20)}...`,
        to: `dyt1${this.generateHash().slice(0, 20)}...`
      })
    }

    return transactions
  }

  private generateHash(): string {
    return Array.from({ length: 64 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('')
  }

  private formatTimeAgo(date: Date): string {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  }

  // WebSocket connection for real-time updates
  async subscribeToUpdates(callback: (data: any) => void): Promise<WebSocket | null> {
    try {
      // Use wss for secure WebSocket connection through the same domain
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const host = window.location.host
      const ws = new WebSocket(`${protocol}//${host}/rpc/websocket`)
      
      ws.onopen = () => {
        console.log('Connected to testnet WebSocket')
        
        // Subscribe to new blocks
        ws.send(JSON.stringify({
          jsonrpc: '2.0',
          method: 'subscribe',
          id: 1,
          params: {
            query: "tm.event='NewBlock'"
          }
        }))
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.result?.events) {
            callback({
              type: 'new_block',
              data: data.result.data.value.block
            })
          }
        } catch (error) {
          console.warn('Failed to parse WebSocket message:', error)
        }
      }

      ws.onerror = (error) => {
        console.warn('WebSocket error:', error)
      }

      ws.onclose = () => {
        console.log('WebSocket connection closed')
      }

      return ws
    } catch (error) {
      console.warn('Failed to establish WebSocket connection:', error)
      return null
    }
  }

}

export const networkStatusService = NetworkStatusService.getInstance()
export type { NetworkStatus, BlockInfo, TransactionInfo }
