// PQC type declarations
export type PQCAlgo = 'dilithium' | 'falcon' | 'sphincs'

export interface PQCKeypair {
  algo: PQCAlgo
  pk: Uint8Array
  sk: Uint8Array
}

export interface PQCSignature {
  algo: PQCAlgo
  sig: Uint8Array
}

export interface PQCSizes { pk: number; sk: number; sig: number }

export interface PQCModule {
  init?(): Promise<void>
  keygen(): Promise<PQCKeypair>
  sign(sk: Uint8Array, msg: Uint8Array): Promise<Uint8Array>
  verify(pk: Uint8Array, msg: Uint8Array, sig: Uint8Array): Promise<boolean>
  sizes(): PQCSizes
  exportSecret?(sk: Uint8Array): Promise<Uint8Array>
}

export interface PQCFacadeConfig {
  algo: PQCAlgo
}

// Serialization helpers (opaque; versioned for future)
export interface SerializedKeypair { v: number; algo: PQCAlgo; pk: string; sk: string }
