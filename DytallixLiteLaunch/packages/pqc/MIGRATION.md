# Migration Guide: Legacy API to Provider API

This guide helps migrate from the legacy `@dyt/pqc` API to the new provider-based API.

## Overview

The new provider API offers:
- Cleaner interface with typed results
- Pluggable backends (WASM, Native)
- Better error handling
- Memory zeroization support
- Raw Uint8Array instead of base64 strings

## Quick Migration

### Before (Legacy API)

```typescript
import { keygen, sign, verify, pubkeyToAddress } from '@dyt/pqc';

// Generate keypair (returns JSON string)
const keypairJson = await keygen();
const { pk, sk } = JSON.parse(keypairJson);

// Sign (base64 input/output)
const message = 'Hello';
const signature = await sign(message, sk);

// Verify (base64 input)
const ok = await verify(message, signature, pk);

// Address (base64 input)
const address = await pubkeyToAddress(pk);
```

### After (Provider API)

```typescript
import { createProvider } from '@dyt/pqc';

// Create provider
const provider = await createProvider();

// Generate keypair (returns Uint8Array)
const keypair = await provider.keygen();

// Sign (Uint8Array input/output)
const message = new TextEncoder().encode('Hello');
const { signature } = await provider.sign(message, keypair.secretKey);

// Verify (Uint8Array input)
const { ok } = await provider.verify(message, signature, keypair.publicKey);

// Address (Uint8Array input)
const address = await provider.addressFromPublicKey(keypair.publicKey);
```

## Detailed Changes

### 1. Keypair Generation

**Legacy:**
```typescript
const json = await keygen();
const { pk, sk } = JSON.parse(json);  // base64 strings
```

**Provider:**
```typescript
const keypair = await provider.keygen();
// keypair.publicKey: Uint8Array (1952 bytes)
// keypair.secretKey: Uint8Array (4000 bytes)
```

**Migration:**
```typescript
// To convert from base64 to Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
  const bytes = Buffer.from(base64, 'base64');
  return new Uint8Array(bytes);
}

// To convert from Uint8Array to base64
function uint8ArrayToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}
```

### 2. Signing

**Legacy:**
```typescript
const message = 'Hello';  // string or Uint8Array
const sig_b64 = await sign(message, sk_b64);  // returns base64 string
```

**Provider:**
```typescript
const message = new TextEncoder().encode('Hello');
const { signature } = await provider.sign(message, secretKey);
// signature: Uint8Array (3309 bytes)
```

**Migration:**
```typescript
// Wrap legacy API
async function legacySign(message: string, sk_b64: string) {
  const provider = await createProvider();
  const secretKey = base64ToUint8Array(sk_b64);
  const msg = new TextEncoder().encode(message);
  const { signature } = await provider.sign(msg, secretKey);
  return uint8ArrayToBase64(signature);
}
```

### 3. Verification

**Legacy:**
```typescript
const ok = await verify(message, sig_b64, pk_b64);  // returns boolean
```

**Provider:**
```typescript
const { ok } = await provider.verify(message, signature, publicKey);
// ok: boolean (in VerifyResult object)
```

**Migration:**
```typescript
// Wrap legacy API
async function legacyVerify(
  message: string,
  sig_b64: string,
  pk_b64: string
): Promise<boolean> {
  const provider = await createProvider();
  const msg = new TextEncoder().encode(message);
  const signature = base64ToUint8Array(sig_b64);
  const publicKey = base64ToUint8Array(pk_b64);
  const { ok } = await provider.verify(msg, signature, publicKey);
  return ok;
}
```

### 4. Address Derivation

**Legacy:**
```typescript
const address = await pubkeyToAddress(pk_b64, hrp);
```

**Provider:**
```typescript
const provider = await createProvider({ hrp });
const address = await provider.addressFromPublicKey(publicKey);
```

## Backward Compatibility

The legacy API is still available and will continue to work:

```typescript
// Legacy API still works
import {
  keygen,
  sign,
  verify,
  pubkeyToAddress,
  canonicalBytes,
  canonicalStringify
} from '@dyt/pqc';

// Use as before
const kp = await keygen();
// ...
```

However, we recommend migrating to the provider API for:
- Better type safety
- Cleaner interface
- Future features (memory zeroization, native backend, etc.)

## Gradual Migration Strategy

### Phase 1: Add Provider Alongside Legacy

```typescript
import { createProvider } from '@dyt/pqc';
import { keygen as legacyKeygen } from '@dyt/pqc';

// Use provider for new code
const provider = await createProvider();

// Keep legacy for existing code
const oldKp = await legacyKeygen();
```

### Phase 2: Replace Core Operations

Replace `keygen`, `sign`, `verify` calls with provider equivalents.

### Phase 3: Update Storage/Serialization

If you store keys as base64, update to store as Uint8Array or keep conversion layer.

### Phase 4: Remove Legacy API Usage

Once all code migrated, remove legacy API imports.

## Common Patterns

### Pattern: Signing Transactions

**Legacy:**
```typescript
const tx = { from, to, amount };
const msg = canonicalBytes(tx);
const sig = await sign(msg, sk_b64);
```

**Provider:**
```typescript
const tx = { from, to, amount };
const msg = canonicalBytes(tx);  // Still use canonicalBytes
const { signature } = await provider.sign(msg, secretKey);
```

### Pattern: Storing Keys

**Legacy (base64 in localStorage):**
```typescript
localStorage.setItem('pk', pk_b64);
localStorage.setItem('sk', sk_b64);
```

**Provider (with conversion):**
```typescript
// Store as base64 for compatibility
const pk_b64 = uint8ArrayToBase64(keypair.publicKey);
const sk_b64 = uint8ArrayToBase64(keypair.secretKey);
localStorage.setItem('pk', pk_b64);
localStorage.setItem('sk', sk_b64);

// Or store as hex
const pkHex = Array.from(keypair.publicKey)
  .map(b => b.toString(16).padStart(2, '0'))
  .join('');
localStorage.setItem('pk', pkHex);
```

### Pattern: API Requests

**Legacy:**
```typescript
const response = await fetch('/api/verify', {
  method: 'POST',
  body: JSON.stringify({
    message: msg_b64,
    signature: sig_b64,
    publicKey: pk_b64
  })
});
```

**Provider (convert before sending):**
```typescript
const response = await fetch('/api/verify', {
  method: 'POST',
  body: JSON.stringify({
    message: uint8ArrayToBase64(message),
    signature: uint8ArrayToBase64(signature),
    publicKey: uint8ArrayToBase64(publicKey)
  })
});
```

## Testing Migration

Create wrapper functions to maintain compatibility during migration:

```typescript
// utils/pqc-compat.ts
import { createProvider } from '@dyt/pqc';
import { keygen as legacyKeygen } from '@dyt/pqc';

let providerInstance: any = null;

async function getProvider() {
  if (!providerInstance) {
    providerInstance = await createProvider();
  }
  return providerInstance;
}

export async function keygen() {
  const provider = await getProvider();
  const keypair = await provider.keygen();
  return JSON.stringify({
    pk: uint8ArrayToBase64(keypair.publicKey),
    sk: uint8ArrayToBase64(keypair.secretKey)
  });
}

// Similar wrappers for sign, verify, etc.
```

Then gradually replace:
```typescript
// Before
import { keygen } from '@dyt/pqc';

// During migration
import { keygen } from './utils/pqc-compat';

// After migration
import { createProvider } from '@dyt/pqc';
const provider = await createProvider();
const keypair = await provider.keygen();
```

## Breaking Changes

### Removed Features

None - legacy API is maintained.

### Changed Behavior

1. **Return Types**: Provider methods return objects instead of primitives
   - `sign()` returns `{ signature: Uint8Array }` not `string`
   - `verify()` returns `{ ok: boolean }` not `boolean`

2. **Input Types**: Provider methods prefer Uint8Array over base64 strings
   - Must encode strings: `new TextEncoder().encode(str)`
   - Must decode base64: `Buffer.from(b64, 'base64')`

3. **Async Initialization**: Provider requires explicit initialization
   - `await createProvider()` handles this automatically
   - Manual: `await provider.init()`

## FAQ

**Q: Do I have to migrate immediately?**  
A: No, legacy API is preserved for backward compatibility.

**Q: What about performance?**  
A: Provider API has similar performance. Native backend (future) will be faster.

**Q: Can I use both APIs?**  
A: Yes, they can coexist. Migrate gradually.

**Q: How do I choose backend?**  
A: Use `createProvider({ backend: 'wasm' })` or set `DYT_PQC_BACKEND` env var.

**Q: What about browser support?**  
A: Both APIs work in browsers. Provider API may be easier to bundle.

## Help

If you encounter issues during migration:
1. Check the [README](../README.md) for API reference
2. Review [examples](../examples/) (if available)
3. Open an issue on GitHub

## Timeline

- **v0.1.0**: Provider API introduced, legacy maintained
- **v0.2.0**: Native backend available
- **v1.0.0**: API stable, legacy deprecated (but still available)
- **v2.0.0**: Legacy API may be removed (with ample notice)
