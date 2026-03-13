import axios, { AxiosInstance } from 'axios';

// ===== Configuration =====

export const TESTNET_RPC = 'https://dytallix.com/api';
export const TESTNET_CHAIN_ID = 'dytallix-testnet-1';

export interface ClientConfig {
  rpcUrl?: string;
  chainId?: string;
  timeout?: number;
}

// ===== Response Types =====

export interface ChainStatus {
  block_height: number;
  chain_id: string;
  latest_block_hash: string;
  latest_block_time: string;
  syncing: boolean;
  status: string;
}

export interface Account {
  address: string;
  balances: {
    DGT: number;
    DRT: number;
    [key: string]: number;
  };
  nonce: number;
}

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  amount: number;
  denom: string;
  fee: number;
  memo?: string;
  status: 'pending' | 'success' | 'failed';
  block?: number;
  timestamp: string;
}

export interface TransactionQuery {
  address: string;
  limit?: number;
  offset?: number;
}

export interface TransactionReceipt {
  hash: string;
  status: 'success' | 'failed' | 'pending';
  block: number;
  gasUsed: number;
  events: any[];
}

export interface SendTokensRequest {
  from: any; // PQCWallet instance
  to: string;
  amount: number;
  denom: 'DGT' | 'DRT';
  memo?: string;
}

export interface TransactionResponse {
  hash: string;
  status: string;
}

export interface Block {
  height: number;
  hash: string;
  timestamp: string;
  transactions: number;
  proposer?: string;
}

// ===== Staking Types =====

export interface StakingRewards {
  address: string;
  rewards: {
    DGT: number;
    DRT: number;
  };
  lastClaimed?: string;
}

// ===== Faucet Types =====

export interface FaucetDispensed {
  symbol: string;
  amount: string;
  txHash: string;
}

export interface FaucetResponse {
  success: boolean;
  dispensed: FaucetDispensed[];
  error?: string;
  message?: string;
  retryAfterSeconds?: number;
}

// ===== Contract Types =====

export interface ContractDeployRequest {
  code: string;     // Hex-encoded WASM bytecode
  deployer: string; // Deployer address
  gasLimit?: number;
}

export interface ContractDeployResponse {
  address: string;
  txHash: string;
}

export interface ContractCallRequest {
  address: string;  // Contract address
  method: string;   // Method name
  args?: string;    // Hex-encoded arguments
  gasLimit?: number;
}

export interface ContractCallResponse {
  result: string;   // Hex-encoded return value
  gasUsed: number;
  logs: string[];
}

// ===== Genesis Types =====

export interface GenesisConfig {
  chainId: string;
  chainVersion: string;
  genesisTime: string;
  features: {
    staking: boolean;
    governance: boolean;
    bridge: boolean;
    smartContracts: boolean;
    wasmContracts: boolean;
    aiOracle: boolean;
  };
  pqc: {
    enabled: boolean;
    algorithms: {
      signature: string[];
      encryption: string[];
    };
  };
  validators: Array<{
    address: string;
    moniker: string;
    votingPower: string;
  }>;
}

export interface PeerInfo {
  id: string;
  address: string;
}

// ===== Client Class =====

export class DytallixClient {
  private http: AxiosInstance;
  private _chainId: string;

  constructor(config: ClientConfig = {}) {
    this._chainId = config.chainId || TESTNET_CHAIN_ID;
    this.http = axios.create({
      baseURL: config.rpcUrl || TESTNET_RPC,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Create a client connected to testnet
   */
  static testnet(): DytallixClient {
    return new DytallixClient({
      rpcUrl: TESTNET_RPC,
      chainId: TESTNET_CHAIN_ID
    });
  }

  /**
   * Get chain ID
   */
  get chainId(): string {
    return this._chainId;
  }

  // ===== Chain Status =====

  /**
   * Get current blockchain status
   */
  async getStatus(): Promise<ChainStatus> {
    const response = await this.http.get('/status');
    const data = response.data;
    return {
      block_height: data.latest_height || data.block_height || 0,
      chain_id: data.chain_id || '',
      latest_block_hash: data.latest_block_hash || '',
      latest_block_time: data.latest_block_time || '',
      syncing: data.syncing || false,
      status: data.status || 'unknown'
    };
  }

  // ===== Account =====

  /**
   * Fetch account details including balances and nonce
   */
  async getAccount(address: string): Promise<Account> {
    const response = await this.http.get(`/account/${address}`);
    const data = response.data;

    return {
      address: data.address || address,
      balances: {
        DGT: (data.balances?.udgt || 0) / 1_000_000,
        DRT: (data.balances?.udrt || 0) / 1_000_000,
      },
      nonce: data.nonce || 0
    };
  }

  // ===== Transactions =====

  /**
   * Send tokens to another address
   */
  async sendTokens(request: SendTokensRequest): Promise<TransactionResponse> {
    const { from, to, amount, denom, memo } = request;

    // Fetch account nonce
    const account = await this.getAccount(from.address);

    // Convert to micro-units
    const microAmount = Math.floor(amount * 1_000_000);
    const feeMicro = "1000"; // 0.001 DGT network fee

    // Build transaction object
    const txObj = {
      chain_id: this._chainId,
      fee: feeMicro,
      nonce: account.nonce,
      memo: memo || '',
      msgs: [
        {
          type: 'send',
          from: from.address,
          to: to,
          amount: String(microAmount),
          denom: denom === 'DGT' ? 'udgt' : 'udrt'
        }
      ]
    };

    // Sign transaction
    const signedTx = from.signTransaction(txObj);

    // Submit to blockchain
    const response = await this.http.post('/submit', { signed_tx: signedTx });

    return {
      hash: response.data.tx_hash || response.data.hash,
      status: 'pending'
    };
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(hash: string, timeout: number = 30000): Promise<TransactionReceipt> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const response = await this.http.get(`/tx/${hash}`);
        if (response.data.status !== 'pending') {
          return {
            hash: hash,
            status: response.data.status,
            block: response.data.block || 0,
            gasUsed: response.data.gas_used || 0,
            events: response.data.events || []
          };
        }
      } catch (error: any) {
        if (error.response?.status !== 404) {
          throw error;
        }
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error(`Transaction ${hash} not confirmed within ${timeout}ms`);
  }

  /**
   * Query transaction history for an address
   */
  async getTransactions(query: TransactionQuery): Promise<Transaction[]> {
    const params = new URLSearchParams({
      address: query.address,
      limit: String(query.limit || 10),
      offset: String(query.offset || 0)
    });

    const response = await this.http.get(`/transactions?${params.toString()}`);
    return response.data.transactions || [];
  }

  /**
   * Get transaction by hash
   */
  async getTransaction(hash: string): Promise<Transaction> {
    const response = await this.http.get(`/tx/${hash}`);
    return response.data;
  }

  // ===== Blocks =====

  /**
   * Get block by height
   */
  async getBlock(height: number | string): Promise<Block> {
    const response = await this.http.get(`/block/${height}`);
    const data = response.data;
    return {
      height: data.height,
      hash: data.hash,
      timestamp: data.timestamp || data.time,
      transactions: data.transactions || data.tx_count || 0,
      proposer: data.proposer
    };
  }

  /**
   * Get latest block
   */
  async getLatestBlock(): Promise<Block> {
    const response = await this.http.get('/block/latest');
    const data = response.data;
    return {
      height: data.height,
      hash: data.hash,
      timestamp: data.timestamp || data.time,
      transactions: data.transactions || data.tx_count || 0,
      proposer: data.proposer
    };
  }

  /**
   * List recent blocks
   */
  async getBlocks(limit: number = 10, offset: number = 0): Promise<Block[]> {
    const response = await this.http.get(`/blocks?limit=${limit}&offset=${offset}`);
    return (response.data.blocks || []).map((b: any) => ({
      height: b.height,
      hash: b.hash,
      timestamp: b.timestamp || b.time,
      transactions: b.transactions || b.tx_count || 0,
      proposer: b.proposer
    }));
  }

  // ===== Staking Rewards =====

  /**
   * Get staking rewards for an address
   */
  async getStakingRewards(address: string): Promise<StakingRewards> {
    const response = await this.http.get(`/api/rewards?address=${address}`);
    const data = response.data;
    return {
      address: data.address || address,
      rewards: {
        DGT: (data.rewards?.udgt || 0) / 1_000_000,
        DRT: (data.rewards?.udrt || 0) / 1_000_000
      },
      lastClaimed: data.last_claimed
    };
  }

  // ===== Faucet =====

  /**
   * Request tokens from the testnet faucet
   * 
   * @param address - The dyt1... address to receive tokens
   * @param tokens - Array of tokens to request: ['DGT'], ['DRT'], or ['DGT', 'DRT']
   * 
   * @example
   * ```typescript
   * const result = await client.requestFaucet(wallet.address, ['DGT', 'DRT']);
   * console.log('Received:', result.dispensed);
   * ```
   */
  async requestFaucet(address: string, tokens: ('DGT' | 'DRT')[] = ['DGT', 'DRT']): Promise<FaucetResponse> {
    const payload: any = { address };

    if (tokens.includes('DGT')) {
      payload.udgt = 1_000_000; // 1 DGT
    }
    if (tokens.includes('DRT')) {
      payload.udrt = 50_000_000; // 50 DRT
    }

    try {
      const response = await this.http.post('/dev/faucet', payload);
      const data = response.data;

      const dispensed: FaucetDispensed[] = [];
      if (data.credited?.udgt) {
        const amt = parseInt(data.credited.udgt) || 0;
        dispensed.push({
          symbol: 'DGT',
          amount: String(amt / 1_000_000),
          txHash: `faucet-${Date.now()}`
        });
      }
      if (data.credited?.udrt) {
        const amt = parseInt(data.credited.udrt) || 0;
        dispensed.push({
          symbol: 'DRT',
          amount: String(amt / 1_000_000),
          txHash: `faucet-${Date.now()}`
        });
      }

      return {
        success: true,
        dispensed,
        message: data.message
      };
    } catch (error: any) {
      return {
        success: false,
        dispensed: [],
        error: error.response?.data?.error || error.message
      };
    }
  }

  // ===== Smart Contracts =====

  /**
   * Deploy a WASM smart contract
   * 
   * @param code - Hex-encoded WASM bytecode
   * @param deployer - Address of the deployer
   * @param gasLimit - Optional gas limit (default: 1,000,000)
   * 
   * @example
   * ```typescript
   * const wasmHex = Buffer.from(fs.readFileSync('contract.wasm')).toString('hex');
   * const result = await client.deployContract(wasmHex, wallet.address);
   * console.log('Contract deployed at:', result.address);
   * ```
   */
  async deployContract(code: string, deployer: string, gasLimit: number = 1_000_000): Promise<ContractDeployResponse> {
    const payload = {
      code: code.startsWith('0x') ? code.slice(2) : code,
      deployer,
      gas_limit: gasLimit
    };

    const response = await this.http.post('/contracts/deploy', payload);
    return {
      address: response.data.address,
      txHash: response.data.tx_hash
    };
  }

  /**
   * Call a method on a deployed smart contract
   * 
   * @param address - Contract address
   * @param method - Method name to call
   * @param args - Optional hex-encoded arguments
   * @param gasLimit - Optional gas limit (default: 1,000,000)
   */
  async callContract(address: string, method: string, args?: string, gasLimit: number = 1_000_000): Promise<ContractCallResponse> {
    const payload = {
      address,
      method,
      args: args || '',
      gas_limit: gasLimit
    };

    const response = await this.http.post('/contracts/call', payload);
    return {
      result: response.data.result,
      gasUsed: response.data.gas_used,
      logs: response.data.logs || []
    };
  }

  /**
   * Query contract state by key
   * 
   * @param address - Contract address
   * @param key - State key to query
   * @returns Hex-encoded state value
   */
  async getContractState(address: string, key: string): Promise<string> {
    const response = await this.http.get(`/contracts/state/${address}/${key}`);
    return response.data.value;
  }

  // ===== Genesis & Network Info =====

  /**
   * Get the genesis configuration for this chain
   */
  async getGenesis(): Promise<GenesisConfig> {
    const response = await this.http.get('/genesis');
    const data = response.data;
    return {
      chainId: data.chain_id,
      chainVersion: data.chain_version,
      genesisTime: data.genesis_time,
      features: {
        staking: data.features?.staking || false,
        governance: data.features?.governance || false,
        bridge: data.features?.bridge || false,
        smartContracts: data.features?.smart_contracts || false,
        wasmContracts: data.features?.wasm_contracts || false,
        aiOracle: data.features?.ai_oracle || false
      },
      pqc: {
        enabled: data.pqc?.enabled || false,
        algorithms: {
          signature: data.pqc?.algorithms?.signature || [],
          encryption: data.pqc?.algorithms?.encryption || []
        }
      },
      validators: (data.validators || []).map((v: any) => ({
        address: v.address,
        moniker: v.moniker,
        votingPower: v.voting_power
      }))
    };
  }

  /**
   * Get list of connected peers
   */
  async getPeers(): Promise<PeerInfo[]> {
    const response = await this.http.get('/peers');
    return response.data;
  }

  /**
   * Get chain statistics
   */
  async getStats(): Promise<any> {
    const response = await this.http.get('/api/stats');
    return response.data;
  }
}
