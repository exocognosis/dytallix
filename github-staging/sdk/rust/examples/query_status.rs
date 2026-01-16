//! Query chain status example
//!
//! Run: cargo run --example query_status

use dytallix_sdk::Client;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    println!("Dytallix SDK - Chain Status Example");
    println!("====================================\n");

    // Connect to testnet
    println!("Connecting to testnet...");
    let client = Client::testnet();
    println!("  RPC: {}", dytallix_sdk::TESTNET_RPC);
    println!("  Chain ID: {}", client.chain_id());

    // Query status
    println!("\nQuerying chain status...");
    match client.get_status().await {
        Ok(status) => {
            println!("✓ Connected");
            println!("  Block height: {}", status.block_height);
            println!("  Chain ID: {}", status.chain_id);
            println!("  Latest block: {}...", &status.latest_block_hash[..16]);
        }
        Err(e) => {
            println!("✗ Connection failed: {}", e);
            println!("  (Network may be unavailable)");
        }
    }

    // Query an example address
    let test_address = "dyt1000000000000000000000000000000000000000000000000";
    println!("\nQuerying account: {}...", &test_address[..20]);
    match client.get_account(test_address).await {
        Ok(account) => {
            println!("  DGT Balance: {}", account.dgt_balance());
            println!("  DRT Balance: {}", account.drt_balance());
            println!("  Nonce: {}", account.nonce);
        }
        Err(e) => {
            println!("  (Account query failed: {})", e);
        }
    }

    println!("\n====================================");
    println!("Demo complete!");

    Ok(())
}
