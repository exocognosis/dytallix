# Post-Quantum Cryptography (PQC) in Dytallix

## Overview

Dytallix implements end-to-end Post-Quantum Cryptography (PQC) signature enforcement to ensure transaction security in the quantum computing era. This implementation provides quantum-resistant digital signatures for all blockchain transactions using NIST-standardized algorithms.

## Supported Algorithms

The following NIST-approved PQC algorithms are supported:

### Dilithium5 (Default)
- **Type**: Lattice-based signature scheme
- **Security Level**: NIST Level 5 (highest)
- **Key Sizes**: Public key ~2.5KB, Secret key ~4.9KB, Signature ~4.6KB
- **Performance**: Fast verification, moderate signing time
- **Use Case**: Recommended for most applications due to balanced performance

### Falcon1024
- **Type**: Lattice-based signature scheme  
- **Security Level**: NIST Level 5
- **Key Sizes**: Public key ~1.8KB, Secret key ~2.3KB, Signature ~1.3KB
- **Performance**: Compact signatures, fast operations
- **Use Case**: Optimal for bandwidth-constrained environments

### SPHINCS+ SHA-256
- **Type**: Hash-based signature scheme
- **Security Level**: NIST Level 1 (128s variant)
- **Key Sizes**: Public key ~32B, Secret key ~64B, Signature ~17KB
- **Performance**: Small keys, large signatures, slower operations
- **Use Case**: Conservative choice with minimal security assumptions

## Key Generation

### CLI Usage

Generate a new PQC keypair using the developer tools CLI:

```bash
# Generate Dilithium keypair (recommended)
dytallix-cli keys pqc-gen --algo dilithium

# Generate Falcon keypair
dytallix-cli keys pqc-gen --algo falcon

# Generate SPHINCS+ keypair
dytallix-cli keys pqc-gen --algo sphincs

# Specify custom keystore location and label
dytallix-cli keys pqc-gen --algo dilithium --keystore /path/to/keystore --label "my-validator-key"
```

### Output Format

The CLI generates a JSON keystore file with the following structure:

```json
{
  "address": "dyt1a1b2c3d4e5f6789012345678901234567890ab",
  "algorithm": "Dilithium5",
  "public_key_b64": "base64-encoded-public-key",
  "secret_key_b64": "base64-encoded-secret-key",
  "created": "2024-01-15T10:30:00.000Z",
  "label": "optional-key-label"
}
```

### Address Derivation

Dytallix addresses are derived from public keys using:
1. Hash the public key with SHA3-256
2. Take the first 20 bytes of the hash
3. Encode as hexadecimal
4. Prefix with `dyt1`

Example: `dyt1a1b2c3d4e5f6789012345678901234567890ab`

### Security Considerations

⚠️ **WARNING**: Secret keys are currently stored unencrypted in the keystore files.

**Production TODO**: Implement encryption at rest using:
- Password-based key derivation (PBKDF2/Argon2)
- Hardware Security Module (HSM) integration
- Secure key escrow for validator keys

## Signing Workflow

### Transaction Structure

Transactions are signed over canonical JSON representation of core fields:

```json
{
  "from": "dyt1sender...",
  "to": "dyt1receiver...", 
  "amount": 1000000,
  "fee": 1000,
  "nonce": 42,
  "chain_id": "dytallix-mainnet",
  "memo": "transfer memo"
}
```

### Signing Process

1. **Canonical Serialization**: Convert transaction to stable JSON format
2. **Hashing**: Apply SHA3-256 to the serialized bytes
3. **Signing**: Use PQC algorithm to sign the hash
4. **Encoding**: Base64-encode signature and public key for transport

### Example (Pseudocode)

```rust
// 1. Create canonical transaction
let canonical_tx = CanonicalTransaction {
    from: tx.from,
    to: tx.to,
    amount: tx.amount,
    fee: tx.fee,
    nonce: tx.nonce,
    chain_id: tx.chain_id,
    memo: tx.memo,
};

// 2. Serialize and hash
let tx_bytes = canonical_json(&canonical_tx)?;
let tx_hash = sha3_256(&tx_bytes);

// 3. Sign with PQC algorithm
let signature = ActivePQC::sign(&secret_key, &tx_hash);

// 4. Attach to transaction
tx.signature = Some(base64::encode(&signature));
tx.public_key = Some(base64::encode(&public_key));
```

## Verification Path

### Mempool Validation

All incoming transactions undergo PQC signature verification in the mempool:

1. **Envelope Check**: Verify presence of signature and public key
2. **Canonical Reconstruction**: Rebuild signable transaction data
3. **Hash Verification**: Apply SHA3-256 to canonical bytes
4. **Signature Verification**: Use ActivePQC algorithm to verify signature
5. **Rejection**: Invalid signatures return `TX_INVALID_SIG` error code

### Implementation Details

```rust
fn verify_envelope(tx: &Transaction) -> bool {
    match (&tx.signature, &tx.public_key) {
        (Some(signature), Some(public_key)) => {
            // Decode base64 components
            let sig_bytes = base64::decode(signature)?;
            let pk_bytes = base64::decode(public_key)?;
            
            // Create canonical transaction
            let canonical_tx = tx.canonical_fields();
            let tx_bytes = canonical_json(&canonical_tx)?;
            let tx_hash = sha3_256(&tx_bytes);
            
            // Verify with active PQC algorithm
            ActivePQC::verify(&pk_bytes, &tx_hash, &sig_bytes)
        }
        _ => false, // Missing signature or public key
    }
}
```

### Error Codes

| Error Code | Description | HTTP Status |
|------------|-------------|-------------|
| `TX_INVALID_SIG` | Signature verification failed | 422 |
| `INVALID_NONCE` | Transaction nonce mismatch | 409 |
| `INSUFFICIENT_FUNDS` | Account balance too low | 422 |

### Consensus Re-verification

The consensus layer performs defense-in-depth by re-verifying signatures before applying state transitions, ensuring no invalid transactions can be included in blocks.

## Benchmark Usage

### Running Benchmarks

Use the dedicated benchmark binary to measure PQC verification performance:

```bash
# Default: 10,000 Dilithium transactions
cargo run --bin bench_pqc_tx

# Custom transaction count
TX_COUNT=50000 cargo run --bin bench_pqc_tx

# Different algorithm
PQC_ALGO=falcon cargo run --bin bench_pqc_tx

# Both parameters
TX_COUNT=100000 PQC_ALGO=sphincs cargo run --bin bench_pqc_tx
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TX_COUNT` | 10000 | Number of transactions to benchmark |
| `PQC_ALGO` | dilithium | Algorithm: dilithium, falcon, or sphincs |

### Output

Benchmark results are saved to `artifacts/bench_pqc.json`:

```json
{
  "algorithm": "Dilithium5",
  "total_txs": 10000,
  "total_time_ms": 2847,
  "avg_verify_us": 284.7,
  "tx_per_second": 3512.1,
  "cpu_user_time_ms": 2840,
  "cpu_system_time_ms": 7,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Smoke Testing

For CI/CD pipelines, run a quick smoke test:

```bash
TX_COUNT=100 cargo run --bin bench_pqc_tx
```

## Performance Targets

### Baseline Requirements

- **Throughput**: ≥10,000 transactions per second verification
- **Latency**: ≤1ms average verification time per transaction
- **Resource Usage**: <100MB memory for 10k transaction batch

### Algorithm Comparison

| Algorithm | Verify Time (μs) | TPS | Key Size | Sig Size |
|-----------|------------------|-----|----------|----------|
| Dilithium5 | ~285 | ~3500 | 2.5KB | 4.6KB |
| Falcon1024 | ~180 | ~5500 | 1.8KB | 1.3KB |
| SPHINCS+ | ~850 | ~1200 | 32B | 17KB |

*Note: Performance varies by hardware. Run benchmarks on target infrastructure.*

## Tests

### Unit Tests

Run PQC-specific tests:

```bash
# Mempool verification tests
cargo test -p dytallix-lean-node pqc_tests

# CLI key generation tests  
cargo test -p dytallix-cli keys

# Integration tests
cargo test -p dytallix-sdk pqc_transaction
```

### Test Scenarios

- ✅ Valid signature verification
- ✅ Invalid signature rejection
- ✅ Tampered transaction detection
- ✅ Missing signature handling
- ✅ Key generation and address derivation
- ✅ Cross-algorithm compatibility

### Manual Testing

1. **Generate Keys**:
   ```bash
   dytallix-cli keys pqc-gen --algo dilithium --label test-key
   ```

2. **Verify Keystore**:
   ```bash
   ls ~/.dyt/keystore/
   cat ~/.dyt/keystore/dyt1*.json | jq
   ```

3. **Run Benchmark**:
   ```bash
   TX_COUNT=1000 cargo run --bin bench_pqc_tx
   ```

4. **Check Artifacts**:
   ```bash
   cat artifacts/bench_pqc.json | jq
   ```

## Future Improvements

### Short Term
- **Encryption at Rest**: Implement password-protected keystore encryption
- **Batch Verification**: Optimize verification for multiple transactions
- **Hardware Acceleration**: Support for PQC-optimized hardware

### Medium Term  
- **Algorithm Agility**: Runtime algorithm selection and migration support
- **Threshold Signatures**: Multi-party signing for enhanced security
- **Key Rotation**: Automated key lifecycle management

### Long Term
- **Quantum-Safe PKI**: Complete certificate authority infrastructure
- **Cross-Chain PQC**: Interoperable quantum-safe bridges
- **Zero-Knowledge PQC**: Privacy-preserving quantum-resistant proofs

## Security Audit Status

🔒 **Security Review Required**: This implementation requires comprehensive security audit before production deployment.

**Audit Areas**:
- Algorithm implementation correctness
- Side-channel attack resistance  
- Memory safety and key zeroization
- Cryptographic parameter validation
- Timing attack mitigation

## Troubleshooting

### Common Issues

**Error: "Invalid signature encoding"**
- Verify signature is valid base64
- Check for truncated or corrupted data

**Error: "Unsupported algorithm"**  
- Ensure algorithm matches ActivePQC configuration
- Verify PQC features are enabled in build

**Performance Issues**
- Use Falcon1024 for faster verification
- Enable hardware acceleration if available
- Consider batch verification optimizations

### Debug Mode

Enable verbose logging:

```bash
RUST_LOG=debug dytallix-cli keys pqc-gen --algo dilithium
```

### Support

For issues or questions:
- Check GitHub Issues: https://github.com/HisMadRealm/dytallix/issues
- Review implementation: `dytallix-lean-launch/node/src/mempool/mod.rs`
- Benchmark source: `benchmarks/bench_pqc_tx.rs`

---

*Last updated: January 2024*
*Dytallix PQC Implementation v0.1.0*