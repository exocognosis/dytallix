use pqcrypto_dilithium::dilithium5;
use pqcrypto_kyber::kyber1024;
use pqcrypto_traits::sign::{PublicKey as SignPublicKey, SecretKey as SignSecretKey, SignedMessage};
use pqcrypto_traits::kem::{PublicKey as KemPublicKey, SecretKey as KemSecretKey, Ciphertext, SharedSecret};
use serde::{Serialize, Deserialize};
use thiserror::Error;
use zeroize::{Zeroize, ZeroizeOnDrop};
use sha3::{Sha3_256, Digest};
use hex;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::fs;

#[derive(Error, Debug)]
pub enum PQCError {
    #[error("Invalid key format")]
    InvalidKey,
    #[error("Invalid signature format")]
    InvalidSignature,
    #[error("Signature verification failed")]
    VerificationFailed,
    #[error("Unsupported algorithm: {0}")]
    UnsupportedAlgorithm(String),
    #[error("Key generation failed")]
    KeyGenerationFailed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SignatureAlgorithm {
    Dilithium5,
    Falcon1024,
    SphincsSha256128s,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum KeyExchangeAlgorithm {
    Kyber1024,
}

#[derive(Debug, Clone, Serialize, Deserialize, Zeroize, ZeroizeOnDrop)]
pub struct KeyPair {
    pub public_key: Vec<u8>,
    #[serde(skip)]
    pub secret_key: Vec<u8>,
    pub algorithm: SignatureAlgorithm,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Signature {
    pub data: Vec<u8>,
    pub algorithm: SignatureAlgorithm,
}

#[derive(Debug, Clone, Serialize, Deserialize, Zeroize, ZeroizeOnDrop)]
pub struct KeyExchangeKeyPair {
    pub public_key: Vec<u8>,
    #[serde(skip)]
    pub secret_key: Vec<u8>,
    pub algorithm: KeyExchangeAlgorithm,
}

pub struct PQCManager {
    signature_keypair: KeyPair,
    key_exchange_keypair: KeyExchangeKeyPair,
}

impl PQCManager {
    pub fn new() -> Result<Self, PQCError> {
        Self::new_with_algorithms(
            SignatureAlgorithm::Dilithium5,
            KeyExchangeAlgorithm::Kyber1024,
        )
    }
    
    pub fn new_with_algorithms(
        sig_alg: SignatureAlgorithm,
        kex_alg: KeyExchangeAlgorithm,
    ) -> Result<Self, PQCError> {
        let signature_keypair = generate_signature_keypair(&sig_alg)?;
        let key_exchange_keypair = generate_key_exchange_keypair(&kex_alg)?;
        
        Ok(Self {
            signature_keypair,
            key_exchange_keypair,
        })
    }
    
    pub fn sign(&self, message: &[u8]) -> Result<Signature, PQCError> {
        match self.signature_keypair.algorithm {
            SignatureAlgorithm::Dilithium5 => {
                let sk = SignSecretKey::from_bytes(&self.signature_keypair.secret_key)
                    .map_err(|_| PQCError::InvalidKey)?;
                
                let signed_message = dilithium5::sign(message, &sk);
                
                Ok(Signature {
                    data: SignedMessage::as_bytes(&signed_message).to_vec(),
                    algorithm: SignatureAlgorithm::Dilithium5,
                })
            }
            _ => Err(PQCError::UnsupportedAlgorithm(format!("{:?}", self.signature_keypair.algorithm))),
        }
    }
    
    pub fn verify(&self, message: &[u8], signature: &Signature, public_key: &[u8]) -> Result<bool, PQCError> {
        match signature.algorithm {
            SignatureAlgorithm::Dilithium5 => {
                let pk = SignPublicKey::from_bytes(public_key)
                    .map_err(|_| PQCError::InvalidKey)?;
                
                let signed_message = SignedMessage::from_bytes(&signature.data)
                    .map_err(|_| PQCError::InvalidSignature)?;
                
                match dilithium5::open(&signed_message, &pk) {
                    Ok(verified_message) => Ok(verified_message == message),
                    Err(_) => Ok(false),
                }
            }
            _ => Err(PQCError::UnsupportedAlgorithm(format!("{:?}", signature.algorithm))),
        }
    }
    
    pub fn encapsulate(&self, peer_public_key: &[u8]) -> Result<(Vec<u8>, Vec<u8>), PQCError> {
        match self.key_exchange_keypair.algorithm {
            KeyExchangeAlgorithm::Kyber1024 => {
                let pk = KemPublicKey::from_bytes(peer_public_key)
                    .map_err(|_| PQCError::InvalidKey)?;
                
                let (ciphertext, shared_secret) = kyber1024::encapsulate(&pk);
                
                Ok((Ciphertext::as_bytes(&ciphertext).to_vec(), SharedSecret::as_bytes(&shared_secret).to_vec()))
            }
        }
    }
    
    pub fn decapsulate(&self, ciphertext: &[u8]) -> Result<Vec<u8>, PQCError> {
        match self.key_exchange_keypair.algorithm {
            KeyExchangeAlgorithm::Kyber1024 => {
                let sk = KemSecretKey::from_bytes(&self.key_exchange_keypair.secret_key)
                    .map_err(|_| PQCError::InvalidKey)?;
                
                let ct = Ciphertext::from_bytes(ciphertext)
                    .map_err(|_| PQCError::InvalidKey)?;
                
                let shared_secret = kyber1024::decapsulate(&ct, &sk);
                
                Ok(SharedSecret::as_bytes(&shared_secret).to_vec())
            }
        }
    }
    
    pub fn get_signature_public_key(&self) -> &[u8] {
        &self.signature_keypair.public_key
    }
    
    pub fn get_key_exchange_public_key(&self) -> &[u8] {
        &self.key_exchange_keypair.public_key
    }
    
    pub fn get_signature_algorithm(&self) -> &SignatureAlgorithm {
        &self.signature_keypair.algorithm
    }
    
    pub fn get_key_exchange_algorithm(&self) -> &KeyExchangeAlgorithm {
        &self.key_exchange_keypair.algorithm
    }
    
    // Crypto-agility: Switch signature algorithms
    pub fn switch_signature_algorithm(&mut self, algorithm: SignatureAlgorithm) -> Result<(), PQCError> {
        self.signature_keypair = generate_signature_keypair(&algorithm)?;
        log::info!("Switched to signature algorithm: {:?}", algorithm);
        Ok(())
    }
    
    // Crypto-agility: Switch key exchange algorithms
    pub fn switch_key_exchange_algorithm(&mut self, algorithm: KeyExchangeAlgorithm) -> Result<(), PQCError> {
        self.key_exchange_keypair = generate_key_exchange_keypair(&algorithm)?;
        log::info!("Switched to key exchange algorithm: {:?}", algorithm);
        Ok(())
    }
}

// Helper functions for key generation
fn generate_signature_keypair(algorithm: &SignatureAlgorithm) -> Result<KeyPair, PQCError> {
    match algorithm {
        SignatureAlgorithm::Dilithium5 => {
            let (pk, sk) = dilithium5::keypair();
            Ok(KeyPair {
                public_key: SignPublicKey::as_bytes(&pk).to_vec(),
                secret_key: SignSecretKey::as_bytes(&sk).to_vec(),
                algorithm: algorithm.clone(),
            })
        }
        SignatureAlgorithm::Falcon1024 => {
            // Placeholder for Falcon implementation
            Err(PQCError::UnsupportedAlgorithm("Falcon1024".to_string()))
        }
        SignatureAlgorithm::SphincsSha256128s => {
            // Placeholder for SPHINCS+ implementation
            Err(PQCError::UnsupportedAlgorithm("SphincsSha256128s".to_string()))
        }
    }
}

fn generate_key_exchange_keypair(algorithm: &KeyExchangeAlgorithm) -> Result<KeyExchangeKeyPair, PQCError> {
    match algorithm {
        KeyExchangeAlgorithm::Kyber1024 => {
            let (pk, sk) = kyber1024::keypair();
            Ok(KeyExchangeKeyPair {
                public_key: KemPublicKey::as_bytes(&pk).to_vec(),
                secret_key: KemSecretKey::as_bytes(&sk).to_vec(),
                algorithm: algorithm.clone(),
            })
        }
    }
}

/// Represents a Dytallix account with PQC capabilities
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Account {
    pub name: String,
    pub address: String,
    pub public_key: Vec<u8>,
    pub signature_algorithm: SignatureAlgorithm,
    pub key_exchange_public_key: Vec<u8>,
    pub key_exchange_algorithm: KeyExchangeAlgorithm,
    pub created_at: u64,
    pub metadata: HashMap<String, String>,
}

/// Secure storage for private keys (encrypted)
#[derive(Debug, Serialize, Deserialize, Zeroize, ZeroizeOnDrop)]
pub struct SecureKeyStore {
    #[serde(skip)]
    pub signature_private_key: Vec<u8>,
    #[serde(skip)]
    pub key_exchange_private_key: Vec<u8>,
    pub encrypted_data: Vec<u8>, // Encrypted version of keys
    pub salt: Vec<u8>,
    pub nonce: Vec<u8>,
}

/// Account manager for handling multiple PQC accounts
pub struct AccountManager {
    accounts: HashMap<String, Account>,
    key_stores: HashMap<String, SecureKeyStore>,
    data_dir: PathBuf,
}

impl AccountManager {
    pub fn new<P: AsRef<Path>>(data_dir: P) -> Result<Self, PQCError> {
        let data_dir = data_dir.as_ref().to_path_buf();
        
        // Create data directory if it doesn't exist
        if !data_dir.exists() {
            fs::create_dir_all(&data_dir)
                .map_err(|_| PQCError::KeyGenerationFailed)?;
        }
        
        let mut manager = Self {
            accounts: HashMap::new(),
            key_stores: HashMap::new(),
            data_dir,
        };
        
        manager.load_accounts()?;
        Ok(manager)
    }
    
    /// Create a new PQC account with specified algorithms
    pub fn create_account(
        &mut self,
        name: String,
        signature_alg: SignatureAlgorithm,
        key_exchange_alg: KeyExchangeAlgorithm,
        passphrase: Option<&str>,
    ) -> Result<Account, PQCError> {
        if self.accounts.contains_key(&name) {
            return Err(PQCError::InvalidKey); // Account already exists
        }
        
        // Generate keypairs
        let signature_keypair = generate_signature_keypair(&signature_alg)?;
        let key_exchange_keypair = generate_key_exchange_keypair(&key_exchange_alg)?;
        
        // Generate Dytallix address from public key
        let address = Self::generate_address(&signature_keypair.public_key);
        
        // Create account
        let account = Account {
            name: name.clone(),
            address,
            public_key: signature_keypair.public_key.clone(),
            signature_algorithm: signature_alg,
            key_exchange_public_key: key_exchange_keypair.public_key.clone(),
            key_exchange_algorithm: key_exchange_alg,
            created_at: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
            metadata: HashMap::new(),
        };
        
        // Create secure key store (simplified for now)
        let key_store = SecureKeyStore {
            signature_private_key: signature_keypair.secret_key,
            key_exchange_private_key: key_exchange_keypair.secret_key,
            encrypted_data: Vec::new(),
            salt: Vec::new(),
            nonce: Vec::new(),
        };
        
        // Store account and keys
        self.accounts.insert(name.clone(), account.clone());
        self.key_stores.insert(name.clone(), key_store);
        
        // Persist to disk
        self.save_account(&account)?;
        self.save_key_store(&name)?;
        
        Ok(account)
    }
    
    /// Generate a Dytallix address from a public key
    fn generate_address(public_key: &[u8]) -> String {
        let mut hasher = Sha3_256::new();
        hasher.update(b"dytallix_address_v1");
        hasher.update(public_key);
        let hash = hasher.finalize();
        
        // Take first 20 bytes and encode with Dytallix prefix
        let address_bytes = &hash[..20];
        format!("dyt1{}", hex::encode(address_bytes))
    }
    
    /// Get account by name
    pub fn get_account(&self, name: &str) -> Option<&Account> {
        self.accounts.get(name)
    }
    
    /// List all account names
    pub fn list_accounts(&self) -> Vec<String> {
        self.accounts.keys().cloned().collect()
    }
    
    /// Get PQC manager for an account (simplified)
    pub fn get_pqc_manager(&self, name: &str, _passphrase: Option<&str>) -> Result<PQCManager, PQCError> {
        let account = self.accounts.get(name)
            .ok_or(PQCError::InvalidKey)?;
        
        let key_store = self.key_stores.get(name)
            .ok_or(PQCError::InvalidKey)?;
        
        let signature_keypair = KeyPair {
            public_key: account.public_key.clone(),
            secret_key: key_store.signature_private_key.clone(),
            algorithm: account.signature_algorithm.clone(),
        };
        
        let key_exchange_keypair = KeyExchangeKeyPair {
            public_key: account.key_exchange_public_key.clone(),
            secret_key: key_store.key_exchange_private_key.clone(),
            algorithm: account.key_exchange_algorithm.clone(),
        };
        
        Ok(PQCManager {
            signature_keypair,
            key_exchange_keypair,
        })
    }
    
    /// Export account to a portable format
    pub fn export_account(&self, name: &str, include_private_keys: bool) -> Result<serde_json::Value, PQCError> {
        let account = self.accounts.get(name)
            .ok_or(PQCError::InvalidKey)?;
        
        let mut export_data = serde_json::to_value(account)
            .map_err(|_| PQCError::InvalidKey)?;
        
        if include_private_keys {
            if let Some(key_store) = self.key_stores.get(name) {
                export_data["key_store"] = serde_json::to_value(key_store)
                    .map_err(|_| PQCError::InvalidKey)?;
            }
        }
        
        Ok(export_data)
    }
    
    /// Import account from exported data
    pub fn import_account(&mut self, account_data: &str, _passphrase: Option<&str>) -> Result<String, PQCError> {
        let data: serde_json::Value = serde_json::from_str(account_data)
            .map_err(|_| PQCError::InvalidKey)?;
        
        let account: Account = serde_json::from_value(data.clone())
            .map_err(|_| PQCError::InvalidKey)?;
        
        if self.accounts.contains_key(&account.name) {
            return Err(PQCError::InvalidKey); // Account already exists
        }
        
        // Import key store if present
        if let Some(key_store_data) = data.get("key_store") {
            let key_store: SecureKeyStore = serde_json::from_value(key_store_data.clone())
                .map_err(|_| PQCError::InvalidKey)?;
            self.key_stores.insert(account.name.clone(), key_store);
        }
        
        let account_name = account.name.clone();
        self.accounts.insert(account_name.clone(), account.clone());
        
        // Save to disk
        self.save_account(&account)?;
        if self.key_stores.contains_key(&account_name) {
            self.save_key_store(&account_name)?;
        }
        
        Ok(account_name)
    }
    
    /// Save account to disk
    fn save_account(&self, account: &Account) -> Result<(), PQCError> {
        let account_file = self.data_dir.join(format!("{}.account", account.name));
        let json_data = serde_json::to_string_pretty(account)
            .map_err(|_| PQCError::InvalidKey)?;
        
        fs::write(account_file, json_data)
            .map_err(|_| PQCError::KeyGenerationFailed)?;
        
        Ok(())
    }
    
    /// Save key store to disk (simplified)
    fn save_key_store(&self, name: &str) -> Result<(), PQCError> {
        let key_file = self.data_dir.join(format!("{}.keystore", name));
        
        // For now, just create an empty file to indicate the keystore exists
        fs::write(key_file, "{}")
            .map_err(|_| PQCError::KeyGenerationFailed)?;
        
        Ok(())
    }
    
    /// Load all accounts from disk
    fn load_accounts(&mut self) -> Result<(), PQCError> {
        if !self.data_dir.exists() {
            return Ok(());
        }
        
        let entries = fs::read_dir(&self.data_dir)
            .map_err(|_| PQCError::KeyGenerationFailed)?;
        
        for entry in entries {
            let entry = entry.map_err(|_| PQCError::KeyGenerationFailed)?;
            let path = entry.path();
            
            if let Some(extension) = path.extension() {
                if extension == "account" {
                    if let Some(stem) = path.file_stem() {
                        let account_name = stem.to_string_lossy().to_string();
                        self.load_account(&account_name)?;
                    }
                }
            }
        }
        
        Ok(())
    }
    
    /// Load specific account from disk
    fn load_account(&mut self, name: &str) -> Result<(), PQCError> {
        let account_file = self.data_dir.join(format!("{}.account", name));
        
        if !account_file.exists() {
            return Ok(());
        }
        
        // Load account
        let account_data = fs::read_to_string(account_file)
            .map_err(|_| PQCError::InvalidKey)?;
        let account: Account = serde_json::from_str(&account_data)
            .map_err(|_| PQCError::InvalidKey)?;
        
        self.accounts.insert(name.to_string(), account);
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_signature_generation_and_verification() {
        let pqc = PQCManager::new().unwrap();
        let message = b"Hello, quantum world!";
        
        let signature = pqc.sign(message).unwrap();
        let is_valid = pqc.verify(message, &signature, pqc.get_signature_public_key()).unwrap();
        
        assert!(is_valid);
    }
    
    #[test]
    fn test_key_exchange() {
        let alice = PQCManager::new().unwrap();
        let bob = PQCManager::new().unwrap();
        
        // Alice encapsulates a secret using Bob's public key
        let (ciphertext, alice_shared_secret) = alice.encapsulate(bob.get_key_exchange_public_key()).unwrap();
        
        // Bob decapsulates to get the same secret
        let bob_shared_secret = bob.decapsulate(&ciphertext).unwrap();
        
        assert_eq!(alice_shared_secret, bob_shared_secret);
    }
}
