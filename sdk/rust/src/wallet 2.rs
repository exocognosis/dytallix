//! PQC Wallet implementation using Dilithium3 (ML-DSA-65)

use crate::error::{Result, SdkError};
use pqcrypto_dilithium::dilithium3;
use pqcrypto_traits::sign::{PublicKey, SecretKey, SignedMessage};
use sha2::{Digest, Sha256};
use zeroize::ZeroizeOnDrop;
use std::path::Path;
use std::fs;

/// PQC Wallet with Dilithium3 keys
#[derive(Clone, ZeroizeOnDrop)]
pub struct Wallet {
    #[zeroize(skip)]
    public_key: Vec<u8>,
    secret_key: Vec<u8>,
    #[zeroize(skip)]
    address: String,
}

impl Wallet {
    /// Generate a new wallet with Dilithium3 keys
    pub fn generate() -> Result<Self> {
        let (pk, sk) = dilithium3::keypair();
        let pk_bytes = pk.as_bytes().to_vec();
        let sk_bytes = sk.as_bytes().to_vec();
        let address = Self::derive_address(&pk_bytes);

        Ok(Self {
            public_key: pk_bytes,
            secret_key: sk_bytes,
            address,
        })
    }

    /// Load wallet from JSON file
    pub fn load<P: AsRef<Path>>(path: P) -> Result<Self> {
        let data = fs::read_to_string(path)?;
        let stored: StoredWallet = serde_json::from_str(&data)?;
        
        let pk_bytes = hex::decode(&stored.public_key)
            .map_err(|e| SdkError::KeyGeneration(e.to_string()))?;
        let sk_bytes = hex::decode(&stored.secret_key)
            .map_err(|e| SdkError::KeyGeneration(e.to_string()))?;
        let address = Self::derive_address(&pk_bytes);

        Ok(Self {
            public_key: pk_bytes,
            secret_key: sk_bytes,
            address,
        })
    }

    /// Save wallet to JSON file
    pub fn save<P: AsRef<Path>>(&self, path: P) -> Result<()> {
        let stored = StoredWallet {
            algorithm: "dilithium3".to_string(),
            public_key: hex::encode(&self.public_key),
            secret_key: hex::encode(&self.secret_key),
            address: self.address.clone(),
        };
        let json = serde_json::to_string_pretty(&stored)?;
        fs::write(path, json)?;
        Ok(())
    }

    /// Load or generate wallet
    pub fn load_or_generate<P: AsRef<Path>>(path: P) -> Result<Self> {
        if path.as_ref().exists() {
            Self::load(path)
        } else {
            let wallet = Self::generate()?;
            wallet.save(&path)?;
            Ok(wallet)
        }
    }

    /// Get wallet address (dyt1...)
    pub fn address(&self) -> &str {
        &self.address
    }

    /// Get public key bytes
    pub fn public_key(&self) -> &[u8] {
        &self.public_key
    }

    /// Get public key as hex string
    pub fn public_key_hex(&self) -> String {
        hex::encode(&self.public_key)
    }

    /// Sign a message
    pub fn sign(&self, message: &[u8]) -> Result<Signature> {
        let sk = dilithium3::SecretKey::from_bytes(&self.secret_key)
            .map_err(|_| SdkError::Signing("Invalid secret key".to_string()))?;

        let signed_msg = dilithium3::sign(message, &sk);
        let sig_bytes = signed_msg.as_bytes();

        // Extract just the signature (prepended to message)
        let sig_len = sig_bytes.len() - message.len();
        let signature = sig_bytes[..sig_len].to_vec();

        Ok(Signature {
            data: signature,
            public_key: self.public_key.clone(),
        })
    }

    /// Verify a signature
    pub fn verify(&self, message: &[u8], signature: &Signature) -> Result<bool> {
        let pk = dilithium3::PublicKey::from_bytes(&signature.public_key)
            .map_err(|_| SdkError::Verification)?;

        // Reconstruct signed message format
        let mut signed_bytes = signature.data.clone();
        signed_bytes.extend_from_slice(message);

        let signed_msg = dilithium3::SignedMessage::from_bytes(&signed_bytes)
            .map_err(|_| SdkError::Verification)?;

        match dilithium3::open(&signed_msg, &pk) {
            Ok(_) => Ok(true),
            Err(_) => Ok(false),
        }
    }

    /// Derive address from public key
    /// Format: dyt1 + hex(blake3(pubkey)[..20] + sha256_checksum[..4])
    fn derive_address(pubkey: &[u8]) -> String {
        // Step 1: Hash the public key using Blake3
        let hash = blake3::hash(pubkey);
        let hash_bytes = hash.as_bytes();

        // Step 2: Take first 20 bytes
        let address_bytes = &hash_bytes[..20];

        // Step 3: Calculate checksum using SHA256
        let mut sha256 = Sha256::new();
        sha256.update(address_bytes);
        let checksum = sha256.finalize();

        // Step 4: Append first 4 bytes of checksum
        let checksum_bytes = &checksum[..4];

        // Step 5: Combine and encode
        let mut full_bytes = Vec::with_capacity(24);
        full_bytes.extend_from_slice(address_bytes);
        full_bytes.extend_from_slice(checksum_bytes);

        format!("dyt1{}", hex::encode(full_bytes))
    }
}

/// Signature with public key
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Signature {
    /// Signature bytes
    pub data: Vec<u8>,
    /// Public key bytes
    pub public_key: Vec<u8>,
}

impl Signature {
    /// Get signature as hex
    pub fn to_hex(&self) -> String {
        hex::encode(&self.data)
    }
}

/// Stored wallet format for serialization
#[derive(serde::Serialize, serde::Deserialize)]
struct StoredWallet {
    algorithm: String,
    public_key: String,
    secret_key: String,
    address: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_wallet_generation() {
        let wallet = Wallet::generate().unwrap();
        assert!(wallet.address().starts_with("dyt1"));
        assert_eq!(wallet.address().len(), 4 + 48); // dyt1 + 24 bytes hex
    }

    #[test]
    fn test_sign_verify() {
        let wallet = Wallet::generate().unwrap();
        let message = b"test message";
        
        let signature = wallet.sign(message).unwrap();
        let valid = wallet.verify(message, &signature).unwrap();
        
        assert!(valid);
    }

    #[test]
    fn test_verify_wrong_message() {
        let wallet = Wallet::generate().unwrap();
        let message = b"test message";
        let wrong_message = b"wrong message";
        
        let signature = wallet.sign(message).unwrap();
        let valid = wallet.verify(wrong_message, &signature).unwrap();
        
        assert!(!valid);
    }
}
