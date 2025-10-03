/**
 * Provider abstraction for PQC operations
 * Defines stable public API for crypto operations with pluggable backends
 */

export type Algo = 'dilithium3';

export type Address = `dyt1${string}`;

export interface Keypair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

export interface SignResult {
  signature: Uint8Array;
}

export interface VerifyResult {
  ok: boolean;
}

/**
 * Provider interface for PQC operations
 * Implementations can be WASM-based, native Node-API, or future backends
 */
export interface Provider {
  /** Provider identifier (e.g., "wasm", "native") */
  readonly name: string;
  
  /** Provider version */
  readonly version: string;
  
  /** Initialize the provider (load WASM, connect to native module, etc.) */
  init(): Promise<void>;
  
  /** Generate a new keypair for the specified algorithm */
  keygen(algo?: Algo): Promise<Keypair>;
  
  /** Sign a message with a secret key */
  sign(message: Uint8Array, secretKey: Uint8Array, algo?: Algo): Promise<SignResult>;
  
  /** Verify a signature against a message and public key */
  verify(
    message: Uint8Array,
    signature: Uint8Array,
    publicKey: Uint8Array,
    algo?: Algo
  ): Promise<VerifyResult>;
  
  /** Derive bech32 address from public key */
  addressFromPublicKey(publicKey: Uint8Array): Promise<Address>;
  
  /** Best-effort memory zeroization (optional) */
  zeroize?(buf: Uint8Array | WebAssembly.Memory): void;
}

/**
 * Factory for creating provider instances
 */
export interface ProviderFactory {
  create(): Provider;
}

/**
 * Options for createProvider
 */
export interface CreateProviderOptions {
  /** Backend selection: 'auto', 'wasm', or 'native' */
  backend?: 'auto' | 'wasm' | 'native';
  
  /** HRP (Human Readable Prefix) for address derivation (default: 'dyt') */
  hrp?: string;
  
  /** Algorithm to use (default: 'dilithium3') */
  algo?: Algo;
}
