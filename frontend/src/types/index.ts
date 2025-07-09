// Core types for the Dytallix application
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface BlockchainStats {
  block_height: number
  total_transactions: number
  peer_count: number
  mempool_size: number
  consensus_status: string
}

export interface Transaction {
  hash: string
  from: string
  to: string
  amount: number
  fee: number
  nonce: number
  status: 'pending' | 'confirmed' | 'failed'
  block_number?: number
  timestamp: number
  confirmations: number
}

export interface TransactionRequest {
  from: string
  to: string
  amount: number
  fee?: number
  nonce?: number
}

export interface Block {
  number: number
  hash: string
  parent_hash: string
  timestamp: number
  transactions: Transaction[]
  validator: string
  signature: string
}

export interface PQCKeyPair {
  algorithm: 'dilithium' | 'falcon' | 'sphincs'
  public_key: string
  private_key: string
  address: string
}

export interface WalletAccount {
  address: string
  balance: number
  nonce: number
  key_pair?: PQCKeyPair
}

export interface AIAnalysisResult {
  risk_score: number
  fraud_probability: number
  recommendations: string[]
  confidence: number
  details: Record<string, any>
}

export interface SmartContract {
  address: string
  name: string
  code_hash: string
  creator: string
  created_at: number
  abi?: any[]
}

export interface ContractCall {
  contract_address: string
  function_name: string
  parameters: any[]
  gas_limit: number
}

export interface WebSocketMessage {
  type: 'block' | 'transaction' | 'ai_analysis' | 'system'
  data: any
  timestamp: number
}
