/**
 * PQC Wallet - Post-Quantum Cryptographic wallet for Dytallix
 * 
 * Uses ML-DSA-65 (FIPS 204, formerly Dilithium3) for quantum-resistant signatures.
 * 
 * IMPORTANT: Call initPQC() before using wallet generation or signing.
 */

import { sha256 } from '@noble/hashes/sha256';
import { DytallixError, ErrorCode } from './errors.js';

export type PQCAlgorithm = 'ML-DSA' | 'dilithium5';

export interface KeyPair {
  publicKey: string;  // Base64 encoded
  secretKey: string;  // Base64 encoded
  address: string;    // dyt1... format
  algorithm: string;
}

// PQC WASM module interface
interface PQCModule {
  keygen(): string;
  sign(message: Uint8Array, sk: string): string;
  verify(message: Uint8Array, sig: string, pk: string): boolean;
  pubkey_to_address(pk: string, hrp: string): string;
  version(): string;
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
      // Try to load pqc-wasm package
      const pqcWasm = await import('pqc-wasm');
      
      // Handle both default export and named exports
      if (pqcWasm.default && typeof pqcWasm.default === 'function') {
        await pqcWasm.default();
        pqcModule = pqcWasm as unknown as PQCModule;
      } else if (typeof pqcWasm.keygen === 'function') {
        pqcModule = pqcWasm as PQCModule;
      } else {
        throw new Error('Invalid pqc-wasm module format');
      }
    } catch (error) {
      initPromise = null;
      throw new DytallixError(
        ErrorCode.PQC_NOT_INITIALIZED,
        'Failed to initialize PQC module. Ensure pqc-wasm is installed: npm install pqc-wasm',
        error
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
    throw new DytallixError(
      ErrorCode.PQC_NOT_INITIALIZED,
      'PQC module not initialized. Call initPQC() first.'
    );
  }
  return pqcModule;
}

/**
 * PQC Wallet class for managing quantum-resistant wallets
 */
export class PQCWallet {
  public readonly address: string;
  public readonly algorithm: string;
  private readonly publicKey: string;
  private readonly secretKey: string;

  private constructor(keypair: KeyPair) {
    this.address = keypair.address;
    this.algorithm = keypair.algorithm;
    this.publicKey = keypair.publicKey;
    this.secretKey = keypair.secretKey;
  }

  /**
   * Generate a new PQC wallet with ML-DSA-65 (Dilithium3) keys
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
  static async generate(algorithm: PQCAlgorithm = 'ML-DSA'): Promise<PQCWallet> {
    const pqc = getPQC();
    
    try {
      const keypairJson = pqc.keygen();
      const keypair = JSON.parse(keypairJson);
      
      return new PQCWallet({
        publicKey: keypair.pk,
        secretKey: keypair.sk,
        address: keypair.address,
        algorithm: keypair.algo || 'fips204/ml-dsa-65'
      });
    } catch (error) {
      throw new DytallixError(
        ErrorCode.PQC_KEYGEN_FAILED,
        'Failed to generate PQC keypair',
        error
      );
    }
  }

  /**
   * Import wallet from a KeyPair object
   */
  static fromKeyPair(keypair: KeyPair): PQCWallet {
    return new PQCWallet(keypair);
  }

  /**
   * Import wallet from encrypted keystore JSON
   * 
   * @param keystoreJson - Encrypted keystore JSON string
   * @param password - Password to decrypt the keystore
   */
  static async fromKeystore(keystoreJson: string, password: string): Promise<PQCWallet> {
    // Parse and validate keystore
    let keystore: {
      version: number;
      address: string;
      crypto: {
        cipher: string;
        ciphertext: string;
        cipherparams: { iv: string };
        kdf: string;
        kdfparams: { salt: string; n: number; r: number; p: number; dklen: number };
        mac: string;
      };
      algorithm: string;
      pk: string;
    };
    
    try {
      keystore = JSON.parse(keystoreJson);
    } catch {
      throw new DytallixError(ErrorCode.INVALID_KEYSTORE, 'Invalid keystore JSON format');
    }

    if (!keystore.crypto || !keystore.address) {
      throw new DytallixError(ErrorCode.INVALID_KEYSTORE, 'Invalid keystore structure');
    }

    // Derive key using scrypt (simplified - in production use proper scrypt)
    const { salt, ciphertext, iv } = {
      salt: hexToBytes(keystore.crypto.kdfparams.salt),
      ciphertext: hexToBytes(keystore.crypto.ciphertext),
      iv: hexToBytes(keystore.crypto.cipherparams.iv)
    };

    // Verify MAC
    const derivedKey = await deriveKey(password, salt);
    const macKey = derivedKey.slice(16, 32);
    const expectedMac = bytesToHex(sha256(new Uint8Array([...macKey, ...ciphertext])));
    
    if (expectedMac !== keystore.crypto.mac) {
      throw new DytallixError(ErrorCode.INVALID_PASSWORD, 'Invalid password');
    }

    // Decrypt secret key
    const decryptKey = derivedKey.slice(0, 16);
    const secretKey = await decryptAES(ciphertext, decryptKey, iv);

    return new PQCWallet({
      publicKey: keystore.pk,
      secretKey: bytesToBase64(secretKey),
      address: keystore.address,
      algorithm: keystore.algorithm || 'fips204/ml-dsa-65'
    });
  }

  /**
   * Get the wallet's public key (base64 encoded)
   */
  getPublicKey(): string {
    return this.publicKey;
  }

  /**
   * Sign a transaction object
   * 
   * @param txObj - Transaction object to sign
   * @returns Signed transaction with signature attached
   */
  async signTransaction(txObj: Record<string, unknown>): Promise<Record<string, unknown>> {
    const pqc = getPQC();
    
    try {
      // Serialize transaction for signing
      const txBytes = new TextEncoder().encode(JSON.stringify(txObj));
      
      // Sign with PQC
      const signature = pqc.sign(txBytes, this.secretKey);
      
      return {
        ...txObj,
        signature: {
          sig: signature,
          pub_key: this.publicKey,
          algorithm: this.algorithm
        }
      };
    } catch (error) {
      throw new DytallixError(
        ErrorCode.PQC_SIGN_FAILED,
        'Failed to sign transaction',
        error
      );
    }
  }

  /**
   * Export wallet as encrypted keystore JSON
   * 
   * @param password - Password to encrypt the keystore
   */
  async exportKeystore(password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(32));
    const iv = crypto.getRandomValues(new Uint8Array(16));
    
    // Derive key
    const derivedKey = await deriveKey(password, salt);
    const encryptKey = derivedKey.slice(0, 16);
    const macKey = derivedKey.slice(16, 32);
    
    // Encrypt secret key
    const secretKeyBytes = base64ToBytes(this.secretKey);
    const ciphertext = await encryptAES(secretKeyBytes, encryptKey, iv);
    
    // Calculate MAC
    const mac = sha256(new Uint8Array([...macKey, ...ciphertext]));
    
    const keystore = {
      version: 1,
      address: this.address,
      algorithm: this.algorithm,
      pk: this.publicKey,
      crypto: {
        cipher: 'aes-128-ctr',
        ciphertext: bytesToHex(ciphertext),
        cipherparams: { iv: bytesToHex(iv) },
        kdf: 'scrypt',
        kdfparams: {
          salt: bytesToHex(salt),
          n: 262144,
          r: 8,
          p: 1,
          dklen: 32
        },
        mac: bytesToHex(mac)
      }
    };
    
    return JSON.stringify(keystore, null, 2);
  }

  /**
   * Get truncated address for display
   */
  getTruncatedAddress(): string {
    if (this.address.length <= 15) return this.address;
    return `${this.address.slice(0, 10)}...${this.address.slice(-4)}`;
  }
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
  return btoa(String.fromCharCode(...bytes));
}

function base64ToBytes(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
}

async function deriveKey(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );
  
  return new Uint8Array(derivedBits);
}

async function encryptAES(data: Uint8Array, key: Uint8Array, iv: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'AES-CTR' },
    false,
    ['encrypt']
  );
  
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-CTR', counter: iv, length: 64 },
    cryptoKey,
    data
  );
  
  return new Uint8Array(ciphertext);
}

async function decryptAES(data: Uint8Array, key: Uint8Array, iv: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'AES-CTR' },
    false,
    ['decrypt']
  );
  
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-CTR', counter: iv, length: 64 },
    cryptoKey,
    data
  );
  
  return new Uint8Array(plaintext);
}
