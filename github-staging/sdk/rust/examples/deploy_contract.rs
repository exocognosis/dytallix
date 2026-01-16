//! Dytallix SDK - Smart Contract Deployment Example
//!
//! Demonstrates deploying and interacting with WASM smart contracts.
//!
//! Prerequisites:
//! - A compiled WASM contract (e.g., counter.wasm)
//! - Testnet tokens from the faucet
//!
//! Usage:
//!   cargo run --example deploy_contract [path-to-wasm]

use dytallix_sdk::{Client, Wallet};
use std::env;
use std::fs;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    println!("═══════════════════════════════════════");
    println!("  Dytallix SDK - Contract Deployment");
    println!("═══════════════════════════════════════\n");

    // Connect to testnet
    println!("🌐 Connecting to testnet...");
    let client = Client::testnet();
    
    match client.get_status().await {
        Ok(status) => println!("✅ Connected: Block height {}\n", status.block_height),
        Err(e) => println!("⚠️  Connection warning: {}\n", e),
    }

    // Generate wallet
    println!("🔐 Generating PQC wallet...");
    let wallet = Wallet::generate()?;
    println!("✅ Wallet: {}\n", wallet.address());

    // Get testnet tokens
    println!("🚰 Requesting faucet tokens...");
    match client.request_faucet(wallet.address(), &["DGT", "DRT"]).await {
        Ok(result) if result.success => {
            let dgt = result.dispensed.iter()
                .find(|d| d.symbol == "DGT")
                .map(|d| d.amount.as_str())
                .unwrap_or("0");
            let drt = result.dispensed.iter()
                .find(|d| d.symbol == "DRT")
                .map(|d| d.amount.as_str())
                .unwrap_or("0");
            println!("✅ Received: {} DGT, {} DRT\n", dgt, drt);
        }
        Ok(result) => println!("⚠️  Faucet: {:?}\n", result.error),
        Err(e) => println!("⚠️  Faucet error: {}\n", e),
    }

    // Check for contract file argument
    let args: Vec<String> = env::args().collect();
    let contract_path = args.get(1);

    match contract_path {
        None => {
            println!("═══════════════════════════════════════");
            println!("  No contract file specified");
            println!("═══════════════════════════════════════");
            println!("\nUsage: cargo run --example deploy_contract <path-to-wasm>\n");
            println!("Example contracts can be found in smart-contracts/examples/");
            println!("\nTo build a contract:");
            println!("  cd smart-contracts/examples/counter");
            println!("  cargo build --target wasm32-unknown-unknown --release");
            println!("  cargo run --example deploy_contract \\");
            println!("    target/wasm32-unknown-unknown/release/counter.wasm");
            
            println!("\n--- Demo Mode (no actual deployment) ---\n");
            println!("If contracts were enabled, you would use:");
            println!(r#"
let result = client.deploy_contract(
    &wasm_hex,
    "{}",
    Some(2_000_000)
).await?;

println!("Contract deployed at: {{}}", result.address);
"#, wallet.address());
        }
        Some(path) => {
            // Read WASM file
            let wasm_bytes = fs::read(path)?;
            let wasm_hex = hex::encode(&wasm_bytes);
            
            println!("📄 Contract file: {}", path);
            println!("   Size: {} bytes\n", wasm_bytes.len());

            // Deploy contract
            println!("🚀 Deploying contract...");
            match client.deploy_contract(&wasm_hex, wallet.address(), Some(2_000_000)).await {
                Ok(result) => {
                    println!("✅ Contract deployed!");
                    println!("   Address: {}", result.address);
                    println!("   Tx Hash: {}\n", result.tx_hash);

                    // Try calling a method
                    println!("📞 Calling contract method \"get_count\"...");
                    match client.call_contract(
                        &result.address,
                        "get_count",
                        None,
                        Some(500_000)
                    ).await {
                        Ok(call_result) => {
                            println!("✅ Contract called!");
                            println!("   Result: {}", call_result.result);
                            println!("   Gas used: {}", call_result.gas_used);
                            if !call_result.logs.is_empty() {
                                println!("   Logs: {}", call_result.logs.join(", "));
                            }
                        }
                        Err(e) => {
                            println!("⚠️  Method call failed: {}", e);
                        }
                    }
                }
                Err(e) => {
                    println!("❌ Deployment failed: {}", e);
                    println!("\nNote: Smart contracts may not be enabled on testnet yet.");
                    println!("Check https://dytallix.com for contract availability.\n");
                }
            }
        }
    }

    println!("\n═══════════════════════════════════════");
    println!("  Complete");
    println!("═══════════════════════════════════════");

    Ok(())
}
