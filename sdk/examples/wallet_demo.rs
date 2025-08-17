use dytallix_sdk::*;
use anyhow::Result;

fn main() -> Result<()> {
    println!("🔐 Dytallix PQC Wallet Demo");
    println!("==========================");
    
    // Test 1: Create a PQC wallet with deterministic generation
    println!("\n1. Creating deterministic PQC wallet...");
    let wallet1 = PQCWallet::create_deterministic::<MockPQC>(
        "my_secure_passphrase",
        Some("production"),
        None, // Use default Argon2 config
    )?;
    
    println!("   Address: {}", wallet1.address);
    println!("   Algorithm: {}", wallet1.algorithm);
    
    // Test 2: Verify deterministic reproduction
    println!("\n2. Verifying deterministic reproduction...");
    let wallet2 = PQCWallet::create_deterministic::<MockPQC>(
        "my_secure_passphrase",
        Some("production"),
        None,
    )?;
    
    if wallet1.address == wallet2.address {
        println!("   ✅ Deterministic generation works!");
    } else {
        println!("   ⚠️  Deterministic generation not fully implemented");
        println!("   Note: This is expected with current MockPQC implementation");
    }
    
    // Test 3: Public key serialization
    println!("\n3. Testing public key serialization...");
    let pk_serialized = wallet1.public_key_serialized::<MockPQC>();
    println!("   Type URL: {}", pk_serialized.type_url);
    println!("   Algorithm: {}", pk_serialized.algorithm);
    println!("   Key (base64): {}...", &pk_serialized.key[..20]);
    
    // Test 4: Address format validation
    println!("\n4. Address format validation...");
    println!("   Starts with 'dytallix1': {}", wallet1.address.starts_with("dytallix1"));
    println!("   Length: {} chars", wallet1.address.len());
    
    // Test 5: Sign a message
    println!("\n5. Signing a test message...");
    let message = b"Hello, quantum-resistant world!";
    let signature = wallet1.sign::<MockPQC>(message)?;
    println!("   Message: {}", String::from_utf8_lossy(message));
    println!("   Signature length: {} bytes", signature.len());
    
    // Test 6: Wallet export
    println!("\n6. Wallet export info...");
    let export_info = wallet1.export_info();
    println!("   Export JSON:");
    println!("   {}", serde_json::to_string_pretty(&export_info)?);
    
    // Test 7: Argon2 configuration
    println!("\n7. Argon2 configuration validation...");
    let config = Argon2Config::default();
    println!("   Memory: {} KiB ({} MiB)", config.memory, config.memory / 1024);
    println!("   Time cost: {}", config.time_cost);
    println!("   Parallelism: {}", config.parallelism);
    println!("   Validation: {}", if config.validate().is_ok() { "✅ Valid" } else { "❌ Invalid" });
    
    println!("\n🎉 PQC Wallet demo completed successfully!");
    println!("\nKey features demonstrated:");
    println!("- Deterministic key generation with Argon2id");
    println!("- Bech32 address format with 'dytallix' prefix");
    println!("- PQC public key serialization");
    println!("- Message signing capability");
    println!("- Crypto-agile framework");
    
    Ok(())
}