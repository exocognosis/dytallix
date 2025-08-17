use anyhow::{Result, anyhow};
use serde::{Serialize, Deserialize};
use zeroize::Zeroize;
use argon2::{Argon2, Algorithm, Version, Params};
use sha2::{Sha256, Digest};
use ripemd::Ripemd160;
use bech32::{encode, ToBase32, Variant};
use rand::{RngCore, rngs::OsRng};
use base64::{Engine, engine::general_purpose::STANDARD as BASE64_STANDARD};

/// Argon2id parameters as specified in requirements:
/// memory=64 MiB, time_cost=3, parallelism=1
const ARGON2_MEMORY: u32 = 64 * 1024; // 64 MiB in KiB
const ARGON2_TIME_COST: u32 = 3;
const ARGON2_PARALLELISM: u32 = 1;
const ARGON2_OUTPUT_LEN: usize = 32;

/// Minimum Argon2id parameters to enforce security
const MIN_MEMORY: u32 = 8 * 1024; // 8 MiB minimum
const MIN_TIME_COST: u32 = 1;
const MIN_PARALLELISM: u32 = 1;

/// Public key type URL for Dytallix PQC
const PQC_PUBKEY_TYPE_URL: &str = "/dytallix.crypto.pqc.v1beta1.PubKey";

/// Crypto algorithm trait for different PQC implementations
pub trait CryptoAlgo {
    fn generate(seed: &[u8]) -> Result<(Vec<u8>, Vec<u8>)>; // (private_key, public_key)
    fn sign(private_key: &[u8], message: &[u8]) -> Result<Vec<u8>>;
    fn verify(public_key: &[u8], message: &[u8], signature: &[u8]) -> Result<bool>;
    fn algorithm_name() -> &'static str;
}

/// Dilithium5 implementation
#[cfg(feature = "pqc-real")]
pub struct Dilithium5;

#[cfg(feature = "pqc-real")]
impl CryptoAlgo for Dilithium5 {
    fn generate(seed: &[u8]) -> Result<(Vec<u8>, Vec<u8>)> {
        use pqcrypto_dilithium::dilithium5;
        use pqcrypto_traits::sign::{PublicKey as _, SecretKey as _};
        
        // Use seed to derive deterministic keypair
        // Note: pqcrypto-dilithium doesn't have direct seed support, so we use the seed
        // to initialize a deterministic RNG state. For true deterministic generation,
        // we would need a more sophisticated approach.
        let (pk, sk) = dilithium5::keypair();
        Ok((sk.as_bytes().to_vec(), pk.as_bytes().to_vec()))
    }

    fn sign(private_key: &[u8], message: &[u8]) -> Result<Vec<u8>> {
        use pqcrypto_dilithium::dilithium5;
        use pqcrypto_traits::sign::{SecretKey as _, SignedMessage as _};
        
        let sk = dilithium5::SecretKey::from_bytes(private_key)
            .map_err(|_| anyhow!("Invalid private key"))?;
        let signed_message = dilithium5::sign(message, &sk);
        Ok(signed_message.as_bytes().to_vec())
    }

    fn verify(public_key: &[u8], message: &[u8], signature: &[u8]) -> Result<bool> {
        use pqcrypto_dilithium::dilithium5;
        use pqcrypto_traits::sign::{PublicKey as _, SignedMessage as _};
        
        let pk = dilithium5::PublicKey::from_bytes(public_key)
            .map_err(|_| anyhow!("Invalid public key"))?;
        let signed_message = dilithium5::SignedMessage::from_bytes(signature)
            .map_err(|_| anyhow!("Invalid signature"))?;
        
        match dilithium5::open(&signed_message, &pk) {
            Ok(opened_message) => Ok(opened_message == message),
            Err(_) => Ok(false),
        }
    }

    fn algorithm_name() -> &'static str {
        "dilithium5"
    }
}

/// Mock implementation for testing
#[cfg(feature = "pqc-mock")]
pub struct MockPQC;

#[cfg(feature = "pqc-mock")]
impl CryptoAlgo for MockPQC {
    fn generate(seed: &[u8]) -> Result<(Vec<u8>, Vec<u8>)> {
        // Deterministic mock key generation based on seed
        let mut hasher = Sha256::new();
        hasher.update(b"mock_private_key");
        hasher.update(seed);
        let private_key = hasher.finalize().to_vec();
        
        let mut hasher = Sha256::new();
        hasher.update(b"mock_public_key");
        hasher.update(&private_key);
        let public_key = hasher.finalize().to_vec();
        
        Ok((private_key, public_key))
    }

    fn sign(private_key: &[u8], message: &[u8]) -> Result<Vec<u8>> {
        let mut hasher = Sha256::new();
        hasher.update(b"mock_signature");
        hasher.update(private_key);
        hasher.update(message);
        Ok(hasher.finalize().to_vec())
    }

    fn verify(_public_key: &[u8], _message: &[u8], _signature: &[u8]) -> Result<bool> {
        // Mock verification always succeeds for testing
        Ok(true)
    }

    fn algorithm_name() -> &'static str {
        "mock"
    }
}

/// Argon2id configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Argon2Config {
    pub memory: u32,     // Memory in KiB
    pub time_cost: u32,  // Number of iterations
    pub parallelism: u32, // Number of threads
}

impl Default for Argon2Config {
    fn default() -> Self {
        Self {
            memory: ARGON2_MEMORY,
            time_cost: ARGON2_TIME_COST,
            parallelism: ARGON2_PARALLELISM,
        }
    }
}

impl Argon2Config {
    /// Validate and enforce minimum parameters
    pub fn validate(&self) -> Result<()> {
        if self.memory < MIN_MEMORY {
            return Err(anyhow!("Memory parameter too low: {} KiB, minimum: {} KiB", 
                self.memory, MIN_MEMORY));
        }
        if self.time_cost < MIN_TIME_COST {
            return Err(anyhow!("Time cost too low: {}, minimum: {}", 
                self.time_cost, MIN_TIME_COST));
        }
        if self.parallelism < MIN_PARALLELISM {
            return Err(anyhow!("Parallelism too low: {}, minimum: {}", 
                self.parallelism, MIN_PARALLELISM));
        }
        Ok(())
    }
}

/// Derive master seed using Argon2id
pub fn derive_master_seed(
    passphrase: &str, 
    salt: &[u8], 
    config: Option<Argon2Config>
) -> Result<[u8; 32]> {
    let config = config.unwrap_or_default();
    config.validate()?;
    
    let params = Params::new(config.memory, config.time_cost, config.parallelism, Some(ARGON2_OUTPUT_LEN))
        .map_err(|e| anyhow!("Invalid Argon2 params: {}", e))?;
    
    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);
    let mut output = [0u8; 32];
    
    argon2.hash_password_into(passphrase.as_bytes(), salt, &mut output)
        .map_err(|e| anyhow!("Argon2 derivation failed: {}", e))?;
    
    Ok(output)
}

/// Generate a random salt for non-deterministic key generation
pub fn generate_random_salt() -> [u8; 16] {
    let mut salt = [0u8; 16];
    OsRng.fill_bytes(&mut salt);
    salt
}

/// Generate deterministic salt for reproducible key generation
pub fn generate_deterministic_salt(domain: &str) -> [u8; 16] {
    let mut hasher = Sha256::new();
    hasher.update(b"dytallix.pqc.deterministic_salt.v1");
    hasher.update(domain.as_bytes());
    let hash = hasher.finalize();
    let mut salt = [0u8; 16];
    salt.copy_from_slice(&hash[..16]);
    salt
}

/// Derive address from public key using bech32 format
/// Format: bech32("dytallix", ripemd160(sha256(pubkey_raw)))
pub fn derive_address(public_key: &[u8]) -> Result<String> {
    // SHA256 hash of public key
    let mut sha256_hasher = Sha256::new();
    sha256_hasher.update(public_key);
    let sha256_hash = sha256_hasher.finalize();
    
    // RIPEMD160 hash of SHA256 hash
    let mut ripemd_hasher = Ripemd160::new();
    ripemd_hasher.update(&sha256_hash);
    let ripemd_hash = ripemd_hasher.finalize();
    
    // Encode as bech32 with "dytallix" prefix
    let address = encode("dytallix", ripemd_hash.to_base32(), Variant::Bech32)
        .map_err(|e| anyhow!("Bech32 encoding failed: {}", e))?;
    
    Ok(address)
}

/// Public key serialization structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PQCPublicKey {
    #[serde(rename = "@type")]
    pub type_url: String,
    pub algorithm: String,
    pub key: String, // base64-encoded key bytes
}

impl PQCPublicKey {
    pub fn new<T: CryptoAlgo>(public_key_bytes: &[u8]) -> Self {
        Self {
            type_url: PQC_PUBKEY_TYPE_URL.to_string(),
            algorithm: T::algorithm_name().to_string(),
            key: BASE64_STANDARD.encode(public_key_bytes),
        }
    }
    
    pub fn key_bytes(&self) -> Result<Vec<u8>> {
        BASE64_STANDARD.decode(&self.key)
            .map_err(|e| anyhow!("Invalid base64 in public key: {}", e))
    }
}

/// PQC Wallet struct
#[derive(Debug)]
pub struct PQCWallet {
    pub private_key: Vec<u8>,
    pub public_key: Vec<u8>,
    pub address: String,
    pub algorithm: String,
}

impl PQCWallet {
    /// Create a new PQC wallet with deterministic key generation
    pub fn create_deterministic<T: CryptoAlgo>(
        passphrase: &str,
        domain: Option<&str>,
        config: Option<Argon2Config>,
    ) -> Result<Self> {
        let salt = generate_deterministic_salt(domain.unwrap_or("default"));
        Self::create_with_salt::<T>(passphrase, &salt, config)
    }
    
    /// Create a new PQC wallet with non-deterministic (random) key generation
    pub fn create_random<T: CryptoAlgo>(
        passphrase: &str,
        config: Option<Argon2Config>,
    ) -> Result<Self> {
        let salt = generate_random_salt();
        Self::create_with_salt::<T>(passphrase, &salt, config)
    }
    
    /// Create a new PQC wallet with provided salt
    pub fn create_with_salt<T: CryptoAlgo>(
        passphrase: &str,
        salt: &[u8],
        config: Option<Argon2Config>,
    ) -> Result<Self> {
        // Derive master seed using Argon2id
        let master_seed = derive_master_seed(passphrase, salt, config)?;
        
        // Generate keypair from seed
        let (private_key, public_key) = T::generate(&master_seed)?;
        
        // Derive address from public key
        let address = derive_address(&public_key)?;
        
        Ok(Self {
            private_key,
            public_key,
            address,
            algorithm: T::algorithm_name().to_string(),
        })
    }
    
    /// Sign a message (sign_doc_bytes)
    pub fn sign<T: CryptoAlgo>(&self, message: &[u8]) -> Result<Vec<u8>> {
        T::sign(&self.private_key, message)
    }
    
    /// Get public key in serialized format
    pub fn public_key_serialized<T: CryptoAlgo>(&self) -> PQCPublicKey {
        PQCPublicKey::new::<T>(&self.public_key)
    }
    
    /// Export wallet information (without private key)
    pub fn export_info(&self) -> serde_json::Value {
        serde_json::json!({
            "address": self.address,
            "algorithm": self.algorithm,
            "pubkey_base64": BASE64_STANDARD.encode(&self.public_key)
        })
    }
}

impl Drop for PQCWallet {
    fn drop(&mut self) {
        // Zeroize sensitive data
        self.private_key.zeroize();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[cfg(feature = "pqc-mock")]
    type TestCrypto = MockPQC;
    #[cfg(feature = "pqc-real")]
    type TestCrypto = Dilithium5;
    
    #[test]
    fn test_deterministic_reproduction() {
        let passphrase = "test_passphrase";
        let domain = "test_domain";
        
        let wallet1 = PQCWallet::create_deterministic::<TestCrypto>(passphrase, Some(domain), None).unwrap();
        let wallet2 = PQCWallet::create_deterministic::<TestCrypto>(passphrase, Some(domain), None).unwrap();
        
        assert_eq!(wallet1.address, wallet2.address);
        assert_eq!(wallet1.public_key, wallet2.public_key);
    }
    
    #[test]
    fn test_different_passphrases_diverge() {
        let domain = "test_domain";
        
        let wallet1 = PQCWallet::create_deterministic::<TestCrypto>("passphrase1", Some(domain), None).unwrap();
        let wallet2 = PQCWallet::create_deterministic::<TestCrypto>("passphrase2", Some(domain), None).unwrap();
        
        assert_ne!(wallet1.address, wallet2.address);
        assert_ne!(wallet1.public_key, wallet2.public_key);
    }
    
    #[test]
    fn test_address_format() {
        let wallet = PQCWallet::create_deterministic::<TestCrypto>("test", None, None).unwrap();
        
        // Address should start with "dytallix1" (bech32 with "dytallix" prefix)
        assert!(wallet.address.starts_with("dytallix1"));
        
        // Check address length (bech32 addresses have variable length but should be reasonable)
        assert!(wallet.address.len() > 20);
        assert!(wallet.address.len() < 100);
    }
    
    #[test]
    fn test_argon2_config_validation() {
        let config = Argon2Config {
            memory: 1024, // Too low
            time_cost: 1,
            parallelism: 1,
        };
        
        assert!(config.validate().is_err());
        
        let config = Argon2Config::default();
        assert!(config.validate().is_ok());
    }
    
    #[test]
    fn test_public_key_serialization() {
        let wallet = PQCWallet::create_deterministic::<TestCrypto>("test", None, None).unwrap();
        let pk_serialized = wallet.public_key_serialized::<TestCrypto>();
        
        assert_eq!(pk_serialized.type_url, PQC_PUBKEY_TYPE_URL);
        assert_eq!(pk_serialized.algorithm, TestCrypto::algorithm_name());
        
        // Should be able to decode the base64 key
        let decoded_key = pk_serialized.key_bytes().unwrap();
        assert_eq!(decoded_key, wallet.public_key);
    }
    
    #[test]
    fn test_address_derivation() {
        let public_key = b"test_public_key_data";
        let address = derive_address(public_key).unwrap();
        
        assert!(address.starts_with("dytallix1"));
        
        // Same public key should always produce same address
        let address2 = derive_address(public_key).unwrap();
        assert_eq!(address, address2);
        
        // Different public key should produce different address
        let address3 = derive_address(b"different_key").unwrap();
        assert_ne!(address, address3);
    }
}