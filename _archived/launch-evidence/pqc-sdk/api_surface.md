# PQC SDK API Surface

## Public API

### Main Entry Point (`@dyt/pqc`)

```typescript
// Factory function
export async function createProvider(options?: CreateProviderOptions): Promise<Provider>

// Types
export type Algo = 'dilithium3'
export type Address = `dyt1${string}`

export interface CreateProviderOptions {
  backend?: 'auto' | 'wasm' | 'native'
  hrp?: string
  algo?: Algo
}

export interface Provider {
  readonly name: string
  readonly version: string
  init(): Promise<void>
  keygen(algo?: Algo): Promise<Keypair>
  sign(message: Uint8Array, secretKey: Uint8Array, algo?: Algo): Promise<SignResult>
  verify(message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array, algo?: Algo): Promise<VerifyResult>
  addressFromPublicKey(publicKey: Uint8Array): Promise<Address>
  zeroize?(buf: Uint8Array | WebAssembly.Memory): void
}

export interface Keypair {
  publicKey: Uint8Array
  secretKey: Uint8Array
}

export interface SignResult {
  signature: Uint8Array
}

export interface VerifyResult {
  ok: boolean
}

// Provider implementations
export { ProviderWasm } from './providers/wasm/index.js'
export { ProviderNative } from './providers/native/index.js'

// Utilities
export { deriveAddress, isValidAddress } from './address.js'
export { isNodeEnvironment, isBrowserEnvironment, selectBackend } from './detect.js'
```

### Subpath Exports

#### `@dyt/pqc/provider`

Core provider types and interfaces.

#### `@dyt/pqc/address`

Address derivation utilities.

```typescript
export async function deriveAddress(publicKey: Uint8Array, hrp?: string): Promise<Address>
export function isValidAddress(address: string, hrp?: string): boolean
```

#### `@dyt/pqc/detect`

Runtime environment detection.

```typescript
export function isNodeEnvironment(): boolean
export function isBrowserEnvironment(): boolean
export async function isNativeAvailable(): Promise<boolean>
export function getBackendPreference(): 'auto' | 'wasm' | 'native'
export async function selectBackend(preference?: 'auto' | 'wasm' | 'native'): Promise<'wasm' | 'native'>
```

## Provider Implementations

### ProviderWasm

WebAssembly backend using Rust (wasm-pack).

**Constructor:**
```typescript
new ProviderWasm(options?: { hrp?: string; algo?: Algo })
```

**Characteristics:**
- Cross-platform (Node.js, browsers, edge runtimes)
- No native dependencies
- Moderate performance
- ~200KB WASM bundle size

### ProviderNative

Native Node-API addon backend (optional).

**Constructor:**
```typescript
new ProviderNative(options?: { hrp?: string; algo?: Algo })
```

**Characteristics:**
- Node.js only
- Requires `@dyt/pqc-native` addon
- High performance (~2-3x faster than WASM)
- Platform-specific binaries

## Constants

### Dilithium3 Sizes

```typescript
const D3_PK_LEN = 1952   // Public key length (bytes)
const D3_SK_LEN = 4000   // Secret key length (bytes)
const D3_SIG_LEN = 3309  // Signature length (bytes)
```

## Backward Compatibility

Legacy API preserved for existing consumers:

```typescript
export async function keygen(): Promise<string>  // Returns JSON
export async function sign(message: Uint8Array | string, sk_b64: string): Promise<string>
export async function verify(message: Uint8Array | string, sig_b64: string, pk_b64: string): Promise<boolean>
export async function pubkeyToAddress(pk_b64: string, hrp?: string): Promise<string>
export async function verifySm(signedMessageB64: string, pk_b64: string): Promise<boolean>
export function canonicalStringify(obj: unknown): string
export function canonicalBytes(doc: unknown): Uint8Array
```

## Environment Variables

- `DYT_PQC_BACKEND` or `PQC_BACKEND`: Backend selection ('auto', 'wasm', 'native')
- `PQC_ALGORITHM`: Algorithm selection (currently only 'dilithium3')
- `VITE_BECH32_HRP`: Address prefix for Vite builds (default: 'dyt')

## Error Handling

All async methods may throw:
- `Error` - Generic errors (initialization, invalid input)
- Provider-specific errors are wrapped in standard `Error` objects

## Thread Safety

- All providers are single-threaded
- WASM provider is safe for concurrent use in separate contexts
- Native provider may have platform-specific threading considerations

## Memory Management

Best-effort zeroization available via `provider.zeroize()`:
- Zeros out Uint8Array buffers
- No guarantees due to GC and JIT optimization
- WebAssembly.Memory zeroization not reliably supported

## Version

Current: 0.1.0

API stability: Beta (may change before 1.0.0)
