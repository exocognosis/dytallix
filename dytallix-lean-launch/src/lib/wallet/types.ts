// Dytallix PQC Wallet SDK Types
// Core types for post-quantum cryptography wallet implementation

export type Algo = 'dilithium' | 'falcon' | 'sphincs+' | 'kyber-hpke'

export interface Account {
  address: string
  pubkey: string
  algo: Algo
  label?: string
}

export interface VaultMeta {
  version: number
  createdAt: string
  kdf: 'scrypt' | 'pbkdf2'
  algo: 'xsalsa20-poly1305' | 'chacha20-poly1305'
  scryptParams?: {
    N: number
    r: number
    p: number
  }
  pbkdf2Params?: {
    iterations: number
    hash: string
  }
}

export interface TxPayload {
  type: string
  body: any
}

export interface SignedTx {
  payload: TxPayload
  algo: Algo
  pubkey: string
  sig: string
}

export interface Balance {
  address: string
  udgt: string
  udrt: string
  [k: string]: string
}

export interface WalletConfig {
  autoLockMs?: number
  rpcUrl?: string
  restUrl?: string
  chainId?: string
}

export interface WalletEventMap {
  lock: () => void
  unlock: () => void
  accountChanged: (account: Account | null) => void
}