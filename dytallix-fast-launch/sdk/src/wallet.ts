/**
 * PQC Wallet class for managing quantum-resistant wallets
 * 
 * Integrates with pqc-wasm for ML-DSA cryptography
 */

import type * as PQC from 'pqc-wasm';

export type PQCAlgorithm = 'ML-DSA' | 'SLH-DSA';

export interface KeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
  address: string;
  algorithm: PQCAlgorithm;
}

// Lazy-loaded WASM module
let pqcModule: typeof PQC | null = null;

/**
 * Initialize the PQC WASM module
 * This must be called before using any PQC wallet functionality
 */
export async function initPQC(wasmBinary?: BufferSource): Promise<void> {
  if (pqcModule) return;
  
  try {
    const module = await import('pqc-wasm');
    
    // Initialize WASM
    if (wasmBinary) {
      // Use provided binary
      await module.default(wasmBinary);
    } else if (typeof window === 'undefined') {
      // Node.js environment - load from file
      try {
        const { readFileSync } = await import('fs');
        const { createRequire } = await import('module');
        const require = createRequire(import.meta.url);
        
        // Resolve the WASM file path
        const wasmPath = require.resolve('pqc-wasm/pqc_wasm_bg.wasm');
        const wasm = readFileSync(wasmPath);
        await module.default(wasm);
      } catch (e) {
        // Fallback - let it try default loading
        await module.default();
      }
    } else {
      // Browser environment - let it fetch automatically
      await module.default();
    }
    
    pqcModule = module;
  } catch (error) {
    throw new Error(
      'Failed to load pqc-wasm. ' +
      'Please ensure the package is installed: npm install pqc-wasm'
    );
  }
}

export class PQCWallet {
  public address: string;
  public algorithm: PQCAlgorithm;
  private publicKey: Uint8Array;
  private privateKey: Uint8Array;

  constructor(keypair: KeyPair) {
    this.address = keypair.address;
    this.algorithm = keypair.algorithm;
    this.publicKey = keypair.publicKey;
    this.privateKey = keypair.privateKey;
  }

  /**
   * Generate a new PQC wallet
   * Note: Only ML-DSA is currently supported in the WASM module
   */
  static async generate(algorithm: PQCAlgorithm = 'ML-DSA'): Promise<PQCWallet> {
    // Auto-initialize if not already done
    if (!pqcModule) {
      await initPQC();
    }

    if (!pqcModule) {
      throw new Error('PQC module failed to initialize');
    }

    if (algorithm !== 'ML-DSA') {
      throw new Error('Only ML-DSA algorithm is currently supported in WASM');
    }

    // Generate keypair using WASM
    const result = pqcModule.generate_keypair();
    const publicKey = result.publicKey;
    const privateKey = result.privateKey;
    
    // Generate address from public key
    const address = pqcModule.public_key_to_address(publicKey);

    return new PQCWallet({
      publicKey,
      privateKey,
      address,
      algorithm: 'ML-DSA'
    });
  }

  /**
   * Import wallet from private key bytes
   */
  static async fromPrivateKey(privateKey: Uint8Array, algorithm: PQCAlgorithm = 'ML-DSA'): Promise<PQCWallet> {
    if (!pqcModule) {
      await initPQC();
    }

    if (!pqcModule) {
      throw new Error('PQC module failed to initialize');
    }

    // Derive public key from private key
    const publicKey = pqcModule.derive_public_key(privateKey);
    const address = pqcModule.public_key_to_address(publicKey);

    return new PQCWallet({
      publicKey,
      privateKey,
      address,
      algorithm
    });
  }

  /**
   * Sign a message/transaction
   */
  async sign(message: Uint8Array): Promise<Uint8Array> {
    if (!pqcModule) {
      await initPQC();
    }

    if (!pqcModule) {
      throw new Error('PQC module failed to initialize');
    }

    return pqcModule.sign(this.privateKey, message);
  }

  /**
   * Verify a signature
   */
  static async verify(publicKey: Uint8Array, message: Uint8Array, signature: Uint8Array): Promise<boolean> {
    if (!pqcModule) {
      await initPQC();
    }

    if (!pqcModule) {
      throw new Error('PQC module failed to initialize');
    }

    return pqcModule.verify(publicKey, message, signature);
  }

  /**
   * Get wallet public key
   */
  getPublicKey(): Uint8Array {
    return this.publicKey;
  }

  /**
   * Get wallet private key (use with caution!)
   */
  getPrivateKey(): Uint8Array {
    return this.privateKey;
  }

  /**
   * Truncate address for display (dyt1...xyz)
   */
  getTruncatedAddress(): string {
    if (this.address.length <= 15) return this.address;
    return `${this.address.slice(0, 8)}...${this.address.slice(-4)}`;
  }

  /**
   * Export wallet as JSON (WARNING: This exports the private key in plaintext!)
   * For production, use proper keystore encryption
   */
  toJSON(): { address: string; publicKey: string; privateKey: string; algorithm: PQCAlgorithm } {
    return {
      address: this.address,
      publicKey: Buffer.from(this.publicKey).toString('base64'),
      privateKey: Buffer.from(this.privateKey).toString('base64'),
      algorithm: this.algorithm
    };
  }

  /**
   * Import wallet from JSON
   */
  static fromJSON(json: { address: string; publicKey: string; privateKey: string; algorithm: PQCAlgorithm }): PQCWallet {
    return new PQCWallet({
      address: json.address,
      publicKey: Buffer.from(json.publicKey, 'base64'),
      privateKey: Buffer.from(json.privateKey, 'base64'),
      algorithm: json.algorithm
    });
  }
}
