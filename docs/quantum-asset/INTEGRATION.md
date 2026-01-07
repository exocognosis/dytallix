# Quantum Asset Integration Guide

This guide explains how to integrate the Quantum-Resistant Permissionless Asset module into Dytallix blockchain applications.

## Quick Start

### 1. Add Dependency

Add the PQC crypto library to your `Cargo.toml`:

```toml
[dependencies]
dytallix-pqc = { path = "../pqc-crypto" }
chrono = "0.4"
hex = "0.4"
```

### 2. Basic Usage

```rust
use dytallix_pqc::{QuantumAssetManager, AssetMetadata, SignatureAlgorithm};
use chrono::Utc;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Create asset manager
    let mut manager = QuantumAssetManager::new()?;
    
    // Create asset
    let metadata = AssetMetadata {
        name: "My Token".to_string(),
        symbol: "MTK".to_string(),
        total_supply: 1_000_000,
        decimals: 8,
        description: Some("My quantum-resistant token".to_string()),
        created_at: Utc::now(),
        signature_algorithm: SignatureAlgorithm::Dilithium3,
        properties: std::collections::HashMap::new(),
    };
    
    let asset = manager.register_asset(metadata)?;
    println!("Asset created: {}", asset.id.0);
    
    Ok(())
}
```

## Integration Patterns

### Pattern 1: Cosmos SDK Smart Contract

Integrate with CosmWasm contracts:

```rust
use cosmwasm_std::{DepsMut, Env, MessageInfo, Response};
use dytallix_pqc::{QuantumAssetManager, AssetMetadata};

#[entry_point]
pub fn execute_create_asset(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    metadata: AssetMetadata,
) -> Result<Response, ContractError> {
    // Initialize quantum asset manager with stored keys
    let pqc_manager = load_pqc_manager(deps.storage)?;
    let mut asset_manager = QuantumAssetManager::with_pqc_manager(pqc_manager);
    
    // Create asset
    let asset = asset_manager.register_asset(metadata)
        .map_err(|_| ContractError::AssetCreationFailed {})?;
    
    // Store asset on-chain
    ASSETS.save(deps.storage, &asset.id.0, &asset)?;
    
    Ok(Response::new()
        .add_attribute("action", "create_asset")
        .add_attribute("asset_id", asset.id.0)
        .add_attribute("creator", info.sender))
}
```

### Pattern 2: Standalone Node Integration

Integrate with blockchain node:

```rust
use dytallix_pqc::{QuantumAssetManager, PQCManager};

pub struct AssetService {
    asset_manager: QuantumAssetManager,
    db: Database,
}

impl AssetService {
    pub fn new(pqc_manager: PQCManager, db: Database) -> Self {
        Self {
            asset_manager: QuantumAssetManager::with_pqc_manager(pqc_manager),
            db,
        }
    }
    
    pub fn process_asset_creation(&mut self, metadata: AssetMetadata) 
        -> Result<String, Error> {
        let asset = self.asset_manager.register_asset(metadata)?;
        
        // Store in database
        self.db.store_asset(&asset)?;
        
        Ok(asset.id.0)
    }
}
```

### Pattern 3: REST API Endpoint

Expose via REST API:

```rust
use axum::{Json, extract::State};
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
struct CreateAssetRequest {
    name: String,
    symbol: String,
    total_supply: u128,
    decimals: u8,
    description: Option<String>,
}

#[derive(Serialize)]
struct CreateAssetResponse {
    asset_id: String,
    tx_hash: String,
}

async fn create_asset(
    State(manager): State<Arc<Mutex<QuantumAssetManager>>>,
    Json(req): Json<CreateAssetRequest>,
) -> Result<Json<CreateAssetResponse>, ApiError> {
    let metadata = AssetMetadata {
        name: req.name,
        symbol: req.symbol,
        total_supply: req.total_supply,
        decimals: req.decimals,
        description: req.description,
        created_at: Utc::now(),
        signature_algorithm: SignatureAlgorithm::Dilithium3,
        properties: HashMap::new(),
    };
    
    let mut mgr = manager.lock().unwrap();
    let asset = mgr.register_asset(metadata)?;
    
    Ok(Json(CreateAssetResponse {
        asset_id: asset.id.0.clone(),
        tx_hash: asset.state_hash.clone(),
    }))
}
```

## Storage Integration

### RocksDB Storage

```rust
use rocksdb::DB;
use dytallix_pqc::QuantumAsset;

pub struct AssetStorage {
    db: DB,
}

impl AssetStorage {
    pub fn store_asset(&self, asset: &QuantumAsset) -> Result<(), Error> {
        let key = format!("asset:{}", asset.id.0);
        let value = asset.to_json()?;
        self.db.put(key.as_bytes(), value.as_bytes())?;
        Ok(())
    }
    
    pub fn get_asset(&self, asset_id: &str) -> Result<Option<QuantumAsset>, Error> {
        let key = format!("asset:{}", asset_id);
        if let Some(data) = self.db.get(key.as_bytes())? {
            let json = String::from_utf8(data)?;
            let asset = QuantumAsset::from_json(&json)?;
            Ok(Some(asset))
        } else {
            Ok(None)
        }
    }
}
```

### PostgreSQL Storage

```rust
use sqlx::PgPool;

pub async fn store_asset(
    pool: &PgPool,
    asset: &QuantumAsset,
) -> Result<(), sqlx::Error> {
    let json = asset.to_json().unwrap();
    
    sqlx::query!(
        r#"
        INSERT INTO quantum_assets (id, data, created_at)
        VALUES ($1, $2, $3)
        ON CONFLICT (id) DO UPDATE SET data = $2
        "#,
        asset.id.0,
        json,
        asset.metadata.created_at
    )
    .execute(pool)
    .await?;
    
    Ok(())
}
```

## Transaction Broadcasting

### Blockchain Transaction Integration

```rust
pub struct TransactionBuilder {
    pqc_manager: PQCManager,
}

impl TransactionBuilder {
    pub fn build_asset_transfer_tx(
        &self,
        asset_id: &str,
        amount: u128,
        recipient: Vec<u8>,
        nonce: u64,
    ) -> Result<Transaction, Error> {
        // Create transfer using quantum asset manager
        let transfer = AssetTransfer::create(
            AssetId(asset_id.to_string()),
            amount,
            recipient,
            nonce,
            &self.pqc_manager,
        )?;
        
        // Build blockchain transaction
        let tx = Transaction {
            tx_type: TxType::AssetTransfer,
            data: serde_json::to_vec(&transfer)?,
            signature: transfer.signature.data.clone(),
            hash: transfer.tx_hash.clone(),
        };
        
        Ok(tx)
    }
}
```

## Security Best Practices

### 1. Key Management

```rust
use std::path::Path;

// Load or generate keys securely
let pqc_manager = PQCManager::load_or_generate(
    Path::new("/secure/path/pqc_keys.json")
)?;

// Validate keys before use
pqc_manager.validate_keys()?;
```

### 2. Signature Verification

```rust
// Always verify signatures before processing
pub fn process_transfer(
    manager: &QuantumAssetManager,
    transfer: &AssetTransfer,
) -> Result<(), Error> {
    // Verify signature
    if !manager.verify_transfer(transfer)? {
        return Err(Error::InvalidSignature);
    }
    
    // Verify transaction hash
    if !transfer.verify_tx_hash() {
        return Err(Error::InvalidTxHash);
    }
    
    // Process transfer
    Ok(())
}
```

### 3. Replay Attack Prevention

```rust
pub struct NonceTracker {
    used_nonces: HashSet<(Vec<u8>, u64)>,
}

impl NonceTracker {
    pub fn verify_nonce(&mut self, pubkey: &[u8], nonce: u64) -> bool {
        let key = (pubkey.to_vec(), nonce);
        if self.used_nonces.contains(&key) {
            false // Replay attack detected
        } else {
            self.used_nonces.insert(key);
            true
        }
    }
}
```

## Testing

### Unit Tests

```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_asset_creation_and_transfer() {
        let mut manager = QuantumAssetManager::new().unwrap();
        
        let metadata = AssetMetadata {
            name: "Test Token".to_string(),
            symbol: "TST".to_string(),
            total_supply: 1000,
            decimals: 2,
            description: None,
            created_at: Utc::now(),
            signature_algorithm: SignatureAlgorithm::Dilithium3,
            properties: HashMap::new(),
        };
        
        let asset = manager.register_asset(metadata).unwrap();
        assert!(asset.verify_state_integrity());
    }
}
```

### Integration Tests

```rust
#[tokio::test]
async fn test_end_to_end_asset_flow() {
    // Initialize
    let mut manager = QuantumAssetManager::new().unwrap();
    
    // Create asset
    let asset = create_test_asset(&mut manager).unwrap();
    
    // Create recipient
    let recipient_pqc = PQCManager::new().unwrap();
    let recipient_key = recipient_pqc.get_signature_public_key().to_vec();
    
    // Transfer
    let transfer = manager.transfer_asset(
        asset.id.clone(),
        100,
        recipient_key.clone(),
    ).unwrap();
    
    // Verify
    assert!(manager.verify_transfer(&transfer).unwrap());
}
```

## Performance Optimization

### 1. Batch Operations

```rust
pub fn batch_create_assets(
    manager: &mut QuantumAssetManager,
    metadata_list: Vec<AssetMetadata>,
) -> Result<Vec<QuantumAsset>, Error> {
    metadata_list
        .into_iter()
        .map(|metadata| manager.register_asset(metadata))
        .collect()
}
```

### 2. Caching

```rust
use lru::LruCache;

pub struct CachedAssetManager {
    manager: QuantumAssetManager,
    asset_cache: LruCache<String, QuantumAsset>,
}

impl CachedAssetManager {
    pub fn get_asset(&mut self, asset_id: &str) -> Option<&QuantumAsset> {
        if let Some(asset) = self.asset_cache.get(asset_id) {
            return Some(asset);
        }
        
        if let Some(asset) = self.manager.get_asset(&AssetId(asset_id.to_string())) {
            self.asset_cache.put(asset_id.to_string(), asset.clone());
            self.asset_cache.get(asset_id)
        } else {
            None
        }
    }
}
```

## Troubleshooting

### Common Issues

1. **Signature Verification Fails**
   - Check that the correct public key is being used
   - Ensure the algorithm matches the signature
   - Verify that the data hasn't been modified

2. **Insufficient Balance Errors**
   - Check the sender's balance before attempting transfer
   - Ensure the amount includes any fees

3. **Replay Attack Detection**
   - Verify nonces are being tracked correctly
   - Ensure nonces are incrementing properly

## Additional Resources

- [Full API Documentation](./README.md)
- [Example Code](../../examples/quantum_asset_demo.rs)
- [Security Guide](../../SECURITY_AUDIT_README.md)
- [PQC Implementation](../pqc-crypto/README.md)

## Support

For questions or issues:
- GitHub Issues: https://github.com/HisMadRealm/dytallix/issues
- Documentation: See the docs/ directory
