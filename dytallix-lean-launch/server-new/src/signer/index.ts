import { createHash } from 'crypto';
import { getConfig } from '../config.js';

/**
 * Signer interface for transaction signing abstraction
 * This allows for easy swapping between local keys, KMS, HSM, etc.
 */
export interface Signer {
  getAddress(): string;
  signTransaction(rawTx: SignableTransaction): Promise<SignedTransaction>;
  rotate(newKey: string): Promise<void>;
}

export interface SignableTransaction {
  to: string;
  value: string;
  data?: string;
  nonce: number;
  gasLimit: string;
  gasPrice: string;
  chainId: number;
}

export interface SignedTransaction {
  raw: string;
  hash: string;
}

/**
 * Local private key signer implementation (for dev/test)
 * WARNING: Not for production use without proper key management
 */
export class LocalPrivateKeySigner implements Signer {
  private privateKey: string;
  
  constructor(privateKey?: string) {
    const config = getConfig();
    this.privateKey = privateKey || config.FAUCET_PRIVATE_KEY;
    
    if (!this.privateKey || this.privateKey === 'dev_only_key_replace_me') {
      throw new Error('Invalid or missing FAUCET_PRIVATE_KEY');
    }
  }
  
  getAddress(): string {
    // Simple address derivation for demonstration
    // In production, use proper key derivation (secp256k1, ed25519, etc.)
    const hash = createHash('sha256').update(this.privateKey).digest('hex');
    return '0x' + hash.substring(0, 40);
  }
  
  async signTransaction(rawTx: SignableTransaction): Promise<SignedTransaction> {
    // Simplified signing for demonstration
    // In production, use proper transaction encoding and signing (RLP, secp256k1, etc.)
    const txData = JSON.stringify(rawTx);
    const signature = createHash('sha256')
      .update(this.privateKey + txData)
      .digest('hex');
    
    const signedTx = {
      ...rawTx,
      signature,
      from: this.getAddress(),
    };
    
    const raw = '0x' + Buffer.from(JSON.stringify(signedTx)).toString('hex');
    const hash = '0x' + createHash('sha256').update(raw).digest('hex');
    
    return { raw, hash };
  }
  
  async rotate(newKey: string): Promise<void> {
    if (!newKey || newKey.length < 32) {
      throw new Error('Invalid new key');
    }
    this.privateKey = newKey;
  }
}

/**
 * KMS/HSM signer stub for future implementation
 * TODO: Implement actual KMS/HSM integration
 */
export class KMSSigner implements Signer {
  // Private field for KMS key identifier (not yet used until implementation)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(private _keyId: string) {}
  
  getAddress(): string {
    throw new Error('KMSSigner not yet implemented');
  }
  
  async signTransaction(_rawTx: SignableTransaction): Promise<SignedTransaction> {
    throw new Error('KMSSigner not yet implemented');
  }
  
  async rotate(_newKey: string): Promise<void> {
    throw new Error('KMSSigner not yet implemented');
  }
}

/**
 * Factory to create appropriate signer based on configuration
 */
export function createSigner(): Signer {
  // For now, always use local signer
  // Future: check config for KMS/HSM settings
  return new LocalPrivateKeySigner();
}

// Global signer instance
let signerInstance: Signer | null = null;

export function getSigner(): Signer {
  if (!signerInstance) {
    signerInstance = createSigner();
  }
  return signerInstance;
}

export function setSigner(signer: Signer): void {
  signerInstance = signer;
}
