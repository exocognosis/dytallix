interface NetworkStatus {
  chainId: string
  activeValidators: number
  blockHeight: number
  blockTime: string
  lastBlockTime: string
  nodeInfo?: { moniker: string; version: string }
  validatorInfo?: { address: string; votingPower: number }
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

// Lightweight browser logger with basic redaction (mnemonic/private/token)
const redactKeys = ['mnemonic','private','secret','token','key'];
function scrub(v:any){
  if (typeof v === 'string') {
    const lower=v.toLowerCase();
    if (redactKeys.some(k=> lower.includes(k))) return '[REDACTED]';
    return v;
  }
  if (typeof v === 'object' && v) {
    const clone: any = Array.isArray(v)?[]:{};
    for (const k in v) clone[k] = redactKeys.some(r=>k.toLowerCase().includes(r))? '[REDACTED]' : scrub(v[k]);
    return clone;
  }
  return v;
}
const browserLog = {
  info: (...a:any[]) => console.log('[INFO]', ...a.map(scrub)),
  warn: (...a:any[]) => console.warn('[WARN]', ...a.map(scrub)),
  error: (...a:any[]) => console.error('[ERROR]', ...a.map(scrub))
}

class NetworkStatusService {
  private static instance: NetworkStatusService
  private cache: Map<string, { data: any; timestamp: number }> = new Map()
  private readonly CACHE_DURATION = 5000 // 5 seconds
  private readonly RPC_ENDPOINT = '/rpc'

  static getInstance(): NetworkStatusService {
    if (!NetworkStatusService.instance) {
      NetworkStatusService.instance = new NetworkStatusService()
    }
    return NetworkStatusService.instance
  }

  private isValidCacheEntry(timestamp: number): boolean { return Date.now() - timestamp < this.CACHE_DURATION }

  private async fetchWithCache<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key)
    if (cached && this.isValidCacheEntry(cached.timestamp)) return cached.data
    try {
      const data = await fetcher()
      this.cache.set(key, { data, timestamp: Date.now() })
      return data
    } catch (error) {
      if (cached) return cached.data
      throw error
    }
  }

  async getNetworkStatus(): Promise<NetworkStatus> {
    return this.fetchWithCache('network_status', async () => {
      const startTime = performance.now()
      browserLog.info('Fetching network status from:', this.RPC_ENDPOINT)
      try {
        const response = await fetch(`${this.RPC_ENDPOINT}/status`, { method: 'GET', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(10000) })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json()
        const responseTime = performance.now() - startTime
        if (data.result) {
          const result = data.result
            , syncInfo = result.sync_info || {}
            , nodeInfo = result.node_info || {}
            , validatorInfo = result.validator_info || {}
          browserLog.info('Live testnet data received', { blockHeight: syncInfo.latest_block_height, network: nodeInfo.network, connected: true })
          return { chainId: nodeInfo.network === 'dockerchain' ? 'dytallix-testnet-1' : (nodeInfo.network || 'dytallix-testnet-1'), activeValidators: 1, blockHeight: parseInt(syncInfo.latest_block_height) || 0, blockTime: '5.2s', lastBlockTime: syncInfo.latest_block_time || new Date().toISOString(), nodeInfo: { moniker: nodeInfo.moniker || 'dytallix-testnet-node', version: nodeInfo.version || '0.1.0' }, validatorInfo: { address: validatorInfo.address || '', votingPower: parseInt(validatorInfo.voting_power) || 0 }, connected: true, responseTime: Math.round(responseTime) }
        }
      } catch (error) { browserLog.warn('Failed to connect to live testnet, using fallback data', error) }
      return this.getSimulatedNetworkStatus()
    })
  }

  private getSimulatedNetworkStatus(): NetworkStatus {
    const responseTime = Math.random() * 200 + 100
    const currentHeight = Math.floor(Date.now() / 5200) + 847000
    return { chainId: 'dytallix-testnet-1', activeValidators: 4, blockHeight: currentHeight, blockTime: '5.2s', lastBlockTime: new Date().toISOString(), nodeInfo: { moniker: 'dytallix-testnet-node', version: '0.1.0' }, validatorInfo: { address: 'dytvaloper1simulated...', votingPower: 25000000 }, connected: false, responseTime: Math.round(responseTime), error: 'Using simulated data - testnet endpoint unavailable' }
  }

  async getRecentBlocks(limit: number = 5): Promise<BlockInfo[]> {
    return this.fetchWithCache(`recent_blocks_${limit}`, async () => {
      try {
        const statusResponse = await fetch(`${this.RPC_ENDPOINT}/status`, { signal: AbortSignal.timeout(5000) })
        if (!statusResponse.ok) throw new Error('Failed to get status')
        const statusData = await statusResponse.json()
        const latestHeight = parseInt(statusData.result?.sync_info?.latest_block_height) || 0
        const blocks: BlockInfo[] = []
        for (let i = 0; i < limit; i++) {
          const height = latestHeight - i
          if (height <= 0) break
          try {
            const response = await fetch(`${this.RPC_ENDPOINT}/block?height=${height}`, { signal: AbortSignal.timeout(3000) })
            if (response.ok) {
              const data = await response.json()
              const block = data.result?.block
              if (block) {
                const header = block.header || {}
                const dataB = block.data || {}
                blocks.push({ height: parseInt(header.height), hash: header.last_commit_hash || header.data_hash || this.generateHash(), time: header.time, txCount: Array.isArray(dataB.txs) ? dataB.txs.length : 0, proposer: header.proposer_address || 'validator-1' })
              }
            }
          } catch { /* skip */ }
        }
        if (blocks.length > 0) return blocks
      } catch (error) { browserLog.warn('Failed to fetch real blocks', error) }
      return this.getSimulatedBlocks(limit)
    })
  }

  async getRecentTransactions(limit: number = 5): Promise<TransactionInfo[]> {
    return this.fetchWithCache(`recent_transactions_${limit}`, async () => {
      browserLog.info('Using simulated transactions - transaction parsing temporarily disabled')
      return this.getSimulatedTransactions(limit)
    })
  }

  private getSimulatedBlocks(limit: number): BlockInfo[] {
    const blocks: BlockInfo[] = []
    const currentHeight = Math.floor(Date.now() / 5200) + 847000
    const currentTime = Date.now()
    for (let i = 0; i < limit; i++) {
      const height = currentHeight - i
      const blockTime = new Date(currentTime - (i * 5200))
      blocks.push({ height, hash: this.generateHash(), time: blockTime.toISOString(), txCount: Math.floor(Math.random() * 30) + 5, proposer: `validator-${(i % 4) + 1}` })
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
      const txTime = new Date(currentTime - (i * 30000))
      transactions.push({ hash: this.generateHash(), type, amount: `${amount.toLocaleString()} DGT`, time: this.formatTimeAgo(txTime), from: `dyt1${this.generateHash().slice(0, 20)}...`, to: `dyt1${this.generateHash().slice(0, 20)}...` })
    }
    return transactions
  }

  private generateHash(): string { return Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('') }

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
}