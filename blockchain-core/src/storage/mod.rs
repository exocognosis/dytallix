use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use log::{info, debug};
use crate::types::{Address, BlockNumber, Timestamp, Amount};
use serde::{Serialize, Deserialize};

/// Smart Contract State Storage
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContractState {
    pub code: Vec<u8>,
    pub storage: HashMap<Vec<u8>, Vec<u8>>,
    pub balance: Amount,
    pub metadata: ContractMetadata,
}

/// Smart Contract Metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContractMetadata {
    pub deployer: Address,
    pub deployment_block: BlockNumber,
    pub last_modified: Timestamp,
    pub call_count: u64,
}

impl ContractState {
    /// Create new contract state
    pub fn new(code: Vec<u8>, deployer: Address, deployment_block: BlockNumber, timestamp: Timestamp) -> Self {
        Self {
            code,
            storage: HashMap::new(),
            balance: 0,
            metadata: ContractMetadata {
                deployer,
                deployment_block,
                last_modified: timestamp,
                call_count: 0,
            },
        }
    }

    /// Update contract storage
    pub fn set_storage(&mut self, key: Vec<u8>, value: Vec<u8>) {
        self.storage.insert(key, value);
    }

    /// Get contract storage value
    pub fn get_storage(&self, key: &[u8]) -> Option<&Vec<u8>> {
        self.storage.get(key)
    }

    /// Increment call count
    pub fn increment_calls(&mut self) {
        self.metadata.call_count += 1;
    }

    /// Update last modified timestamp
    pub fn update_timestamp(&mut self, timestamp: Timestamp) {
        self.metadata.last_modified = timestamp;
    }
}

#[derive(Debug)]
pub struct StorageManager {
    data: Arc<RwLock<HashMap<Vec<u8>, Vec<u8>>>>,
}

impl StorageManager {
    pub async fn new() -> Result<Self, Box<dyn std::error::Error>> {
        Ok(Self {
            data: Arc::new(RwLock::new(HashMap::new())),
        })
    }
    
    pub async fn put(&self, key: &[u8], value: &[u8]) -> Result<(), Box<dyn std::error::Error>> {
        let mut data = self.data.write().await;
        data.insert(key.to_vec(), value.to_vec());
        debug!("Stored {} bytes at key (length: {})", value.len(), key.len());
        Ok(())
    }
    
    pub async fn get(&self, key: &[u8]) -> Result<Option<Vec<u8>>, Box<dyn std::error::Error>> {
        let data = self.data.read().await;
        Ok(data.get(key).cloned())
    }
    
    pub async fn delete(&self, key: &[u8]) -> Result<(), Box<dyn std::error::Error>> {
        let mut data = self.data.write().await;
        data.remove(key);
        debug!("Deleted key (length: {})", key.len());
        Ok(())
    }
    
    pub async fn exists(&self, key: &[u8]) -> Result<bool, Box<dyn std::error::Error>> {
        let data = self.data.read().await;
        Ok(data.contains_key(key))
    }
    
    pub async fn list_keys(&self) -> Result<Vec<Vec<u8>>, Box<dyn std::error::Error>> {
        let data = self.data.read().await;
        Ok(data.keys().cloned().collect())
    }
    
    pub async fn clear(&self) -> Result<(), Box<dyn std::error::Error>> {
        let mut data = self.data.write().await;
        data.clear();
        info!("Storage cleared");
        Ok(())
    }
    
    /// Store contract state
    pub async fn store_contract(&self, address: &Address, state: &ContractState) -> Result<(), Box<dyn std::error::Error>> {
        let key = format!("contract:{}", address);
        let value = bincode::serialize(state)?;
        self.put(key.as_bytes(), &value).await
    }

    /// Get contract state
    pub async fn get_contract(&self, address: &Address) -> Result<Option<ContractState>, Box<dyn std::error::Error>> {
        let key = format!("contract:{}", address);
        if let Some(data) = self.get(key.as_bytes()).await? {
            let state: ContractState = bincode::deserialize(&data)?;
            Ok(Some(state))
        } else {
            Ok(None)
        }
    }

    /// Update contract storage
    pub async fn update_contract_storage(&self, address: &Address, key: &[u8], value: &[u8]) -> Result<(), Box<dyn std::error::Error>> {
        if let Some(mut state) = self.get_contract(address).await? {
            state.set_storage(key.to_vec(), value.to_vec());
            self.store_contract(address, &state).await?;
        }
        Ok(())
    }

    /// Get contract storage value
    pub async fn get_contract_storage(&self, address: &Address, key: &[u8]) -> Result<Option<Vec<u8>>, Box<dyn std::error::Error>> {
        if let Some(state) = self.get_contract(address).await? {
            Ok(state.get_storage(key).cloned())
        } else {
            Ok(None)
        }
    }

    /// Check if contract exists
    pub async fn contract_exists(&self, address: &Address) -> Result<bool, Box<dyn std::error::Error>> {
        let key = format!("contract:{}", address);
        self.exists(key.as_bytes()).await
    }

    /// List all contracts
    pub async fn list_contracts(&self) -> Result<Vec<Address>, Box<dyn std::error::Error>> {
        let keys = self.list_keys().await?;
        let mut contracts = Vec::new();
        
        for key in keys {
            if let Ok(key_str) = String::from_utf8(key) {
                if key_str.starts_with("contract:") {
                    let address = key_str.strip_prefix("contract:").unwrap();
                    contracts.push(address.to_string());
                }
            }
        }
        
        Ok(contracts)
    }

    pub async fn size(&self) -> Result<usize, Box<dyn std::error::Error>> {
        let data = self.data.read().await;
        Ok(data.len())
    }
}
