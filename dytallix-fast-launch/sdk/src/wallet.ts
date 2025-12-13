/**
 * PQC Wallet class for managing quantum-resistant wallets
 * 
 * This is a wrapper around a PQC module (WASM or other implementation).
 * In the browser, it defaults to window.PQCWallet if available.
 * In Node.js, you must provide an implementation via PQCWallet.setProvider().
 */

export type PQCAlgorithm = 'ML-DSA' | 'SLH-DSA';

export interface KeyPair {
  publicKey: string;
  secretKey: string;
  address: string;
  algorithm: PQCAlgorithm;
}

/**
 * Interface for PQC implementation provider.
 * Allows injecting different implementations (WASM, Native, Mock)
 */
export interface IPQCProvider {
  generateKeypair(algorithm: string): Promise<KeyPair>;
  importKeystore(keystore: any, password: string): Promise<KeyPair>;
  signTransaction(txObj: any, secretKey: string, publicKey: string): Promise<any>;
  exportKeystore(keypair: any, password: string): Promise<any>;
}

export class PQCWallet {
  public address: string;
  public algorithm: PQCAlgorithm;
  private publicKey: string;
  private secretKey: string;

  private static provider: IPQCProvider | null = null;

  constructor(keypair: KeyPair) {
    this.address = keypair.address;
    this.algorithm = keypair.algorithm;
    this.publicKey = keypair.publicKey;
    this.secretKey = keypair.secretKey;
  }

  /**
   * Set the PQC provider implementation.
   * Required for Node.js usage.
   */
  static setProvider(provider: IPQCProvider) {
    this.provider = provider;
  }

  /**
   * Get the current PQC provider.
   * Falls back to window.PQCWallet if available and no provider set.
   */
  private static getProvider(): IPQCProvider {
    if (this.provider) {
      return this.provider;
    }

    if (typeof window !== 'undefined' && (window as any).PQCWallet) {
      return (window as any).PQCWallet as IPQCProvider;
    }

    throw new Error(
      'PQC Provider not found. ' +
      'In Node.js, call PQCWallet.setProvider() with a valid IPQCProvider implementation. ' +
      'In Browser, ensure @dytallix/pqc-wasm is loaded.'
    );
  }

  /**
   * Generate a new PQC wallet
   */
  static async generate(algorithm: PQCAlgorithm = 'ML-DSA'): Promise<PQCWallet> {
    const provider = this.getProvider();
    const keypair = await provider.generateKeypair(algorithm);
    return new PQCWallet(keypair);
  }

  /**
   * Import wallet from encrypted keystore JSON
   */
  static async fromKeystore(keystoreJson: string, password: string): Promise<PQCWallet> {
    const provider = this.getProvider();
    const keystore = JSON.parse(keystoreJson);
    const keypair = await provider.importKeystore(keystore, password);
    return new PQCWallet(keypair);
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
    const provider = PQCWallet.getProvider();
    return await provider.signTransaction(
      txObj,
      this.secretKey,
      this.publicKey
    );
  }

  /**
   * Export wallet as encrypted keystore JSON
   */
  async exportKeystore(password: string): Promise<string> {
    const provider = PQCWallet.getProvider();
    const keystore = await provider.exportKeystore(
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
