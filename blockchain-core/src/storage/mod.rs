use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use log::{info, debug};

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
    
    pub async fn size(&self) -> Result<usize, Box<dyn std::error::Error>> {
        let data = self.data.read().await;
        Ok(data.len())
    }
}
