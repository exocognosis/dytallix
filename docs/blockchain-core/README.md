# Blockchain Core

The core blockchain implementation for Dytallix, built in Rust with Substrate-compatible modules.

## Features

- Post-quantum signature validation
- Modular consensus mechanism (PoS/DPoS)
- Crypto-agility framework
- Oracle integration for AI services
- Transaction pool with PQC support

## Architecture

```
blockchain-core/
├── src/
│   ├── consensus/          # Consensus mechanisms
│   ├── crypto/            # PQC integration layer
│   ├── networking/        # P2P networking
│   ├── runtime/           # Blockchain runtime
│   ├── storage/           # State and block storage
│   └── main.rs           # Node entry point
├── pallets/               # Substrate pallets
│   ├── pqc-signatures/   # PQC signature validation
│   ├── ai-oracle/        # AI service oracle
│   └── governance/       # On-chain governance
└── tests/                # Integration tests
```

## Building

```bash
cargo build --release
```

## Running

```bash
# Development node
cargo run -- --dev

# Custom configuration
cargo run -- --config config.toml
```

## Testing

```bash
cargo test
```
