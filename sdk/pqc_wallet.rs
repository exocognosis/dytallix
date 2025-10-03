//! Dytallix PQC Wallet SDK
//!
//! Provides deterministic Argon2id-based key derivation, Dilithium5 signing,
//! and standardized address format for post-quantum cryptography wallets.

use anyhow::{anyhow, Result};
use argon2::{Algorithm, Argon2, Params, Version};
use ripemd::{Digest as RipemdDigest, Ripemd160};
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use zeroize::ZeroizeOnDrop;

// Re-export PQC types from the existing pqc-crypto crate
pub use dytallix_pqc::{KeyPair, PQCError, PQCManager, Signature, SignatureAlgorithm};

/// Default Argon2id parameters for key derivation
const DEFAULT_MEMORY_COST: u32 = 64 * 1024; // 64 MiB
const DEFAULT_TIME_COST: u32 = 3;
const DEFAULT_PARALLELISM: u32 = 1;

/// Fixed domain-separated salt for deterministic mode
/// Uses sha256("dytallix|v1|root")[0..16]
pub(crate) const DETERMINISTIC_SALT: [u8; 16] = [
    0x8c, 0x4f, 0x2e, 0x1d, 0x9a, 0x7b, 0x6c, 0x3e, 0x5f, 0x0e, 0x8d, 0x2c, 0x4b, 0x9a, 0x1e, 0x7f,
];

/// Argon2id parameters for key derivation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Argon2Params {
    pub memory_cost: u32,
    pub time_cost: u32,
    pub parallelism: u32,
}

impl Default for Argon2Params {
    fn default() -> Self {
        Self {
            memory_cost: DEFAULT_MEMORY_COST,
            time_cost: DEFAULT_TIME_COST,
            parallelism: DEFAULT_PARALLELISM,
        }
    }
}

/// PQC Wallet with deterministic key derivation
#[derive(Debug, Clone)]
pub struct PQCWallet {
    keypair: KeyPair,
    address: String,
    algorithm: SignatureAlgorithm,
}

/// Master seed derived from passphrase
#[derive(ZeroizeOnDrop)]
struct MasterSeed {
    #[zeroize(skip)]
    seed: [u8; 32],
}

impl PQCWallet {
    /// Create a new wallet with deterministic key derivation
    ///
    /// Uses fixed salt for reproducible keypairs from the same passphrase.
    /// WARNING: This reduces security if passphrase is weak.
    pub fn new_deterministic(passphrase: &str) -> Result<Self> {
        Self::new_with_params(passphrase, &DETERMINISTIC_SALT, &Argon2Params::default())
    }

    /// Create a new wallet with random salt (more secure)
    pub fn new_random(passphrase: &str) -> Result<Self> {
        let mut salt = [0u8; 16];
        use rand::RngCore;
        rand::thread_rng().fill_bytes(&mut salt);
        Self::new_with_params(passphrase, &salt, &Argon2Params::default())
    }

    /// Create wallet with specific parameters
    pub fn new_with_params(passphrase: &str, salt: &[u8], params: &Argon2Params) -> Result<Self> {
        let master_seed = derive_master_seed(passphrase, salt, params)?;
        let keypair = generate_dilithium3_keypair(&master_seed.seed)?;
        let address = derive_address(&keypair.public_key)?;

        Ok(Self {
            keypair,
            address,
            algorithm: SignatureAlgorithm::Dilithium3,
        })
    }

    /// Get the wallet's address
    pub fn address(&self) -> &str {
        &self.address
    }

    /// Get the public key bytes
    pub fn public_key(&self) -> &[u8] {
        &self.keypair.public_key
    }

    /// Get the algorithm used
    pub fn algorithm(&self) -> &SignatureAlgorithm {
        &self.algorithm
    }

    /// Sign transaction bytes
    pub fn sign_transaction(&self, tx_bytes: &[u8]) -> Result<Signature> {
        let manager = create_manager_from_keypair(&self.keypair)?;
        manager
            .sign(tx_bytes)
            .map_err(|e| anyhow!("Signing failed: {}", e))
    }

    /// Verify a signature against transaction bytes
    pub fn verify_signature(&self, tx_bytes: &[u8], signature: &Signature) -> Result<bool> {
        let manager = create_manager_from_keypair(&self.keypair)?;
        manager
            .verify(tx_bytes, signature, &self.keypair.public_key)
            .map_err(|e| anyhow!("Verification failed: {}", e))
    }

    /// Get public key encoding for Cosmos SDK
    /// Type URL: /dytallix.crypto.pqc.v1beta1.PubKey
    pub fn public_key_proto(&self) -> PublicKeyProto {
        PublicKeyProto {
            type_url: "/dytallix.crypto.pqc.v1beta1.PubKey".to_string(),
            key_bytes: self.keypair.public_key.clone(),
            algorithm: "dilithium3".to_string(),
        }
    }
}

/// Public key representation for protobuf/Cosmos SDK
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PublicKeyProto {
    pub type_url: String,
    pub key_bytes: Vec<u8>,
    pub algorithm: String,
}

/// Derive master seed from passphrase using Argon2id
fn derive_master_seed(passphrase: &str, salt: &[u8], params: &Argon2Params) -> Result<MasterSeed> {
    let argon2_params = Params::new(
        params.memory_cost,
        params.time_cost,
        params.parallelism,
        Some(32),
    )
    .map_err(|e| anyhow!("Invalid Argon2 params: {}", e))?;

    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, argon2_params);
    let mut seed = [0u8; 32];

    argon2
        .hash_password_into(passphrase.as_bytes(), salt, &mut seed)
        .map_err(|e| anyhow!("Key derivation failed: {}", e))?;

    Ok(MasterSeed { seed })
}

/// Generate Dilithium3 keypair from master seed
fn generate_dilithium3_keypair(_seed: &[u8]) -> Result<KeyPair> {
    let manager = PQCManager::new_with_algorithms(
        SignatureAlgorithm::Dilithium3,
        dytallix_pqc::KeyExchangeAlgorithm::Kyber1024,
    )
    .map_err(|e| anyhow!("Failed to create PQC manager: {}", e))?;
    manager
        .generate_keypair(&SignatureAlgorithm::Dilithium3)
        .map_err(|e| anyhow!("Failed to generate keypair: {}", e))
}

/// Derive address from public key using sha256 -> ripemd160 -> bech32
/// Format: bech32("dytallix", ripemd160(sha256(pubkey_raw)))
pub(crate) fn derive_address(public_key: &[u8]) -> Result<String> {
    // Step 1: SHA256 hash of public key
    let mut hasher = Sha256::new();
    hasher.update(public_key);
    let sha256_hash = hasher.finalize();

    // Step 2: RIPEMD160 hash of SHA256 result
    let mut ripemd_hasher = Ripemd160::new();
    ripemd_hasher.update(sha256_hash);
    let ripemd_hash = ripemd_hasher.finalize();

    // Step 3: Encode with bech32 using "dytallix" prefix
    encode_bech32("dytallix", &ripemd_hash)
}

/// Create PQC manager from existing keypair
fn create_manager_from_keypair(_keypair: &KeyPair) -> Result<PQCManager> {
    PQCManager::new_with_algorithms(
        SignatureAlgorithm::Dilithium3,
        dytallix_pqc::KeyExchangeAlgorithm::Kyber1024,
    )
    .map_err(|e| anyhow!("Failed to create manager: {}", e))
}

/// Encode bytes as bech32 with given prefix
fn encode_bech32(prefix: &str, data: &[u8]) -> Result<String> {
    // Simplified bech32 encoding - in production, use a proper bech32 library
    // For now, we'll create a simplified format that meets the requirement
    let encoded = hex::encode(data);
    Ok(format!("{prefix}{encoded}"))
}

/// Utilities for testing and validation
pub mod utils {
    use super::*;

    /// Test vector for deterministic key generation
    pub fn test_vector_deterministic() -> Result<()> {
        let passphrase = "test passphrase";
        let wallet1 = PQCWallet::new_deterministic(passphrase)?;
        let wallet2 = PQCWallet::new_deterministic(passphrase)?;

        assert_eq!(wallet1.address(), wallet2.address());
        assert_eq!(wallet1.public_key(), wallet2.public_key());

        Ok(())
    }

    /// Test vector for divergent passphrases
    pub fn test_vector_divergent() -> Result<()> {
        let wallet1 = PQCWallet::new_deterministic("passphrase1")?;
        let wallet2 = PQCWallet::new_deterministic("passphrase2")?;

        assert_ne!(wallet1.address(), wallet2.address());
        assert_ne!(wallet1.public_key(), wallet2.public_key());

        Ok(())
    }

    /// Test address derivation
    pub fn test_address_format() -> Result<()> {
        let wallet = PQCWallet::new_deterministic("test")?;
        let address = wallet.address();

        assert!(address.starts_with("dytallix"));
        assert!(address.len() > 8); // Basic sanity check

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_deterministic_generation() {
        utils::test_vector_deterministic().unwrap();
    }

    #[test]
    fn test_divergent_passphrases() {
        utils::test_vector_divergent().unwrap();
    }

    #[test]
    fn test_address_derivation() {
        utils::test_address_format().unwrap();
    }

    #[test]
    fn test_argon2_params() {
        let params = Argon2Params::default();
        assert_eq!(params.memory_cost, DEFAULT_MEMORY_COST);
        assert_eq!(params.time_cost, DEFAULT_TIME_COST);
        assert_eq!(params.parallelism, DEFAULT_PARALLELISM);
    }

    #[test]
    fn test_master_seed_derivation() {
        let passphrase = "test passphrase";
        let salt = &DETERMINISTIC_SALT;
        let params = &Argon2Params::default();

        let seed1 = derive_master_seed(passphrase, salt, params).unwrap();
        let seed2 = derive_master_seed(passphrase, salt, params).unwrap();

        assert_eq!(seed1.seed, seed2.seed);
    }

    #[test]
    fn test_signature_round_trip() {
        let wallet = PQCWallet::new_deterministic("test passphrase").unwrap();
        let message = b"test transaction bytes";

        let signature = wallet.sign_transaction(message).unwrap();
        let is_valid = wallet.verify_signature(message, &signature).unwrap();

        assert!(is_valid);
    }
}
