import axios, { AxiosInstance } from 'axios';
import { DytallixClient, TransactionReceipt, TransactionResponse } from './client';
import { PQCAlgorithm, PQCWallet } from './wallet';

export interface AgentKitConfig {
  rpcUrl: string;
  chainId: string;
  faucetUrl: string;
  timeout?: number;
}

export interface FaucetRequest {
  dgtAmount?: number;
  drtAmount?: number;
}

export interface AgentIdentity {
  agentId: string;
  wallet: PQCWallet;
  createdAt: string;
}

export interface AgentSnapshot {
  agentId: string;
  address: string;
  chainId: string;
  balances: Record<string, number>;
  nonce: number;
  timestamp: string;
}

export interface AgentValueStore {
  put(snapshot: AgentSnapshot): Promise<void>;
}

export class InMemoryAgentValueStore implements AgentValueStore {
  private readonly snapshots: AgentSnapshot[] = [];

  async put(snapshot: AgentSnapshot): Promise<void> {
    this.snapshots.push(snapshot);
  }

  list(): AgentSnapshot[] {
    return [...this.snapshots];
  }
}

export class AutonomousAgentKit {
  private readonly client: DytallixClient;
  private readonly faucetHttp: AxiosInstance;
  private readonly chainId: string;

  constructor(config: AgentKitConfig) {
    this.chainId = config.chainId;
    this.client = new DytallixClient({
      rpcUrl: config.rpcUrl,
      chainId: config.chainId,
      timeout: config.timeout
    });

    this.faucetHttp = axios.create({
      baseURL: config.faucetUrl,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async createAgent(agentId: string, algorithm: PQCAlgorithm = 'ML-DSA'): Promise<AgentIdentity> {
    const wallet = await PQCWallet.generate(algorithm);
    return {
      agentId,
      wallet,
      createdAt: new Date().toISOString()
    };
  }

  async requestTokens(agent: AgentIdentity, request: FaucetRequest = {}): Promise<any> {
    const response = await this.faucetHttp.post('/request', {
      address: agent.wallet.address,
      dgt_amount: request.dgtAmount,
      drt_amount: request.drtAmount
    });

    return response.data;
  }

  async transferValue(
    from: AgentIdentity,
    toAddress: string,
    amount: number,
    denom: 'DGT' | 'DRT',
    memo?: string
  ): Promise<TransactionResponse> {
    return this.client.sendTokens({
      from: from.wallet,
      to: toAddress,
      amount,
      denom,
      memo: memo || `agent-transfer:${from.agentId}`
    });
  }

  async waitForSettlement(hash: string, timeoutMs?: number): Promise<TransactionReceipt> {
    return this.client.waitForTransaction(hash, timeoutMs);
  }

  async snapshot(agent: AgentIdentity, valueStore?: AgentValueStore): Promise<AgentSnapshot> {
    const account = await this.client.getAccount(agent.wallet.address);
    const snapshot: AgentSnapshot = {
      agentId: agent.agentId,
      address: agent.wallet.address,
      chainId: this.chainId,
      balances: account.balances,
      nonce: account.nonce,
      timestamp: new Date().toISOString()
    };

    if (valueStore) {
      await valueStore.put(snapshot);
    }

    return snapshot;
  }
}
