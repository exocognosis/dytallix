use crate::{state::State, storage::state::Storage};
use serde::Serialize;
use std::sync::{Arc, Mutex};

// Simple emission pools model.
// Pools accumulate a fixed amount per block. Claiming reduces pool and credits account.

#[derive(Debug, Clone, Serialize)]
pub struct EmissionSnapshot {
    pub height: u64,
    pub pools: std::collections::HashMap<String, u128>,
}

#[derive(Clone)]
pub struct EmissionEngine {
    pub storage: Arc<Storage>,
    pub state: Arc<Mutex<State>>, // to credit balances
    pub per_block: std::collections::HashMap<String, u128>,
}

impl EmissionEngine {
    pub fn new(storage: Arc<Storage>, state: Arc<Mutex<State>>) -> Self {
        let mut per_block = std::collections::HashMap::new();
        per_block.insert("community".to_string(), 5); // arbitrary small values
        per_block.insert("staking".to_string(), 7);
        per_block.insert("ecosystem".to_string(), 3);
        Self {
            storage,
            state,
            per_block,
        }
    }
    fn pool_key(pool: &str) -> String {
        format!("emission:pool:{}", pool)
    }
    fn height_key() -> &'static str {
        "emission:last_height"
    }

    pub fn pool_amount(&self, pool: &str) -> u128 {
        self.storage
            .db
            .get(Self::pool_key(pool))
            .ok()
            .flatten()
            .and_then(|v| bincode::deserialize::<u128>(&v).ok())
            .unwrap_or(0)
    }
    fn set_pool_amount(&self, pool: &str, amt: u128) {
        let _ = self
            .storage
            .db
            .put(Self::pool_key(pool), bincode::serialize(&amt).unwrap());
    }

    pub fn last_accounted_height(&self) -> u64 {
        self.storage
            .db
            .get(Self::height_key())
            .ok()
            .flatten()
            .and_then(|v| {
                if v.len() == 8 {
                    let mut a = [0u8; 8];
                    a.copy_from_slice(&v);
                    Some(u64::from_be_bytes(a))
                } else {
                    None
                }
            })
            .unwrap_or(0)
    }
    fn set_last_height(&self, h: u64) {
        let _ = self.storage.db.put(Self::height_key(), h.to_be_bytes());
    }

    pub fn apply_until(&self, target_height: u64) {
        let mut h = self.last_accounted_height();
        while h < target_height {
            h += 1;
            for (pool, amt) in &self.per_block {
                let cur = self.pool_amount(pool);
                self.set_pool_amount(pool, cur + amt);
            }
        }
        if h >= target_height {
            self.set_last_height(target_height);
        }
    }
    pub fn claim(&self, pool: &str, amount: u128, to: &str) -> Result<u128, String> {
        let cur = self.pool_amount(pool);
        if amount > cur {
            return Err("InsufficientPool".into());
        }
        let new_amt = cur - amount;
        self.set_pool_amount(pool, new_amt);
        // credit account
        if let Ok(mut st) = self.state.lock() {
            st.credit(to, "udgt", amount);
        }
        Ok(new_amt)
    }
    pub fn snapshot(&self) -> EmissionSnapshot {
        let mut pools = std::collections::HashMap::new();
        for k in self.per_block.keys() {
            pools.insert(k.clone(), self.pool_amount(k));
        }
        EmissionSnapshot {
            height: self.last_accounted_height(),
            pools,
        }
    }
}
