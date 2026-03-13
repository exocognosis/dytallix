// Dytallix SDK for TypeScript/JavaScript
// Official SDK for the Dytallix PQC blockchain

export { DytallixClient, TESTNET_RPC, TESTNET_CHAIN_ID } from './client';
export type {
  ClientConfig,
  ChainStatus,
  Account,
  Transaction,
  TransactionQuery,
  TransactionReceipt,
  SendTokensRequest,
  TransactionResponse,
  Block,
  StakingRewards,
  FaucetResponse,
  FaucetDispensed,
  ContractDeployRequest,
  ContractDeployResponse,
  ContractCallRequest,
  ContractCallResponse,
  GenesisConfig,
  PeerInfo
} from './client';

export { PQCWallet, initPQC, isPQCInitialized } from './wallet';
export type {
  PQCAlgorithm,
  KeyPair
} from './wallet';

export { DytallixError, ErrorCode } from './errors';

// Version
export const VERSION = '0.2.0';
