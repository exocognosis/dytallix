# Post-Quantum Cryptography Module

Implementation of post-quantum cryptographic primitives for Dytallix.

## Features

- CRYSTALS-Dilithium signature scheme
- Kyber key exchange mechanism
- Crypto-agility framework for algorithm swapping
- Integration with liboqs and PQClean

## Supported Algorithms

### Digital Signatures
- **CRYSTALS-Dilithium** (Primary)
- **Falcon** (Planned)
- **SPHINCS+** (Backup)

### Key Exchange
- **Kyber** (Lattice-based)

## Usage

```rust
use dytallix_pqc::{PQCManager, SignatureAlgorithm};

let pqc = PQCManager::new()?;
let signature = pqc.sign_message(b"Hello, quantum world!")?;
let is_valid = pqc.verify_signature(message, &signature, &public_key)?;
```

## Building

```bash
cargo build --release
```

## Testing

```bash
cargo test
```
