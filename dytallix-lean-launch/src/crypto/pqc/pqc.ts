// PQC facade selecting algorithm implementation with unified API.
// Loads verified WASM modules providing standardized C symbols.
// Real schemes provided via PQClean builds (see build_pqc_wasm.sh)
import type { PQCAlgo, PQCFacadeConfig, PQCKeypair, PQCSizes, SerializedKeypair } from './types'
import { fetchAndVerifyWasm } from './integrity'

// Internal in-memory registry
const modules: Partial<Record<PQCAlgo, SchemeAPI>> = {}

async function loadWasm(file: string): Promise<WebAssembly.Instance & { exports: any }> {
  const buf = await fetchAndVerifyWasm(file)
  const envStubs: Record<string, any> = {
    abort: () => {},
    emscripten_notify_memory_growth: () => {},
    emscripten_memcpy_big: (dest: number, src: number, num: number) => { /* no-op stub */ return dest },
    emscripten_asm_const_int: () => 0,
    emscripten_resize_heap: () => 0,
    fflush: () => 0,
  }
  const wasiStubs: Record<string, any> = {
    // Minimal WASI stubs; our code shouldn't call these in browser
    fd_write: () => 0,
    fd_close: () => 0,
    fd_seek: () => 0,
    fd_read: () => 0,
    fd_fdstat_get: () => 0,
    environ_sizes_get: () => 0,
    environ_get: () => 0,
    args_sizes_get: () => 0,
    args_get: () => 0,
    clock_time_get: () => 0,
    proc_exit: () => 0,
    random_get: () => 0,
  }
  try {
    const mod = await WebAssembly.instantiate(buf, { env: envStubs })
    return mod.instance as any
  } catch {
    const mod = await WebAssembly.instantiate(buf, { env: envStubs, wasi_snapshot_preview1: wasiStubs })
    return mod.instance as any
  }
}

interface SchemeAPI {
  keygen(): Promise<PQCKeypair>
  sign(sk: Uint8Array, msg: Uint8Array): Promise<Uint8Array>
  verify(pk: Uint8Array, msg: Uint8Array, sig: Uint8Array): Promise<boolean>
  sizes(): PQCSizes
}

function assertLen(name: string, actual: number, expected: number) {
  if (actual !== expected) throw new Error(`${name} length ${actual} != expected ${expected}`)
}

function getExport<T extends Function | number>(e: any, candidates: string[], kind: 'function' | 'number' = 'function'): any {
  for (const name of candidates) {
    const v = e[name as keyof typeof e]
    if (kind === 'function' && typeof v === 'function') return v
    if (kind === 'number' && typeof v === 'number') return v
  }
  return undefined
}

function wrapInstance(instance: any, algo: PQCAlgo): SchemeAPI {
  const e = instance.exports
  const mem: WebAssembly.Memory = (e.memory ?? e._memory)
  if (!mem) throw new Error('WASM memory export missing')
  const HEAPU8 = new Uint8Array(mem.buffer)
  const pkBytes = getExport(e, ['_pqc_pk_bytes', 'pqc_pk_bytes'])
  const skBytes = getExport(e, ['_pqc_sk_bytes', 'pqc_sk_bytes'])
  const sigBytes = getExport(e, ['_pqc_sig_bytes', 'pqc_sig_bytes'])
  const keypair = getExport(e, ['_pqc_keypair', 'pqc_keypair'])
  const signFn = getExport(e, ['_pqc_sign', 'pqc_sign'])
  const verifyFn = getExport(e, ['_pqc_verify', 'pqc_verify'])
  const mallocFn = getExport(e, ['_malloc', 'malloc'])
  const freeFn = getExport(e, ['_free', 'free'])
  if (!pkBytes || !skBytes || !sigBytes || !keypair || !signFn || !verifyFn || !mallocFn || !freeFn) {
    throw new Error(`Missing required exports for ${algo}`)
  }
  const pkLen = pkBytes()
  const skLen = skBytes()
  const sigLen = sigBytes()
  if (!pkLen || !skLen || !sigLen) throw new Error(`Invalid size metadata for ${algo}`)
  function malloc(size: number) { const p = (mallocFn as any)(size); if (!p) throw new Error('malloc failed'); return p as number }
  function free(ptr: number) { if (ptr) (freeFn as any)(ptr) }
  function zap(ptr: number, len: number) { try { HEAPU8.fill(0, ptr, ptr + len) } catch { /* ignore */ } }

  return {
    async keygen() {
      const pkPtr = malloc(pkLen)
      const skPtr = malloc(skLen)
      try {
        const rc = (keypair as any)(pkPtr, skPtr)
        if (rc !== 0) throw new Error(`keypair failed rc=${rc}`)
        const pk = HEAPU8.slice(pkPtr, pkPtr + pkLen)
        const sk = HEAPU8.slice(skPtr, skPtr + skLen)
        zap(pkPtr, pkLen); zap(skPtr, skLen)
        return { algo, pk, sk }
      } finally { free(pkPtr); free(skPtr) }
    },
    async sign(sk: Uint8Array, msg: Uint8Array) {
      assertLen('secret key', sk.length, skLen)
      const skPtr = malloc(skLen); HEAPU8.set(sk, skPtr)
      const msgPtr = malloc(msg.length); HEAPU8.set(msg, msgPtr)
      const sigPtr = malloc(sigLen)
      const sigLenPtr = malloc(8) // size_t (wasm32 => 4 bytes, allocate 8 for alignment)
      try {
        const rc = (signFn as any)(sigPtr, sigLenPtr, msgPtr, msg.length, skPtr)
        if (rc !== 0) throw new Error(`sign failed rc=${rc}`)
        const dv = new DataView(mem.buffer)
        const actualSigLen = dv.getUint32(sigLenPtr, true)
        const outSig = HEAPU8.slice(sigPtr, sigPtr + actualSigLen)
        zap(sigPtr, sigLen); zap(msgPtr, msg.length); zap(skPtr, skLen)
        return outSig
      } finally { free(skPtr); free(msgPtr); free(sigPtr); free(sigLenPtr) }
    },
    async verify(pk: Uint8Array, msg: Uint8Array, sig: Uint8Array) {
      assertLen('public key', pk.length, pkLen)
      const pkPtr = malloc(pkLen); HEAPU8.set(pk, pkPtr)
      const msgPtr = malloc(msg.length); HEAPU8.set(msg, msgPtr)
      const sigPtr = malloc(sig.length); HEAPU8.set(sig, sigPtr)
      try {
        const rc = (verifyFn as any)(sigPtr, sig.length, msgPtr, msg.length, pkPtr)
        zap(pkPtr, pkLen); zap(msgPtr, msg.length); zap(sigPtr, sig.length)
        return rc === 0
      } finally { free(pkPtr); free(msgPtr); free(sigPtr) }
    },
    sizes() { return { pk: pkLen, sk: skLen, sig: sigLen } }
  }
}

async function initModule(algo: PQCAlgo) {
  if (modules[algo]) return modules[algo]!
  const wasmName = `${algo}.wasm`
  const wasm = await loadWasm(wasmName)
  const wrapped = wrapInstance(wasm, algo)
  modules[algo] = wrapped
  return wrapped
}

async function getModule(algo: PQCAlgo) { return initModule(algo) }

export async function keygen(algo: PQCAlgo) { return (await getModule(algo)).keygen() }
export async function sign(algo: PQCAlgo, sk: Uint8Array, msg: Uint8Array) { return (await getModule(algo)).sign(sk, msg) }
export async function verify(algo: PQCAlgo, pk: Uint8Array, msg: Uint8Array, sig: Uint8Array) { return (await getModule(algo)).verify(pk, msg, sig) }
export async function sizes(algo: PQCAlgo): Promise<PQCSizes> { return (await getModule(algo)).sizes() }

// Serialization (base64) – secret material remains in memory only; caller decides secure storage strategy
export function serializeKeypair(kp: PQCKeypair): SerializedKeypair {
  return { v: 1, algo: kp.algo, pk: b64(kp.pk), sk: b64(kp.sk) }
}
export function deserializeKeypair(obj: SerializedKeypair): PQCKeypair {
  if (obj.v !== 1) throw new Error('Unsupported key version')
  return { algo: obj.algo, pk: ub64(obj.pk), sk: ub64(obj.sk) }
}
function b64(u8: Uint8Array) {
  const B: any = (typeof globalThis !== 'undefined' && (globalThis as any).Buffer) || null
  return B ? B.from(u8).toString('base64') : btoa(String.fromCharCode(...u8))
}
function ub64(s: string) {
  const B: any = (typeof globalThis !== 'undefined' && (globalThis as any).Buffer) || null
  if (B) return new Uint8Array(B.from(s, 'base64'))
  const bin = atob(s)
  return Uint8Array.from(bin, c => c.charCodeAt(0))
}

export async function init(config: PQCFacadeConfig) { await getModule(config.algo) }

// Compatibility exports for legacy/fallback callers expecting generateKeypair & pubkeyFromSecret
export async function generateKeypair(algo: PQCAlgo) { return keygen(algo) }
export function pubkeyFromSecret(): never { throw new Error('pubkeyFromSecret unsupported in real PQC facade; provide public key explicitly') }
