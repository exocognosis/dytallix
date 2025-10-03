const isNode = typeof process !== 'undefined' && process.versions?.node;

let wasm: any;

async function loadWasm() {
  if (wasm) return wasm;
  if (isNode) {
    // Node: load local pkg glue and initialize with local wasm bytes
    // to avoid fetch() on file:// URLs.
    // @ts-ignore
    const mod = await import('../../../crates/pqc-wasm/pkg/pqc_wasm.js');
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
      const wasmPath = pathMod.resolve(__dirname, '../../../crates/pqc-wasm/pkg/pqc_wasm_bg.wasm');
      if (typeof (mod as any).initSync === 'function') {
        const bytes = readFileSync(wasmPath);
        (mod as any).initSync(bytes);
      } else if (typeof (mod as any).default === 'function') {
        await (mod as any).default();
      }
    } catch (_) {
      // Fallback to default init which may work in some Node versions
      if (typeof (mod as any).default === 'function') {
        await (mod as any).default();
      }
    }
    wasm = mod;
    return wasm;
  }
  // Browser/web
  try {
    // @ts-ignore
    const mod = await import('../../../crates/pqc-wasm/pkg-web/pqc_wasm.js');
    if (typeof (mod as any).default === 'function') {
      await (mod as any).default();
    }
    wasm = mod;
    return wasm;
  } catch (e2) {
    // Last resort: try generic pkg
    // @ts-ignore
    const mod = await import('../../../crates/pqc-wasm/pkg/pqc_wasm.js');
    if (typeof (mod as any).default === 'function') {
      await (mod as any).default();
    }
    wasm = mod;
    return wasm;
  }
}

function assertAlgo() {
  const algo = (process?.env?.PQC_ALGORITHM || 'dilithium3').toLowerCase();
  if (algo !== 'dilithium3') {
    throw new Error(`Unsupported PQC_ALGORITHM=${algo}. Only dilithium3 is supported`);
  }
}

export async function dilithiumAvailable(): Promise<boolean> {
  try {
    const w = await loadWasm();
    const f = (w as any).dilithium_available;
    return typeof f === 'function' ? !!f() : false;
  } catch {
    return false;
  }
}

export async function keygen() {
  assertAlgo();
  const w = await loadWasm();
  return (w as any).keygen();
}

export async function sign(message: Uint8Array | string, sk_b64: string): Promise<string> {
  assertAlgo();
  const w = await loadWasm();
  const msg = typeof message === 'string' ? new TextEncoder().encode(message) : message;
  return (w as any).sign(msg, sk_b64);
}

export async function verify(message: Uint8Array | string, sig_b64: string, pk_b64: string): Promise<boolean> {
  assertAlgo();
  const w = await loadWasm();
  const msg = typeof message === 'string' ? new TextEncoder().encode(message) : message;
  return (w as any).verify(msg, sig_b64, pk_b64);
}

export async function pubkeyToAddress(pk_b64: string, hrp = (process?.env?.VITE_BECH32_HRP || 'dyt')): Promise<string> {
  assertAlgo();
  const w = await loadWasm();
  return (w as any).pubkey_to_address(pk_b64, hrp);
}

export function canonicalStringify(obj: unknown): string {
  const seen = new WeakSet();
  const stringify = (value: any): string => {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (seen.has(value)) throw new Error('Circular reference');
    seen.add(value);
    if (Array.isArray(value)) return '[' + value.map((v) => stringify(v)).join(',') + ']';
    const keys = Object.keys(value).sort();
    const parts = keys.map((k) => JSON.stringify(k) + ':' + stringify((value as any)[k]));
    return '{' + parts.join(',') + '}';
  };
  return stringify(obj);
}

export function canonicalBytes(doc: unknown): Uint8Array {
  // Return canonical UTF-8 bytes of deterministic JSON across Node and Browser
  const s = canonicalStringify(doc);
  return new TextEncoder().encode(s);
}

const D3_SIG_LEN = 3309;
export async function verifySm(signedMessageB64: string, pk_b64: string): Promise<boolean> {
  assertAlgo();
  const w = await loadWasm();
  if (typeof (w as any).verify_sm === 'function') {
    return (w as any).verify_sm(signedMessageB64, pk_b64);
  }
  // Fallback: decode sm, split [sig||msg], verify detached
  try {
    const sm = typeof Buffer !== 'undefined'
      ? Buffer.from(signedMessageB64, 'base64')
      : Uint8Array.from(atob(signedMessageB64), c => c.charCodeAt(0));
    const sig = sm.slice(0, D3_SIG_LEN);
    const msg = sm.slice(D3_SIG_LEN);
    const sigB64 = (typeof Buffer !== 'undefined')
      ? Buffer.from(sig).toString('base64')
      : btoa(String.fromCharCode(...(sig as unknown as number[])));
    return verify(msg, sigB64, pk_b64);
  } catch {
    return false;
  }
}
