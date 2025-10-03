/**
 * WASM Provider - WebAssembly backend for PQC operations
 * Uses existing Rust WASM implementation (wasm-pack)
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

const isNode =
  typeof process !== 'undefined' &&
  process.versions != null &&
  process.versions.node != null;

let wasmModule: any = null;

/**
 * Load WASM module based on environment
 */
async function loadWasmModule() {
  if (wasmModule) return wasmModule;

  if (isNode) {
    // Node: load local pkg glue and initialize with local wasm bytes
    // @ts-ignore - dynamic import
    const mod = await import('../../../../../crates/pqc-wasm/pkg/pqc_wasm.js');
    
    try {
      // Resolve wasm path relative to compiled dist file
      // @ts-ignore
      const { readFileSync } = await import('node:fs');
      // @ts-ignore
      const pathMod = await import('node:path');
      // @ts-ignore
      const { fileURLToPath } = await import('node:url');
      
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = pathMod.dirname(__filename);
      const wasmPath = pathMod.resolve(
        __dirname,
        '../../../../../crates/pqc-wasm/pkg/pqc_wasm_bg.wasm'
      );
      
      if (typeof (mod as any).initSync === 'function') {
        const bytes = readFileSync(wasmPath);
        (mod as any).initSync(bytes);
      } else if (typeof (mod as any).default === 'function') {
        await (mod as any).default();
      }
    } catch (err) {
      // Fallback to default init
      if (typeof (mod as any).default === 'function') {
        await (mod as any).default();
      }
    }
    
    wasmModule = mod;
    return wasmModule;
  }

  // Browser/web
  try {
    // @ts-ignore
    const mod = await import('../../../../../crates/pqc-wasm/pkg-web/pqc_wasm.js');
    if (typeof (mod as any).default === 'function') {
      await (mod as any).default();
    }
    wasmModule = mod;
    return wasmModule;
  } catch (e2) {
    // Last resort: try generic pkg
    // @ts-ignore
    const mod = await import('../../../../../crates/pqc-wasm/pkg/pqc_wasm.js');
    if (typeof (mod as any).default === 'function') {
      await (mod as any).default();
    }
    wasmModule = mod;
    return wasmModule;
  }
}

/**
 * WASM Provider implementation
 */
export class ProviderWasm implements Provider {
  readonly name = 'wasm';
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
    
    await loadWasmModule();
    this.initialized = true;
  }

  async keygen(algo?: Algo): Promise<Keypair> {
    await this.init();
    
    const algoToUse = algo || this.algo;
    if (algoToUse !== 'dilithium3') {
      throw new Error(`Unsupported algorithm: ${algoToUse}`);
    }

    const wasm = await loadWasmModule();
    const resultJson = (wasm as any).keygen();
    const result = JSON.parse(resultJson);
    
    // Convert base64 to Uint8Array
    const publicKey = this.base64ToUint8Array(result.pk);
    const secretKey = this.base64ToUint8Array(result.sk);
    
    return { publicKey, secretKey };
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

    const wasm = await loadWasmModule();
    const sk_b64 = this.uint8ArrayToBase64(secretKey);
    const sig_b64 = (wasm as any).sign(message, sk_b64);
    const signature = this.base64ToUint8Array(sig_b64);
    
    return { signature };
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

    const wasm = await loadWasmModule();
    const sig_b64 = this.uint8ArrayToBase64(signature);
    const pk_b64 = this.uint8ArrayToBase64(publicKey);
    const ok = (wasm as any).verify(message, sig_b64, pk_b64);
    
    return { ok };
  }

  async addressFromPublicKey(publicKey: Uint8Array): Promise<Address> {
    await this.init();
    
    // Try using WASM method if available
    const wasm = await loadWasmModule();
    if (typeof (wasm as any).pubkey_to_address === 'function') {
      const pk_b64 = this.uint8ArrayToBase64(publicKey);
      return (wasm as any).pubkey_to_address(pk_b64, this.hrp) as Address;
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
    // WebAssembly.Memory zeroization is not reliably supported
  }

  // Utility methods
  private base64ToUint8Array(base64: string): Uint8Array {
    if (typeof Buffer !== 'undefined') {
      return new Uint8Array(Buffer.from(base64, 'base64'));
    } else {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    }
  }

  private uint8ArrayToBase64(bytes: Uint8Array): string {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(bytes).toString('base64');
    } else {
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    }
  }
}
