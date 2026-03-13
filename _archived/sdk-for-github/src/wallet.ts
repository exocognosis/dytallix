/**
 * PQC Wallet - Post-Quantum Cryptographic wallet for Dytallix
 * 
 * Uses ML-DSA-65 (FIPS 204, formerly Dilithium3) for quantum-resistant signatures.
 * 
 * IMPORTANT: Call initPQC() before using wallet generation or signing.
 */

export type PQCAlgorithm = 'ML-DSA' | 'SLH-DSA';

export interface KeyPair {
  publicKey: string;  // Hex encoded
  secretKey: string;  // Hex encoded
  address: string;    // dyt1... format
  algorithm: string;
}

// PQC WASM module interface (matches published pqc-wasm@0.1.x package)
interface PQCModule {
  generate_keypair(): string;  // Returns JSON string
  sign(private_key: Uint8Array, message: Uint8Array): Uint8Array;
  verify(public_key: Uint8Array, message: Uint8Array, signature: Uint8Array): boolean;
  public_key_to_address(public_key: Uint8Array): string;
  derive_public_key(private_key: Uint8Array): Uint8Array;
  initSync?(input: BufferSource): void;
}

// Global PQC module reference
let pqcModule: PQCModule | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Initialize PQC WASM module.
 * This must be called before using PQCWallet.generate() or signing transactions.
 * 
 * @example
 * ```typescript
 * import { initPQC, PQCWallet } from '@dytallix/sdk';
 * 
 * await initPQC();
 * const wallet = await PQCWallet.generate();
 * ```
 */
export async function initPQC(): Promise<void> {
  if (pqcModule) return;

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      // Dynamic import of pqc-wasm
      const pqcWasm = await import('pqc-wasm');

      // Check if we're in Node.js
      const isNode = typeof process !== 'undefined' && process.versions?.node;

      if (isNode && typeof pqcWasm.initSync === 'function') {
        // In Node.js, we need to load the WASM file and call initSync
        try {
          const fs = await import('fs');
          const path = await import('path');

          // Try to find the wasm file relative to the pqc-wasm package
          const pqcWasmDir = path.dirname(require.resolve('pqc-wasm'));
          const wasmPath = path.join(pqcWasmDir, 'pqc_wasm_bg.wasm');

          if (fs.existsSync(wasmPath)) {
            const wasmBuffer = fs.readFileSync(wasmPath);
            pqcWasm.initSync(wasmBuffer.buffer.slice(wasmBuffer.byteOffset, wasmBuffer.byteOffset + wasmBuffer.byteLength));
          } else {
            // Fallback: try without init (some versions auto-initialize)
            console.warn('pqc-wasm: WASM file not found, attempting to use without explicit init');
          }
        } catch (fsError) {
          // Module might already be initialized or auto-initializes
          console.warn('pqc-wasm: Could not load WASM file, module may already be initialized');
        }
      }

      // Verify the module has the expected functions
      if (typeof pqcWasm.generate_keypair !== 'function') {
        throw new Error(
          'pqc-wasm module does not have expected API. ' +
          'Expected function: generate_keypair. ' +
          'Please ensure you have pqc-wasm@0.1.x installed: npm install pqc-wasm'
        );
      }

      // Store module reference
      pqcModule = pqcWasm as PQCModule;
    } catch (error) {
      initPromise = null;
      throw new Error(
        `Failed to load pqc-wasm. Please ensure the package is installed: npm install pqc-wasm\n` +
        `Original error: ${error instanceof Error ? error.message : error}`
      );
    }
  })();

  return initPromise;
}

/**
 * Check if PQC module is initialized
 */
export function isPQCInitialized(): boolean {
  return pqcModule !== null;
}

/**
 * Get the PQC module, throwing if not initialized
 */
function getPQC(): PQCModule {
  if (!pqcModule) {
    throw new Error('PQC module not initialized. Call initPQC() first.');
  }
  return pqcModule;
}

// Helper functions
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  return btoa(String.fromCharCode(...bytes));
}

/**
 * PQC Wallet class for managing quantum-resistant wallets
 */
export class PQCWallet {
  public readonly address: string;
  public readonly algorithm: string;
  private readonly publicKey: Uint8Array;
  private readonly secretKey: Uint8Array;

  private constructor(keypair: { publicKey: Uint8Array; secretKey: Uint8Array; address: string; algorithm: string }) {
    this.address = keypair.address;
    this.algorithm = keypair.algorithm;
    this.publicKey = keypair.publicKey;
    this.secretKey = keypair.secretKey;
  }

  /**
   * Generate a new PQC wallet with ML-DSA-65 keys
   * 
   * @param algorithm - Currently only 'ML-DSA' is supported
   * @returns A new PQCWallet instance
   * 
   * @example
   * ```typescript
   * await initPQC();
   * const wallet = await PQCWallet.generate();
   * console.log('Address:', wallet.address);
   * ```
   */
  static async generate(_algorithm: PQCAlgorithm = 'ML-DSA'): Promise<PQCWallet> {
    // Ensure PQC is initialized
    await initPQC();

    const pqc = getPQC();

    try {
      // Call generate_keypair - returns JSON string
      const keypairResult = pqc.generate_keypair();

      // Parse the result (could be JSON string or object)
      let keypair: { pk: string | Uint8Array; sk: string | Uint8Array; address?: string };
      if (typeof keypairResult === 'string') {
        keypair = JSON.parse(keypairResult);
      } else {
        keypair = keypairResult as any;
      }

      // Convert to bytes if needed
      const publicKey = typeof keypair.pk === 'string'
        ? hexToBytes(keypair.pk)
        : keypair.pk as Uint8Array;
      const secretKey = typeof keypair.sk === 'string'
        ? hexToBytes(keypair.sk)
        : keypair.sk as Uint8Array;

      // Get address (either from result or derive it)
      let address = keypair.address;
      if (!address && typeof pqc.public_key_to_address === 'function') {
        address = pqc.public_key_to_address(publicKey);
      }
      if (!address) {
        // Fallback: generate a simple address from public key hash
        address = 'dyt1' + bytesToHex(publicKey.slice(0, 20));
      }

      return new PQCWallet({
        publicKey,
        secretKey,
        address,
        algorithm: 'fips204/ml-dsa-65'
      });
    } catch (error) {
      throw new Error(`Failed to generate PQC keypair: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Create wallet from existing private key
   */
  static fromPrivateKey(privateKeyHex: string, algorithm: PQCAlgorithm = 'ML-DSA'): PQCWallet {
    const pqc = getPQC();
    const secretKey = hexToBytes(privateKeyHex);

    // Derive public key if function available
    let publicKey: Uint8Array;
    if (typeof pqc.derive_public_key === 'function') {
      publicKey = pqc.derive_public_key(secretKey);
    } else {
      throw new Error('Cannot derive public key from private key - pqc.derive_public_key not available');
    }

    // Derive address
    let address: string;
    if (typeof pqc.public_key_to_address === 'function') {
      address = pqc.public_key_to_address(publicKey);
    } else {
      address = 'dyt1' + bytesToHex(publicKey.slice(0, 20));
    }

    return new PQCWallet({
      publicKey,
      secretKey,
      address,
      algorithm: 'fips204/ml-dsa-65'
    });
  }

  /**
   * Verify a signature
   */
  static verify(publicKeyHex: string, message: string, signatureHex: string): boolean {
    const pqc = getPQC();
    const publicKey = hexToBytes(publicKeyHex);
    const signature = hexToBytes(signatureHex);
    const msgBytes = new TextEncoder().encode(message);

    return pqc.verify(publicKey, msgBytes, signature);
  }

  /**
   * Import from JSON
   */
  static fromJSON(json: { address: string; publicKey: string; secretKey: string; algorithm?: string }): PQCWallet {
    return new PQCWallet({
      address: json.address,
      publicKey: hexToBytes(json.publicKey),
      secretKey: hexToBytes(json.secretKey),
      algorithm: json.algorithm || 'fips204/ml-dsa-65'
    });
  }

  /**
   * Get the wallet's public key as hex string
   */
  getPublicKey(): string {
    return bytesToHex(this.publicKey);
  }

  /**
   * Get the wallet's private key as hex string
   * WARNING: Handle with care!
   */
  getPrivateKey(): string {
    return bytesToHex(this.secretKey);
  }

  /**
   * Sign a message
   */
  sign(message: string): string {
    const pqc = getPQC();
    const msgBytes = new TextEncoder().encode(message);
    const signature = pqc.sign(this.secretKey, msgBytes);
    return bytesToHex(signature);
  }

  /**
   * Sign a transaction object
   */
  signTransaction(txObj: Record<string, unknown>): Record<string, unknown> {
    const pqc = getPQC();
    const txBytes = new TextEncoder().encode(JSON.stringify(txObj));
    const signature = pqc.sign(this.secretKey, txBytes);

    return {
      tx: txObj,
      public_key: bytesToBase64(this.publicKey),
      signature: bytesToBase64(signature),
      algorithm: this.algorithm,
      version: 1
    };
  }

  /**
   * Sort object keys for canonical JSON
   */
  sortObjectKeys(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this.sortObjectKeys(item));
    } else if (obj !== null && typeof obj === 'object') {
      return Object.keys(obj).sort().reduce((result: any, key) => {
        result[key] = this.sortObjectKeys(obj[key]);
        return result;
      }, {});
    }
    return obj;
  }

  /**
   * Create canonical JSON string
   */
  canonicalJSON(obj: any): string {
    return JSON.stringify(this.sortObjectKeys(obj));
  }

  /**
   * Get truncated address for display
   */
  getTruncatedAddress(): string {
    if (this.address.length <= 15) return this.address;
    return `${this.address.slice(0, 10)}...${this.address.slice(-4)}`;
  }

  /**
   * Export to JSON
   */
  toJSON(): { address: string; publicKey: string; secretKey: string; algorithm: string } {
    return {
      address: this.address,
      publicKey: bytesToHex(this.publicKey),
      secretKey: bytesToHex(this.secretKey),
      algorithm: this.algorithm
    };
  }

  /**
   * Export as encrypted keystore JSON
   */
  async exportKeystore(password: string): Promise<string> {
    // Simplified keystore export
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(this.toJSON()));

    // Use SubtleCrypto for encryption if available
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));

      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
      );

      const key = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );

      const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        data
      );

      return JSON.stringify({
        version: 1,
        address: this.address,
        crypto: {
          cipher: 'aes-256-gcm',
          ciphertext: bytesToHex(new Uint8Array(ciphertext)),
          salt: bytesToHex(salt),
          iv: bytesToHex(iv)
        }
      });
    }

    throw new Error('Web Crypto API not available');
  }

  /**
   * Import from encrypted keystore JSON
   */
  static async importKeystore(keystoreJson: string, password: string): Promise<PQCWallet> {
    const keystore = JSON.parse(keystoreJson);

    if (typeof crypto === 'undefined' || !crypto.subtle) {
      throw new Error('Web Crypto API not available');
    }

    const encoder = new TextEncoder();
    const salt = hexToBytes(keystore.crypto.salt);
    const iv = hexToBytes(keystore.crypto.iv);
    const ciphertext = hexToBytes(keystore.crypto.ciphertext);

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
      key,
      ciphertext.buffer as ArrayBuffer
    );

    const json = JSON.parse(new TextDecoder().decode(decrypted));
    return PQCWallet.fromJSON(json);
  }
}
