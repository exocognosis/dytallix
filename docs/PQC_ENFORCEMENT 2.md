# PQC-Only Transaction Signature Enforcement

## Overview

Dytallix enforces Post-Quantum Cryptography (PQC)-only transaction signatures across the complete transaction lifecycle to ensure quantum-resistant security. This implementation provides configurable algorithm whitelisting, legacy algorithm rejection, and enforcement at both mempool and consensus levels.

## Architecture

### Transaction Lifecycle with PQC Enforcement

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Wallet/CLI    │    │     Mempool      │    │   Consensus     │
│                 │    │                  │    │                 │
│ 1. Algorithm    │    │ 3. Policy        │    │ 5. Validator    │
│    Selection    │───▶│    Validation    │───▶│    Policy Check │
│                 │    │                  │    │                 │
│ 2. PQC Signing  │    │ 4. Admission     │    │ 6. Block        │
│                 │    │    Control       │    │    Inclusion    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Configuration

### Environment Variables

Configure signature policy enforcement using these environment variables:

```bash
# Enable/disable legacy algorithm rejection (default: true)
SIGNATURE_POLICY_REJECT_LEGACY=true

# Enable mempool-level enforcement (default: true)
SIGNATURE_POLICY_ENFORCE_MEMPOOL=true

# Enable consensus-level enforcement (default: true)
SIGNATURE_POLICY_ENFORCE_CONSENSUS=true

# Comma-separated list of allowed algorithms (default: all PQC)
SIGNATURE_POLICY_ALLOWED_ALGORITHMS=dilithium5,falcon1024,sphincssha256128s
```

### Supported Algorithms

#### Allowed PQC Algorithms
- **Dilithium5** (default) - CRYSTALS-Dilithium lattice-based signatures
- **Falcon1024** - Falcon lattice-based compact signatures
- **SPHINCS+** (SphincsSha256128s) - Hash-based signatures

#### Rejected Legacy Algorithms
- ECDSA (secp256k1, P-256, P-384, P-521)
- RSA (all variants)
- Ed25519
- Any non-PQC algorithm

## Usage

### Account Creation with Algorithm Selection

```bash
# Create account with default PQC algorithm (Dilithium5)
dcli keys new --name alice --algo pqc

# Create account with specific algorithm
dcli keys new --name bob --algo dilithium5
dcli keys new --name charlie --algo falcon1024
dcli keys new --name dave --algo sphincssha256128s

# List accounts with algorithm information
dcli keys list
```

### Transaction Signing

```bash
# Sign transaction (algorithm determined by account)
dcli tx transfer --from alice --to bob --amount 1000 --denom DGT --fee 250

# Output includes algorithm information:
# hash=0x... status=success algorithm=dilithium5
```

### Policy Validation

The system enforces policies at two levels:

#### 1. Mempool Level
- Validates signature algorithm before admission
- Rejects transactions with non-whitelisted algorithms
- Returns `PolicyViolation` error for rejected transactions

#### 2. Consensus Level
- Validates algorithm during block proposal
- Ensures only compliant transactions are included in blocks
- Prevents consensus on blocks with policy violations

## API Integration

### Transaction Responses

Transaction queries and submissions include algorithm information:

```json
{
  "hash": "0x...",
  "status": "success",
  "algorithm": "dilithium5",
  "gas_limit": 50000,
  "gas_price": 1000
}
```

### Account Queries

Account information includes the selected signature algorithm:

```json
{
  "name": "alice",
  "address": "dyt1...",
  "algorithm": "dilithium5",
  "created": 1640995200
}
```

## Security Benefits

### Quantum Resistance
- All transactions use NIST-standardized PQC algorithms
- Protection against future quantum computer attacks
- No reliance on discrete logarithm or factoring assumptions

### Algorithm Agility
- Configurable algorithm selection per account
- Easy migration to new algorithms as they become available
- Policy-driven enforcement allows gradual transitions

### Legacy Protection
- Explicit rejection of quantum-vulnerable algorithms
- Prevents accidental use of weak cryptography
- Configurable enforcement levels for migration scenarios

## Performance Impact

### Signature Verification
PQC algorithms have different performance characteristics:

- **Dilithium5**: Balanced performance, ~1.5KB signatures
- **Falcon1024**: Fastest verification, ~690B signatures
- **SPHINCS+**: Smallest public keys, larger signatures (~7KB)

### Network Overhead
- Larger signature sizes compared to ECDSA
- Offset by improved security guarantees
- Configurable algorithm choice allows optimization

## Error Handling

### Policy Violation Errors

```rust
// Mempool rejection
RejectionReason::PolicyViolation("Algorithm Dilithium5 is not in the allowed list")

// Consensus validation error
"Signature policy violation: Legacy algorithm ecdsa is explicitly rejected"
```

### Common Issues

1. **Algorithm Not Allowed**: Check `SIGNATURE_POLICY_ALLOWED_ALGORITHMS`
2. **Legacy Algorithm Used**: Verify account was created with PQC algorithm
3. **Policy Disabled**: Ensure enforcement flags are enabled

## Migration Guide

### From Legacy to PQC

1. **Phase 1**: Enable PQC support alongside legacy
   ```bash
   SIGNATURE_POLICY_REJECT_LEGACY=false
   SIGNATURE_POLICY_ENFORCE_MEMPOOL=false
   ```

2. **Phase 2**: Enforce at mempool level
   ```bash
   SIGNATURE_POLICY_ENFORCE_MEMPOOL=true
   ```

3. **Phase 3**: Full PQC-only enforcement
   ```bash
   SIGNATURE_POLICY_REJECT_LEGACY=true
   SIGNATURE_POLICY_ENFORCE_CONSENSUS=true
   ```

### Algorithm Upgrades

When new PQC algorithms become available:

1. Add to `SIGNATURE_POLICY_ALLOWED_ALGORITHMS`
2. Update CLI algorithm choices
3. Allow gradual migration from old to new algorithms

## Development

### Testing Policy Enforcement

```bash
# Run policy enforcement tests
cargo test pqc_policy_enforcement

# Test mempool integration
cargo test mempool_policy_validation

# Test consensus integration
cargo test consensus_policy_validation
```

### Adding New Algorithms

1. Update `SignatureAlgorithm` enum in `dytallix_pqc`
2. Add to `SignaturePolicy::validate_algorithm_name()`
3. Update CLI `AlgorithmChoice` enum
4. Add comprehensive tests

## Monitoring

### Metrics

Monitor policy enforcement effectiveness:

- Transaction rejection rates by algorithm
- Mempool policy violation counts
- Consensus validation failures
- Algorithm usage distribution

### Logging

Policy violations are logged at WARN level:

```
WARN: Signature policy violation: Algorithm not allowed
WARN: Legacy algorithm rejected: ecdsa
INFO: Policy enforcement enabled: mempool=true consensus=true
```

## Security Considerations

### Algorithm Selection
- Choose algorithms based on security requirements and performance needs
- Consider signature size impact on transaction throughput
- Plan for future algorithm migration capabilities

### Policy Configuration
- Enable both mempool and consensus enforcement in production
- Use restrictive algorithm whitelists
- Monitor for attempted legacy algorithm usage

### Key Management
- Store algorithm choice in account metadata
- Ensure proper key derivation for each algorithm
- Implement secure key rotation procedures

## References

- [NIST Post-Quantum Cryptography Standards](https://www.nist.gov/news-events/news/2022/07/nist-announces-first-four-quantum-resistant-cryptographic-algorithms)
- [CRYSTALS-Dilithium Specification](https://pq-crystals.org/dilithium/)
- [Falcon Signature Scheme](https://falcon-sign.info/)
- [SPHINCS+ Specification](https://sphincs.org/)