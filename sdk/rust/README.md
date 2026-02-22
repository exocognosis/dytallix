# Dytallix Rust SDK

Official Rust SDK for the Dytallix blockchain with post-quantum cryptography (PQC) support.

[![Crates.io](https://img.shields.io/crates/v/dytallix-sdk.svg)](https://crates.io/crates/dytallix-sdk)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

## Features

- 🔐 **PQC Wallet Generation** - Dilithium3 quantum-resistant keys
- ✍️ **Transaction & Message Signing** - Secure PQC signatures with verification
- 🌐 **RPC Client** - Full blockchain interaction (accounts, blocks, transactions)
- 🚰 **Faucet Integration** - Testnet token requests built-in
- 💎 **Staking Rewards** - Query pending staking rewards
- 📦 **Self-contained** - No external path dependencies

## Installation

Add to your `Cargo.toml`:

```toml
[dependencies]
dytallix-sdk = { git = "https://github.com/DytallixHQ/Dytallix", branch = "main" }
tokio = { version = "1", features = ["full"] }
anyhow = "1"
```

Or for local development:

```toml
[dependencies]
dytallix-sdk = { path = "../path/to/dytallix/sdk/rust" }
```

## Quick Start

```rust
use dytallix_sdk::{Wallet, Client};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Generate a PQC wallet
    let wallet = Wallet::generate()?;
    println!("Address: {}", wallet.address());

    // Connect to testnet
    let client = Client::testnet();
    let status = client.get_status().await?;
    println!("Block height: {}", status.block_height);

    // Request testnet tokens
    let faucet = client.request_faucet(wallet.address(), &["DGT", "DRT"]).await?;
    println!("Faucet: {:?}", faucet.dispensed);

    // Query account
    let account = client.get_account(wallet.address()).await?;
    println!("DGT Balance: {}", account.dgt_balance());
    println!("DRT Balance: {}", account.drt_balance());

    // Sign and verify a message
    let signature = wallet.sign(b"Hello Dytallix!")?;
    let valid = wallet.verify(b"Hello Dytallix!", &signature)?;
    println!("Signature valid: {}", valid);

    Ok(())
}
```

## API Reference

### Wallet

```rust
use dytallix_sdk::Wallet;

// Generate new wallet
let wallet = Wallet::generate()?;

// Load from file
let wallet = Wallet::load("wallet.json")?;

// Load or generate (creates new if file doesn't exist)
let wallet = Wallet::load_or_generate("wallet.json")?;

// Get address (dyt1...)
let address = wallet.address();

// Sign message
let signature = wallet.sign(b"message")?;

// Verify signature
let valid = wallet.verify(b"message", &signature)?;

// Save to file
wallet.save("wallet.json")?;
```

### Client

```rust
use dytallix_sdk::Client;

// Create testnet client
let client = Client::testnet();

// Create custom client
let client = Client::new("https://custom.rpc", "chain-id");

// Get chain ID
let chain_id = client.chain_id();
```

#### Chain Status

```rust
let status = client.get_status().await?;
println!("Height: {}", status.block_height);
println!("Chain: {}", status.chain_id);
```

#### Account Info

```rust
let account = client.get_account("dyt1...").await?;
println!("DGT: {}", account.dgt_balance());
println!("DRT: {}", account.drt_balance());
println!("Nonce: {}", account.nonce);
```

#### Blocks

```rust
// List recent blocks
let blocks = client.get_blocks(10, 0).await?;
for block in blocks {
    println!("Block {}: {}", block.height, block.hash);
}

// Get specific block
let block = client.get_block("12345").await?;
println!("Transactions: {}", block.transactions);
```

#### Staking Rewards

```rust
let rewards = client.get_staking_rewards("dyt1...").await?;
println!("Pending DGT: {}", rewards.dgt_rewards());
println!("Pending DRT: {}", rewards.drt_rewards());
```

#### Faucet (Testnet)

```rust
let result = client.request_faucet("dyt1...", &["DGT", "DRT"]).await?;
if result.success {
    for token in &result.dispensed {
        println!("{}: {}", token.symbol, token.amount);
    }
}
```

#### Transactions

```rust
// Get transaction by hash
let tx = client.get_transaction("tx_hash").await?;
println!("Status: {}", tx.status);

// Wait for transaction confirmation
let receipt = client.wait_for_transaction("tx_hash", 30).await?;
println!("Block: {}", receipt.block);
```

## Building

```bash
cd sdk/rust
cargo build
cargo test
```

## Running Examples

```bash
# Wallet generation demo
cargo run --example wallet

# Chain status query
cargo run --example query_status

# End-to-end test against live testnet
cargo run --example e2e_test

# Contract deployment (requires WASM file)
cargo run --example deploy_contract path/to/contract.wasm
```

---

## Running a Node

### Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/DytallixHQ/Dytallix.git
cd Dytallix

# Build and run with Docker
docker build -t dytallix-node .
docker run -p 3030:3030 -p 30303:30303 dytallix-node
```

### From Source

```bash
# Prerequisites: Rust 1.82+, clang, protobuf-compiler

# Clone and build with contracts feature
git clone https://github.com/DytallixHQ/Dytallix.git
cd Dytallix/dytallix-fast-launch/node
cargo build --release --features "contracts,metrics"

# Run
./target/release/dytallix-fast-node
```

### Connect to Testnet

```bash
# Set environment variables
export DYT_CHAIN_ID=dytallix-testnet-1
export DYT_RPC_PORT=3030
export DYT_SEED_NODE=178.156.187.81:30303

./target/release/dytallix-fast-node
```

---

## Smart Contracts

Dytallix supports WASM smart contracts with gas metering.

### Deploy a Contract

```rust
use dytallix_sdk::Client;
use std::fs;

let client = Client::testnet();
let wasm_bytes = fs::read("my_contract.wasm")?;
let wasm_hex = hex::encode(&wasm_bytes);

let result = client.deploy_contract(
    &wasm_hex,
    "dyt1deployer...",
    Some(2_000_000)
).await?;

println!("Contract deployed at: {}", result.address);
println!("Transaction hash: {}", result.tx_hash);
```

### Call a Contract

```rust
let result = client.call_contract(
    "dyt1contract...",
    "get_value",
    None,           // args (hex-encoded)
    Some(500_000)   // gas limit
).await?;

println!("Result: {}", result.result);
println!("Gas used: {}", result.gas_used);
```

### Query Contract State

```rust
let state = client.get_contract_state(
    "dyt1contract...",
    "counter"
).await?;

println!("State value: {}", state);
```

### Contract SDK Methods

| Method | Description |
|--------|-------------|
| `deploy_contract()` | Deploy WASM bytecode |
| `call_contract()` | Execute a contract method |
| `get_contract_state()` | Read contract storage |
| `get_genesis()` | Get chain configuration |

---

## Network Constants

```rust
use dytallix_sdk::{TESTNET_RPC, TESTNET_CHAIN_ID};

// TESTNET_RPC = "https://dytallix.com/rpc"
// TESTNET_CHAIN_ID = "dytallix-testnet-1"
```

## Token Denominations

| Token | Symbol | Micro-unit | Description |
|-------|--------|------------|-------------|
| DGT | Dytallix Governance Token | udgt | Staking & governance |
| DRT | Dytallix Reward Token | udrt | Transaction fees & rewards |

**Conversion:** 1 DGT = 1,000,000 udgt

## Types

### Core Types

| Type | Description |
|------|-------------|
| `Wallet` | PQC wallet with signing capabilities |
| `Client` | RPC client for blockchain interaction |
| `ChainStatus` | Current blockchain state |
| `AccountInfo` | Account balances and nonce |
| `Block` | Block information |
| `TransactionReceipt` | Transaction status and details |
| `StakingRewards` | Pending staking rewards |
| `FaucetResponse` | Faucet request result |

### Error Handling

```rust
use dytallix_sdk::{SdkError, Result};

match client.get_account("dyt1...").await {
    Ok(account) => println!("Balance: {}", account.dgt_balance()),
    Err(SdkError::Api(msg)) => eprintln!("API error: {}", msg),
    Err(SdkError::Timeout) => eprintln!("Request timed out"),
    Err(e) => eprintln!("Error: {}", e),
}
```

## License

Apache-2.0
