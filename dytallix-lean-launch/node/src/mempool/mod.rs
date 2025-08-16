use std::collections::{VecDeque, HashSet};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::state::State;
use crate::storage::tx::Transaction;

#[derive(Debug, Clone)]
pub struct PendingTx {
    pub tx: Transaction,
    pub received_at: u64,
}

pub struct Mempool {
    queue: VecDeque<PendingTx>,
    hashes: HashSet<String>,
    pub max: usize,
}

impl Mempool {
    pub fn new(max: usize) -> Self {
        Self { queue: VecDeque::new(), hashes: HashSet::new(), max }
    }

    pub fn len(&self) -> usize { self.queue.len() }
    pub fn is_full(&self) -> bool { self.queue.len() >= self.max }
    pub fn contains(&self, hash: &str) -> bool { self.hashes.contains(hash) }

    pub fn push(&mut self, tx: Transaction) -> Result<(), MempoolError> {
        if self.is_full() { return Err(MempoolError::Full); }
        let h = tx.hash.clone();
        if self.hashes.contains(&h) { return Err(MempoolError::Duplicate); }
        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
        self.queue.push_back(PendingTx { tx: tx.clone(), received_at: now });
        self.hashes.insert(h);
        Ok(())
    }

    // Take up to n (FIFO) without validation removal
    pub fn take_snapshot(&self, n: usize) -> Vec<Transaction> {
        self.queue.iter().take(n).map(|p| p.tx.clone()).collect()
    }

    // Remove a list of hashes after they were processed (success or failed)
    pub fn drop_hashes(&mut self, hashes: &[String]) {
        if hashes.is_empty() { return; }
        let set: HashSet<String> = hashes.iter().cloned().collect();
        self.queue.retain(|p| !set.contains(&p.tx.hash));
        for h in set { self.hashes.remove(&h); }
    }
}

#[derive(Debug)]
pub enum MempoolError { Duplicate, Full }
impl std::fmt::Display for MempoolError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self { MempoolError::Duplicate => write!(f, "duplicate"), MempoolError::Full => write!(f, "full") }
    }
}
impl std::error::Error for MempoolError {}

// Simple transfer validation reused pre-inclusion
pub fn basic_validate(state: &State, tx: &Transaction) -> Result<(), String> {
    let from_state = state.get_account(&tx.from);
    let balance = from_state.map(|a| a.balance).unwrap_or(0);
    let nonce = from_state.map(|a| a.nonce).unwrap_or(0);
    if tx.nonce != nonce { return Err(format!("InvalidNonce expected={} got={}", nonce, tx.nonce)); }
    let needed = tx.amount + tx.fee;
    if balance < needed { return Err("InsufficientBalance".to_string()); }
    // signature verification placeholder (assume valid)
    Ok(())
}
