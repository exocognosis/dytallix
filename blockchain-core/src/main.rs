use std::sync::Arc;
use tokio;
use log::{info, warn, error};

mod runtime;
mod storage;
mod crypto; 
mod types;
mod api;
// mod consensus;  // Temporarily disabled
// mod networking;  // Temporarily disabled

// use crate::runtime::DytallixRuntime;  // Temporarily disabled
use crate::crypto::PQCManager;
use crate::types::{TransactionPool, Transaction, Block, NodeStatus};

pub struct DummyNode {
    // runtime: Arc<Result<DytallixRuntime, Box<dyn std::error::Error>>>,  // Temporarily disabled
    pqc_manager: Arc<PQCManager>,
    transaction_pool: Arc<TransactionPool>,
}

impl DummyNode {
    pub fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let pqc_manager = Arc::new(PQCManager::load_or_generate("pqc_keys.json")?);
        let transaction_pool = Arc::new(TransactionPool::new(10000));

        Ok(Self {
            // runtime,  // Temporarily disabled
            pqc_manager,
            transaction_pool,
        })
    }

    pub async fn start(&self) -> Result<(), String> {
        info!("Starting Dytallix Node...");
        info!("Dytallix Node started successfully");
        Ok(())
    }
    
    pub async fn stop(&self) -> Result<(), String> {
        info!("Stopping Dytallix Node...");
        info!("Dytallix Node stopped");
        Ok(())
    }
    
    pub async fn submit_transaction(&self, tx: Transaction) -> Result<(), String> {
        let tx_hash = self.transaction_pool.add_transaction(tx).await
            .map_err(|e| format!("Failed to add transaction: {}", e))?;
        
        info!("Transaction {} submitted successfully", tx_hash);
        Ok(())
    }
    
    pub fn get_block(&self, _hash: &str) -> Option<Block> {
        None
    }
    
    pub fn get_status(&self) -> NodeStatus {
        NodeStatus::Running
    }

    pub async fn get_balance(&self, _address: &str) -> Result<u64, String> {
        Ok(0)
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    env_logger::init();
    
    let node = Arc::new(DummyNode::new()?);
    let node_clone = Arc::clone(&node);
    
    // Start node
    node_clone.start().await?;
    
    info!("Dytallix blockchain core is running!");
    
    // Start API server
    tokio::spawn(async move {
        if let Err(e) = api::start_api_server().await {
            error!("API server error: {}", e);
        }
    });
    
    // Keep the main thread alive
    loop {
        tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
    }
}
