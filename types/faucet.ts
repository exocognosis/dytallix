// Shared TypeScript DTO types for Dytallix Faucet
// These types are consumed by both client and server

export type FaucetTokenSymbol = 'DGT' | 'DRT';

export interface FaucetRequestDTO {
  address: string;              // EVM/Bech32 address (checksum or lowercased accepted)
  tokens: FaucetTokenSymbol[];  // One or both tokens to request
}

export interface DispensedToken {
  symbol: FaucetTokenSymbol;
  amount: string;               // Human-readable amount (e.g., "10" for 10 DGT)
  txHash?: string;              // Optional transaction hash
}

export interface FaucetSuccessResponseDTO {
  success: true;
  dispensed: DispensedToken[];
  message?: string;
}

export interface FaucetErrorResponseDTO {
  success: false;
  error: 'RATE_LIMIT' | 'INVALID_ADDRESS' | 'SERVER_ERROR' | 'INVALID_TOKEN';
  message: string;
  retryAfterSeconds?: number;   // Present for RATE_LIMIT errors
}

export type FaucetResponseDTO = FaucetSuccessResponseDTO | FaucetErrorResponseDTO;

export interface StatusResponseDTO {
  ok: boolean;
  network: string;
  redis: boolean;               // Whether Redis rate limiting is active
  rateLimit: {
    windowSeconds: number;
    maxRequests: number;
  };
  uptime?: number;              // Server uptime in seconds
}

export interface BalanceResponseDTO {
  address: string;
  balances: {
    symbol: FaucetTokenSymbol;
    amount: string;             // Human-readable amount
    denom: string;              // Base denomination (e.g., "udgt")
  }[];
}

// Legacy compatibility - support for single token requests
export interface LegacyFaucetRequestDTO {
  address: string;
  token: FaucetTokenSymbol;
}

export interface LegacyFaucetResponseDTO {
  ok: boolean;
  token?: string;
  amount?: string | number;
  txHash?: string;
  code?: string;
  message?: string;
}