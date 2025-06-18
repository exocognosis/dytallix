use std::sync::Arc;
use std::collections::HashMap;
use tokio::sync::RwLock;
use log::{info, debug};

use crate::storage::StorageManager;

#[derive(Debug)]
pub struct DytallixRuntime {
    storage: Arc<StorageManager>,
    state: Arc<RwLock<RuntimeState>>,
}

#[derive(Debug, Default, serde::Serialize, serde::Deserialize)]
pub struct RuntimeState {
    pub balances: HashMap<String, u64>,
    pub nonces: HashMap<String, u64>,
    pub contracts: HashMap<String, Vec<u8>>,
}

impl DytallixRuntime {
    pub fn new(storage: Arc<StorageManager>) -> Result<Self, Box<dyn std::error::Error>> {
        let state = Arc::new(RwLock::new(RuntimeState::default()));
        
        Ok(Self {
            storage,
            state,
        })
    }
    
    pub async fn get_balance(&self, address: &str) -> Result<u64, Box<dyn std::error::Error>> {
        let state = self.state.read().await;
        Ok(state.balances.get(address).copied().unwrap_or(0))
    }
    
    pub async fn set_balance(&self, address: &str, amount: u64) -> Result<(), Box<dyn std::error::Error>> {
        let mut state = self.state.write().await;
        state.balances.insert(address.to_string(), amount);
        debug!("Set balance for {}: {}", address, amount);
        Ok(())
    }
    
    pub async fn transfer(&self, from: &str, to: &str, amount: u64) -> Result<(), Box<dyn std::error::Error>> {
        let mut state = self.state.write().await;
        
        let from_balance = state.balances.get(from).copied().unwrap_or(0);
        if from_balance < amount {
            return Err("Insufficient balance".into());
        }
        
        let to_balance = state.balances.get(to).copied().unwrap_or(0);
        
        state.balances.insert(from.to_string(), from_balance - amount);
        state.balances.insert(to.to_string(), to_balance + amount);
        
        info!("Transfer: {} -> {} amount: {}", from, to, amount);
        Ok(())
    }
    
    pub async fn get_nonce(&self, address: &str) -> Result<u64, Box<dyn std::error::Error>> {
        let state = self.state.read().await;
        Ok(state.nonces.get(address).copied().unwrap_or(0))
    }
    
    pub async fn increment_nonce(&self, address: &str) -> Result<(), Box<dyn std::error::Error>> {
        let mut state = self.state.write().await;
        let current_nonce = state.nonces.get(address).copied().unwrap_or(0);
        state.nonces.insert(address.to_string(), current_nonce + 1);
        Ok(())
    }
    
    pub async fn deploy_contract(&self, address: &str, code: Vec<u8>) -> Result<(), Box<dyn std::error::Error>> {
        let mut state = self.state.write().await;
        state.contracts.insert(address.to_string(), code);
        info!("Contract deployed at address: {}", address);
        Ok(())
    }
    
    pub async fn get_contract(&self, address: &str) -> Result<Option<Vec<u8>>, Box<dyn std::error::Error>> {
        let state = self.state.read().await;
        Ok(state.contracts.get(address).cloned())
    }
    
    pub async fn execute_contract(&self, address: &str, input: &[u8]) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
        let state = self.state.read().await;
        
        if let Some(_contract_code) = state.contracts.get(address) {
            // In a real implementation, this would execute WASM code
            // For now, return a placeholder response
            debug!("Executing contract at {} with {} bytes input", address, input.len());
            Ok(b"contract_executed".to_vec())
        } else {
            Err("Contract not found".into())
        }
    }
    
    pub async fn save_state(&self) -> Result<(), Box<dyn std::error::Error>> {
        let state = self.state.read().await;
        
        // Serialize and save state to storage
        let state_json = serde_json::to_string(&*state)?;
        self.storage.put("runtime_state".as_bytes(), state_json.as_bytes()).await?;
        
        info!("Runtime state saved to storage");
        Ok(())
    }
    
    pub async fn load_state(&self) -> Result<(), Box<dyn std::error::Error>> {
        match self.storage.get("runtime_state".as_bytes()).await? {
            Some(state_data) => {
                let state_json = String::from_utf8(state_data)?;
                let loaded_state: RuntimeState = serde_json::from_str(&state_json)?;
                
                let mut state = self.state.write().await;
                *state = loaded_state;
                
                info!("Runtime state loaded from storage");
                Ok(())
            }
            None => {
                info!("No previous state found, starting with fresh state");
                Ok(())
            }
        }
    }
}
