/**
 * @dytallix/sdk - TypeScript SDK for Dytallix blockchain
 * 
 * This SDK provides PQC wallet generation, transaction signing, and RPC interaction.
 */

export { DytallixClient } from './client.js';
export type {
  ClientConfig,
  ChainStatus,
  Account,
  Transaction,
  TransactionQuery,
  TransactionReceipt,
  SendTokensRequest,
  TransactionResponse,
  FaucetRequest,
  FaucetDispensed,
  FaucetResponse,
  Block,
  BlocksQuery,
  StakingRewards,
  ClaimRewardsResponse
} from './client.js';

export { PQCWallet, initPQC, isPQCInitialized } from './wallet.js';
export type {
  PQCAlgorithm,
  KeyPair
} from './wallet.js';

export { DytallixError, ErrorCode } from './errors.js';

export const VERSION = '0.2.0';

// Network constants
export const TESTNET_RPC = 'https://dytallix.com/rpc';
export const TESTNET_CHAIN_ID = 'dytallix-testnet-1';
