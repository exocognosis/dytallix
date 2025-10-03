# @dyt/pqc - Post-Quantum Cryptography SDK

A portable, provider-based abstraction for Post-Quantum Cryptography operations with support for multiple backends.

## Features

- **Provider Abstraction**: Clean interface for PQC operations (keygen, sign, verify, address derivation)
- **Multiple Backends**: 
  - WASM (default): WebAssembly backend using Rust WASM (wasm-pack)
  - Native (optional): Node-API native addon for performance
- **Cross-Platform**: Works in Node.js, browsers, and edge runtimes
- **Type-Safe**: Full TypeScript support with comprehensive type definitions
- **Algorithm Support**: CRYSTALS-Dilithium3 (NIST PQC standard)

## Installation

```bash
npm install @dyt/pqc
```

## Quick Start

```typescript
import { createProvider } from '@dyt/pqc';

// Create a provider (auto-selects best backend)
const provider = await createProvider();

// Generate a keypair
const keypair = await provider.keygen();

// Sign a message
const message = new TextEncoder().encode('Hello, Dytallix!');
const { signature } = await provider.sign(message, keypair.secretKey);

// Verify signature
const { ok } = await provider.verify(message, signature, keypair.publicKey);
console.log('Signature valid:', ok);

// Derive address
const address = await provider.addressFromPublicKey(keypair.publicKey);
console.log('Address:', address);
```

## Backend Selection

### Automatic Selection (Default)

```typescript
const provider = await createProvider();
```

The provider automatically selects the best backend:
- **Native**: Used if running in Node.js and `@dyt/pqc-native` is installed
- **WASM**: Used as fallback (default)

### Explicit Backend Selection

```typescript
// Force WASM backend
const wasmProvider = await createProvider({ backend: 'wasm' });

// Request Native backend (falls back to WASM if unavailable)
const nativeProvider = await createProvider({ backend: 'native' });
```

### Environment Variable

Set `DYT_PQC_BACKEND` or `PQC_BACKEND` environment variable:

```bash
export DYT_PQC_BACKEND=wasm  # Force WASM
export DYT_PQC_BACKEND=native  # Prefer native
```

## API Reference

### Provider Interface

```typescript
interface Provider {
  readonly name: string;        // Provider identifier
  readonly version: string;     // Provider version
  
  init(): Promise<void>;        // Initialize provider
  keygen(algo?: Algo): Promise<Keypair>;
  sign(message: Uint8Array, secretKey: Uint8Array, algo?: Algo): Promise<SignResult>;
  verify(message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array, algo?: Algo): Promise<VerifyResult>;
  addressFromPublicKey(publicKey: Uint8Array): Promise<Address>;
  zeroize?(buf: Uint8Array): void;  // Best-effort memory cleanup
}
```

### Types

```typescript
type Algo = 'dilithium3';
type Address = `dyt1${string}`;

interface Keypair {
  publicKey: Uint8Array;   // Dilithium3: 1952 bytes
  secretKey: Uint8Array;   // Dilithium3: 4000 bytes
}

interface SignResult {
  signature: Uint8Array;   // Dilithium3: 3309 bytes
}

interface VerifyResult {
  ok: boolean;
}
```

### Address Derivation

Addresses are derived deterministically from public keys using:
1. SHA-256 hash of public key
2. Take first 20 bytes
3. Bech32 encoding with HRP (default: 'dyt')

```typescript
const provider = await createProvider({ hrp: 'dytallix' });
const address = await provider.addressFromPublicKey(publicKey);
// Returns: dytallix1...
```

## Security Considerations

### Memory Zeroization

The `zeroize()` method provides best-effort memory cleanup for sensitive data:

```typescript
const keypair = await provider.keygen();
// ... use keypair ...

// Clean up sensitive data
if (provider.zeroize) {
  provider.zeroize(keypair.secretKey);
}
```

**Note**: Memory zeroization in JavaScript/WASM is not guaranteed due to garbage collection and JIT optimization.

### Key Storage

- **Never** store secret keys in plain text
- Use secure key management systems (Vault, HSM, etc.)
- Consider encrypting keys at rest
- Implement proper access controls

## Building from Source

### Prerequisites

- Node.js 18+
- Rust 1.75+ (for WASM build)
- wasm-pack (for WASM build)

### Build WASM Module

```bash
cd crates/pqc-wasm
bash build.sh
```

This builds:
- `pkg/` - Node.js target
- `pkg-web/` - Web/browser target

### Build TypeScript

```bash
npm run build
```

### Run Tests

```bash
npm test              # Node.js test runner
npm run test:vitest   # Vitest (requires WASM built)
```

## Testing

### Unit Tests

Tests are located in `__tests__/`:
- `wasm.spec.ts` - Provider implementation tests
- `kats.spec.ts` - Known Answer Tests (KAT) from NIST vectors

### Known Answer Tests (KAT)

KAT vectors are stored in `test/vectors/dilithium3.kat.min.json` and verified against the implementation.

## CI/CD

The package includes GitHub Actions workflow for:
- Building WASM artifacts
- Running test suites
- Size budget checks
- Publishing to npm

See `.github/workflows/pqc_wasm.yml` (to be created).

## Browser Compatibility

The WASM backend works in:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Node.js 18+

## Performance

Typical operation times (WASM backend on modern hardware):

- **Keygen**: ~5-10ms
- **Sign**: ~3-5ms
- **Verify**: ~2-3ms

Native backend offers ~2-3x performance improvement.

## License

Apache-2.0 OR MIT

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## Support

- GitHub Issues: https://github.com/dytallix/dytallix/issues
- Documentation: https://docs.dytallix.io

## Related Packages

- `@dyt/pqc-native` - Optional native addon for Node.js
- `crates/pqc-wasm` - Rust WASM implementation

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history.
