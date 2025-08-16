use std::collections::HashMap;
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccountState { pub balance: u128, pub nonce: u64 }

#[derive(Default, Clone)]
pub struct State { pub accounts: HashMap<String, AccountState> }

impl State {
    pub fn new() -> Self { Self { accounts: HashMap::new() } }
    pub fn get_account(&self, addr: &str) -> Option<&AccountState> { self.accounts.get(addr) }
    pub fn balance_of(&self, addr: &str) -> u128 { self.accounts.get(addr).map(|a| a.balance).unwrap_or(0) }
    pub fn nonce_of(&self, addr: &str) -> u64 { self.accounts.get(addr).map(|a| a.nonce).unwrap_or(0) }
    pub fn apply_transfer(&mut self, from: &str, to: &str, amount: u128, fee: u128) {
        let sender = self.accounts.entry(from.to_string()).or_insert(AccountState { balance:0, nonce:0 });
        sender.balance -= amount + fee; sender.nonce += 1;
        let recv = self.accounts.entry(to.to_string()).or_insert(AccountState { balance:0, nonce:0 });
        recv.balance += amount;
    }
    pub fn credit(&mut self, addr: &str, amount: u128) { let a = self.accounts.entry(addr.to_string()).or_insert(AccountState{balance:0,nonce:0}); a.balance += amount; }
}
