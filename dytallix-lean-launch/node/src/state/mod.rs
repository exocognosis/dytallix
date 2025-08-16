use crate::storage::state::Storage;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccountState {
    pub balance: u128,
    pub nonce: u64,
}

#[derive(Clone)]
pub struct State {
    pub accounts: HashMap<String, AccountState>,
    pub storage: Arc<Storage>,
}

impl State {
    pub fn new(storage: Arc<Storage>) -> Self {
        Self {
            accounts: HashMap::new(),
            storage,
        }
    }
    pub fn get_account(&mut self, addr: &str) -> AccountState {
        // lazy load DB
        if let Some(a) = self.accounts.get(addr) {
            return a.clone();
        }
        let bal = self.storage.get_balance_db(addr);
        let nonce = self.storage.get_nonce_db(addr);
        let a = AccountState {
            balance: bal,
            nonce,
        };
        self.accounts.insert(addr.to_string(), a.clone());
        a
    }
    pub fn balance_of(&mut self, addr: &str) -> u128 {
        self.get_account(addr).balance
    }
    pub fn nonce_of(&mut self, addr: &str) -> u64 {
        self.get_account(addr).nonce
    }
    pub fn apply_transfer(&mut self, from: &str, to: &str, amount: u128, fee: u128) {
        let mut sender = self.get_account(from);
        sender.balance -= amount + fee;
        sender.nonce += 1;
        self.accounts.insert(from.to_string(), sender.clone());
        let mut recv = self.get_account(to);
        recv.balance += amount;
        self.accounts.insert(to.to_string(), recv.clone());
        let _ = self.storage.set_balance_db(from, sender.balance);
        let _ = self.storage.set_nonce_db(from, sender.nonce);
        let _ = self.storage.set_balance_db(to, recv.balance);
    }
    pub fn credit(&mut self, addr: &str, amount: u128) {
        let mut a = self.get_account(addr);
        a.balance += amount;
        self.accounts.insert(addr.to_string(), a.clone());
        let _ = self.storage.set_balance_db(addr, a.balance);
    }
}
