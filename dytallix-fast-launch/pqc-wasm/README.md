# @dytallix/pqc-wasm

Post-Quantum Cryptography WASM bindings for the Dytallix blockchain network. This package provides WebAssembly-compiled implementations of ML-DSA (FIPS 204, formerly CRYSTALS-Dilithium) for quantum-resistant digital signatures.

## Features

- 🔐 **Quantum-Resistant**: ML-DSA-65 (FIPS 204) implementation
- 🚀 **High Performance**: WebAssembly for near-native speed
- 🌐 **Universal**: Works in Node.js, browsers, and edge runtimes
- 📦 **Zero Dependencies**: Self-contained cryptographic implementation
- 🔒 **Secure**: Zeroization of sensitive key material

## Installation

```bash
npm install @dytallix/pqc-wasm
```

## Usage

### Node.js / Modern Bundlers

```typescript
import init, * as pqc from '@dytallix/pqc-wasm';

// Initialize the WASM module (required once)
await init();

// Generate a new keypair
const { publicKey, privateKey } = pqc.generate_keypair();

// Sign a message
const message = new TextEncoder().encode("Hello, Quantum World!");
const signature = pqc.sign(privateKey, message);

// Verify signature
const isValid = pqc.verify(publicKey, message, signature);
console.log('Signature valid:', isValid);
```

### Browser with CDN

```html
<!DOCTYPE html>
<html>
<head>
  <script type="module">
    import init, * as pqc from 'https://unpkg.com/@dytallix/pqc-wasm/pqc_wasm.js';
    
    async function demo() {
      await init();
      const { publicKey, privateKey } = pqc.generate_keypair();
      console.log('Generated PQC keypair:', publicKey);
    }
    
    demo();
  </script>
</head>
<body>
  <h1>Dytallix PQC Demo</h1>
</body>
</html>
```

### With Dytallix SDK

This package is designed to work seamlessly with `@dytallix/sdk`:

```typescript
import { Wallet } from '@dytallix/sdk';

// The SDK automatically uses @dytallix/pqc-wasm for cryptography
const wallet = await Wallet.createRandom();
const address = wallet.getAddress();
```

## API Reference

### `generate_keypair(): { publicKey: Uint8Array, privateKey: Uint8Array }`

Generates a new ML-DSA-65 keypair.

**Returns:**
- `publicKey` - 1,952 bytes (ML-DSA-65 public key)
- `privateKey` - 4,032 bytes (ML-DSA-65 private key)

### `sign(privateKey: Uint8Array, message: Uint8Array): Uint8Array`

Signs a message using ML-DSA-65.

**Parameters:**
- `privateKey` - The 4,032-byte private key
- `message` - The message to sign

**Returns:**
- Signature bytes (3,293 bytes for ML-DSA-65)

### `verify(publicKey: Uint8Array, message: Uint8Array, signature: Uint8Array): boolean`

Verifies an ML-DSA-65 signature.

**Parameters:**
- `publicKey` - The 1,952-byte public key
- `message` - The original message
- `signature` - The signature to verify

**Returns:**
- `true` if signature is valid, `false` otherwise

### `public_key_to_address(publicKey: Uint8Array): string`

Converts a public key to a Dytallix bech32 address.

**Parameters:**
- `publicKey` - The ML-DSA-65 public key

**Returns:**
- Bech32-encoded address with `dyt` prefix

### `derive_public_key(privateKey: Uint8Array): Uint8Array`

Derives the public key from a private key.

**Parameters:**
- `privateKey` - The 4,032-byte private key

**Returns:**
- The corresponding 1,952-byte public key

## Technical Details

### Algorithm

This package implements **ML-DSA-65** (Module-Lattice-Based Digital Signature Algorithm, security level 3) as specified in [FIPS 204](https://csrc.nist.gov/pubs/fips/204/final).

- **Public Key Size**: 1,952 bytes
- **Private Key Size**: 4,032 bytes
- **Signature Size**: 3,293 bytes
- **Security Level**: NIST Level 3 (equivalent to AES-192)

### Performance

Typical performance on modern hardware:
- **Key Generation**: ~1ms
- **Signing**: ~2ms
- **Verification**: ~1ms

### Browser Compatibility

- Chrome/Edge 91+
- Firefox 89+
- Safari 15+
- Node.js 18+

Requires WebAssembly and ES modules support.

## Development

This package is built from Rust using `wasm-pack`:

```bash
# Build from source (requires Rust toolchain)
cd dytallix-fast-launch/pqc-wasm
wasm-pack build --target web --out-dir pkg
```

## Security Considerations

1. **Key Storage**: Private keys should be encrypted at rest
2. **Key Zeroization**: Keys are automatically zeroized when dropped
3. **Side-Channel Resistance**: Uses constant-time operations where possible
4. **Random Number Generation**: Uses cryptographically secure RNG

## License

Apache-2.0 OR MIT

## Resources

- [Dytallix Website](https://dytallix.network)
- [GitHub Repository](https://github.com/HisMadRealm/dytallix)
- [FIPS 204 Standard](https://csrc.nist.gov/pubs/fips/204/final)
- [Post-Quantum Cryptography FAQ](https://csrc.nist.gov/projects/post-quantum-cryptography/faqs)

## Support

For issues and questions:
- [GitHub Issues](https://github.com/HisMadRealm/dytallix/issues)
- [Discord Community](https://discord.gg/dytallix)

---

**Note**: This is quantum-resistant cryptography designed to protect against future quantum computers. Current ECDSA-based systems will become vulnerable when large-scale quantum computers are available.
