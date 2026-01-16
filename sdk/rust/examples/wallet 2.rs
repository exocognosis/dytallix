//! Wallet generation example
//!
//! Run: cargo run --example wallet

use dytallix_sdk::Wallet;

fn main() -> anyhow::Result<()> {
    println!("Dytallix SDK - Wallet Example");
    println!("==============================\n");

    // Generate a new wallet
    println!("Generating PQC wallet (Dilithium3)...");
    let wallet = Wallet::generate()?;
    
    println!("✓ Wallet generated");
    println!("  Address: {}", wallet.address());
    println!("  Public key: {}...", &wallet.public_key_hex()[..32]);

    // Sign a test message
    println!("\nSigning test message...");
    let message = b"Hello, Dytallix!";
    let signature = wallet.sign(message)?;
    println!("✓ Message signed");
    println!("  Signature length: {} bytes", signature.data.len());

    // Verify the signature
    println!("\nVerifying signature...");
    let valid = wallet.verify(message, &signature)?;
    println!("✓ Signature valid: {}", valid);

    // Save wallet to file
    let wallet_path = "/tmp/dytallix-demo-wallet.json";
    println!("\nSaving wallet to {}...", wallet_path);
    wallet.save(wallet_path)?;
    println!("✓ Wallet saved");

    // Load wallet from file
    println!("\nLoading wallet from file...");
    let loaded = Wallet::load(wallet_path)?;
    println!("✓ Wallet loaded");
    println!("  Address matches: {}", loaded.address() == wallet.address());

    println!("\n==============================");
    println!("Demo complete!");

    Ok(())
}
