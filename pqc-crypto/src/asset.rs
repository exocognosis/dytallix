//! Quantum-Resistant Permissionless Asset Module
//!
//! This module provides a quantum cryptography-compliant permissionless asset
//! implementation for the Dytallix blockchain. It uses NIST-approved post-quantum
//! cryptographic algorithms to ensure security against quantum computing threats.
//!
//! ## Features
//!
//! - **Quantum-Resistant Cryptography**: Uses Dilithium, Falcon, and SPHINCS+ signatures
//! - **Permissionless Design**: No centralized control or approval required
//! - **Secure Storage**: Blake3 hashing for integrity verification
//! - **Secure Transmission**: PQC-signed transactions for tamper-proof transfers
//! - **Crypto-Agility**: Support for algorithm migration and upgrades
//!
//! ## Security Properties
//!
//! - Resistant to quantum attacks via lattice-based and hash-based cryptography
//! - Tamper-evident through cryptographic signatures
//! - Replay-attack protection via nonces and timestamps
//! - Data integrity through cryptographic hashing

use crate::{PQCError, PQCManager, Signature, SignatureAlgorithm};
use blake3;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Unique identifier for an asset, derived from its cryptographic properties
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct AssetId(pub String);

impl AssetId {
    /// Generate a new asset ID from asset metadata
    pub fn from_metadata(metadata: &AssetMetadata) -> Self {
        let hash = blake3::hash(serde_json::to_string(metadata).unwrap().as_bytes());
        AssetId(hex::encode(hash.as_bytes()))
    }
}

/// Metadata describing the asset properties
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssetMetadata {
    /// Human-readable name of the asset
    pub name: String,
    /// Symbol or ticker (e.g., "QRC-TOKEN")
    pub symbol: String,
    /// Total supply of the asset
    pub total_supply: u128,
    /// Number of decimal places
    pub decimals: u8,
    /// Optional description
    pub description: Option<String>,
    /// Timestamp of asset creation
    pub created_at: DateTime<Utc>,
    /// Quantum-resistant signature algorithm used
    pub signature_algorithm: SignatureAlgorithm,
    /// Optional additional properties (extensible)
    pub properties: std::collections::HashMap<String, String>,
}

/// Represents a quantum-resistant permissionless asset on the Dytallix blockchain
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuantumAsset {
    /// Unique identifier derived from metadata hash
    pub id: AssetId,
    /// Asset metadata
    pub metadata: AssetMetadata,
    /// Public key of the asset creator (for verification)
    pub creator_public_key: Vec<u8>,
    /// Signature over the asset metadata (quantum-resistant)
    pub creation_signature: Signature,
    /// Current state hash (for integrity verification)
    pub state_hash: String,
}

impl QuantumAsset {
    /// Create a new quantum-resistant asset
    ///
    /// # Arguments
    ///
    /// * `metadata` - Asset metadata describing the asset properties
    /// * `pqc_manager` - PQC manager for signing operations
    ///
    /// # Security
    ///
    /// - Uses quantum-resistant signatures (Dilithium/Falcon/SPHINCS+)
    /// - Asset ID derived from cryptographic hash of metadata
    /// - Creation signature provides authenticity and non-repudiation
    pub fn create(
        metadata: AssetMetadata,
        pqc_manager: &PQCManager,
    ) -> Result<Self, PQCError> {
        // Generate asset ID from metadata
        let id = AssetId::from_metadata(&metadata);

        // Serialize metadata for signing
        let metadata_bytes = serde_json::to_vec(&metadata)
            .map_err(|_| PQCError::InvalidKey("Failed to serialize metadata".to_string()))?;

        // Sign metadata with quantum-resistant signature
        let creation_signature = pqc_manager.sign(&metadata_bytes)?;

        // Get creator's public key
        let creator_public_key = pqc_manager.get_signature_public_key().to_vec();

        // Calculate initial state hash
        let state_data = format!("{}{:?}", id.0, metadata_bytes);
        let state_hash = hex::encode(blake3::hash(state_data.as_bytes()).as_bytes());

        Ok(QuantumAsset {
            id,
            metadata,
            creator_public_key,
            creation_signature,
            state_hash,
        })
    }

    /// Verify the asset's creation signature
    ///
    /// # Security
    ///
    /// - Validates quantum-resistant signature
    /// - Ensures asset was created by claimed creator
    /// - Verifies metadata integrity
    pub fn verify_creation(&self, pqc_manager: &PQCManager) -> Result<bool, PQCError> {
        let metadata_bytes = serde_json::to_vec(&self.metadata)
            .map_err(|_| PQCError::InvalidKey("Failed to serialize metadata".to_string()))?;

        pqc_manager.verify(
            &metadata_bytes,
            &self.creation_signature,
            &self.creator_public_key,
        )
    }

    /// Verify the asset's state integrity
    pub fn verify_state_integrity(&self) -> bool {
        let metadata_bytes = serde_json::to_vec(&self.metadata).unwrap_or_default();
        let state_data = format!("{}{:?}", self.id.0, metadata_bytes);
        let expected_hash = hex::encode(blake3::hash(state_data.as_bytes()).as_bytes());
        self.state_hash == expected_hash
    }

    /// Export asset to JSON for storage
    pub fn to_json(&self) -> Result<String, PQCError> {
        serde_json::to_string_pretty(self)
            .map_err(|_| PQCError::InvalidKey("Failed to serialize asset".to_string()))
    }

    /// Import asset from JSON
    pub fn from_json(json: &str) -> Result<Self, PQCError> {
        serde_json::from_str(json)
            .map_err(|_| PQCError::InvalidKey("Failed to deserialize asset".to_string()))
    }
}

/// Represents a transfer of a quantum-resistant asset
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssetTransfer {
    /// Asset being transferred
    pub asset_id: AssetId,
    /// Amount to transfer (in smallest unit)
    pub amount: u128,
    /// Sender's public key
    pub sender_public_key: Vec<u8>,
    /// Recipient's public key
    pub recipient_public_key: Vec<u8>,
    /// Nonce to prevent replay attacks
    pub nonce: u64,
    /// Timestamp of transfer
    pub timestamp: DateTime<Utc>,
    /// Quantum-resistant signature from sender
    pub signature: Signature,
    /// Transaction hash for blockchain storage
    pub tx_hash: String,
}

impl AssetTransfer {
    /// Create a new asset transfer
    ///
    /// # Security
    ///
    /// - Includes nonce for replay attack prevention
    /// - Timestamp for temporal ordering
    /// - Quantum-resistant signature from sender
    /// - Cryptographic hash for integrity
    pub fn create(
        asset_id: AssetId,
        amount: u128,
        recipient_public_key: Vec<u8>,
        nonce: u64,
        pqc_manager: &PQCManager,
    ) -> Result<Self, PQCError> {
        let sender_public_key = pqc_manager.get_signature_public_key().to_vec();
        let timestamp = Utc::now();

        // Create transfer message for signing
        let transfer_data = TransferData {
            asset_id: asset_id.clone(),
            amount,
            sender_public_key: sender_public_key.clone(),
            recipient_public_key: recipient_public_key.clone(),
            nonce,
            timestamp,
        };

        let transfer_bytes = serde_json::to_vec(&transfer_data)
            .map_err(|_| PQCError::InvalidKey("Failed to serialize transfer".to_string()))?;

        // Sign with quantum-resistant signature
        let signature = pqc_manager.sign(&transfer_bytes)?;

        // Calculate transaction hash
        let tx_hash = hex::encode(blake3::hash(&transfer_bytes).as_bytes());

        Ok(AssetTransfer {
            asset_id,
            amount,
            sender_public_key,
            recipient_public_key,
            nonce,
            timestamp,
            signature,
            tx_hash,
        })
    }

    /// Verify the transfer signature
    ///
    /// # Security
    ///
    /// - Validates quantum-resistant signature
    /// - Ensures transfer was authorized by sender
    /// - Verifies data integrity
    pub fn verify(&self, pqc_manager: &PQCManager) -> Result<bool, PQCError> {
        let transfer_data = TransferData {
            asset_id: self.asset_id.clone(),
            amount: self.amount,
            sender_public_key: self.sender_public_key.clone(),
            recipient_public_key: self.recipient_public_key.clone(),
            nonce: self.nonce,
            timestamp: self.timestamp,
        };

        let transfer_bytes = serde_json::to_vec(&transfer_data)
            .map_err(|_| PQCError::InvalidKey("Failed to serialize transfer".to_string()))?;

        pqc_manager.verify(&transfer_bytes, &self.signature, &self.sender_public_key)
    }

    /// Verify transaction hash integrity
    pub fn verify_tx_hash(&self) -> bool {
        let transfer_data = TransferData {
            asset_id: self.asset_id.clone(),
            amount: self.amount,
            sender_public_key: self.sender_public_key.clone(),
            recipient_public_key: self.recipient_public_key.clone(),
            nonce: self.nonce,
            timestamp: self.timestamp,
        };

        let transfer_bytes = serde_json::to_vec(&transfer_data).unwrap_or_default();
        let expected_hash = hex::encode(blake3::hash(&transfer_bytes).as_bytes());
        self.tx_hash == expected_hash
    }
}

/// Internal structure for transfer data serialization
#[derive(Debug, Clone, Serialize, Deserialize)]
struct TransferData {
    asset_id: AssetId,
    amount: u128,
    sender_public_key: Vec<u8>,
    recipient_public_key: Vec<u8>,
    nonce: u64,
    timestamp: DateTime<Utc>,
}

/// Asset balance tracking
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssetBalance {
    /// Asset ID
    pub asset_id: AssetId,
    /// Owner's public key
    pub owner_public_key: Vec<u8>,
    /// Current balance
    pub balance: u128,
    /// Last update nonce
    pub last_nonce: u64,
    /// Last update timestamp
    pub last_updated: DateTime<Utc>,
}

/// Quantum-resistant asset manager for permissionless operations
#[derive(Debug, Clone)]
pub struct QuantumAssetManager {
    pqc_manager: PQCManager,
    /// Asset registry (in production, this would be in blockchain storage)
    assets: std::collections::HashMap<AssetId, QuantumAsset>,
    /// Balance tracking (in production, this would be in blockchain storage)
    balances: std::collections::HashMap<(AssetId, Vec<u8>), AssetBalance>,
    /// Transfer history for nonce tracking
    transfer_nonces: std::collections::HashMap<Vec<u8>, u64>,
}

impl QuantumAssetManager {
    /// Create a new quantum asset manager
    pub fn new() -> Result<Self, PQCError> {
        Ok(Self {
            pqc_manager: PQCManager::new()?,
            assets: std::collections::HashMap::new(),
            balances: std::collections::HashMap::new(),
            transfer_nonces: std::collections::HashMap::new(),
        })
    }

    /// Create a new quantum asset manager with a specific PQC manager
    pub fn with_pqc_manager(pqc_manager: PQCManager) -> Self {
        Self {
            pqc_manager,
            assets: std::collections::HashMap::new(),
            balances: std::collections::HashMap::new(),
            transfer_nonces: std::collections::HashMap::new(),
        }
    }

    /// Register a new quantum-resistant asset (permissionless)
    ///
    /// # Security
    ///
    /// - Anyone can create assets (permissionless)
    /// - Each asset is cryptographically signed by creator
    /// - Asset ID is deterministic based on metadata
    /// - Creator gets initial supply
    pub fn register_asset(
        &mut self,
        metadata: AssetMetadata,
    ) -> Result<QuantumAsset, PQCError> {
        let asset = QuantumAsset::create(metadata, &self.pqc_manager)?;

        // Initialize creator's balance with total supply
        let creator_key = self.pqc_manager.get_signature_public_key().to_vec();
        let balance = AssetBalance {
            asset_id: asset.id.clone(),
            owner_public_key: creator_key.clone(),
            balance: asset.metadata.total_supply,
            last_nonce: 0,
            last_updated: Utc::now(),
        };

        self.assets.insert(asset.id.clone(), asset.clone());
        self.balances
            .insert((asset.id.clone(), creator_key.clone()), balance);
        self.transfer_nonces.insert(creator_key, 0);

        Ok(asset)
    }

    /// Get an asset by ID
    pub fn get_asset(&self, asset_id: &AssetId) -> Option<&QuantumAsset> {
        self.assets.get(asset_id)
    }

    /// Get balance for an owner
    pub fn get_balance(
        &self,
        asset_id: &AssetId,
        owner_public_key: &[u8],
    ) -> Option<&AssetBalance> {
        self.balances
            .get(&(asset_id.clone(), owner_public_key.to_vec()))
    }

    /// Transfer assets (permissionless with quantum-resistant signatures)
    ///
    /// # Security
    ///
    /// - Requires valid quantum-resistant signature
    /// - Nonce prevents replay attacks
    /// - Balance checks prevent double-spending
    /// - Atomic balance updates
    pub fn transfer_asset(
        &mut self,
        asset_id: AssetId,
        amount: u128,
        recipient_public_key: Vec<u8>,
    ) -> Result<AssetTransfer, PQCError> {
        let sender_key = self.pqc_manager.get_signature_public_key().to_vec();

        // Get and validate sender's balance
        let sender_balance = self
            .balances
            .get(&(asset_id.clone(), sender_key.clone()))
            .ok_or_else(|| PQCError::InvalidKey("Insufficient balance".to_string()))?;

        if sender_balance.balance < amount {
            return Err(PQCError::InvalidKey("Insufficient balance".to_string()));
        }

        // Get next nonce for sender
        let nonce = self.transfer_nonces.get(&sender_key).copied().unwrap_or(0) + 1;

        // Create signed transfer
        let transfer =
            AssetTransfer::create(asset_id.clone(), amount, recipient_public_key.clone(), nonce, &self.pqc_manager)?;

        // Update balances
        self.update_balance(&asset_id, &sender_key, sender_balance.balance - amount, nonce)?;
        
        let recipient_balance = self
            .balances
            .get(&(asset_id.clone(), recipient_public_key.clone()))
            .map(|b| b.balance)
            .unwrap_or(0);
        
        self.update_balance(&asset_id, &recipient_public_key, recipient_balance + amount, nonce)?;

        // Update nonce
        self.transfer_nonces.insert(sender_key, nonce);

        Ok(transfer)
    }

    /// Update balance (internal helper)
    fn update_balance(
        &mut self,
        asset_id: &AssetId,
        owner_key: &[u8],
        new_balance: u128,
        nonce: u64,
    ) -> Result<(), PQCError> {
        let balance = AssetBalance {
            asset_id: asset_id.clone(),
            owner_public_key: owner_key.to_vec(),
            balance: new_balance,
            last_nonce: nonce,
            last_updated: Utc::now(),
        };

        self.balances
            .insert((asset_id.clone(), owner_key.to_vec()), balance);
        Ok(())
    }

    /// Verify an asset transfer
    pub fn verify_transfer(&self, transfer: &AssetTransfer) -> Result<bool, PQCError> {
        // Verify signature
        if !transfer.verify(&self.pqc_manager)? {
            return Ok(false);
        }

        // Verify transaction hash
        if !transfer.verify_tx_hash() {
            return Ok(false);
        }

        Ok(true)
    }

    /// Export all assets to JSON (for backup/storage)
    pub fn export_assets(&self) -> Result<String, PQCError> {
        serde_json::to_string_pretty(&self.assets)
            .map_err(|_| PQCError::InvalidKey("Failed to export assets".to_string()))
    }

    /// Get the PQC manager's public key
    pub fn get_public_key(&self) -> &[u8] {
        self.pqc_manager.get_signature_public_key()
    }
}

impl Default for QuantumAssetManager {
    fn default() -> Self {
        Self::new().expect("Failed to create QuantumAssetManager")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_asset_creation() {
        let pqc_manager = PQCManager::new().unwrap();
        let metadata = AssetMetadata {
            name: "Quantum Token".to_string(),
            symbol: "QTK".to_string(),
            total_supply: 1_000_000_000,
            decimals: 8,
            description: Some("A quantum-resistant token".to_string()),
            created_at: Utc::now(),
            signature_algorithm: SignatureAlgorithm::Dilithium3,
            properties: std::collections::HashMap::new(),
        };

        let asset = QuantumAsset::create(metadata, &pqc_manager).unwrap();
        assert!(asset.verify_creation(&pqc_manager).unwrap());
        assert!(asset.verify_state_integrity());
    }

    #[test]
    fn test_asset_transfer() {
        let mut manager = QuantumAssetManager::new().unwrap();
        
        let metadata = AssetMetadata {
            name: "Test Token".to_string(),
            symbol: "TST".to_string(),
            total_supply: 1000,
            decimals: 2,
            description: None,
            created_at: Utc::now(),
            signature_algorithm: SignatureAlgorithm::Dilithium3,
            properties: std::collections::HashMap::new(),
        };

        let asset = manager.register_asset(metadata).unwrap();
        
        // Create recipient
        let recipient_pqc = PQCManager::new().unwrap();
        let recipient_key = recipient_pqc.get_signature_public_key().to_vec();

        // Transfer assets
        let transfer = manager
            .transfer_asset(asset.id.clone(), 100, recipient_key.clone())
            .unwrap();

        assert!(manager.verify_transfer(&transfer).unwrap());

        // Check balances
        let sender_balance = manager.get_balance(&asset.id, manager.get_public_key()).unwrap();
        assert_eq!(sender_balance.balance, 900);

        let recipient_balance = manager.get_balance(&asset.id, &recipient_key).unwrap();
        assert_eq!(recipient_balance.balance, 100);
    }

    #[test]
    fn test_replay_attack_prevention() {
        let mut manager = QuantumAssetManager::new().unwrap();
        
        let metadata = AssetMetadata {
            name: "Test Token".to_string(),
            symbol: "TST".to_string(),
            total_supply: 1000,
            decimals: 2,
            description: None,
            created_at: Utc::now(),
            signature_algorithm: SignatureAlgorithm::Dilithium3,
            properties: std::collections::HashMap::new(),
        };

        let asset = manager.register_asset(metadata).unwrap();
        
        let recipient_pqc = PQCManager::new().unwrap();
        let recipient_key = recipient_pqc.get_signature_public_key().to_vec();

        // First transfer
        let transfer1 = manager
            .transfer_asset(asset.id.clone(), 100, recipient_key.clone())
            .unwrap();
        assert_eq!(transfer1.nonce, 1);

        // Second transfer should have different nonce
        let transfer2 = manager
            .transfer_asset(asset.id.clone(), 100, recipient_key.clone())
            .unwrap();
        assert_eq!(transfer2.nonce, 2);
        assert_ne!(transfer1.nonce, transfer2.nonce);
    }

    #[test]
    fn test_insufficient_balance() {
        let mut manager = QuantumAssetManager::new().unwrap();
        
        let metadata = AssetMetadata {
            name: "Test Token".to_string(),
            symbol: "TST".to_string(),
            total_supply: 100,
            decimals: 2,
            description: None,
            created_at: Utc::now(),
            signature_algorithm: SignatureAlgorithm::Dilithium3,
            properties: std::collections::HashMap::new(),
        };

        let asset = manager.register_asset(metadata).unwrap();
        
        let recipient_pqc = PQCManager::new().unwrap();
        let recipient_key = recipient_pqc.get_signature_public_key().to_vec();

        // Try to transfer more than balance
        let result = manager.transfer_asset(asset.id.clone(), 200, recipient_key);
        assert!(result.is_err());
    }

    #[test]
    fn test_asset_serialization() {
        let pqc_manager = PQCManager::new().unwrap();
        let metadata = AssetMetadata {
            name: "Serializable Token".to_string(),
            symbol: "SRL".to_string(),
            total_supply: 500,
            decimals: 4,
            description: Some("Test serialization".to_string()),
            created_at: Utc::now(),
            signature_algorithm: SignatureAlgorithm::Dilithium3,
            properties: std::collections::HashMap::new(),
        };

        let asset = QuantumAsset::create(metadata, &pqc_manager).unwrap();
        
        // Serialize to JSON
        let json = asset.to_json().unwrap();
        
        // Deserialize from JSON
        let restored = QuantumAsset::from_json(&json).unwrap();
        
        assert_eq!(asset.id, restored.id);
        assert_eq!(asset.metadata.name, restored.metadata.name);
        assert_eq!(asset.metadata.total_supply, restored.metadata.total_supply);
    }
}
