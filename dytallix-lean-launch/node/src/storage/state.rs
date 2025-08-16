use std::path::PathBuf;
use rocksdb::{DB, Options, IteratorMode};
use serde::{Serialize, Deserialize};
use super::blocks::Block;
use super::tx::Transaction;
use super::receipts::TxReceipt;

pub struct Storage { pub db: DB }

#[derive(Serialize, Deserialize)]
struct AccountSer { balance: u128, nonce: u64 }

impl Storage {
    pub fn open(path: PathBuf) -> anyhow::Result<Self> {
        let mut opts = Options::default(); opts.create_if_missing(true); let db = DB::open(&opts, path)?; Ok(Self { db })
    }
    pub fn put_block(&self, block: &Block, receipts: &[TxReceipt]) -> anyhow::Result<()> {
        self.db.put(format!("blk_hash:{}", block.hash), bincode::serialize(block)?)?;
        self.db.put(format!("blk_num:{:016x}", block.header.height), block.hash.as_bytes())?;
        self.db.put("meta:height", block.header.height.to_be_bytes())?;
        self.db.put("meta:best_hash", block.hash.as_bytes())?;
        for r in receipts { self.db.put(format!("rcpt:{}", r.tx_hash), bincode::serialize(r)?)?; }
        Ok(())
    }
    pub fn height(&self) -> u64 { self.db.get("meta:height").ok().flatten().and_then(|v| if v.len()==8 { let mut arr=[0u8;8]; arr.copy_from_slice(&v); Some(u64::from_be_bytes(arr)) } else { None }).unwrap_or(0) }
    pub fn best_hash(&self) -> String { self.db.get("meta:best_hash").ok().flatten().map(|v| String::from_utf8_lossy(&v).to_string()).unwrap_or_else(|| "genesis".to_string()) }
    pub fn get_block_by_height(&self, h: u64) -> Option<Block> { let hash = self.db.get(format!("blk_num:{:016x}", h)).ok().flatten()?; self.get_block_by_hash(String::from_utf8_lossy(&hash).to_string()) }
    pub fn get_block_by_hash(&self, hash: String) -> Option<Block> { self.db.get(format!("blk_hash:{}", hash)).ok().flatten().and_then(|b| bincode::deserialize(&b).ok()) }
    pub fn put_account(&self, addr: &str, balance: u128, nonce: u64) -> anyhow::Result<()> { let a = AccountSer{balance,nonce}; self.db.put(format!("acct:{}", addr), bincode::serialize(&a)?)?; Ok(()) }
    pub fn get_account(&self, addr: &str) -> Option<(u128,u64)> { self.db.get(format!("acct:{}", addr)).ok().flatten().and_then(|b| bincode::deserialize::<AccountSer>(&b).ok()).map(|a|(a.balance,a.nonce)) }
    pub fn iter_accounts(&self) -> Vec<(String,u128,u64)> {
        let mut out=vec![];
        let iter = self.db.iterator(IteratorMode::Start);
        for item in iter {
            if let Ok((k,v)) = item {
                if let Ok(key_str) = String::from_utf8(k.to_vec()) {
                    if let Some(rest) = key_str.strip_prefix("acct:") {
                        if let Ok(acc) = bincode::deserialize::<AccountSer>(&v) { out.push((rest.to_string(), acc.balance, acc.nonce)); }
                    }
                }
            }
        }
        out
    }
    pub fn put_tx(&self, tx: &Transaction) -> anyhow::Result<()> { self.db.put(format!("tx:{}", tx.hash), bincode::serialize(tx)?)?; Ok(()) }
    pub fn put_pending_receipt(&self, r: &TxReceipt) -> anyhow::Result<()> { self.db.put(format!("rcpt:{}", r.tx_hash), bincode::serialize(r)?)?; Ok(()) }
    pub fn get_receipt(&self, hash: &str) -> Option<TxReceipt> { self.db.get(format!("rcpt:{}", hash)).ok().flatten().and_then(|b| bincode::deserialize(&b).ok()) }
    pub fn get_chain_id(&self) -> Option<String> { self.db.get("meta:chain_id").ok().flatten().map(|v| String::from_utf8_lossy(&v).to_string()) }
    pub fn set_chain_id(&self, id: &str) -> anyhow::Result<()> { self.db.put("meta:chain_id", id.as_bytes())?; Ok(()) }
}
