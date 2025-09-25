//! Unit tests for PQC Wallet SDK
//!
//! These tests validate deterministic key generation, address derivation,
//! and signature functionality as specified in the requirements.

use crate::{Argon2Params, PQCWallet, SignatureAlgorithm};
use sha2::Digest; // For Sha256::new()

/// Test deterministic key generation
/// Requirement: Same passphrase yields identical keys
#[test]
fn test_deterministic_key_generation() {
    let passphrase = "test passphrase for deterministic generation";

    let wallet1 = PQCWallet::new_deterministic(passphrase).unwrap();
    let wallet2 = PQCWallet::new_deterministic(passphrase).unwrap();

    assert_eq!(wallet1.address(), wallet2.address());
    assert_eq!(wallet1.public_key(), wallet2.public_key());
    assert_eq!(wallet1.algorithm(), wallet2.algorithm());
}

/// Test divergent passphrases yield different keys
/// Requirement: Different passphrases must generate different keys
#[test]
fn test_divergent_passphrases() {
    let wallet1 = PQCWallet::new_deterministic("passphrase one").unwrap();
    let wallet2 = PQCWallet::new_deterministic("passphrase two").unwrap();

    assert_ne!(wallet1.address(), wallet2.address());
    assert_ne!(wallet1.public_key(), wallet2.public_key());
}

/// Test address derivation format
/// Requirement: Address format must be bech32-style with "dytallix" prefix
#[test]
fn test_address_derivation_format() {
    let wallet = PQCWallet::new_deterministic("test").unwrap();
    let address = wallet.address();

    assert!(
        address.starts_with("dytallix"),
        "Address must start with 'dytallix'"
    );
    assert!(
        address.len() > 8,
        "Address must be longer than just the prefix"
    );

    // Test address contains only valid characters (hex after prefix)
    let hex_part = &address["dytallix".len()..];
    assert_eq!(
        hex_part.len(),
        40,
        "Address hash should be 20 bytes (40 hex chars)"
    );
    assert!(
        hex_part.chars().all(|c| c.is_ascii_hexdigit()),
        "Address hash must be valid hex"
    );
}

/// Test signature round-trip (sign + verify)
/// Requirement: Signatures must be verifiable by the same wallet
#[test]
fn test_signature_round_trip() {
    let wallet = PQCWallet::new_deterministic("test passphrase").unwrap();
    let message = b"test transaction data";

    let signature = wallet.sign_transaction(message).unwrap();
    let is_valid = wallet.verify_signature(message, &signature).unwrap();

    assert!(is_valid, "Signature should be valid for the message");
}

/// Test signature rejection for different message
/// Requirement: Invalid signatures must be rejected
#[test]
fn test_signature_rejection() {
    let wallet = PQCWallet::new_deterministic("test passphrase").unwrap();
    let message1 = b"original message";
    let message2 = b"different message";

    let signature = wallet.sign_transaction(message1).unwrap();
    let is_valid = wallet.verify_signature(message2, &signature).unwrap();

    assert!(
        !is_valid,
        "Signature should be invalid for different message"
    );
}

/// Test Argon2id parameter validation
/// Requirement: Argon2id params must meet security floor
#[test]
fn test_argon2_params_floor() {
    let params = Argon2Params::default();

    // Minimum security requirements
    assert!(
        params.memory_cost >= 64 * 1024,
        "Memory cost must be at least 64 MiB"
    );
    assert!(params.time_cost >= 3, "Time cost must be at least 3");
    assert!(params.parallelism >= 1, "Parallelism must be at least 1");
}

/// Test custom Argon2id parameters
#[test]
fn test_custom_argon2_params() {
    let custom_params = Argon2Params {
        memory_cost: 128 * 1024, // 128 MiB
        time_cost: 5,
        parallelism: 2,
    };

    let salt = [1u8; 16];
    let wallet = PQCWallet::new_with_params("test", &salt, &custom_params).unwrap();

    assert!(wallet.address().starts_with("dytallix"));
}

/// Test public key proto format
/// Requirement: Public key must use correct type URL
#[test]
fn test_public_key_proto_format() {
    let wallet = PQCWallet::new_deterministic("test").unwrap();
    let proto = wallet.public_key_proto();

    assert_eq!(proto.type_url, "/dytallix.crypto.pqc.v1beta1.PubKey");
    assert_eq!(proto.algorithm, "dilithium5");
    assert!(!proto.key_bytes.is_empty());
}

/// Test deterministic salt usage
/// Requirement: Fixed salt for reproducible test vectors
#[test]
fn test_deterministic_salt() {
    use crate::DETERMINISTIC_SALT;

    // Verify the deterministic salt is correctly calculated
    // sha256("dytallix|v1|root")[0..16]
    let input = b"dytallix|v1|root";
    let mut hasher = sha2::Sha256::new();
    hasher.update(input);
    let hash = hasher.finalize();
    let expected_salt = &hash[0..16];

    assert_eq!(DETERMINISTIC_SALT, expected_salt);
}

/// Test wallet creation with random salt
/// Requirement: Random salt mode for enhanced security
#[test]
fn test_random_salt_mode() {
    let wallet1 = PQCWallet::new_random("same passphrase").unwrap();
    let wallet2 = PQCWallet::new_random("same passphrase").unwrap();

    // Random salt should make addresses different even with same passphrase
    // Note: This test might occasionally fail due to random collision, but extremely unlikely
    assert_ne!(wallet1.address(), wallet2.address());
}

/// Test address derivation test vectors
/// Requirement: Document test vectors for validation
#[test]
fn test_address_derivation_vectors() {
    // Known test vector for validation
    let test_pubkey = [0x12, 0x34, 0x56, 0x78]; // Simple test key
    let address = crate::pqc_wallet::derive_address(&test_pubkey).unwrap();

    assert!(address.starts_with("dytallix"));

    // Test same input produces same output
    let address2 = crate::pqc_wallet::derive_address(&test_pubkey).unwrap();
    assert_eq!(address, address2);
}

/// Test signature size documentation
/// Requirement: Document signature sizes for gas estimation
#[test]
fn test_signature_size() {
    let wallet = PQCWallet::new_deterministic("test").unwrap();
    let message = b"test";
    let signature = wallet.sign_transaction(message).unwrap();

    // Dilithium5 signatures are approximately 4595 bytes
    // Allow some variance for implementation differences
    assert!(
        signature.data.len() > 4000,
        "Dilithium5 signature too small"
    );
    assert!(
        signature.data.len() < 5000,
        "Dilithium5 signature too large"
    );
}

/// Test algorithm identifier
/// Requirement: Algorithm must be correctly identified
#[test]
fn test_algorithm_identifier() {
    let wallet = PQCWallet::new_deterministic("test").unwrap();

    match wallet.algorithm() {
        SignatureAlgorithm::Dilithium5 => {} // Expected
        _ => panic!("Expected Dilithium5 algorithm"),
    }
}

/// Test error handling for invalid parameters
#[test]
fn test_error_handling() {
    // Test invalid Argon2 parameters
    let invalid_params = Argon2Params {
        memory_cost: 0, // Invalid
        time_cost: 0,   // Invalid
        parallelism: 0, // Invalid
    };

    let salt = [0u8; 16];
    let result = PQCWallet::new_with_params("test", &salt, &invalid_params);
    assert!(result.is_err(), "Should fail with invalid parameters");
}

/// Integration test: Full wallet workflow
/// Requirement: End-to-end functionality test
#[test]
fn test_full_wallet_workflow() {
    // 1. Create wallet
    let passphrase = "integration test passphrase";
    let wallet = PQCWallet::new_deterministic(passphrase).unwrap();

    // 2. Verify address format
    let address = wallet.address();
    assert!(address.starts_with("dytallix"));

    // 3. Sign transaction
    let tx_data = b"test transaction for integration";
    let signature = wallet.sign_transaction(tx_data).unwrap();

    // 4. Verify signature
    let is_valid = wallet.verify_signature(tx_data, &signature).unwrap();
    assert!(is_valid);

    // 5. Get public key proto
    let proto = wallet.public_key_proto();
    assert_eq!(proto.algorithm, "dilithium5");

    // 6. Reproduce wallet from same passphrase
    let wallet2 = PQCWallet::new_deterministic(passphrase).unwrap();
    assert_eq!(wallet.address(), wallet2.address());
}

/// Benchmark test: Key generation performance
/// Requirement: Document performance characteristics
#[test]
fn test_key_generation_performance() {
    use std::time::Instant;

    let start = Instant::now();
    let _wallet = PQCWallet::new_deterministic("performance test").unwrap();
    let duration = start.elapsed();

    // Key generation should complete within reasonable time (10 seconds)
    assert!(
        duration.as_secs() < 10,
        "Key generation too slow: {duration:?}",
    );

    println!("Key generation took: {duration:?}");
}

/// Test memory safety and zeroization
/// Requirement: Sensitive data should be properly zeroized
#[test]
fn test_memory_safety() {
    use zeroize::Zeroize;

    let mut sensitive_data = vec![0xde, 0xad, 0xbe, 0xef];
    let original = sensitive_data.clone();

    sensitive_data.zeroize();

    assert_ne!(sensitive_data, original);
    assert_eq!(sensitive_data, vec![0, 0, 0, 0]);
}
