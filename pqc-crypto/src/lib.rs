//! Dytallix PQC Cryptography Library
//!
//! Provides key generation, signing, and verification for Dilithium, Falcon, and SPHINCS+.

pub enum PQCAlgorithm {
    Dilithium,
    Falcon,
    SphincsPlus,
}

pub struct PQCKeyPair {
    pub public: Vec<u8>,
    pub private: Vec<u8>,
}

pub struct Signature(pub Vec<u8>);

pub trait PQCKeyManager {
    fn generate_keypair(algo: PQCAlgorithm) -> PQCKeyPair;
    fn sign(message: &[u8], keypair: &PQCKeyPair, algo: PQCAlgorithm) -> Signature;
    fn verify(message: &[u8], sig: &Signature, pubkey: &[u8], algo: PQCAlgorithm) -> bool;
}

/// Dummy implementation for scaffolding
pub struct DummyPQC;

impl PQCKeyManager for DummyPQC {
    fn generate_keypair(algo: PQCAlgorithm) -> PQCKeyPair {
        // TODO: Integrate real PQC library (liboqs, PQClean, etc.)
        PQCKeyPair { public: vec![0; 32], private: vec![0; 64] }
    }
    fn sign(_message: &[u8], _keypair: &PQCKeyPair, _algo: PQCAlgorithm) -> Signature {
        // TODO: Implement real signing
        Signature(vec![1; 64])
    }
    fn verify(_message: &[u8], _sig: &Signature, _pubkey: &[u8], _algo: PQCAlgorithm) -> bool {
        // TODO: Implement real verification
        true
    }
}

use pqcrypto_dilithium::dilithium5;
use pqcrypto_falcon::falcon1024;
use pqcrypto_sphincsplus::sphincssha256128ssimple;
use pqcrypto_kyber::kyber1024;
use pqcrypto_traits::sign::{PublicKey as SignPublicKey, SecretKey as SignSecretKey, SignedMessage};
use pqcrypto_traits::kem::{PublicKey as KemPublicKey, SecretKey as KemSecretKey, Ciphertext, SharedSecret};
use serde::{Serialize, Deserialize};
use thiserror::Error;
use sha3::{Sha3_256, Digest};
use hex;
use std::collections::{HashMap, HashSet};
use rand::Rng;
use chrono::Utc;
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

/// Signature length constants for basic validation
const DILITHIUM5_SIGNATURE_LEN: usize = 4595;
const FALCON1024_SIGNATURE_LEN: usize = 1330;
const SPHINCS_SHA256_128S_SIGNATURE_LEN: usize = 7856;

#[derive(Default, Debug)]
pub struct SignatureMetrics {
    pub verification_success: u64,
    pub verification_failure: u64,
    pub algorithm_usage: HashMap<SignatureAlgorithm, u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
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
    pub nonce: u64,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyExchangeKeyPair {
    pub public_key: Vec<u8>,
    #[serde(skip)]
    pub secret_key: Vec<u8>,
    pub algorithm: KeyExchangeAlgorithm,
}

pub struct PQCManager {
    signature_keypair: KeyPair,
    key_exchange_keypair: KeyExchangeKeyPair,
    metrics: SignatureMetrics,
    used_nonces: HashSet<u64>,
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
            metrics: SignatureMetrics::default(),
            used_nonces: HashSet::new(),
        })
    }
    
    pub fn sign(&self, message: &[u8]) -> Result<Signature, PQCError> {
        let nonce: u64 = rand::thread_rng().gen();
        let timestamp = Utc::now().timestamp() as u64;
        let entry = self.metrics.algorithm_usage.entry(self.signature_keypair.algorithm.clone()).or_insert(0);
        *entry += 1;
        match self.signature_keypair.algorithm {
            SignatureAlgorithm::Dilithium5 => {
                let sk = dilithium5::SecretKey::from_bytes(&self.signature_keypair.secret_key)
                    .map_err(|_| PQCError::InvalidKey)?;

                let signed_message = dilithium5::sign(message, &sk);

                Ok(Signature {
                    data: signed_message.as_bytes().to_vec(),
                    algorithm: SignatureAlgorithm::Dilithium5,
                    nonce,
                    timestamp,
                })
            }
            SignatureAlgorithm::Falcon1024 => {
                let sk = falcon1024::SecretKey::from_bytes(&self.signature_keypair.secret_key)
                    .map_err(|_| PQCError::InvalidKey)?;

                let signed_message = falcon1024::sign(message, &sk);

                Ok(Signature {
                    data: signed_message.as_bytes().to_vec(),
                    algorithm: SignatureAlgorithm::Falcon1024,
                    nonce,
                    timestamp,
                })
            }
            SignatureAlgorithm::SphincsSha256128s => {
                let sk = sphincssha256128ssimple::SecretKey::from_bytes(&self.signature_keypair.secret_key)
                    .map_err(|_| PQCError::InvalidKey)?;

                let signed_message = sphincssha256128ssimple::sign(message, &sk);

                Ok(Signature {
                    data: signed_message.as_bytes().to_vec(),
                    algorithm: SignatureAlgorithm::SphincsSha256128s,
                    nonce,
                    timestamp,
                })
            }
        }
    }
    
    pub fn verify(&self, message: &[u8], signature: &Signature, public_key: &[u8]) -> Result<bool, PQCError> {
        if self.used_nonces.contains(&signature.nonce) {
            log::warn!("Replay detected for nonce {}", signature.nonce);
            self.metrics.verification_failure += 1;
            return Ok(false);
        }

        let expected_len = match signature.algorithm {
            SignatureAlgorithm::Dilithium5 => DILITHIUM5_SIGNATURE_LEN,
            SignatureAlgorithm::Falcon1024 => FALCON1024_SIGNATURE_LEN,
            SignatureAlgorithm::SphincsSha256128s => SPHINCS_SHA256_128S_SIGNATURE_LEN,
        };

        if signature.data.len() != expected_len {
            log::error!("Invalid signature length: {} (expected {})", signature.data.len(), expected_len);
            self.metrics.verification_failure += 1;
            return Err(PQCError::InvalidSignature);
        }

        let entry = self.metrics.algorithm_usage.entry(signature.algorithm.clone()).or_insert(0);
        *entry += 1;

        let result = match signature.algorithm {
            SignatureAlgorithm::Dilithium5 => {
                let pk = dilithium5::PublicKey::from_bytes(public_key)
                    .map_err(|_| PQCError::InvalidKey)?;
                
                let signed_message = dilithium5::SignedMessage::from_bytes(&signature.data)
                    .map_err(|_| PQCError::InvalidSignature)?;
                
                match dilithium5::open(&signed_message, &pk) {
                    Ok(verified_message) => Ok(verified_message == message),
                    Err(_) => Ok(false),
                }
            }
            SignatureAlgorithm::Falcon1024 => {
                let pk = falcon1024::PublicKey::from_bytes(public_key)
                    .map_err(|_| PQCError::InvalidKey)?;
                
                let signed_message = falcon1024::SignedMessage::from_bytes(&signature.data)
                    .map_err(|_| PQCError::InvalidSignature)?;
                
                match falcon1024::open(&signed_message, &pk) {
                    Ok(verified_message) => Ok(verified_message == message),
                    Err(_) => Ok(false),
                }
            }
            SignatureAlgorithm::SphincsSha256128s => {
                let pk = sphincssha256128ssimple::PublicKey::from_bytes(public_key)
                    .map_err(|_| PQCError::InvalidKey)?;
                
                let signed_message = sphincssha256128ssimple::SignedMessage::from_bytes(&signature.data)
                    .map_err(|_| PQCError::InvalidSignature)?;
                
                match sphincssha256128ssimple::open(&signed_message, &pk) {
                    Ok(verified_message) => Ok(verified_message == message),
                    Err(_) => Ok(false),
                }
            }
        }?;

        if result {
            self.used_nonces.insert(signature.nonce);
            self.metrics.verification_success += 1;
            log::info!("Signature verified successfully using {:?}", signature.algorithm);
        } else {
            self.metrics.verification_failure += 1;
            log::warn!("Signature verification failed using {:?}", signature.algorithm);
        }

        Ok(result)
    }
    
    pub fn encapsulate(&self, peer_public_key: &[u8]) -> Result<(Vec<u8>, Vec<u8>), PQCError> {
        match self.key_exchange_keypair.algorithm {
            KeyExchangeAlgorithm::Kyber1024 => {
                let pk = KemPublicKey::from_bytes(peer_public_key)
                    .map_err(|_| PQCError::InvalidKey)?;
                
                let (ciphertext, shared_secret) = kyber1024::encapsulate(&pk);
                
                // Convert to byte vectors using the specific type methods
                Ok((
                    ciphertext.as_bytes().to_vec(), 
                    shared_secret.as_bytes().to_vec()
                ))
            }
        }
    }
    
    pub fn decapsulate(&self, ciphertext: &[u8]) -> Result<Vec<u8>, PQCError> {
        match self.key_exchange_keypair.algorithm {
            KeyExchangeAlgorithm::Kyber1024 => {
                let sk = kyber1024::SecretKey::from_bytes(&self.key_exchange_keypair.secret_key)
                    .map_err(|_| PQCError::InvalidKey)?;
                
                let ct = kyber1024::Ciphertext::from_bytes(ciphertext)
                    .map_err(|_| PQCError::InvalidKey)?;
                
                let shared_secret = kyber1024::decapsulate(&ct, &sk);
                
                Ok(shared_secret.as_bytes().to_vec())
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
    
    /// Generate keypair for the specified algorithm
    pub fn generate_keypair(&self, algorithm: &SignatureAlgorithm) -> Result<KeyPair, PQCError> {
        match algorithm {
            SignatureAlgorithm::Dilithium5 => {
                let (pk, sk) = dilithium5::keypair();
                Ok(KeyPair {
                    public_key: pqcrypto_traits::sign::PublicKey::as_bytes(&pk).to_vec(),
                    secret_key: pqcrypto_traits::sign::SecretKey::as_bytes(&sk).to_vec(),
                    algorithm: algorithm.clone(),
                })
            }
            SignatureAlgorithm::Falcon1024 => {
                let (pk, sk) = falcon1024::keypair();
                Ok(KeyPair {
                    public_key: pqcrypto_traits::sign::PublicKey::as_bytes(&pk).to_vec(),
                    secret_key: pqcrypto_traits::sign::SecretKey::as_bytes(&sk).to_vec(),
                    algorithm: algorithm.clone(),
                })
            }
            SignatureAlgorithm::SphincsSha256128s => {
                let (pk, sk) = sphincssha256128ssimple::keypair();
                Ok(KeyPair {
                    public_key: pqcrypto_traits::sign::PublicKey::as_bytes(&pk).to_vec(),
                    secret_key: pqcrypto_traits::sign::SecretKey::as_bytes(&sk).to_vec(),
                    algorithm: algorithm.clone(),
                })
            }
        }
    }

    /// Sign a message with the specified algorithm  
    pub fn sign_with_algorithm(
        &self,
        message: &[u8],
        secret_key: &[u8],
        algorithm: &SignatureAlgorithm,
    ) -> Result<Vec<u8>, PQCError> {
        match algorithm {
            SignatureAlgorithm::Dilithium5 => {
                let sk = dilithium5::SecretKey::from_bytes(secret_key)
                    .map_err(|_| PQCError::InvalidKey("Invalid Dilithium5 secret key".to_string()))?;
                let signature = dilithium5::sign(message, &sk);
                Ok(signature.as_bytes().to_vec())
            }
            SignatureAlgorithm::Falcon1024 => {
                let sk = falcon1024::SecretKey::from_bytes(secret_key)
                    .map_err(|_| PQCError::InvalidKey("Invalid Falcon1024 secret key".to_string()))?;
                let signature = falcon1024::sign(message, &sk);
                Ok(signature.as_bytes().to_vec())
            }
            SignatureAlgorithm::SphincsSha256128s => {
                let sk = sphincssha256128ssimple::SecretKey::from_bytes(secret_key)
                    .map_err(|_| PQCError::InvalidKey("Invalid SPHINCS+ secret key".to_string()))?;
                let signature = sphincssha256128ssimple::sign(message, &sk);
                Ok(signature.as_bytes().to_vec())
            }
        }
    }

    /// Verify signature with the specified algorithm
    pub fn verify_with_algorithm(
        &self,
        message: &[u8],
        signature: &[u8],
        public_key: &[u8],
        algorithm: &SignatureAlgorithm,
    ) -> Result<bool, PQCError> {
        match algorithm {
            SignatureAlgorithm::Dilithium5 => {
                let pk = dilithium5::PublicKey::from_bytes(public_key)
                    .map_err(|_| PQCError::InvalidKey("Invalid Dilithium5 public key".to_string()))?;
                let sig = dilithium5::Signature::from_bytes(signature)
                    .map_err(|_| PQCError::InvalidSignature("Invalid Dilithium5 signature".to_string()))?;
                Ok(dilithium5::verify(&sig, message, &pk).is_ok())
            }
            SignatureAlgorithm::Falcon1024 => {
                let pk = falcon1024::PublicKey::from_bytes(public_key)
                    .map_err(|_| PQCError::InvalidKey("Invalid Falcon1024 public key".to_string()))?;
                let sig = falcon1024::Signature::from_bytes(signature)
                    .map_err(|_| PQCError::InvalidSignature("Invalid Falcon1024 signature".to_string()))?;
                Ok(falcon1024::verify(&sig, message, &pk).is_ok())
            }
            SignatureAlgorithm::SphincsSha256128s => {
                let pk = sphincssha256128ssimple::PublicKey::from_bytes(public_key)
                    .map_err(|_| PQCError::InvalidKey("Invalid SPHINCS+ public key".to_string()))?;
                let sig = sphincssha256128ssimple::Signature::from_bytes(signature)
                    .map_err(|_| PQCError::InvalidSignature("Invalid SPHINCS+ signature".to_string()))?;
                Ok(sphincssha256128ssimple::verify(&sig, message, &pk).is_ok())
            }
        }
    }
}

/// Crypto-agility framework for seamless algorithm upgrades
#[derive(Debug, Clone)]
pub struct CryptoAgilityManager {
    preferred_algorithm: SignatureAlgorithm,
    supported_algorithms: Vec<SignatureAlgorithm>,
    migration_schedule: Option<AlgorithmMigration>,
}

#[derive(Debug, Clone)]
pub struct AlgorithmMigration {
    from_algorithm: SignatureAlgorithm,
    to_algorithm: SignatureAlgorithm,
    migration_deadline: chrono::DateTime<chrono::Utc>,
    deprecation_warning_period: chrono::Duration,
}

impl CryptoAgilityManager {
    pub fn new() -> Self {
        Self {
            preferred_algorithm: SignatureAlgorithm::Dilithium5,
            supported_algorithms: vec![
                SignatureAlgorithm::Dilithium5,
                SignatureAlgorithm::Falcon1024,
                SignatureAlgorithm::SphincsSha256128s,
            ],
            migration_schedule: None,
        }
    }

    /// Check if an algorithm is supported
    pub fn is_algorithm_supported(&self, algorithm: &SignatureAlgorithm) -> bool {
        self.supported_algorithms.contains(algorithm)
    }

    /// Get the preferred algorithm for new operations
    pub fn get_preferred_algorithm(&self) -> SignatureAlgorithm {
        self.preferred_algorithm.clone()
    }

    /// Schedule an algorithm migration
    pub fn schedule_migration(
        &mut self,
        from: SignatureAlgorithm,
        to: SignatureAlgorithm,
        deadline: chrono::DateTime<chrono::Utc>,
    ) -> Result<(), PQCError> {
        if !self.is_algorithm_supported(&from) || !self.is_algorithm_supported(&to) {
            return Err(PQCError::UnsupportedAlgorithm("Migration algorithms not supported".to_string()));
        }

        self.migration_schedule = Some(AlgorithmMigration {
            from_algorithm: from,
            to_algorithm: to,
            migration_deadline: deadline,
            deprecation_warning_period: chrono::Duration::days(90),
        });

        Ok(())
    }
}
