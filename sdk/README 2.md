# Dytallix SDKs

Official SDKs for the Dytallix blockchain with post-quantum cryptography (PQC) support.

## Available SDKs

| SDK | Language | PQC Algorithm | Status |
|-----|----------|---------------|--------|
| [@dytallix/sdk](./typescript/) | TypeScript/JavaScript | ML-DSA-65 (FIPS 204) | ✅ Production Ready |
| [dytallix-sdk](./rust/) | Rust | Dilithium3 | ✅ Production Ready |

## Features

Both SDKs provide:

- 🔐 **PQC Wallet Generation** - Quantum-resistant key pairs
- ✍️ **Transaction & Message Signing** - Secure PQC signatures
- 🌐 **RPC Client** - Full blockchain interaction
- 🚰 **Faucet Integration** - Testnet token requests
- 💎 **Staking Rewards** - Query pending rewards
- 📦 **Block Explorer** - Query blocks and transactions

## Quick Start

### TypeScript

```bash
npm install @dytallix/sdk pqc-wasm
```

```typescript
import { DytallixClient, PQCWallet, initPQC, TESTNET_RPC, TESTNET_CHAIN_ID } from '@dytallix/sdk';

await initPQC();
const client = new DytallixClient({ rpcUrl: TESTNET_RPC, chainId: TESTNET_CHAIN_ID });
const wallet = await PQCWallet.generate();

console.log('Address:', wallet.address);
```

### Rust

```toml
[dependencies]
dytallix-sdk = { git = "https://github.com/DytallixHQ/Dytallix", branch = "main" }
```

```rust
use dytallix_sdk::{Wallet, Client};

let wallet = Wallet::generate()?;
let client = Client::testnet();

println!("Address: {}", wallet.address());
```

## Network

| Network | RPC | Chain ID |
|---------|-----|----------|
| Testnet | https://dytallix.com/rpc | dytallix-testnet-1 |

## Token Denominations

| Token | Symbol | Description |
|-------|--------|-------------|
| DGT | Dytallix Governance Token | Staking & governance |
| DRT | Dytallix Reward Token | Transaction fees & rewards |

## License

Apache-2.0
