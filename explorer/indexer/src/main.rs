use std::env;
use std::fs::OpenOptions;
use std::io::Write;
use std::time::Duration;
use tokio::time::sleep;
use tracing::{info, warn, error};
use anyhow::Result;

mod models;
mod schema;
mod store;
mod rpc;

use store::Store;
use rpc::RpcClient;
use models::{Block, Transaction};

#[derive(Debug, Clone)]
pub struct Config {
    pub rpc_base: String,
    pub db_path: String,
    pub backfill_blocks: u64,
    pub poll_interval_ms: u64,
    pub jsonl_path: Option<String>,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            rpc_base: "http://localhost:3030".to_string(),
            db_path: "explorer.db".to_string(),
            backfill_blocks: 100,
            poll_interval_ms: 5000,
            jsonl_path: None,
        }
    }
}

impl Config {
    pub fn from_env() -> Self {
        let mut config = Self::default();
        
        if let Ok(rpc_base) = env::var("DYT_RPC_BASE") {
            config.rpc_base = rpc_base;
        }
        
        if let Ok(db_path) = env::var("DYT_INDEX_DB") {
            config.db_path = db_path;
        }
        
        if let Ok(backfill) = env::var("DYT_BACKFILL_BLOCKS") {
            if let Ok(num) = backfill.parse() {
                config.backfill_blocks = num;
            }
        }
        
        if let Ok(interval) = env::var("DYT_POLL_INTERVAL_MS") {
            if let Ok(num) = interval.parse() {
                config.poll_interval_ms = num;
            }
        }
        
        if let Ok(jsonl_path) = env::var("DYT_INDEXER_JSONL") {
            if !jsonl_path.is_empty() {
                config.jsonl_path = Some(jsonl_path);
            }
        }
        
        config
    }
}

struct Indexer {
    config: Config,
    store: Store,
    rpc_client: RpcClient,
    jsonl_file: Option<std::fs::File>,
}

impl Indexer {
    pub fn new(config: Config) -> Result<Self> {
        let store = Store::new(&config.db_path)?;
        let rpc_client = RpcClient::new(config.rpc_base.clone());
        
        let jsonl_file = if let Some(ref path) = config.jsonl_path {
            Some(OpenOptions::new()
                .create(true)
                .append(true)
                .open(path)?)
        } else {
            None
        };
        
        Ok(Self {
            config,
            store,
            rpc_client,
            jsonl_file,
        })
    }

    pub async fn run(&mut self) -> Result<()> {
        info!("Starting indexer with config: {:?}", self.config);
        
        // Get latest height from RPC
        let latest_height = self.rpc_client.get_latest_height().await?;
        info!("Latest height from RPC: {}", latest_height);
        
        // Get latest height from our store
        let store_height = self.store.get_latest_block_height()
            .unwrap_or(None)
            .unwrap_or(0);
        info!("Latest height in store: {}", store_height);
        
        // Determine backfill start height
        let start_height = if store_height == 0 {
            latest_height.saturating_sub(self.config.backfill_blocks).max(1)
        } else {
            store_height + 1
        };
        
        // Backfill missing blocks
        if start_height <= latest_height {
            info!("Backfilling blocks from {} to {}", start_height, latest_height);
            for height in start_height..=latest_height {
                if let Err(e) = self.ingest_block(height).await {
                    warn!("Failed to ingest block {}: {}", height, e);
                }
            }
        }
        
        // Start polling loop
        info!("Starting polling loop with interval {}ms", self.config.poll_interval_ms);
        let mut last_height = latest_height;
        
        loop {
            sleep(Duration::from_millis(self.config.poll_interval_ms)).await;
            
            match self.rpc_client.get_latest_height().await {
                Ok(current_height) => {
                    if current_height > last_height {
                        info!("New blocks detected: {} to {}", last_height + 1, current_height);
                        for height in (last_height + 1)..=current_height {
                            if let Err(e) = self.ingest_block(height).await {
                                warn!("Failed to ingest block {}: {}", height, e);
                            }
                        }
                        last_height = current_height;
                    }
                }
                Err(e) => {
                    error!("Failed to get latest height: {}", e);
                }
            }
        }
    }

    async fn ingest_block(&mut self, height: u64) -> Result<()> {
        let blocks_response = self.rpc_client.get_blocks(height).await?;
        
        for rpc_block in blocks_response.blocks {
            if rpc_block.height != height {
                warn!("Height mismatch: requested {}, got {}", height, rpc_block.height);
                continue;
            }
            
            let block = Block {
                height: rpc_block.height,
                hash: rpc_block.hash.clone(),
                time: chrono::Utc::now().to_rfc3339(),
                tx_count: rpc_block.txs.len() as u32,
            };
            
            // Store block
            if let Err(e) = self.store.insert_block(&block) {
                warn!("Failed to insert block {}: {}", height, e);
                continue;
            }
            
            // Log to JSONL if enabled
            if let Some(ref mut file) = self.jsonl_file {
                if let Ok(json) = serde_json::to_string(&block) {
                    let _ = writeln!(file, "{}", json);
                }
            }
            
            // Ingest transactions
            for tx_hash in rpc_block.txs {
                if let Err(e) = self.ingest_transaction(&tx_hash, height).await {
                    warn!("Failed to ingest transaction {}: {}", tx_hash, e);
                }
            }
            
            info!("Ingested block {} with {} transactions", height, block.tx_count);
        }
        
        Ok(())
    }

    async fn ingest_transaction(&mut self, hash: &str, height: u64) -> Result<()> {
        match self.rpc_client.get_transaction(hash).await? {
            Some(rpc_tx) => {
                let tx = Transaction {
                    hash: rpc_tx.hash,
                    height: rpc_tx.height.unwrap_or(height),
                    sender: rpc_tx.from,
                    recipient: rpc_tx.to,
                    amount: rpc_tx.amount,
                    denom: Some(rpc_tx.denom.unwrap_or_else(|| "dyt".to_string())),
                    status: if rpc_tx.status.as_deref() == Some("success") { 1 } else { 0 },
                    gas_used: rpc_tx.gas_used.unwrap_or(0),
                };
                
                self.store.insert_transaction(&tx)?;
                
                // Log to JSONL if enabled
                if let Some(ref mut file) = self.jsonl_file {
                    if let Ok(json) = serde_json::to_string(&tx) {
                        let _ = writeln!(file, "{}", json);
                    }
                }
            }
            None => {
                warn!("Transaction {} not found", hash);
            }
        }
        
        Ok(())
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();
    
    let config = Config::from_env();
    let mut indexer = Indexer::new(config)?;
    
    indexer.run().await
}