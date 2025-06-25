//! Dytallix PQC Cryptography Library
//!
//! Provides key generation, signing, and verification for Dilithium, Falcon, and SPHINCS+.

pub enum PQCAlgorithm {
    Dilithium,
    Falcon,
    SphincsPlus,
}

use pqcrypto_dilithium::dilithium5;
use pqcrypto_falcon::falcon1024;
use pqcrypto_sphincsplus::sphincssha2128ssimple;
use pqcrypto_kyber::kyber1024;
use pqcrypto_traits::sign::{PublicKey as SignPublicKey, SecretKey as SignSecretKey, SignedMessage};
use pqcrypto_traits::kem::{PublicKey as KemPublicKey, SecretKey as KemSecretKey, Ciphertext, SharedSecret};
use serde::{Serialize, Deserialize};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum PQCError {
    #[error("Invalid key format: {0}")]
    InvalidKey(String),
    #[error("Invalid signature format: {0}")]
    InvalidSignature(String),
    #[error("Signature verification failed")]
    VerificationFailed,
    #[error("Unsupported algorithm: {0}")]
    UnsupportedAlgorithm(String),
    #[error("Key generation failed")]
    KeyGenerationFailed,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SignatureAlgorithm {
    Dilithium5,
    Falcon1024,
    SphincsSha256128s,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum KeyExchangeAlgorithm {
    Kyber1024,
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
                let sk = dilithium5::SecretKey::from_bytes(&self.signature_keypair.secret_key)
                    .map_err(|_| PQCError::InvalidKey("Invalid Dilithium5 secret key".to_string()))?;
                
                let signed_message = dilithium5::sign(message, &sk);
                
                Ok(Signature {
                    data: signed_message.as_bytes().to_vec(),
                    algorithm: SignatureAlgorithm::Dilithium5,
                })
            }
            SignatureAlgorithm::Falcon1024 => {
                let sk = falcon1024::SecretKey::from_bytes(&self.signature_keypair.secret_key)
                    .map_err(|_| PQCError::InvalidKey("Invalid Falcon1024 secret key".to_string()))?;
                
                let signed_message = falcon1024::sign(message, &sk);
                
                Ok(Signature {
                    data: signed_message.as_bytes().to_vec(),
                    algorithm: SignatureAlgorithm::Falcon1024,
                })
            }
            SignatureAlgorithm::SphincsSha256128s => {
                let sk = sphincssha2128ssimple::SecretKey::from_bytes(&self.signature_keypair.secret_key)
                    .map_err(|_| PQCError::InvalidKey("Invalid SPHINCS+ secret key".to_string()))?;
                
                let signed_message = sphincssha2128ssimple::sign(message, &sk);
                
                Ok(Signature {
                    data: signed_message.as_bytes().to_vec(),
                    algorithm: SignatureAlgorithm::SphincsSha256128s,
                })
            }
        }
    }
    
    pub fn verify(&self, message: &[u8], signature: &Signature, public_key: &[u8]) -> Result<bool, PQCError> {
        match signature.algorithm {
            SignatureAlgorithm::Dilithium5 => {
                let pk = dilithium5::PublicKey::from_bytes(public_key)
                    .map_err(|_| PQCError::InvalidKey("Invalid Dilithium5 public key".to_string()))?;
                
                let signed_message = dilithium5::SignedMessage::from_bytes(&signature.data)
                    .map_err(|_| PQCError::InvalidSignature("Invalid Dilithium5 signature".to_string()))?;
                
                match dilithium5::open(&signed_message, &pk) {
                    Ok(verified_message) => Ok(verified_message == message),
                    Err(_) => Ok(false),
                }
            }
            SignatureAlgorithm::Falcon1024 => {
                let pk = falcon1024::PublicKey::from_bytes(public_key)
                    .map_err(|_| PQCError::InvalidKey("Invalid Falcon1024 public key".to_string()))?;
                
                let signed_message = falcon1024::SignedMessage::from_bytes(&signature.data)
                    .map_err(|_| PQCError::InvalidSignature("Invalid Falcon1024 signature".to_string()))?;
                
                match falcon1024::open(&signed_message, &pk) {
                    Ok(verified_message) => Ok(verified_message == message),
                    Err(_) => Ok(false),
                }
            }
            SignatureAlgorithm::SphincsSha256128s => {
                let pk = sphincssha2128ssimple::PublicKey::from_bytes(public_key)
                    .map_err(|_| PQCError::InvalidKey("Invalid SPHINCS+ public key".to_string()))?;
                
                let signed_message = sphincssha2128ssimple::SignedMessage::from_bytes(&signature.data)
                    .map_err(|_| PQCError::InvalidSignature("Invalid SPHINCS+ signature".to_string()))?;
                
                match sphincssha2128ssimple::open(&signed_message, &pk) {
                    Ok(verified_message) => Ok(verified_message == message),
                    Err(_) => Ok(false),
                }
            }
        }
    }
    
    pub fn encapsulate(&self, peer_public_key: &[u8]) -> Result<(Vec<u8>, Vec<u8>), PQCError> {
        match self.key_exchange_keypair.algorithm {
            KeyExchangeAlgorithm::Kyber1024 => {
                let pk = KemPublicKey::from_bytes(peer_public_key)
                    .map_err(|_| PQCError::InvalidKey("Invalid Kyber1024 public key".to_string()))?;
                
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
                    .map_err(|_| PQCError::InvalidKey("Invalid Kyber1024 secret key".to_string()))?;
                
                let ct = kyber1024::Ciphertext::from_bytes(ciphertext)
                    .map_err(|_| PQCError::InvalidKey("Invalid Kyber1024 ciphertext".to_string()))?;
                
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
                let (pk, sk) = sphincssha2128ssimple::keypair();
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
                let sk = sphincssha2128ssimple::SecretKey::from_bytes(secret_key)
                    .map_err(|_| PQCError::InvalidKey("Invalid SPHINCS+ secret key".to_string()))?;
                let signature = sphincssha2128ssimple::sign(message, &sk);
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
                let sig = dilithium5::SignedMessage::from_bytes(signature)
                    .map_err(|_| PQCError::InvalidSignature("Invalid Dilithium5 signature".to_string()))?;
                match dilithium5::open(&sig, &pk) {
                    Ok(verified_message) => Ok(verified_message == message),
                    Err(_) => Ok(false),
                }
            }
            SignatureAlgorithm::Falcon1024 => {
                let pk = falcon1024::PublicKey::from_bytes(public_key)
                    .map_err(|_| PQCError::InvalidKey("Invalid Falcon1024 public key".to_string()))?;
                let sig = falcon1024::SignedMessage::from_bytes(signature)
                    .map_err(|_| PQCError::InvalidSignature("Invalid Falcon1024 signature".to_string()))?;
                match falcon1024::open(&sig, &pk) {
                    Ok(verified_message) => Ok(verified_message == message),
                    Err(_) => Ok(false),
                }
            }
            SignatureAlgorithm::SphincsSha256128s => {
                let pk = sphincssha2128ssimple::PublicKey::from_bytes(public_key)
                    .map_err(|_| PQCError::InvalidKey("Invalid SPHINCS+ public key".to_string()))?;
                let sig = sphincssha2128ssimple::SignedMessage::from_bytes(signature)
                    .map_err(|_| PQCError::InvalidSignature("Invalid SPHINCS+ signature".to_string()))?;
                match sphincssha2128ssimple::open(&sig, &pk) {
                    Ok(verified_message) => Ok(verified_message == message),
                    Err(_) => Ok(false),
                }
            }
        }
    }
}

// Helper functions for key generation
fn generate_signature_keypair(algorithm: &SignatureAlgorithm) -> Result<KeyPair, PQCError> {
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
            let (pk, sk) = sphincssha2128ssimple::keypair();
            Ok(KeyPair {
                public_key: pqcrypto_traits::sign::PublicKey::as_bytes(&pk).to_vec(),
                secret_key: pqcrypto_traits::sign::SecretKey::as_bytes(&sk).to_vec(),
                algorithm: algorithm.clone(),
            })
        }
    }
}

fn generate_key_exchange_keypair(algorithm: &KeyExchangeAlgorithm) -> Result<KeyExchangeKeyPair, PQCError> {
    match algorithm {
        KeyExchangeAlgorithm::Kyber1024 => {
            let (pk, sk) = kyber1024::keypair();
            Ok(KeyExchangeKeyPair {
                public_key: pqcrypto_traits::kem::PublicKey::as_bytes(&pk).to_vec(),
                secret_key: pqcrypto_traits::kem::SecretKey::as_bytes(&sk).to_vec(),
                algorithm: algorithm.clone(),
            })
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
