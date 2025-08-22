use crate::models::{Block, Transaction};
use rusqlite::{Connection, Result, params, OptionalExtension};
use anyhow::anyhow;

pub struct Store {
    conn: Connection,
}

impl Store {
    pub fn new(db_path: &str) -> anyhow::Result<Self> {
        let conn = Connection::open(db_path)
            .map_err(|e| anyhow!("Failed to open database: {}", e))?;
        
        crate::schema::apply_migrations(&conn)?;
        
        Ok(Self { conn })
    }

    pub fn insert_block(&self, block: &Block) -> Result<()> {
        self.conn.execute(
            "INSERT OR REPLACE INTO blocks (height, hash, time, tx_count) VALUES (?1, ?2, ?3, ?4)",
            params![block.height, block.hash, block.time, block.tx_count],
        )?;
        Ok(())
    }

    pub fn insert_transaction(&self, tx: &Transaction) -> Result<()> {
        self.conn.execute(
            "INSERT OR REPLACE INTO txs (hash, height, sender, recipient, amount, denom, status, gas_used) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                tx.hash,
                tx.height,
                tx.sender,
                tx.recipient,
                tx.amount,
                tx.denom,
                tx.status,
                tx.gas_used
            ],
        )?;
        Ok(())
    }

    pub fn get_latest_block_height(&self) -> Result<Option<u64>> {
        let mut stmt = self.conn.prepare("SELECT MAX(height) FROM blocks")?;
        let height: Option<Option<u64>> = stmt.query_row([], |row| row.get(0)).optional()?;
        Ok(height.flatten())
    }

    pub fn get_blocks(&self, limit: u32, offset: u32) -> Result<Vec<Block>> {
        let mut stmt = self.conn.prepare(
            "SELECT height, hash, time, tx_count FROM blocks 
             ORDER BY height DESC 
             LIMIT ?1 OFFSET ?2"
        )?;
        
        let block_iter = stmt.query_map(params![limit, offset], |row| {
            Ok(Block {
                height: row.get(0)?,
                hash: row.get(1)?,
                time: row.get(2)?,
                tx_count: row.get(3)?,
            })
        })?;

        let mut blocks = Vec::new();
        for block in block_iter {
            blocks.push(block?);
        }
        Ok(blocks)
    }

    pub fn get_transactions(&self, limit: u32, offset: u32) -> Result<Vec<Transaction>> {
        let mut stmt = self.conn.prepare(
            "SELECT hash, height, sender, recipient, amount, denom, status, gas_used 
             FROM txs 
             ORDER BY rowid DESC 
             LIMIT ?1 OFFSET ?2"
        )?;
        
        let tx_iter = stmt.query_map(params![limit, offset], |row| {
            Ok(Transaction {
                hash: row.get(0)?,
                height: row.get(1)?,
                sender: row.get(2)?,
                recipient: row.get(3)?,
                amount: row.get(4)?,
                denom: row.get(5)?,
                status: row.get(6)?,
                gas_used: row.get(7)?,
            })
        })?;

        let mut txs = Vec::new();
        for tx in tx_iter {
            txs.push(tx?);
        }
        Ok(txs)
    }

    pub fn get_transaction_by_hash(&self, hash: &str) -> Result<Option<Transaction>> {
        let mut stmt = self.conn.prepare(
            "SELECT hash, height, sender, recipient, amount, denom, status, gas_used 
             FROM txs 
             WHERE hash = ?1"
        )?;
        
        let tx = stmt.query_row(params![hash], |row| {
            Ok(Transaction {
                hash: row.get(0)?,
                height: row.get(1)?,
                sender: row.get(2)?,
                recipient: row.get(3)?,
                amount: row.get(4)?,
                denom: row.get(5)?,
                status: row.get(6)?,
                gas_used: row.get(7)?,
            })
        }).optional()?;
        
        Ok(tx)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::NamedTempFile;

    #[test]
    fn test_schema_creation() {
        let temp_db = NamedTempFile::new().unwrap();
        let store = Store::new(temp_db.path().to_str().unwrap()).unwrap();
        
        // Test that we can insert and retrieve a block
        let block = Block {
            height: 1,
            hash: "test_hash".to_string(),
            time: "2024-01-01T00:00:00Z".to_string(),
            tx_count: 0,
        };
        
        store.insert_block(&block).unwrap();
        let blocks = store.get_blocks(10, 0).unwrap();
        assert_eq!(blocks.len(), 1);
        assert_eq!(blocks[0].height, 1);
        assert_eq!(blocks[0].hash, "test_hash");
    }

    #[test]
    fn test_transaction_insert_select() {
        let temp_db = NamedTempFile::new().unwrap();
        let store = Store::new(temp_db.path().to_str().unwrap()).unwrap();
        
        // Insert a block first
        let block = Block {
            height: 1,
            hash: "block_hash".to_string(),
            time: "2024-01-01T00:00:00Z".to_string(),
            tx_count: 1,
        };
        store.insert_block(&block).unwrap();
        
        // Insert a transaction
        let tx = Transaction {
            hash: "tx_hash".to_string(),
            height: 1,
            sender: Some("sender_addr".to_string()),
            recipient: Some("recipient_addr".to_string()),
            amount: Some("100".to_string()),
            denom: Some("dyt".to_string()),
            status: 1,
            gas_used: 21000,
        };
        
        store.insert_transaction(&tx).unwrap();
        
        // Test retrieval
        let txs = store.get_transactions(10, 0).unwrap();
        assert_eq!(txs.len(), 1);
        assert_eq!(txs[0].hash, "tx_hash");
        assert_eq!(txs[0].sender, Some("sender_addr".to_string()));
        
        // Test by hash
        let retrieved_tx = store.get_transaction_by_hash("tx_hash").unwrap();
        assert!(retrieved_tx.is_some());
        assert_eq!(retrieved_tx.unwrap().hash, "tx_hash");
    }

    #[test]
    fn test_idempotent_inserts() {
        let temp_db = NamedTempFile::new().unwrap();
        let store = Store::new(temp_db.path().to_str().unwrap()).unwrap();
        
        let block = Block {
            height: 1,
            hash: "test_hash".to_string(),
            time: "2024-01-01T00:00:00Z".to_string(),
            tx_count: 0,
        };
        
        // Insert the same block twice
        store.insert_block(&block).unwrap();
        store.insert_block(&block).unwrap();
        
        // Should only have one block
        let blocks = store.get_blocks(10, 0).unwrap();
        assert_eq!(blocks.len(), 1);
    }

    #[test]
    fn test_latest_block_height() {
        let temp_db = NamedTempFile::new().unwrap();
        let store = Store::new(temp_db.path().to_str().unwrap()).unwrap();
        
        // No blocks initially
        assert_eq!(store.get_latest_block_height().unwrap(), None);
        
        // Insert blocks
        for height in [1, 3, 2] {
            let block = Block {
                height,
                hash: format!("hash_{}", height),
                time: "2024-01-01T00:00:00Z".to_string(),
                tx_count: 0,
            };
            store.insert_block(&block).unwrap();
        }
        
        // Should return highest height
        assert_eq!(store.get_latest_block_height().unwrap(), Some(3));
    }
}