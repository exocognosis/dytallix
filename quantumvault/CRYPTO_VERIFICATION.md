# QuantumVault Cryptographic Algorithm Verification Guide

## Overview

QuantumVault uses **NIST-standardized Post-Quantum Cryptography (PQC)** algorithms. All cryptographic implementations are statically compiled into the binary - **no external downloads or files are required at runtime**.

This guide explains how to verify the algorithms being used and optionally audit the source code.

## Algorithms Included

### Key Encapsulation Mechanisms (KEM)
- **Kyber512, Kyber768, Kyber1024** (NIST FIPS 203)
  - Lattice-based KEM
  - Used for: Hybrid key agreement, data key wrapping
  - Crate: `pqcrypto-kyber` v0.7+
  - NIST Specification: https://csrc.nist.gov/pubs/fips/203/final

### Digital Signatures
- **Dilithium2, Dilithium3, Dilithium5** (NIST FIPS 204)
  - Lattice-based signatures
  - Used for: Document signing, authentication
  - Crate: `pqcrypto-dilithium` v0.5+
  - NIST Specification: https://csrc.nist.gov/pubs/fips/204/final

- **Falcon512, Falcon1024** (NIST FIPS 206)
  - Compact lattice-based signatures
  - Used for: Space-constrained applications
  - Crate: `pqcrypto-falcon` v0.3+
  - NIST Specification: https://csrc.nist.gov/pubs/fips/206/final

- **SPHINCS+-SHA2-128s-simple** (NIST FIPS 205)
  - Stateless hash-based signatures
  - Used for: Maximum security applications
  - Crate: `pqcrypto-sphincsplus` v0.7+
  - NIST Specification: https://csrc.nist.gov/pubs/fips/205/final

### Classical Cryptography (Hybrid Mode)
- **X25519** (RFC 7748)
  - Elliptic curve Diffie-Hellman
  - Crate: `x25519-dalek` v2.0+
  
- **Ed25519** (RFC 8032)
  - EdDSA signatures
  - Crate: `ed25519-dalek` v2.0+

### Symmetric Encryption
- **AES-256-GCM** (NIST FIPS 197 + SP 800-38D)
  - Authenticated encryption
  - Crate: `aes-gcm` v0.10+

- **ChaCha20-Poly1305** (RFC 8439)
  - Stream cipher with authentication
  - Crate: `chacha20poly1305` v0.10+

## Verification Steps

### 1. Verify Algorithm Versions in Build

Check the exact versions being used:

```bash
cd /Users/rickglenn/Downloads/dytallix-main/quantumvault
grep "pqcrypto" Cargo.toml
grep "aes-gcm\|chacha20\|x25519\|ed25519" Cargo.toml
```

Expected output shows version constraints matching this guide.

### 2. Inspect Cargo.lock for Exact Versions

```bash
cd /Users/rickglenn/Downloads/dytallix-main/quantumvault
grep -A 5 "name = \"pqcrypto-" Cargo.lock | head -30
```

This shows the exact versions being compiled into the binary.

### 3. Verify Source Code Integrity

The `pqcrypto` crates are wrappers around the official NIST reference implementations:

```bash
# View the upstream repository
open https://github.com/rustpq/pqcrypto

# Each crate links to the official NIST submission:
open https://csrc.nist.gov/projects/post-quantum-cryptography/selected-algorithms-2022
```

### 4. Audit Cryptographic Operations

Review how QuantumVault uses these algorithms:

```bash
# View the crypto engine implementation
cat src/infrastructure/crypto.rs

# View key generation
grep -A 20 "generate_hybrid_keypair" src/infrastructure/crypto.rs

# View data key wrapping
grep -A 20 "wrap_data_key" src/infrastructure/crypto.rs
```

### 5. Run Test Vectors

Verify the algorithms work correctly:

```bash
cd /Users/rickglenn/Downloads/dytallix-main/quantumvault
cargo test crypto -- --nocapture

# Run with detailed output
RUST_LOG=debug cargo test test_generate_hybrid_keypair -- --nocapture
```

### 6. Verify Binary Contents (Advanced)

After building, inspect the binary:

```bash
# Build release binary
cargo build --release

# Check size (includes all crypto)
ls -lh target/release/quantumvault-server

# Verify symbols include PQC functions (Linux/macOS)
nm target/release/quantumvault-server | grep -i "pqcrystals\|kyber\|dilithium"

# Or use strings to find algorithm names
strings target/release/quantumvault-server | grep -i "kyber\|dilithium\|falcon"
```

## Security Audit Checklist

### ✅ Algorithm Selection
- [ ] All algorithms are NIST-approved (FIPS 203-206)
- [ ] Hybrid mode combines classical + PQC for defense-in-depth
- [ ] No deprecated or experimental algorithms

### ✅ Implementation Source
- [ ] Uses `pqcrypto` crates from rust-pqc project
- [ ] Crates wrap official NIST reference implementations
- [ ] No custom crypto implementations (avoid "roll your own")

### ✅ Key Management
- [ ] Master key stored securely (environment variable)
- [ ] Data keys wrapped with hybrid KEM
- [ ] Secret keys zeroized on drop (via `zeroize` crate)

### ✅ Random Number Generation
- [ ] Uses OS random number generator (`OsRng` from `rand` crate)
- [ ] No predictable or weak RNG sources

### ✅ Side-Channel Resistance
- [ ] PQC implementations use constant-time operations where possible
- [ ] Sensitive operations don't leak timing information
- [ ] Memory zeroized after use

## Compliance and Certifications

### NIST Standards Compliance

- **FIPS 203**: ML-KEM (Kyber) - Final Standard (August 2024)
- **FIPS 204**: ML-DSA (Dilithium) - Final Standard (August 2024)
- **FIPS 205**: SLH-DSA (SPHINCS+) - Final Standard (August 2024)
- **FIPS 206**: FN-DSA (Falcon) - Draft Standard

### Migration Guidance

Per NIST guidance (NIST IR 8413):
1. **Inventory** cryptographic assets (QuantumVault's primary function)
2. **Prioritize** by quantum risk (automated risk scoring)
3. **Hybrid** transition recommended (QuantumVault default)
4. **Test** thoroughly before production (included test suite)

## Frequently Asked Questions

### Q: Are the algorithms downloaded from the internet at runtime?

**A: No.** All algorithms are compiled into the binary at build time. The final executable is self-contained and requires no external cryptographic libraries or downloads.

### Q: How do I verify NIST compliance?

**A: Three ways:**
1. Check the `pqcrypto` crate versions (they track NIST rounds)
2. Review NIST's official project page (linked above)
3. Run the test suite to verify algorithm behavior

### Q: Can I use different algorithms?

**A: Yes.** You can create custom protection policies via the API:

```bash
curl -X POST http://localhost:8080/api/policies \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Custom High Security",
    "description": "Maximum strength PQC",
    "kem": "kyber1024",
    "signature_scheme": "dilithium5",
    "symmetric_algo": "aes256gcm",
    "mode": "hybrid",
    "rotation_interval_days": 90
  }'
```

### Q: What about quantum-safe TLS?

**A: Roadmap item.** Current version protects data at rest. Future versions will include:
- Hybrid TLS certificate generation
- Integration with post-quantum TLS libraries
- Automated cert rotation

### Q: How do I stay updated on PQC standards?

**A: Follow NIST:**
- NIST PQC Project: https://csrc.nist.gov/projects/post-quantum-cryptography
- Subscribe to NIST updates: https://csrc.nist.gov/projects/post-quantum-cryptography/email-list
- Update QuantumVault dependencies when new versions release

## Dependency Verification Script

We provide a script to verify all cryptographic dependencies:

```bash
#!/bin/bash
# verify_crypto_deps.sh

echo "=== QuantumVault Cryptographic Dependencies Verification ==="
echo ""

cd "$(dirname "$0")"

echo "1. Checking Cargo.toml dependencies..."
grep -E "pqcrypto|aes-gcm|chacha20|x25519|ed25519" Cargo.toml

echo ""
echo "2. Checking resolved versions in Cargo.lock..."
for pkg in pqcrypto-kyber pqcrypto-dilithium pqcrypto-falcon pqcrypto-sphincsplus aes-gcm x25519-dalek ed25519-dalek; do
    version=$(grep -A 1 "name = \"$pkg\"" Cargo.lock | grep "version" | head -1)
    if [ -n "$version" ]; then
        echo "   $pkg: $version"
    fi
done

echo ""
echo "3. Running crypto tests..."
cargo test crypto::tests --quiet 2>&1 | tail -5

echo ""
echo "4. Verifying NIST algorithm availability..."
cargo build --quiet 2>&1
if [ $? -eq 0 ]; then
    echo "   ✅ All algorithms compiled successfully"
else
    echo "   ❌ Build failed - check dependencies"
    exit 1
fi

echo ""
echo "=== Verification Complete ==="
echo ""
echo "For official NIST specifications, visit:"
echo "   https://csrc.nist.gov/projects/post-quantum-cryptography"
```

Save this as `verify_crypto_deps.sh` and run it to audit dependencies.

## Updating Algorithms

When NIST releases updated specifications:

```bash
# 1. Check for updates
cargo update --dry-run | grep pqcrypto

# 2. Update specific packages
cargo update -p pqcrypto-kyber
cargo update -p pqcrypto-dilithium

# 3. Test thoroughly
cargo test

# 4. Rebuild Docker image
docker-compose build backend
```

## External Audit Support

For third-party security audits, provide:

1. **This verification guide**
2. **Full source code** (GitHub repo or source archive)
3. **Dependency tree**: `cargo tree > dependencies.txt`
4. **Build instructions**: See main README.md
5. **Test results**: `cargo test 2>&1 | tee test-results.txt`

## Contact for Security Issues

If you discover a security vulnerability:

1. **DO NOT** open a public GitHub issue
2. Email: security@dytallix.com
3. Encrypt with PGP key: [Include PGP key or link]
4. Include: affected version, attack scenario, proposed fix

## References

- NIST PQC Project: https://csrc.nist.gov/projects/post-quantum-cryptography
- NIST Migration Guidelines (IR 8413): https://nvlpubs.nist.gov/nistpubs/ir/2024/NIST.IR.8413.pdf
- Rust PQC Crates: https://github.com/rustpq/pqcrypto
- Kyber Spec (FIPS 203): https://csrc.nist.gov/pubs/fips/203/final
- Dilithium Spec (FIPS 204): https://csrc.nist.gov/pubs/fips/204/final
- SPHINCS+ Spec (FIPS 205): https://csrc.nist.gov/pubs/fips/205/final
- Falcon Spec (FIPS 206): https://csrc.nist.gov/pubs/fips/206/ipd

---

**Last Updated**: November 2025  
**QuantumVault Version**: 0.1.0 MVP
