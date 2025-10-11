/**
 * PQC Wallet class for managing quantum-resistant wallets
 * 
 * This is a simplified wrapper around the WASM PQC module.
 * In production, this should import from @dytallix/pqc-wasm package.
 */

export type PQCAlgorithm = 'ML-DSA' | 'SLH-DSA';

export interface KeyPair {
  publicKey: string;
  secretKey: string;
  address: string;
  algorithm: PQCAlgorithm;
}

export class PQCWallet {
  public address: string;
  public algorithm: PQCAlgorithm;
  private publicKey: string;
  private secretKey: string;

  constructor(keypair: KeyPair) {
    this.address = keypair.address;
    this.algorithm = keypair.algorithm;
    this.publicKey = keypair.publicKey;
    this.secretKey = keypair.secretKey;
  }

  /**
   * Generate a new PQC wallet
   * 
   * Note: This requires the @dytallix/pqc-wasm package to be installed
   * and properly initialized in the browser or Node.js environment.
   */
  static async generate(algorithm: PQCAlgorithm = 'ML-DSA'): Promise<PQCWallet> {
    // Check if PQC WASM module is available
    if (typeof window !== 'undefined' && (window as any).PQCWallet) {
      const keypair = await (window as any).PQCWallet.generateKeypair(algorithm);
      return new PQCWallet(keypair);
    }

    throw new Error(
      'PQC WASM module not loaded. ' +
      'Please ensure @dytallix/pqc-wasm is installed and initialized. ' +
      'See https://docs.dytallix.network/developers/pqc-wallet'
    );
  }

  /**
   * Import wallet from encrypted keystore JSON
   */
  static async fromKeystore(keystoreJson: string, password: string): Promise<PQCWallet> {
    // Check if PQC WASM module is available
    if (typeof window !== 'undefined' && (window as any).PQCWallet) {
      const keystore = JSON.parse(keystoreJson);
      const keypair = await (window as any).PQCWallet.importKeystore(keystore, password);
      return new PQCWallet(keypair);
    }

    throw new Error(
      'PQC WASM module not loaded. ' +
      'Please ensure @dytallix/pqc-wasm is installed and initialized.'
    );
  }

  /**
   * Import wallet from secret key
   */
  static fromSecretKey(secretKey: string, algorithm: PQCAlgorithm = 'ML-DSA'): PQCWallet {
    // This is a simplified version - in production, derive address from secret key
    throw new Error('fromSecretKey not yet implemented');
  }

  /**
   * Sign a transaction with PQC signature
   */
  async signTransaction(txObj: any): Promise<any> {
    // Check if PQC WASM module is available
    if (typeof window !== 'undefined' && (window as any).PQCWallet) {
      return await (window as any).PQCWallet.signTransaction(
        txObj,
        this.secretKey,
        this.publicKey
      );
    }

    throw new Error('PQC WASM module not loaded.');
  }

  /**
   * Export wallet as encrypted keystore JSON
   */
  async exportKeystore(password: string): Promise<string> {
    // Check if PQC WASM module is available
    if (typeof window !== 'undefined' && (window as any).PQCWallet) {
      const keystore = await (window as any).PQCWallet.exportKeystore(
        {
          address: this.address,
          secretKey: this.secretKey,
          publicKey: this.publicKey,
          algorithm: this.algorithm
        },
        password
      );
      return JSON.stringify(keystore);
    }

    throw new Error('PQC WASM module not loaded.');
  }

  /**
   * Get wallet public key
   */
  getPublicKey(): string {
    return this.publicKey;
  }

  /**
   * Truncate address for display (pqc1ml...xyz)
   */
  getTruncatedAddress(): string {
    if (this.address.length <= 15) return this.address;
    return `${this.address.slice(0, 8)}...${this.address.slice(-4)}`;
  }
}
