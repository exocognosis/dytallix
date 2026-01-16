# Dytallix Post-Quantum Cryptography Wallet

This document specifies the deterministic key derivation, address format, algorithm identifiers, and usage patterns for Dytallix PQC wallets.

## Overview

Dytallix wallets use post-quantum cryptography (Dilithium5) by default to ensure long-term security against quantum computer attacks. The wallet system provides deterministic key derivation using Argon2id and standardized address formatting using bech32 encoding.

## Key Derivation

### Deterministic Mode

For reproducible test vectors and development:
```
master_seed = Argon2id(passphrase, fixed_salt, params)
where:
- fixed_salt = sha256("dytallix|v1|root")[0..16]
- params = { memory: 64 MiB, time: 3, parallelism: 1 }
```

### Secure Mode (Recommended for Production)

For production use with enhanced security:
```
master_seed = Argon2id(passphrase, random_salt, params)
where:
- random_salt = 16 random bytes (stored with encrypted keystore)
- params = { memory: 64 MiB, time: 3, parallelism: 1 }
```

### Argon2id Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| Memory Cost | 64 MiB | RAM usage for key derivation |
| Time Cost | 3 | Number of iterations |
| Parallelism | 1 | Number of parallel threads |
| Algorithm | Argon2id | Hybrid of Argon2i and Argon2d |
| Output Size | 32 bytes | Master seed length |

## Address Format

Dytallix addresses use a standardized format based on bech32 encoding:

```
address = bech32("dytallix", ripemd160(sha256(pubkey_raw)))
```

### Address Derivation Steps

1. **Public Key Hashing**: `sha256_hash = SHA256(public_key_bytes)`
2. **Address Hash**: `addr_hash = RIPEMD160(sha256_hash)`
3. **Bech32 Encoding**: `address = bech32_encode("dytallix", addr_hash)`

### Address Properties

- **Prefix**: `dytallix` (identifies network)
- **Length**: Variable (bech32 encoded)
- **Checksum**: Built into bech32 encoding
- **Example**: `dytallix1qw508d6qejxtdg4y5r3zarvary0c5xw7k3lh9z3`

## Algorithm Identifiers

### Signature Algorithms

| Algorithm | Identifier | Type URL | Status |
|-----------|------------|----------|--------|
| Dilithium5 | `dilithium5` | `/dytallix.crypto.pqc.v1beta1.PubKey` | Default |
| Secp256k1 | `secp256k1` | `/cosmos.crypto.secp256k1.PubKey` | Legacy (deprecated) |

### Public Key Representation

PQC public keys are represented in Cosmos SDK protobuf format:

```protobuf
message PubKey {
  bytes key_bytes = 1;    // Raw public key bytes
  string algorithm = 2;   // Algorithm identifier ("dilithium5")
}
```

## CLI Usage

### Creating a New Wallet

Default (PQC):
```bash
dcli keys new mykey
```

Legacy mode (deprecated):
```bash
dcli keys new mykey --legacy-secp
```

With algorithm selection:
```bash
dcli keys new mykey --algo pqc
dcli keys new mykey --algo secp256k1  # Hidden, deprecated
```

### Listing Keys

```bash
dcli keys list
```

Output format:
```
NAME    ADDRESS                           ALGORITHM   CREATED
mykey   dytallix1qw508d6qejxtdg4y...      pqc         1643723400
legacy  dyt1e1c820e653bb12629306be...     secp256k1   1643723300
```

### Signing Transactions

PQC signing is used by default:
```bash
dcli tx transfer mykey dytallix1receiver... 1000udyt
```

## Transaction Signing

### Sign Document Format

Transactions are signed using Cosmos SDK sign doc format:
```json
{
  "account_number": "0",
  "chain_id": "dytallix-1",
  "fee": {...},
  "memo": "",
  "msgs": [...],
  "sequence": "0"
}
```

### Signature Format

PQC signatures are larger than traditional ECDSA signatures:

| Algorithm | Signature Size | Public Key Size |
|-----------|----------------|-----------------|
| Dilithium5 | ~4,595 bytes | ~2,592 bytes |
| Secp256k1 | ~64 bytes | ~33 bytes |

## Security Considerations

### Deterministic Mode Trade-offs

**Advantages:**
- Reproducible test vectors
- Simplified backup/recovery
- Consistent addresses for same passphrase

**Disadvantages:**
- Reduced security if passphrase is weak
- No protection against rainbow table attacks
- Not recommended for production use

### Recommended Practices

1. **Use Strong Passphrases**: Minimum 12 words or equivalent entropy
2. **Random Salt Mode**: Use for production wallets
3. **Hardware Security**: Store keys in hardware wallets when available
4. **Key Rotation**: Regularly rotate keys for high-value accounts

## Migration from Legacy

### Address Migration

Legacy addresses (Blake3-based) are supported during transition:
- Old format: `dyt1e1c820e653bb12629306be2af671e2aab83074cdf6193cf6`
- New format: `dytallix1qw508d6qejxtdg4y5r3zarvary0c5xw7k3lh9z3`

### Migration Steps

1. Create new PQC wallet: `dcli keys new mykey-pqc`
2. Transfer funds from legacy to PQC address
3. Update integrations to use new address format
4. Retire legacy keys after migration

### Compatibility

Legacy addresses and signatures remain valid during transition period. The `--legacy-secp` flag provides access to deprecated functionality.

## Integration Examples

### JavaScript/TypeScript

```typescript
import { PQCWallet } from '@dytallix/sdk';

// Create deterministic wallet (development)
const wallet = PQCWallet.newDeterministic("my passphrase");

// Create secure wallet (production)
const secureWallet = PQCWallet.newRandom("my passphrase");

// Get address
const address = wallet.address();

// Sign transaction
const signature = wallet.signTransaction(txBytes);
```

### Go Integration

```go
import "github.com/dytallix/sdk/go"

// Create wallet
wallet, err := pqc.NewDeterministicWallet("my passphrase")
if err != nil {
    return err
}

// Get address
address := wallet.Address()

// Sign transaction
signature, err := wallet.SignTransaction(txBytes)
```

## Test Vectors

### Deterministic Key Generation

Passphrase: `"test passphrase"`
Expected Results:
- Master Seed: `a1b2c3d4e5f6...` (deterministic)
- Address: `dytallix1qw508d6qejxtdg4y5r3zarvary0c5xw7k...`
- Public Key: `03a1b2c3d4e5f6...`

### Address Derivation

Public Key: `0x1234567890abcdef...`
Expected Results:
- SHA256: `e3b0c44298fc1c149afbf4c8996fb924...`
- RIPEMD160: `356a192b7913b04c54574d18c28d46e6395428ab`
- Address: `dytallix1x44pj2m6zwn5cjxx6xgcnxxm5vwujp24s...`

## Gas Considerations

PQC signatures are significantly larger than ECDSA signatures, affecting transaction costs:

- **Signature Size**: ~4.6KB vs ~64 bytes
- **Gas Impact**: ~10x increase in signature verification costs
- **Mitigation**: Dynamic gas pricing based on signature type

## Future Extensions

### Hybrid Algorithms

Future versions will support hybrid PQC + classical cryptography:
- Dilithium5 + ECDSA for transition security
- Kyber1024 for key exchange

### Algorithm Agility

The system supports algorithm upgrades through:
- Version negotiation in protocol
- Backward compatibility for old signatures
- Gradual migration paths

## Troubleshooting

### Common Issues

1. **Address Format Errors**: Ensure using correct prefix (`dytallix` vs `dyt1`)
2. **Signature Verification Failures**: Check algorithm compatibility
3. **Gas Estimation**: Account for larger PQC signature sizes

### Debug Commands

```bash
# Validate address format
dcli validate-address dytallix1qw508d6qejxtdg4y...

# Test signature verification
dcli verify-signature --address dytallix1... --signature base64... --message hex...

# Check algorithm support
dcli query pqc algorithms
```

## References

- [NIST Post-Quantum Cryptography](https://csrc.nist.gov/projects/post-quantum-cryptography)
- [Dilithium Specification](https://pq-crystals.org/dilithium/)
- [Argon2 RFC](https://tools.ietf.org/html/rfc9106)
- [Bech32 Address Format](https://github.com/bitcoin/bips/blob/master/bip-0173.mediawiki)