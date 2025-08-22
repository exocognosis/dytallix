export interface FaucetTokenConfig {
  symbol: string;
  decimals: number;
  maxPerRequest: string; // as decimal string
  cooldownSeconds: number;
}

export interface FaucetRateLimitConfig {
  windowMs: number;
  max: number;
}

export interface FaucetConfig {
  allowedTokens: Record<string, FaucetTokenConfig>;
  maxTokensPerRequest: number;
  signer: {
    privateKeyEnv: string; // name of env var with PK
    rpcUrlEnv: string;     // name of env var with RPC URL
    chainId: number;
  };
  rateLimit: {
    ip: FaucetRateLimitConfig;
    address: FaucetRateLimitConfig;
  };
}

export const faucetConfig: FaucetConfig = {
  allowedTokens: {
    TOKENA: { symbol: 'TOKENA', decimals: 18, maxPerRequest: '100', cooldownSeconds: 3600 },
    TOKENB: { symbol: 'TOKENB', decimals: 18, maxPerRequest: '50', cooldownSeconds: 3600 },
  },
  maxTokensPerRequest: 2,
  signer: {
    privateKeyEnv: 'FAUCET_SIGNER_PK',
    rpcUrlEnv: 'FAUCET_RPC_URL',
    chainId: 1,
  },
  rateLimit: {
    ip: { windowMs: 15 * 60 * 1000, max: 10 },
    address: { windowMs: 15 * 60 * 1000, max: 5 },
  },
};