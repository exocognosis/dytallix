use super::blocks::Block;
use super::receipts::TxReceipt;
use super::tx::Transaction;
use rocksdb::{Options, DB};
use std::collections::BTreeMap;
use std::path::PathBuf;

#[derive(Debug)]
pub struct Storage {
    pub db: DB,
}

impl Storage {
    pub fn open(path: PathBuf) -> anyhow::Result<Self> {
        let mut opts = Options::default();
        opts.create_if_missing(true);
        let db = DB::open(&opts, path)?;
        Ok(Self { db })
    }
    pub fn put_block(&self, block: &Block, receipts: &[TxReceipt]) -> anyhow::Result<()> {
        eprintln!("[DEBUG put_block] Storing block {} with {} txs", block.header.height, block.txs.len());
        if !block.txs.is_empty() {
            eprintln!("[DEBUG put_block] First tx: hash={}, from={}, to={}, amount={}", 
                block.txs[0].hash, block.txs[0].from, block.txs[0].to, block.txs[0].amount);
        }
        
        // Use serde_json instead of bincode for blocks because TxMessage enum uses #[serde(tag = "type")]
        // which is not supported by bincode's deserialize_any
        let serialized = serde_json::to_vec(block)?;
        eprintln!("[DEBUG put_block] Serialized block {} to {} bytes (JSON)", block.header.height, serialized.len());
        
        // Try deserializing immediately to verify
        match serde_json::from_slice::<Block>(&serialized) {
            Ok(deserialized) => {
                eprintln!("[DEBUG put_block] Immediate deserialize check: {} txs ✅", deserialized.txs.len());
                if deserialized.txs.len() != block.txs.len() {
                    eprintln!("[DEBUG put_block] ⚠️ TX COUNT MISMATCH! Original: {}, Deserialized: {}", 
                        block.txs.len(), deserialized.txs.len());
                }
            }
            Err(e) => {
                eprintln!("[DEBUG put_block] ⚠️ WARNING: Failed to deserialize immediately after serialization!");
                eprintln!("[DEBUG put_block] Error details: {:?}", e);
                eprintln!("[DEBUG put_block] Original block had {} txs, serialized to {} bytes", 
                    block.txs.len(), serialized.len());
            }
        }
        
        self.db.put(
            format!("blk_hash:{}", block.hash),
            serialized,
        )?;
        self.db.put(
            format!("blk_num:{:016x}", block.header.height),
            block.hash.as_bytes(),
        )?;
        self.db
            .put("meta:height", block.header.height.to_be_bytes())?;
        self.db.put("meta:best_hash", block.hash.as_bytes())?;
        for r in receipts {
            self.db
                .put(format!("rcpt:{}", r.tx_hash), serde_json::to_vec(r)?)?;
        }
        Ok(())
    }
    pub fn height(&self) -> u64 {
        self.db
            .get("meta:height")
            .ok()
            .flatten()
            .and_then(|v| {
                if v.len() == 8 {
                    let mut arr = [0u8; 8];
                    arr.copy_from_slice(&v);
                    Some(u64::from_be_bytes(arr))
                } else {
                    None
                }
            })
            .unwrap_or(0)
    }
    pub fn best_hash(&self) -> String {
        self.db
            .get("meta:best_hash")
            .ok()
            .flatten()
            .map(|v| String::from_utf8_lossy(&v).to_string())
            .unwrap_or_else(|| "genesis".to_string())
    }
    pub fn get_block_by_height(&self, h: u64) -> Option<Block> {
        let hash = self.db.get(format!("blk_num:{h:016x}")).ok().flatten()?;
        self.get_block_by_hash(String::from_utf8_lossy(&hash).to_string())
    }
    pub fn get_block_by_hash(&self, hash: String) -> Option<Block> {
        eprintln!("[DEBUG get_block_by_hash] Looking for block with hash: {}", hash);
        let raw_data = self.db
            .get(format!("blk_hash:{hash}"))
            .ok()
            .flatten();
        
        if let Some(ref data) = raw_data {
            eprintln!("[DEBUG get_block_by_hash] Found raw data: {} bytes", data.len());
        } else {
            eprintln!("[DEBUG get_block_by_hash] ⚠️ No data found in DB for hash: {}", hash);
            return None;
        }
        
        let block: Option<Block> = raw_data.and_then(|b| {
            // Try JSON first (new format), fallback to bincode for old blocks
            match serde_json::from_slice::<Block>(&b) {
                Ok(block) => {
                    eprintln!("[DEBUG get_block_by_hash] Successfully deserialized block (JSON)");
                    Some(block)
                }
                Err(json_err) => {
                    eprintln!("[DEBUG get_block_by_hash] JSON deserialization failed, trying bincode...");
                    match bincode::deserialize::<Block>(&b) {
                        Ok(block) => {
                            eprintln!("[DEBUG get_block_by_hash] Successfully deserialized block (bincode)");
                            Some(block)
                        }
                        Err(bincode_err) => {
                            eprintln!("[DEBUG get_block_by_hash] ⚠️ Both JSON and bincode deserialization failed!");
                            eprintln!("[DEBUG get_block_by_hash] JSON error: {}", json_err);
                            eprintln!("[DEBUG get_block_by_hash] Bincode error: {}", bincode_err);
                            None
                        }
                    }
                }
            }
        });
        
        if let Some(ref b) = block {
            eprintln!("[DEBUG get_block_by_hash] Retrieved block {} with {} txs", b.header.height, b.txs.len());
            if !b.txs.is_empty() {
                eprintln!("[DEBUG get_block_by_hash] First tx: hash={}, from={}, to={}, amount={}", 
                    b.txs[0].hash, b.txs[0].from, b.txs[0].to, b.txs[0].amount);
            }
        }
        
        block
    }
    pub fn put_tx(&self, tx: &Transaction) -> anyhow::Result<()> {
        self.db
            .put(format!("tx:{}", tx.hash), bincode::serialize(tx)?)?;
        Ok(())
    }
    pub fn put_pending_receipt(&self, r: &TxReceipt) -> anyhow::Result<()> {
        self.db
            .put(format!("rcpt:{}", r.tx_hash), serde_json::to_vec(r)?)?;
        Ok(())
    }
    pub fn get_receipt(&self, hash: &str) -> Option<TxReceipt> {
        let k = format!("rcpt:{hash}");
        match self.db.get(&k) {
            Ok(Some(raw)) => {
                if raw.is_empty() {
                    return None;
                }
                serde_json::from_slice(&raw)
                    .or_else(|_| bincode::deserialize(&raw))
                    .ok()
            }
            Ok(None) => None,
            Err(_) => None,
        }
    }
    pub fn get_chain_id(&self) -> Option<String> {
        self.db
            .get("meta:chain_id")
            .ok()
            .flatten()
            .map(|v| String::from_utf8_lossy(&v).to_string())
    }
    pub fn set_chain_id(&self, id: &str) -> anyhow::Result<()> {
        self.db.put("meta:chain_id", id.as_bytes())?;
        Ok(())
    }

    // Durable balance + nonce methods
    /// Get multi-denomination balances for an address
    pub fn get_balances_db(&self, addr: &str) -> BTreeMap<String, u128> {
        self.db
            .get(format!("acct:balances:{addr}"))
            .ok()
            .flatten()
            .and_then(|b| bincode::deserialize::<BTreeMap<String, u128>>(&b).ok())
            .unwrap_or_default()
    }

    /// Set multi-denomination balances for an address
    pub fn set_balances_db(
        &self,
        addr: &str,
        balances: &BTreeMap<String, u128>,
    ) -> anyhow::Result<()> {
        self.db.put(
            format!("acct:balances:{addr}"),
            bincode::serialize(balances)?,
        )?;
        Ok(())
    }

    /// Legacy single balance getter (for backward compatibility)
    pub fn get_balance_db(&self, addr: &str) -> u128 {
        // Check if new multi-denom format exists first
        let balances = self.get_balances_db(addr);
        if !balances.is_empty() {
            return balances.get("udgt").copied().unwrap_or(0);
        }

        // Fallback to legacy single balance format
        self.db
            .get(format!("acct:bal:{addr}"))
            .ok()
            .flatten()
            .and_then(|b| bincode::deserialize::<u128>(&b).ok())
            .unwrap_or(0)
    }

    /// Legacy single balance setter (for backward compatibility)
    pub fn set_balance_db(&self, addr: &str, bal: u128) -> anyhow::Result<()> {
        // Migrate to multi-denom format
        let mut balances = self.get_balances_db(addr);
        balances.insert("udgt".to_string(), bal);
        self.set_balances_db(addr, &balances)?;

        // Also keep legacy format for compatibility during migration
        self.db
            .put(format!("acct:bal:{addr}"), bincode::serialize(&bal)?)?;
        Ok(())
    }
    pub fn get_nonce_db(&self, addr: &str) -> u64 {
        self.db
            .get(format!("acct:nonce:{addr}"))
            .ok()
            .flatten()
            .and_then(|b| bincode::deserialize::<u64>(&b).ok())
            .unwrap_or(0)
    }
    pub fn set_nonce_db(&self, addr: &str, nonce: u64) -> anyhow::Result<()> {
        self.db
            .put(format!("acct:nonce:{addr}"), bincode::serialize(&nonce)?)?;
        Ok(())
    }
}
