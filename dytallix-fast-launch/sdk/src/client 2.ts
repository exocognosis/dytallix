import axios, { AxiosInstance } from 'axios';

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

export class DytallixClient {
  private http: AxiosInstance;
  private chainId: string;

  constructor(config: ClientConfig) {
    this.chainId = config.chainId;
    this.http = axios.create({
      baseURL: config.rpcUrl,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Get current blockchain status
   */
  async getStatus(): Promise<ChainStatus> {
    const response = await this.http.get('/status');
    return response.data;
  }

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
      chain_id: this.chainId,
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
    const signedTx = await from.signTransaction(txObj);

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

  /**
   * Get block by height
   */
  async getBlock(height: number): Promise<any> {
    const response = await this.http.get(`/block/${height}`);
    return response.data;
  }

  /**
   * Get latest block
   */
  async getLatestBlock(): Promise<any> {
    const response = await this.http.get('/block/latest');
    return response.data;
  }
}
