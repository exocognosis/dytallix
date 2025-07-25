//! Bridge-specific PQC cryptography implementation
//!
//! Extends the PQC crypto library with bridge-specific functionality for cross-chain operations.

use crate::{PQCManager, PQCError, Signature, SignatureAlgorithm, KeyPair};
use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};

/// Bridge-specific signature that includes chain and payload information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BridgeSignature {
    pub signature: Signature,
    pub chain_id: String,
    pub payload_hash: Vec<u8>,
    pub timestamp: u64,
    pub validator_id: String,
}

/// Cross-chain payload formats for different blockchain types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CrossChainPayload {
    EthereumTransaction {
        to: String,
        value: u64,
        data: Vec<u8>,
        gas_limit: u64,
        gas_price: u64,
        nonce: u64,
    },
    CosmosIBCPacket {
        sequence: u64,
        source_port: String,
        source_channel: String,
        dest_port: String,
        dest_channel: String,
        data: Vec<u8>,
        timeout_height: u64,
        timeout_timestamp: u64,
    },
    GenericBridgePayload {
        asset_id: String,
        amount: u64,
        source_chain: String,
        dest_chain: String,
        source_address: String,
        dest_address: String,
        metadata: HashMap<String, String>,
    },
}

/// Multi-signature validation result
#[derive(Debug, Clone)]
pub struct MultiSigValidationResult {
    pub valid_signatures: usize,
    pub required_signatures: usize,
    pub validator_results: HashMap<String, bool>,
    pub consensus_reached: bool,
}

/// Bridge PQC Manager that extends the base PQC functionality
#[derive(Clone)]
pub struct BridgePQCManager {
    pqc_manager: PQCManager,
    validator_keys: HashMap<String, (Vec<u8>, SignatureAlgorithm)>, // validator_id -> (public_key, algorithm)
    chain_configs: HashMap<String, ChainConfig>,
    min_signatures: usize,
}

/// Configuration for different blockchain chains
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChainConfig {
    pub chain_id: String,
    pub signature_format: SignatureFormat,
    pub hash_algorithm: HashAlgorithm,
    pub address_format: AddressFormat,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SignatureFormat {
    Raw,
    DER,
    Ethereum,
    Cosmos,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum HashAlgorithm {
    Blake3,
    SHA256,
    Keccak256,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AddressFormat {
    Ethereum,
    CosmosBase32,
    PolkadotSS58,
}

impl BridgePQCManager {
    /// Create a new BridgePQCManager with default settings
    pub fn new() -> Result<Self, PQCError> {
        let pqc_manager = PQCManager::new()?;
        
        let mut chain_configs = HashMap::new();
        
        // Add default chain configurations
        chain_configs.insert("ethereum".to_string(), ChainConfig {
            chain_id: "ethereum".to_string(),
            signature_format: SignatureFormat::Ethereum,
            hash_algorithm: HashAlgorithm::Keccak256,
            address_format: AddressFormat::Ethereum,
        });
        
        chain_configs.insert("cosmos".to_string(), ChainConfig {
            chain_id: "cosmos".to_string(),
            signature_format: SignatureFormat::Cosmos,
            hash_algorithm: HashAlgorithm::SHA256,
            address_format: AddressFormat::CosmosBase32,
        });
        
        chain_configs.insert("polkadot".to_string(), ChainConfig {
            chain_id: "polkadot".to_string(),
            signature_format: SignatureFormat::Raw,
            hash_algorithm: HashAlgorithm::Blake3,
            address_format: AddressFormat::PolkadotSS58,
        });

        Ok(Self {
            pqc_manager,
            validator_keys: HashMap::new(),
            chain_configs,
            min_signatures: 3, // Default 3-of-N multi-sig
        })
    }
    
    /// Load or create a BridgePQCManager with persistent storage
    pub fn load_or_create<P: AsRef<std::path::Path>>(path: P) -> Result<Self, PQCError> {
        let pqc_manager = PQCManager::load_or_generate(&path)?;
        
        let mut bridge_manager = Self {
            pqc_manager,
            validator_keys: HashMap::new(),
            chain_configs: HashMap::new(),
            min_signatures: 3,
        };
        
        // Initialize default chain configs
        bridge_manager.initialize_default_chains();
        
        Ok(bridge_manager)
    }
    
    /// Initialize default chain configurations
    fn initialize_default_chains(&mut self) {
        self.chain_configs.insert("ethereum".to_string(), ChainConfig {
            chain_id: "ethereum".to_string(),
            signature_format: SignatureFormat::Ethereum,
            hash_algorithm: HashAlgorithm::Keccak256,
            address_format: AddressFormat::Ethereum,
        });
        
        self.chain_configs.insert("cosmos".to_string(), ChainConfig {
            chain_id: "cosmos".to_string(),
            signature_format: SignatureFormat::Cosmos,
            hash_algorithm: HashAlgorithm::SHA256,
            address_format: AddressFormat::CosmosBase32,
        });
    }
    
    /// Add a validator's public key for multi-signature verification
    pub fn add_validator(&mut self, validator_id: String, public_key: Vec<u8>, algorithm: SignatureAlgorithm) {
        self.validator_keys.insert(validator_id, (public_key, algorithm));
    }
    
    /// Set minimum required signatures for consensus
    pub fn set_min_signatures(&mut self, min_signatures: usize) {
        self.min_signatures = min_signatures;
    }
    
    /// Sign a cross-chain payload for bridge operations
    pub fn sign_bridge_payload(&self, payload: &CrossChainPayload, chain_id: &str, validator_id: &str) -> Result<BridgeSignature, PQCError> {
        // Serialize payload and calculate hash based on chain configuration
        let payload_hash = self.calculate_payload_hash(payload, chain_id)?;
        
        // Sign the payload hash
        let signature = self.pqc_manager.sign(&payload_hash)?;
        
        Ok(BridgeSignature {
            signature,
            chain_id: chain_id.to_string(),
            payload_hash,
            timestamp: SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs(),
            validator_id: validator_id.to_string(),
        })
    }
    
    /// Verify a bridge signature from a specific validator
    pub fn verify_bridge_signature(&self, bridge_sig: &BridgeSignature, payload: &CrossChainPayload) -> Result<bool, PQCError> {
        // Verify payload hash matches
        let expected_hash = self.calculate_payload_hash(payload, &bridge_sig.chain_id)?;
        if expected_hash != bridge_sig.payload_hash {
            return Ok(false);
        }
        
        // Get validator's public key
        let (public_key, algorithm) = self.validator_keys.get(&bridge_sig.validator_id)
            .ok_or_else(|| PQCError::InvalidKey(format!("Unknown validator: {}", bridge_sig.validator_id)))?;
        
        // Verify algorithm matches
        if *algorithm != bridge_sig.signature.algorithm {
            return Ok(false);
        }
        
        // Verify signature
        self.pqc_manager.verify(&bridge_sig.payload_hash, &bridge_sig.signature, public_key)
    }
    
    /// Verify multiple signatures for multi-sig consensus
    pub fn verify_multi_signature(&self, signatures: &[BridgeSignature], payload: &CrossChainPayload) -> Result<MultiSigValidationResult, PQCError> {
        let mut valid_signatures = 0;
        let mut validator_results = HashMap::new();
        
        for bridge_sig in signatures {
            let is_valid = self.verify_bridge_signature(bridge_sig, payload)?;
            validator_results.insert(bridge_sig.validator_id.clone(), is_valid);
            
            if is_valid {
                valid_signatures += 1;
            }
        }
        
        let consensus_reached = valid_signatures >= self.min_signatures;
        
        Ok(MultiSigValidationResult {
            valid_signatures,
            required_signatures: self.min_signatures,
            validator_results,
            consensus_reached,
        })
    }
    
    /// Calculate payload hash based on chain configuration
    fn calculate_payload_hash(&self, payload: &CrossChainPayload, chain_id: &str) -> Result<Vec<u8>, PQCError> {
        let serialized = serde_json::to_vec(payload)
            .map_err(|e| PQCError::InvalidKey(format!("Payload serialization error: {}", e)))?;
        
        let chain_config = self.chain_configs.get(chain_id)
            .ok_or_else(|| PQCError::UnsupportedAlgorithm(format!("Unknown chain: {}", chain_id)))?;
        
        match chain_config.hash_algorithm {
            HashAlgorithm::Blake3 => Ok(blake3::hash(&serialized).as_bytes().to_vec()),
            HashAlgorithm::SHA256 => {
                use sha2::{Sha256, Digest};
                let mut hasher = Sha256::new();
                hasher.update(&serialized);
                Ok(hasher.finalize().to_vec())
            },
            HashAlgorithm::Keccak256 => {
                // For now, use SHA256 as placeholder - in production would use keccak256
                use sha2::{Sha256, Digest};
                let mut hasher = Sha256::new();
                hasher.update(&serialized);
                Ok(hasher.finalize().to_vec())
            },
        }
    }
    
    /// Format signature for specific chain requirements
    pub fn format_signature_for_chain(&self, signature: &BridgeSignature) -> Result<Vec<u8>, PQCError> {
        let chain_config = self.chain_configs.get(&signature.chain_id)
            .ok_or_else(|| PQCError::UnsupportedAlgorithm(format!("Unknown chain: {}", signature.chain_id)))?;
        
        match chain_config.signature_format {
            SignatureFormat::Raw => Ok(signature.signature.data.clone()),
            SignatureFormat::DER => {
                // In production, would implement DER encoding
                Ok(signature.signature.data.clone())
            },
            SignatureFormat::Ethereum => {
                // In production, would implement Ethereum-specific signature format
                Ok(signature.signature.data.clone())
            },
            SignatureFormat::Cosmos => {
                // In production, would implement Cosmos-specific signature format
                Ok(signature.signature.data.clone())
            },
        }
    }
    
    /// Get supported chains
    pub fn get_supported_chains(&self) -> Vec<String> {
        self.chain_configs.keys().cloned().collect()
    }
    
    /// Get validator public keys
    pub fn get_validator_public_key(&self, validator_id: &str) -> Option<&Vec<u8>> {
        self.validator_keys.get(validator_id).map(|(key, _)| key)
    }
    
    /// Get the underlying PQC manager for direct operations
    pub fn get_pqc_manager(&self) -> &PQCManager {
        &self.pqc_manager
    }
    
    /// Get the underlying PQC manager for mutable operations
    pub fn get_pqc_manager_mut(&mut self) -> &mut PQCManager {
        &mut self.pqc_manager
    }
    
    /// Generate a new validator keypair
    pub fn generate_validator_keypair(&self, algorithm: &SignatureAlgorithm) -> Result<KeyPair, PQCError> {
        self.pqc_manager.generate_keypair(algorithm)
    }
    
    /// Add a new chain configuration
    pub fn add_chain_config(&mut self, chain_id: String, config: ChainConfig) {
        self.chain_configs.insert(chain_id, config);
    }
    
    /// Get chain configuration
    pub fn get_chain_config(&self, chain_id: &str) -> Option<&ChainConfig> {
        self.chain_configs.get(chain_id)
    }
}

impl Default for BridgePQCManager {
    fn default() -> Self {
        Self::new().expect("Failed to create BridgePQCManager")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_bridge_signature_creation_and_verification() {
        let mut bridge_manager = BridgePQCManager::new().unwrap();
        
        // Add a validator
        let validator_keypair = bridge_manager.generate_validator_keypair(&SignatureAlgorithm::Dilithium5).unwrap();
        bridge_manager.add_validator(
            "validator_1".to_string(),
            validator_keypair.public_key.clone(),
            SignatureAlgorithm::Dilithium5,
        );
        
        // Create a test payload
        let payload = CrossChainPayload::GenericBridgePayload {
            asset_id: "USDC".to_string(),
            amount: 1000000,
            source_chain: "ethereum".to_string(),
            dest_chain: "cosmos".to_string(),
            source_address: "0x742d35Cc6634C0532925a3b8D1EbA4F00b7C8000".to_string(),
            dest_address: "cosmos1abc123...".to_string(),
            metadata: HashMap::new(),
        };
        
        // Sign the payload (would use validator's private key in production)
        let bridge_signature = bridge_manager.sign_bridge_payload(&payload, "ethereum", "validator_1").unwrap();
        
        // Verify the signature
        let is_valid = bridge_manager.verify_bridge_signature(&bridge_signature, &payload).unwrap();
        assert!(is_valid);
    }
    
    #[test]
    fn test_multi_signature_validation() {
        let mut bridge_manager = BridgePQCManager::new().unwrap();
        bridge_manager.set_min_signatures(2);
        
        // Add multiple validators
        for i in 1..=3 {
            let validator_keypair = bridge_manager.generate_validator_keypair(&SignatureAlgorithm::Dilithium5).unwrap();
            bridge_manager.add_validator(
                format!("validator_{}", i),
                validator_keypair.public_key.clone(),
                SignatureAlgorithm::Dilithium5,
            );
        }
        
        let payload = CrossChainPayload::EthereumTransaction {
            to: "0x742d35Cc6634C0532925a3b8D1EbA4F00b7C8000".to_string(),
            value: 1000000,
            data: vec![],
            gas_limit: 21000,
            gas_price: 20000000000,
            nonce: 1,
        };
        
        // Create signatures from multiple validators
        let mut signatures = Vec::new();
        for i in 1..=3 {
            let bridge_signature = bridge_manager.sign_bridge_payload(&payload, "ethereum", &format!("validator_{}", i)).unwrap();
            signatures.push(bridge_signature);
        }
        
        // Verify multi-signature
        let result = bridge_manager.verify_multi_signature(&signatures, &payload).unwrap();
        assert!(result.consensus_reached);
        assert_eq!(result.valid_signatures, 3);
        assert_eq!(result.required_signatures, 2);
    }
    
    #[test]
    fn test_cross_chain_payload_formats() {
        let bridge_manager = BridgePQCManager::new().unwrap();
        
        // Test Ethereum transaction format
        let eth_payload = CrossChainPayload::EthereumTransaction {
            to: "0x742d35Cc6634C0532925a3b8D1EbA4F00b7C8000".to_string(),
            value: 1000000,
            data: vec![0x12, 0x34],
            gas_limit: 21000,
            gas_price: 20000000000,
            nonce: 1,
        };
        
        let eth_hash = bridge_manager.calculate_payload_hash(&eth_payload, "ethereum").unwrap();
        assert!(!eth_hash.is_empty());
        
        // Test Cosmos IBC packet format
        let cosmos_payload = CrossChainPayload::CosmosIBCPacket {
            sequence: 1,
            source_port: "transfer".to_string(),
            source_channel: "channel-0".to_string(),
            dest_port: "transfer".to_string(),
            dest_channel: "channel-1".to_string(),
            data: vec![0x56, 0x78],
            timeout_height: 1000,
            timeout_timestamp: 1234567890,
        };
        
        let cosmos_hash = bridge_manager.calculate_payload_hash(&cosmos_payload, "cosmos").unwrap();
        assert!(!cosmos_hash.is_empty());
        
        // Hashes should be different for different payloads
        assert_ne!(eth_hash, cosmos_hash);
    }
    
    #[test]
    fn test_invalid_signature_scenarios() {
        let mut bridge_manager = BridgePQCManager::new().unwrap();
        
        // Add a validator
        let validator_keypair = bridge_manager.generate_validator_keypair(&SignatureAlgorithm::Dilithium5).unwrap();
        bridge_manager.add_validator(
            "validator_1".to_string(),
            validator_keypair.public_key.clone(),
            SignatureAlgorithm::Dilithium5,
        );
        
        let payload = CrossChainPayload::GenericBridgePayload {
            asset_id: "USDC".to_string(),
            amount: 1000000,
            source_chain: "ethereum".to_string(),
            dest_chain: "cosmos".to_string(),
            source_address: "0x742d35Cc6634C0532925a3b8D1EbA4F00b7C8000".to_string(),
            dest_address: "cosmos1abc123...".to_string(),
            metadata: HashMap::new(),
        };
        
        // Create a valid signature
        let mut bridge_signature = bridge_manager.sign_bridge_payload(&payload, "ethereum", "validator_1").unwrap();
        
        // Test with tampered payload
        let tampered_payload = CrossChainPayload::GenericBridgePayload {
            asset_id: "USDC".to_string(),
            amount: 2000000, // Changed amount
            source_chain: "ethereum".to_string(),
            dest_chain: "cosmos".to_string(),
            source_address: "0x742d35Cc6634C0532925a3b8D1EbA4F00b7C8000".to_string(),
            dest_address: "cosmos1abc123...".to_string(),
            metadata: HashMap::new(),
        };
        
        let is_valid = bridge_manager.verify_bridge_signature(&bridge_signature, &tampered_payload).unwrap();
        assert!(!is_valid);
        
        // Test with unknown validator
        bridge_signature.validator_id = "unknown_validator".to_string();
        let result = bridge_manager.verify_bridge_signature(&bridge_signature, &payload);
        assert!(result.is_err());
    }
}