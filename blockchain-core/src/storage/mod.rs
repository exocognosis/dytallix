use crate::types::{
    AccountState, Address, Amount, Block, BlockNumber, Timestamp, Transaction,
    Transaction as TxEnum, TxReceipt,
};
use rocksdb::{Options, DB};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;
use std::sync::Arc;
use tokio::sync::RwLock;

/// Transaction receipt persisted for lookup
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransactionReceipt {
    pub hash: String,
    pub status: String, // success | failed
    pub block_number: BlockNumber,
    pub index: u32,
    pub fee: Amount,
    pub from: Address,
    pub to: Option<Address>,
    pub amount: Option<Amount>,
    pub nonce: u64,
    pub error: Option<String>,
}

/// Smart Contract State Storage
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContractState {
    pub code: Vec<u8>,
    pub storage: HashMap<Vec<u8>, Vec<u8>>, // removed stray backslash
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
    pub fn _new(
        code: Vec<u8>,
        deployer: Address,
        deployment_block: BlockNumber,
        timestamp: Timestamp,
    ) -> Self {
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
    pub fn _set_storage(&mut self, key: Vec<u8>, value: Vec<u8>) {
        self.storage.insert(key, value);
    }
    pub fn _get_storage(&self, key: &[u8]) -> Option<&Vec<u8>> {
        self.storage.get(key)
    }
    pub fn _increment_calls(&mut self) {
        self.metadata.call_count += 1;
    }
    pub fn _update_timestamp(&mut self, timestamp: Timestamp) {
        self.metadata.last_modified = timestamp;
    }
}

/// Persistent storage manager (RocksDB)
#[derive(Debug)]
pub struct StorageManager {
    db: Arc<DB>,
    // lightweight in-memory cache for hot account states (optional)
    _account_cache: Arc<RwLock<HashMap<Address, AccountState>>>, // underscore
}

const META_CHAIN_ID: &str = "meta:chain_id";
const META_HEIGHT: &str = "meta:height";
const META_BEST_HASH: &str = "meta:best_hash";

pub type _KVSnapshotResult = Result<Vec<(Vec<u8>, Vec<u8>)>, Box<dyn std::error::Error>>;

impl StorageManager {
    /// Open or create storage at data_dir. If empty, will initialize genesis (balances)
    pub async fn new() -> Result<Self, Box<dyn std::error::Error>> {
        // Fallback to env path if provided
        let data_dir = std::env::var("DYT_DATA_DIR").unwrap_or_else(|_| "./data".to_string());
        let chain_id = std::env::var("DYT_CHAIN_ID").unwrap_or_else(|_| "dyt-local-1".to_string());
        std::fs::create_dir_all(&data_dir)?;
        let mut opts = Options::default();
        opts.create_if_missing(true);
        let db_path = Path::new(&data_dir).join("node.db");
        let db = DB::open(&opts, db_path)?;
        let mgr = Self {
            db: Arc::new(db),
            _account_cache: Arc::new(RwLock::new(HashMap::new())),
        };
        mgr.ensure_chain_id(&chain_id)?;
        // If height not set treat as fresh and init genesis
        if mgr.get_height()? == 0 {
            mgr.init_genesis(&chain_id).await?;
        }
        Ok(mgr)
    }

    fn ensure_chain_id(&self, expected: &str) -> Result<(), Box<dyn std::error::Error>> {
        match self.db.get(META_CHAIN_ID.as_bytes())? {
            Some(stored) => {
                let stored_str = String::from_utf8(stored)?;
                if stored_str != expected {
                    return Err(format!(
                        "Chain ID mismatch: existing {stored_str} expected {expected}"
                    )
                    .into());
                }
            }
            None => {
                self.db.put(META_CHAIN_ID, expected)?;
            }
        }
        Ok(())
    }

    async fn init_genesis(&self, _chain_id: &str) -> Result<(), Box<dyn std::error::Error>> {
        // Load balances from genesis file if provided
        let genesis_path =
            std::env::var("DYT_GENESIS_FILE").unwrap_or_else(|_| "genesisBlock.json".to_string());
        if Path::new(&genesis_path).exists() {
            if let Ok(text) = std::fs::read_to_string(&genesis_path) {
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&text) {
                    // Accept either dgt_allocations or allocations arrays; only load dyt1* addresses
                    if let Some(arr) = json.get("dgt_allocations").and_then(|v| v.as_array()) {
                        for entry in arr {
                            if let (Some(addr), Some(amount_val)) = (
                                entry.get("address").and_then(|v| v.as_str()),
                                entry.get("amount"),
                            ) {
                                if addr.starts_with("dyt1") {
                                    // Amounts are serialized as strings; support numeric fallback for legacy
                                    let amount: Amount = if let Some(s) = amount_val.as_str() {
                                        s.parse::<Amount>().unwrap_or(0)
                                    } else if let Some(n) = amount_val.as_u128() {
                                        n
                                    } else if let Some(n) = amount_val.as_u64() {
                                        // Legacy fallback - TODO: remove when all genesis files use string/u128
                   