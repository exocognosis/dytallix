/**
 * Native Provider - Node-API native backend for PQC operations (stub)
 * This is a placeholder for future native addon integration
 */

import type {
  Provider,
  Keypair,
  SignResult,
  VerifyResult,
  Address,
  Algo,
} from '../../provider.js';
import { deriveAddress } from '../../address.js';

let nativeAddon: any = null;

/**
 * Attempt to load native addon
 */
async function loadNativeAddon() {
  if (nativeAddon) return nativeAddon;
  
  try {
    // Try to load @dyt/pqc-native
    nativeAddon = await import('@dyt/pqc-native');
    return nativeAddon;
  } catch (err) {
    throw new Error(
      'Native addon @dyt/pqc-native not available. Install it or use WASM backend.'
    );
  }
}

/**
 * Native Provider implementation (stub)
 * 
 * This provider defers to a native Node-API addon when available.
 * The addon must export: keygen(), sign(), verify() functions.
 */
export class ProviderNative implements Provider {
  readonly name = 'native';
  readonly version = '0.1.0';
  
  private hrp: string;
  private algo: Algo;
  private initialized = false;

  constructor(options?: { hrp?: string; algo?: Algo }) {
    this.hrp = options?.hrp || 'dyt';
    this.algo = options?.algo || 'dilithium3';
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    
    await loadNativeAddon();
    this.initialized = true;
  }

  async keygen(algo?: Algo): Promise<Keypair> {
    await this.init();
    
    const algoToUse = algo || this.algo;
    if (algoToUse !== 'dilithium3') {
      throw new Error(`Unsupported algorithm: ${algoToUse}`);
    }

    const addon = await loadNativeAddon();
    const result = addon.keygen();
    
    return {
      publicKey: new Uint8Array(result.publicKey),
      secretKey: new Uint8Array(result.secretKey),
    };
  }

  async sign(
    message: Uint8Array,
    secretKey: Uint8Array,
    algo?: Algo
  ): Promise<SignResult> {
    await this.init();
    
    const algoToUse = algo || this.algo;
    if (algoToUse !== 'dilithium3') {
      throw new Error(`Unsupported algorithm: ${algoToUse}`);
    }

    const addon = await loadNativeAddon();
    const signature = addon.sign(message, secretKey);
    
    return { signature: new Uint8Array(signature) };
  }

  async verify(
    message: Uint8Array,
    signature: Uint8Array,
    publicKey: Uint8Array,
    algo?: Algo
  ): Promise<VerifyResult> {
    await this.init();
    
    const algoToUse = algo || this.algo;
    if (algoToUse !== 'dilithium3') {
      throw new Error(`Unsupported algorithm: ${algoToUse}`);
    }

    const addon = await loadNativeAddon();
    const ok = addon.verify(message, signature, publicKey);
    
    return { ok };
  }

  async addressFromPublicKey(publicKey: Uint8Array): Promise<Address> {
    await this.init();
    
    // Try using native method if available
    const addon = await loadNativeAddon();
    if (typeof addon.addressFromPublicKey === 'function') {
      return addon.addressFromPublicKey(publicKey, this.hrp) as Address;
    }
    
    // Fallback to local implementation
    return deriveAddress(publicKey, this.hrp);
  }

  /**
   * Best-effort memory zeroization
   */
  zeroize(buf: Uint8Array | WebAssembly.Memory): void {
    if (buf instanceof Uint8Array) {
      for (let i = 0; i < buf.length; i++) {
        buf[i] = 0;
      }
    }
  }
}
