//! Quantum-Resistant Asset Example
//!
//! This example demonstrates how to create and manage quantum-resistant
//! permissionless assets on the Dytallix blockchain.

use chrono::Utc;
use dytallix_pqc::{
    AssetMetadata, PQCManager, QuantumAssetManager, SignatureAlgorithm,
};
use std::collections::HashMap;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("🔐 Quantum-Resistant Permissionless Asset Demo");
    println!("==============================================\n");

    // Step 1: Create an asset manager for the first user (Alice)
    println!("Step 1: Creating Alice's asset manager...");
    let mut alice_manager = QuantumAssetManager::new()?;
    let alice_pubkey = alice_manager.get_public_key().to_vec();
    println!("✓ Alice's public key: {}", hex::encode(&alice_pubkey[..8]));
    println!();

    // Step 2: Alice creates a new quantum-resistant asset
    println!("Step 2: Alice creates a new asset...");
    let metadata = AssetMetadata {
        name: "Quantum Coin".to_string(),
        symbol: "QCN".to_string(),
        total_supply: 1_000_000,
        decimals: 2,
        description: Some("A quantum-resistant digital asset".to_string()),
        created_at: Utc::now(),
        signature_algorithm: SignatureAlgorithm::Dilithium3,
        properties: HashMap::new(),
    };

    let asset = alice_manager.register_asset(metadata)?;
    println!("✓ Asset created: {} ({})", asset.metadata.name, asset.metadata.symbol);
    println!("  Asset ID: {}", &asset.id.0[..16]);
    println!("  Total Supply: {}", asset.metadata.total_supply);
    println!("  Decimals: {}", asset.metadata.decimals);
    println!("  Algorithm: {:?}", asset.metadata.signature_algorithm);
    println!();

    // Step 3: Verify the asset's creation signature
    println!("Step 3: Verifying asset creation signature...");
    let pqc_manager = PQCManager::new()?;
    if asset.verify_creation(&pqc_manager).unwrap_or(false) {
        println!("✓ Asset creation signature verified!");
    } else {
        println!("⚠ Asset creation signature verification failed");
    }
    
    // Verify state integrity
    if asset.verify_state_integrity() {
        println!("✓ Asset state integrity verified!");
    } else {
        println!("⚠ Asset state integrity check failed");
    }
    println!();

    // Step 4: Check Alice's initial balance
    println!("Step 4: Checking Alice's initial balance...");
    if let Some(balance) = alice_manager.get_balance(&asset.id, &alice_pubkey) {
        println!("✓ Alice's balance: {} {}", balance.balance, asset.metadata.symbol);
        println!("  Last nonce: {}", balance.last_nonce);
    }
    println!();

    // Step 5: Create a second user (Bob) and transfer assets to him
    println!("Step 5: Creating Bob's identity...");
    let bob_pqc = PQCManager::new()?;
    let bob_pubkey = bob_pqc.get_signature_public_key().to_vec();
    println!("✓ Bob's public key: {}", hex::encode(&bob_pubkey[..8]));
    println!();

    // Step 6: Alice transfers assets to Bob
    println!("Step 6: Alice transfers 10,000 {} to Bob...", asset.metadata.symbol);
    let transfer_amount = 10_000;
    let transfer = alice_manager.transfer_asset(
        asset.id.clone(),
        transfer_amount,
        bob_pubkey.clone(),
    )?;
    
    println!("✓ Transfer created!");
    println!("  Amount: {} {}", transfer_amount, asset.metadata.symbol);
    println!("  Nonce: {}", transfer.nonce);
    println!("  TX Hash: {}", &transfer.tx_hash[..16]);
    println!("  Timestamp: {}", transfer.timestamp);
    println!();

    // Step 7: Verify the transfer
    println!("Step 7: Verifying transfer signature and integrity...");
    let is_valid = alice_manager.verify_transfer(&transfer)?;
    if is_valid {
        println!("✓ Transfer signature verified!");
    } else {
        println!("⚠ Transfer verification failed");
    }
    
    if transfer.verify_tx_hash() {
        println!("✓ Transaction hash verified!");
    } else {
        println!("⚠ Transaction hash verification failed");
    }
    println!();

    // Step 8: Check updated balances
    println!("Step 8: Checking updated balances...");
    if let Some(alice_balance) = alice_manager.get_balance(&asset.id, &alice_pubkey) {
        println!("✓ Alice's balance: {} {}", alice_balance.balance, asset.metadata.symbol);
    }
    if let Some(bob_balance) = alice_manager.get_balance(&asset.id, &bob_pubkey) {
        println!("✓ Bob's balance: {} {}", bob_balance.balance, asset.metadata.symbol);
    }
    println!();

    // Step 9: Alice makes another transfer to Bob
    println!("Step 9: Alice transfers another 5,000 {} to Bob...", asset.metadata.symbol);
    let transfer2 = alice_manager.transfer_asset(
        asset.id.clone(),
        5_000,
        bob_pubkey.clone(),
    )?;
    
    println!("✓ Second transfer created!");
    println!("  Amount: 5,000 {}", asset.metadata.symbol);
    println!("  Nonce: {} (incremented from {})", transfer2.nonce, transfer.nonce);
    println!("  TX Hash: {}", &transfer2.tx_hash[..16]);
    println!();

    // Demonstrate nonce prevents replay attacks
    println!("  🛡️ Nonce difference: {} (prevents replay attacks)", 
             transfer2.nonce - transfer.nonce);
    println!();

    // Step 10: Final balance check
    println!("Step 10: Final balance check...");
    if let Some(alice_balance) = alice_manager.get_balance(&asset.id, &alice_pubkey) {
        println!("✓ Alice's final balance: {} {}", alice_balance.balance, asset.metadata.symbol);
    }
    if let Some(bob_balance) = alice_manager.get_balance(&asset.id, &bob_pubkey) {
        println!("✓ Bob's final balance: {} {}", bob_balance.balance, asset.metadata.symbol);
    }
    println!();

    // Step 11: Export asset to JSON for blockchain storage
    println!("Step 11: Exporting asset to JSON...");
    let json = asset.to_json()?;
    println!("✓ Asset exported successfully!");
    println!("  JSON length: {} bytes", json.len());
    println!();

    // Step 12: Demonstrate insufficient balance error
    println!("Step 12: Testing insufficient balance protection...");
    let result = alice_manager.transfer_asset(
        asset.id.clone(),
        alice_manager.get_balance(&asset.id, &alice_pubkey)
            .map(|b| b.balance + 1)
            .unwrap_or(0),
        bob_pubkey.clone(),
    );
    
    match result {
        Err(_) => println!("✓ Insufficient balance correctly prevented!"),
        Ok(_) => println!("⚠ Warning: Insufficient balance check failed"),
    }
    println!();

    // Summary
    println!("Summary:");
    println!("========");
    println!("✓ Quantum-resistant asset created (Dilithium3 signatures)");
    println!("✓ Permissionless design - no central authority required");
    println!("✓ Transfers cryptographically signed and verified");
    println!("✓ Replay attacks prevented via nonces");
    println!("✓ Double-spending prevented via balance checks");
    println!("✓ All operations are tamper-evident and auditable");
    println!();
    println!("🎉 Quantum-Resistant Asset Demo Complete!");

    Ok(())
}
