/**
 * Dytallix RPC Client
 * 
 * Provides methods to interact with the Dytallix blockchain.
 */

import type { PQCWallet } from './wallet.js';

export interface ClientConfig {
  rpcUrl: string;
  chainId: string;
  timeout?: number;
}

export interface ChainStatus {
  block_height: number;
  chain_id: string;
  latest_block_hash: string;
  latest_block_time: string;
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
  status: 'success' | 'failed';
  block: number;
  gasUsed: number;
  events: unknown[];
}

export interface FaucetRequest {
  address: string;
  tokens: ('DGT' | 'DRT')[];
}

export interface FaucetDispensed {
  symbol: 'DGT' | 'DRT';
  amount: string;
  txHash: string;
}

export interface FaucetResponse {
  success: boolean;
  dispensed?: FaucetDispensed[];
  error?: string;
  message?: string;
  retryAfterSeconds?: number;
}

export interface SendTokensRequest {
  from: PQCWallet;
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

export interface StakingRewards {
  address: string;
  rewards: {
    DGT: number;
    DRT: number;
  };
  lastClaimed?: string;
}

export interface ClaimRewardsResponse {
  success: boolean;
  hash?: string;
  claimed?: {
    DGT: number;
    DRT: number;
  };
  error?: string;
}

export interface BlocksQuery {
  limit?: number;
  offset?: number;
}

// ===== Contract Types =====

export interface ContractDeployRequest {
  /** WASM bytecode as hex string (with or without 0x prefix) */
  code: string;
  /** Deployer address */
  deployer: string;
  /** Gas limit for deployment */
  gasLimit?: number;
}

export interface ContractDeployResponse {
  /** Deployed contract address */
  address: string;
  /** Transaction hash */
  txHash: string;
}

export interface ContractCallRequest {
  /** Contract address */
  address: string;
  /** Method/function name to call */
  method: string;
  /** Arguments as hex-encoded bytes */
  args?: string;
  /** Gas limit for execution */
  gasLimit?: number;
}

export interface ContractCallResponse {
  /** Return value as hex-encoded bytes */
  result: string;
  /** Gas consumed */
  gasUsed: number;
  /** Execution logs */
  logs: string[];
}

export interface ContractStateQuery {
  /** Contract address */
  address: string;
  /** State key to query */
  key: string;
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

/**
 * Dytallix blockchain client for RPC interactions
 * 
 * @example
 * ```typescript
 * import { DytallixClient, TESTNET_RPC, TESTNET_CHAIN_ID } from '@dytallix/sdk';
 * 
 * const client = new DytallixClient({
 *   rpcUrl: TESTNET_RPC,
 *   chainId: TESTNET_CHAIN_ID
 * });
 * 
 * const status = await client.getStatus();
 * console.log('Block height:', status.block_height);
 * ```
 */
export class DytallixClient {
  private readonly rpcUrl: string;
  private readonly chainId: string;
  private readonly timeout: number;

  constructor(config: ClientConfig) {
    this.rpcUrl = config.rpcUrl.replace(/\/$/, ''); // Remove trailing slash
    this.chainId = config.chainId;
    this.timeout = config.timeout ?? 30000;
  }

  /**
   * Make an HTTP request to the RPC endpoint
   */
  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.rpcUrl}${path}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return await response.json() as T;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Get current blockchain status
   */
  async getStatus(): Promise<ChainStatus> {
    return this.request<ChainStatus>('/status');
  }

  /**
   * Fetch account details including balances and nonce
   * 
   * @param address - The dyt1... address to query
   */
  async getAccount(address: string): Promise<Account> {
    interface RawAccount {
      address?: string;
      balances?: { udgt?: number; udrt?: number };
      nonce?: number;
    }
    
    const data = await this.request<RawAccount>(`/account/${address}`);

    return {
      address: data.address ?? address,
      balances: {
        DGT: (data.balances?.udgt ?? 0) / 1_000_000,
        DRT: (data.balances?.udrt ?? 0) / 1_000_000,
      },
      nonce: data.nonce ?? 0
    };
  }

  /**
   * Send tokens to another address
   * 
   * @param request - Transaction details including sender wallet, recipient, and amount
   */
  async sendTokens(request: SendTokensRequest): Promise<TransactionResponse> {
    const { from, to, amount, denom, memo } = request;

    // Fetch account nonce
    const account = await this.getAccount(from.address);

    // Convert to micro-units (1 DGT = 1,000,000 udgt)
    const microAmount = Math.floor(amount * 1_000_000);
    const feeMicro = '1000'; // 0.001 DGT network fee

    // Build transaction object
    const txObj = {
      chain_id: this.chainId,
      fee: feeMicro,
      nonce: account.nonce,
      memo: memo ?? '',
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

    // Sign transaction with PQC wallet
    const signedTx = await from.signTransaction(txObj);

    // Submit to blockchain
    interface SubmitResponse {
      tx_hash?: string;
      hash?: string;
    }
    
    const response = await this.request<SubmitResponse>('/submit', {
      method: 'POST',
      body: JSON.stringify({ signed_tx: signedTx })
    });

    return {
      hash: response.tx_hash ?? response.hash ?? '',
      status: 'pending'
    };
  }

  /**
   * Wait for transaction confirmation
   * 
   * @param hash - Transaction hash to wait for
   * @param timeout - Maximum time to wait in milliseconds (default: 30000)
   */
  async waitForTransaction(hash: string, timeout = 30000): Promise<TransactionReceipt> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        interface TxResponse {
          status: string;
          block?: number;
          gas_used?: number;
          events?: unknown[];
        }
        
        const response = await this.request<TxResponse>(`/tx/${hash}`);
        
        if (response.status !== 'pending') {
          return {
            hash: hash,
            status: response.status as 'success' | 'failed',
            block: response.block ?? 0,
            gasUsed: response.gas_used ?? 0,
            events: response.events ?? []
          };
        }
      } catch (error) {
        // Transaction might not be indexed yet, continue polling
        if (!(error instanceof Error) || !error.message.includes('404')) {
          throw error;
        }
      }

      // Wait 1 second before retrying
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
      limit: String(query.limit ?? 10),
      offset: String(query.offset ?? 0)
    });

    interface TxListResponse {
      transactions?: Transaction[];
    }
    
    const response = await this.request<TxListResponse>(`/transactions?${params.toString()}`);
    return response.transactions ?? [];
  }

  /**
   * Get transaction by hash
   */
  async getTransaction(hash: string): Promise<Transaction> {
    return this.request<Transaction>(`/tx/${hash}`);
  }

  /**
   * Get chain ID configured for this client
   */
  getChainId(): string {
    return this.chainId;
  }

  /**
   * List recent blocks
   * 
   * @param query - Optional limit and offset for pagination
   */
  async getBlocks(query: BlocksQuery = {}): Promise<Block[]> {
    const params = new URLSearchParams({
      limit: String(query.limit ?? 10),
      offset: String(query.offset ?? 0)
    });

    interface BlocksResponse {
      blocks?: Array<{
        height: number;
        hash: string;
        time?: string;
        timestamp?: string;
        tx_count?: number;
        transactions?: unknown[];
        proposer?: string;
      }>;
    }
    
    const response = await this.request<BlocksResponse>(`/blocks?${params.toString()}`);
    
    return (response.blocks ?? []).map(b => ({
      height: b.height,
      hash: b.hash,
      timestamp: b.time ?? b.timestamp ?? '',
      transactions: b.tx_count ?? b.transactions?.length ?? 0,
      proposer: b.proposer
    }));
  }

  /**
   * Get a specific block by height or hash
   * 
   * @param id - Block height or hash
   */
  async getBlock(id: number | string): Promise<Block> {
    interface BlockResponse {
      height: number;
      hash: string;
      time?: string;
      timestamp?: string;
      tx_count?: number;
      transactions?: unknown[];
      proposer?: string;
    }
    
    const response = await this.request<BlockResponse>(`/block/${id}`);
    
    return {
      height: response.height,
      hash: response.hash,
      timestamp: response.time ?? response.timestamp ?? '',
      transactions: response.tx_count ?? response.transactions?.length ?? 0,
      proposer: response.proposer
    };
  }

  /**
   * Get pending staking rewards for an address
   * 
   * @param address - The dyt1... address to check rewards for
   */
  async getStakingRewards(address: string): Promise<StakingRewards> {
    interface RewardsResponse {
      address?: string;
      rewards?: { udgt?: number; udrt?: number };
      last_claimed?: string;
    }
    
    const response = await this.request<RewardsResponse>(`/api/rewards?address=${address}`);
    
    return {
      address: response.address ?? address,
      rewards: {
        DGT: (response.rewards?.udgt ?? 0) / 1_000_000,
        DRT: (response.rewards?.udrt ?? 0) / 1_000_000
      },
      lastClaimed: response.last_claimed
    };
  }

  /**
   * Claim staking rewards
   * 
   * @param wallet - The wallet to claim rewards for (will be signed)
   */
  async claimRewards(wallet: PQCWallet): Promise<ClaimRewardsResponse> {
    // Fetch account nonce
    const account = await this.getAccount(wallet.address);

    // Build claim transaction
    const txObj = {
      chain_id: this.chainId,
      fee: '1000',
      nonce: account.nonce,
      memo: '',
      msgs: [
        {
          type: 'claim_rewards',
          from: wallet.address
        }
      ]
    };

    // Sign and submit
    const signedTx = await wallet.signTransaction(txObj);

    try {
      interface ClaimResponse {
        success?: boolean;
        tx_hash?: string;
        hash?: string;
        claimed?: { udgt?: number; udrt?: number };
        error?: string;
      }
      
      const response = await this.request<ClaimResponse>('/emission/claim', {
        method: 'POST',
        body: JSON.stringify({ signed_tx: signedTx })
      });

      return {
        success: response.success ?? true,
        hash: response.tx_hash ?? response.hash,
        claimed: {
          DGT: (response.claimed?.udgt ?? 0) / 1_000_000,
          DRT: (response.claimed?.udrt ?? 0) / 1_000_000
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Claim failed'
      };
    }
  }

  /**
   * Request tokens from the testnet faucet
   * 
   * Rate limited to one request per token per hour per address.
   * 
   * @param address - The dyt1... address to receive tokens
   * @param tokens - Array of tokens to request: ['DGT'], ['DRT'], or ['DGT', 'DRT']
   * @returns Faucet response with dispensed tokens or error
   * 
   * @example
   * ```typescript
   * const client = new DytallixClient({ rpcUrl: TESTNET_RPC, chainId: TESTNET_CHAIN_ID });
   * const wallet = await PQCWallet.generate();
   * 
   * // Request both tokens
   * const result = await client.requestFaucet(wallet.address, ['DGT', 'DRT']);
   * if (result.success) {
   *   console.log('Received:', result.dispensed);
   * }
   * ```
   */
  async requestFaucet(
    address: string, 
    tokens: ('DGT' | 'DRT')[] = ['DGT', 'DRT']
  ): Promise<FaucetResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      // Build faucet request payload - use node's dev/faucet endpoint
      // Amounts are in micro-units (1 token = 1,000,000 micro-units)
      const payload: Record<string, string | number> = { address };
      
      // Default amounts: 1 DGT, 50 DRT (in micro-units)
      if (tokens.includes('DGT')) {
        payload.udgt = 1_000_000; // 1 DGT
      }
      if (tokens.includes('DRT')) {
        payload.udrt = 50_000_000; // 50 DRT
      }

      const response = await fetch(`${this.rpcUrl}/dev/faucet`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      interface NodeFaucetResponse {
        success?: boolean;
        address?: string;
        credited?: { udgt?: string; udrt?: string };
        error?: string;
        message?: string;
      }

      const data = await response.json() as NodeFaucetResponse;
      
      if (!response.ok || data.error) {
        return {
          success: false,
          error: data.error ?? 'FAUCET_ERROR',
          message: data.message ?? `Faucet request failed: ${response.status}`
        };
      }

      // Convert node response to SDK format
      const dispensed: FaucetDispensed[] = [];
      if (data.credited?.udgt) {
        dispensed.push({
          symbol: 'DGT',
          amount: String(Number(data.credited.udgt) / 1_000_000),
          txHash: `faucet-${Date.now()}`
        });
      }
      if (data.credited?.udrt) {
        dispensed.push({
          symbol: 'DRT',
          amount: String(Number(data.credited.udrt) / 1_000_000),
          txHash: `faucet-${Date.now()}`
        });
      }

      return {
        success: true,
        dispensed
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: 'TIMEOUT',
          message: 'Faucet request timed out'
        };
      }
      return {
        success: false,
        error: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network request failed'
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ===== Contract Methods =====

  /**
   * Deploy a WASM smart contract
   * 
   * @param request - Contract deployment parameters
   * @returns Deployed contract address and transaction hash
   * 
   * @example
   * ```typescript
   * const wasmCode = fs.readFileSync('contract.wasm');
   * const result = await client.deployContract({
   *   code: wasmCode.toString('hex'),
   *   deployer: wallet.address,
   *   gasLimit: 2_000_000
   * });
   * console.log('Contract deployed at:', result.address);
   * ```
   */
  async deployContract(request: ContractDeployRequest): Promise<ContractDeployResponse> {
    const response = await this.request<{ address: string; tx_hash: string }>('/contracts/deploy', {
      method: 'POST',
      body: JSON.stringify({
        code: request.code.startsWith('0x') ? request.code.slice(2) : request.code,
        deployer: request.deployer,
        gas_limit: request.gasLimit ?? 1_000_000
      })
    });

    return {
      address: response.address,
      txHash: response.tx_hash
    };
  }

  /**
   * Call a method on a deployed smart contract
   * 
   * @param request - Contract call parameters
   * @returns Execution result, gas used, and logs
   * 
   * @example
   * ```typescript
   * const result = await client.callContract({
   *   address: 'dyt1contract...',
   *   method: 'get_balance',
   *   args: '0x...',
   *   gasLimit: 500_000
   * });
   * console.log('Result:', result.result);
   * ```
   */
  async callContract(request: ContractCallRequest): Promise<ContractCallResponse> {
    const response = await this.request<{ result: string; gas_used: number; logs: string[] }>('/contracts/call', {
      method: 'POST',
      body: JSON.stringify({
        address: request.address,
        method: request.method,
        args: request.args ?? '',
        gas_limit: request.gasLimit ?? 1_000_000
      })
    });

    return {
      result: response.result,
      gasUsed: response.gas_used,
      logs: response.logs ?? []
    };
  }

  /**
   * Query contract state by key
   * 
   * @param query - Contract address and state key
   * @returns State value as hex-encoded bytes
   */
  async getContractState(query: ContractStateQuery): Promise<string> {
    const response = await this.request<{ value: string }>(`/contracts/state/${query.address}/${query.key}`);
    return response.value;
  }

  // ===== Genesis & Network Info =====

  /**
   * Get the genesis configuration for this chain
   * 
   * Useful for understanding chain parameters, enabled features,
   * and initial validator set.
   * 
   * @returns Parsed genesis configuration
   */
  async getGenesis(): Promise<GenesisConfig> {
    interface RawGenesis {
      chain_id: string;
      chain_version: string;
      genesis_time: string;
      features: {
        staking: boolean;
        governance: boolean;
        bridge: boolean;
        smart_contracts: boolean;
        wasm_contracts: boolean;
        ai_oracle: boolean;
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
        voting_power: string;
      }>;
    }

    const raw = await this.request<RawGenesis>('/genesis');

    return {
      chainId: raw.chain_id,
      chainVersion: raw.chain_version,
      genesisTime: raw.genesis_time,
      features: {
        staking: raw.features.staking,
        governance: raw.features.governance,
        bridge: raw.features.bridge,
        smartContracts: raw.features.smart_contracts,
        wasmContracts: raw.features.wasm_contracts,
        aiOracle: raw.features.ai_oracle
      },
      pqc: raw.pqc,
      validators: raw.validators.map(v => ({
        address: v.address,
        moniker: v.moniker,
        votingPower: v.voting_power
      }))
    };
  }

  /**
   * Get list of connected peers
   * 
   * @returns Array of peer information
   */
  async getPeers(): Promise<Array<{ id: string; address: string }>> {
    return this.request('/peers');
  }

  /**
   * Get chain statistics including emission info
   */
  async getStats(): Promise<Record<string, unknown>> {
    return this.request('/api/stats');
  }
}
