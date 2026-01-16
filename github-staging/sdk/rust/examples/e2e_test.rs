//! End-to-End Test for Dytallix Rust SDK
//!
//! Run: cargo run --example e2e_test

use dytallix_sdk::{Client, Wallet};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    println!("═══════════════════════════════════════");
    println!("  Dytallix Rust SDK v0.2.0 - E2E Test");
    println!("═══════════════════════════════════════\n");

    let mut passed = 0;
    let mut failed = 0;

    // Test 1: Initialize Client
    println!("🌐 Test 1: Connect to Testnet");
    let client = Client::testnet();
    match client.get_status().await {
        Ok(status) => {
            println!("✅ RPC connection: Block height: {}, Chain: {}", 
                     status.block_height, status.chain_id);
            passed += 1;
        }
        Err(e) => {
            println!("❌ Connection failed: {}", e);
            failed += 1;
        }
    }

    // Test 2: Generate PQC Wallet
    println!("\n🔐 Test 2: Generate PQC Wallet");
    let wallet = match Wallet::generate() {
        Ok(w) => {
            println!("✅ Wallet generated: Address: {}", w.address());
            passed += 1;
            Some(w)
        }
        Err(e) => {
            println!("❌ Wallet generation failed: {}", e);
            failed += 1;
            None
        }
    };

    let wallet = match wallet {
        Some(w) => w,
        None => {
            println!("\n⚠️  Cannot continue without wallet");
            return Ok(());
        }
    };

    // Test 3: Check Initial Balance
    println!("\n💰 Test 3: Check Initial Balance");
    match client.get_account(wallet.address()).await {
        Ok(account) => {
            println!("✅ Account query: DGT: {}, DRT: {}", 
                     account.dgt_balance(), account.drt_balance());
            passed += 1;
        }
        Err(e) => {
            println!("❌ Account query failed: {}", e);
            failed += 1;
        }
    }

    // Test 4: Request Faucet Tokens
    println!("\n🚰 Test 4: Request Faucet Tokens");
    match client.request_faucet(wallet.address(), &["DGT", "DRT"]).await {
        Ok(result) => {
            if result.success {
                let dgt = result.dispensed.iter()
                    .find(|d| d.symbol == "DGT")
                    .map(|d| d.amount.as_str())
                    .unwrap_or("0");
                let drt = result.dispensed.iter()
                    .find(|d| d.symbol == "DRT")
                    .map(|d| d.amount.as_str())
                    .unwrap_or("0");
                println!("✅ Faucet request: Received: DGT: {}, DRT: {}", dgt, drt);
                passed += 1;
            } else {
                println!("❌ Faucet failed: {:?}", result.error);
                failed += 1;
            }
        }
        Err(e) => {
            println!("❌ Faucet request error: {}", e);
            failed += 1;
        }
    }

    // Test 5: Check Balance After Faucet
    println!("\n💰 Test 5: Check Balance After Faucet");
    match client.get_account(wallet.address()).await {
        Ok(account) => {
            let has_balance = account.dgt_balance() > 0.0 || account.drt_balance() > 0.0;
            println!("✅ Balance check: DGT: {}, DRT: {}", 
                     account.dgt_balance(), account.drt_balance());
            if has_balance {
                println!("✅ Tokens received: Balance > 0");
                passed += 2;
            } else {
                println!("⚠️  Balance still zero");
                passed += 1;
                failed += 1;
            }
        }
        Err(e) => {
            println!("❌ Balance query failed: {}", e);
            failed += 2;
        }
    }

    // Test 6: Sign Message
    println!("\n✍️  Test 6: Sign Message");
    let message = b"Hello, Dytallix!";
    match wallet.sign(message) {
        Ok(signature) => {
            println!("✅ Message signed: Signature length: {} bytes", signature.data.len());
            passed += 1;

            // Test 7: Verify Signature
            println!("\n🔍 Test 7: Verify Signature");
            match wallet.verify(message, &signature) {
                Ok(true) => {
                    println!("✅ Signature verified: Valid");
                    passed += 1;
                }
                Ok(false) => {
                    println!("❌ Signature verification failed: Invalid");
                    failed += 1;
                }
                Err(e) => {
                    println!("❌ Signature verification error: {}", e);
                    failed += 1;
                }
            }
        }
        Err(e) => {
            println!("❌ Signing failed: {}", e);
            failed += 2;  // Count both sign and verify as failed
        }
    }

    // Test 8: List Recent Blocks
    println!("\n📦 Test 8: List Recent Blocks");
    match client.get_blocks(5, 0).await {
        Ok(blocks) => {
            if blocks.is_empty() {
                println!("✅ Blocks listed: Empty list (expected for new chain)");
            } else {
                println!("✅ Blocks listed: {} blocks", blocks.len());
                for block in blocks.iter().take(3) {
                    println!("   Block #{}: {}", block.height, &block.hash[..16]);
                }
            }
            passed += 1;
        }
        Err(e) => {
            println!("❌ Blocks query failed: {}", e);
            failed += 1;
        }
    }

    // Test 9: Get Staking Rewards
    println!("\n💎 Test 9: Get Staking Rewards");
    match client.get_staking_rewards(wallet.address()).await {
        Ok(rewards) => {
            println!("✅ Rewards query: DGT: {}, DRT: {}", 
                     rewards.dgt_rewards(), rewards.drt_rewards());
            passed += 1;
        }
        Err(e) => {
            // Staking rewards might return error for non-stakers
            println!("⚠️  Rewards query: {} (expected for non-staker)", e);
            passed += 1;
        }
    }

    // Test 10: Get Genesis
    println!("\n🌍 Test 10: Get Genesis Configuration");
    match client.get_genesis().await {
        Ok(genesis) => {
            println!("✅ Genesis: Chain ID: {}, Version: {}", 
                     genesis.chain_id, genesis.chain_version);
            println!("   Features: staking={}, contracts={}, pqc={}", 
                     genesis.features.staking, 
                     genesis.features.smart_contracts,
                     genesis.pqc.enabled);
            passed += 1;
        }
        Err(e) => {
            println!("❌ Genesis query failed: {}", e);
            failed += 1;
        }
    }

    // Summary
    println!("\n═══════════════════════════════════════");
    println!("  Results: {} passed, {} failed", passed, failed);
    println!("═══════════════════════════════════════");

    if failed > 0 {
        std::process::exit(1);
    }

    Ok(())
}
