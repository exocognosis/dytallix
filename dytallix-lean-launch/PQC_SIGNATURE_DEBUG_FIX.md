# PQC Signature Validation Fix

## Root Cause Found

The CLI successfully:
1. ✅ Uses correct chain_id (`dyt-local-1`)
2. ✅ Generates correct canonical JSON
3. ✅ Produces correct SHA3-256 hash: `74ce22d6ba6aa0ec0b8dc6eadde83ddb3c86be6981d82b14ce999cfbe7b3f784`
4. ✅ Public key length: 2592 bytes (correct for dilithium5)
5. ✅ Signature length: 4851 bytes (correct for dilithium5 SignedMessage format)

## The Issue

Dilithium5's `SignedMessage` format contains:
- Signature (3309 bytes) + Original Message (variable length)

When we sign:
```typescript
const signBytes = canonicalJson({...}) // The transaction data
const signature = signDilithium(secretKey, signBytes)  // Returns SignedMessage = sig + msg
```

The signature is 4851 bytes = 3309 (sig) + 1542 (canonical JSON message)

When we verify on the node:
```rust
let hash = sha3_256(&bytes);  // hash of canonical JSON
verify(&pk, &hash, &sig, algorithm)  // tries to verify hash with SignedMessage
```

**THE PROBLEM**: We're signing the canonical JSON bytes, but then hashing them and trying to verify the hash. But dilithium5's `open()` function expects to extract and verify the original message bytes, not a hash!

## The Fix

We have two options:

### Option 1: Sign the hash (recommended)
Change the CLI to sign the **hash** instead of the canonical bytes:

```typescript
const signBytes = canonicalJson({...})
const txHash = createHash('sha3-256').update(Buffer.from(signBytes)).digest()
const signature = signDilithium(secretKey, txHash)  // Sign the 32-byte hash
```

### Option 2: Verify the canonical bytes  
Change the node to verify against the canonical bytes instead of the hash:

```rust
let bytes = canonical_json(&self.tx)?;
// Don't hash it, verify the bytes directly
verify(&pk, &bytes, &sig, algorithm)
```

## Recommendation

**Use Option 1** - Sign the hash in the CLI. This is standard practice and reduces signature size since we're signing 32 bytes instead of ~1500 bytes.

## Implementation

CLI change in `dytallix-lean-launch/cli/dytx/src/lib/tx.ts`:

```typescript
export function signTx(tx: Tx, secretKey: Uint8Array, publicKey: Uint8Array) {
  if (publicKey.byteLength === 0) {
    throw new Error('Public key is required for signing output')
  }
  const signBytes = canonicalJson({
    chain_id: tx.chain_id,
    fee: tx.fee,
    memo: tx.memo,
    msgs: tx.msgs,
    nonce: tx.nonce
  })
  
  // CHANGE: Hash the canonical bytes before signing
  const txHashBytes = createHash('sha3-256').update(Buffer.from(signBytes)).digest()
  const signature = signDilithium(secretKey, txHashBytes)  // Sign the hash, not the bytes
  
  return {
    tx: {
      chain_id: tx.chain_id,
      nonce: tx.nonce,
      msgs: tx.msgs.map(msg => ({
        type: msg.type,
        from: msg.from,
        to: msg.to,
        denom: msg.denom,
        amount: msg.amount
      })),
      fee: tx.fee,
      memo: tx.memo
    },
    public_key: Buffer.from(publicKey).toString('base64'),
    signature: Buffer.from(signature).toString('base64'),
    algorithm: DILITHIUM_ALGO,
    version: 1
  }
}
```

This will produce a signature of ~3341 bytes (3309 sig + 32 hash) instead of ~4851 bytes.
