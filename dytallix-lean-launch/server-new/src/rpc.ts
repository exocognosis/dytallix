import { request } from 'undici';
import { getConfig } from './config.js';
import { logger } from './util/logger.js';

interface RpcRequest {
  method: string;
  params: unknown[];
}

interface RpcResponse {
  result?: unknown;
  error?: {
    code: number;
    message: string;
  };
}

class ConcurrencyLimiter {
  private current = 0;
  private queue: Array<() => void> = [];
  
  constructor(private maxConcurrent: number) {}
  
  async acquire(): Promise<void> {
    if (this.current < this.maxConcurrent) {
      this.current++;
      return;
    }
    
    return new Promise<void>((resolve) => {
      this.queue.push(() => {
        this.current++;
        resolve();
      });
    });
  }
  
  release(): void {
    this.current--;
    const next = this.queue.shift();
    if (next) {
      next();
    }
  }
}

export class RpcClient {
  private config = getConfig();
  private limiter: ConcurrencyLimiter;
  private allowedMethods: Set<string>;
  
  constructor() {
    this.limiter = new ConcurrencyLimiter(this.config.MAX_CONCURRENCY);
    this.allowedMethods = new Set(
      this.config.RPC_ALLOWED_METHODS.split(',').map(m => m.trim())
    );
  }
  
  async call(req: RpcRequest): Promise<RpcResponse> {
    // Check if method is allowed
    if (!this.allowedMethods.has(req.method)) {
      throw new Error(`RPC method not allowed: ${req.method}`);
    }
    
    await this.limiter.acquire();
    
    try {
      const payload = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: req.method,
        params: req.params,
      };
      
      logger.debug({ method: req.method }, 'RPC request');
      
      const response = await request(this.config.RPC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        bodyTimeout: this.config.NODE_TIMEOUT_MS,
        headersTimeout: this.config.NODE_TIMEOUT_MS,
      });
      
      const body = await response.body.json() as RpcResponse & { jsonrpc: string; id: number };
      
      if (body.error) {
        logger.warn({ error: body.error }, 'RPC error response');
        return { error: body.error };
      }
      
      return { result: body.result };
    } catch (error) {
      logger.error({ error, method: req.method }, 'RPC call failed');
      
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          throw new Error('RPC_TIMEOUT');
        }
        throw new Error(`RPC_ERROR: ${error.message}`);
      }
      throw error;
    } finally {
      this.limiter.release();
    }
  }
  
  async getBlockNumber(): Promise<number> {
    const response = await this.call({
      method: 'eth_blockNumber',
      params: [],
    });
    
    if (response.error) {
      throw new Error(response.error.message);
    }
    
    return parseInt(response.result as string, 16);
  }
  
  async getBalance(address: string): Promise<string> {
    const response = await this.call({
      method: 'eth_getBalance',
      params: [address, 'latest'],
    });
    
    if (response.error) {
      throw new Error(response.error.message);
    }
    
    return response.result as string;
  }
  
  async sendRawTransaction(signedTx: string): Promise<string> {
    const response = await this.call({
      method: 'eth_sendRawTransaction',
      params: [signedTx],
    });
    
    if (response.error) {
      throw new Error(response.error.message);
    }
    
    return response.result as string;
  }
}

let rpcClient: RpcClient | null = null;

export function getRpcClient(): RpcClient {
  if (!rpcClient) {
    rpcClient = new RpcClient();
  }
  return rpcClient;
}
