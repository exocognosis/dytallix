# Dytallix

<div align="center">

**Post-Quantum Secure Blockchain**

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![TypeScript SDK](https://img.shields.io/npm/v/@dytallix/sdk.svg?label=TypeScript%20SDK)](https://www.npmjs.com/package/@dytallix/sdk)
[![Rust SDK](https://img.shields.io/badge/Rust%20SDK-0.1.0-orange)](sdk/rust)

[Website](https://dytallix.com) • [Documentation](https://dytallix.com/resources) • [Discord](https://discord.gg/N8Q4A2KE) • [Twitter](https://x.com/dytallixhq)

</div>

---

## 🔐 Post-Quantum Security

Dytallix implements NIST FIPS 204 (ML-DSA) post-quantum digital signatures, protecting your transactions against both classical and future quantum computer attacks.

## 📦 What's Included

| Directory | Description |
|-----------|-------------|
| [`sdk/typescript/`](sdk/typescript) | TypeScript/JavaScript SDK for web & Node.js |
| [`sdk/rust/`](sdk/rust) | Rust SDK for high-performance applications |
| [`node/`](node) | Full blockchain node source code |
| [`cli/`](cli) | Command-line tools |
| [`contracts/`](contracts) | Example smart contracts |
| [`docs/`](docs) | Technical documentation |

---

## 🚀 Quick Start

### TypeScript SDK

```bash
npm install @dytallix/sdk pqc-wasm
```

```typescript
import { DytallixClient, PQCWallet, initPQC } from '@dytallix/sdk';

// Initialize PQC module
await initPQC();

// Generate quantum-resistant wallet
const wallet = await PQCWallet.generate();
console.log('Address:', wallet.address);

// Connect to testnet
const client = DytallixClient.testnet();
const status = await client.getStatus();
console.log('Block height:', status.block_height);

// Request testnet tokens
const faucet = await client.requestFaucet(wallet.address, ['DGT', 'DRT']);
console.log('Received:', faucet.dispensed);

// Check balance
const account = await client.getAccount(wallet.address);
console.log('DGT:', account.balances.DGT);
console.log('DRT:', account.balances.DRT);
```

### Rust SDK

```toml
# Cargo.toml
[dependencies]
dytallix-sdk = { git = "https://github.com/DytallixHQ/Dytallix", branch = "main" }
tokio = { version = "1", features = ["full"] }
```

```rust
use dytallix_sdk::{Wallet, Client};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Generate PQC wallet
    let wallet = Wallet::generate()?;
    println!("Address: {}", wallet.address());

    // Connect to testnet
    let client = Client::testnet();
    let status = client.get_status().await?;
    println!("Block height: {}", status.block_height);

    // Request tokens & query balance
    client.request_faucet(wallet.address(), &["DGT", "DRT"]).await?;
    let account = client.get_account(wallet.address()).await?;
    println!("DGT: {}", account.dgt_balance());
    
    Ok(())
}
```

---

## 🔧 Running a Node

### Docker (Recommended)

```bash
git clone https://github.com/DytallixHQ/Dytallix.git
cd Dytallix
docker build -t dytallix-node .
docker run -p 3030:3030 -p 30303:30303 dytallix-node
```

### From Source

```bash
# Prerequisites: Rust 1.82+, clang

cd node
cargo build --release
./target/release/dytallix-fast-node
```

### Connect to Testnet

```bash
export DYT_CHAIN_ID=dytallix-testnet-1
export DYT_SEED_NODE=178.156.187.81:30303
./target/release/dytallix-fast-node
```

---

## 📝 Smart Contracts

Deploy WASM smart contracts with gas metering:

### TypeScript
```typescript
const wasmHex = Buffer.from(fs.readFileSync('contract.wasm')).toString('hex');
const result = await client.deployContract(wasmHex, wallet.address);
console.log('Contract:', result.address);

// Call contract method
const response = await client.callContract(result.address, 'get_value');
console.log('Result:', response.result);
```

### Rust
```rust
let wasm_hex = hex::encode(&std::fs::read("contract.wasm")?);
let result = client.deploy_contract(&wasm_hex, &wallet.address(), None).await?;
println!("Contract: {}", result.address);
```

---

## 🌐 Testnet Resources

| Resource | URL |
|----------|-----|
| RPC Endpoint | `https://dytallix.com/api` |
| Block Explorer | [dytallix.com/build/blockchain](https://dytallix.com/build/blockchain) |
| Faucet | [dytallix.com/build/faucet](https://dytallix.com/build/faucet) |

---

## 💎 Token Denominations

| Token | Symbol | Description |
|-------|--------|-------------|
| DGT | Dytallix Governance Token | Staking & governance |
| DRT | Dytallix Reward Token | Transaction fees & rewards |

**Conversion:** 1 DGT = 1,000,000 udgt (micro-units)

---

## 📚 Documentation

- [SDK Reference](sdk/README.md)
- [Node RPC API](node/README_RPC.md)
- [PQC Implementation](node/PQC_IMPLEMENTATION.md)
- [Architecture](docs/architecture/)
- [Smart Contracts Guide](docs/developers/)

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](sdk/typescript/CONTRIBUTING.md) for guidelines.

---

## 📄 License

This project is licensed under the Apache 2.0 License - see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with ❤️ by the Dytallix Team**

[Website](https://dytallix.com) • [Documentation](https://dytallix.com/resources) • [Discord](https://discord.gg/N8Q4A2KE)

</div>
