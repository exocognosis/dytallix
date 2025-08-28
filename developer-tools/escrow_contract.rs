
// Generated Smart Contract: A simple token contract with transfer and balance functions
// Type: escrow
// Generated on: 2025-07-09T15:34:34.905352+00:00

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Debug)]
pub struct ContractState {
    pub owner: String,
    pub balances: HashMap<String, u64>,
    pub total_supply: u64,
    pub contract_name: String,
}

impl ContractState {
    pub fn new(owner: String) -> Self {
        let mut balances = HashMap::new();
        balances.insert(owner.clone(), 1000000);

        Self {
            owner,
            balances,
            total_supply: 1000000,
            contract_name: "A simple token contract with transfer and balance functions".to_string(),
        }
    }

    pub fn transfer(&mut self, from: &str, to: &str, amount: u64) -> Result<(), String> {
        let from_balance = self.balances.get(from).copied().unwrap_or(0);

        if from_balance < amount {
            return Err("Insufficient balance".to_string());
        }

        self.balances.insert(from.to_string(), from_balance - amount);

        let to_balance = self.balances.get(to).copied().unwrap_or(0);
        self.balances.insert(to.to_string(), to_balance + amount);

        Ok(())
    }

    pub fn balance_of(&self, account: &str) -> u64 {
        self.balances.get(account).copied().unwrap_or(0)
    }
}

#[no_mangle]
pub extern "C" fn init(owner: *const u8, owner_len: usize) -> *mut ContractState {
    let owner_slice = unsafe { std::slice::from_raw_parts(owner, owner_len) };
    let owner_str = String::from_utf8_lossy(owner_slice).to_string();

    let state = ContractState::new(owner_str);
    Box::into_raw(Box::new(state))
}

#[no_mangle]
pub extern "C" fn transfer(
    state: *mut ContractState,
    from: *const u8,
    from_len: usize,
    to: *const u8,
    to_len: usize,
    amount: u64
) -> i32 {
    let state = unsafe { &mut *state };

    let from_slice = unsafe { std::slice::from_raw_parts(from, from_len) };
    let from_str = String::from_utf8_lossy(from_slice);

    let to_slice = unsafe { std::slice::from_raw_parts(to, to_len) };
    let to_str = String::from_utf8_lossy(to_slice);

    match state.transfer(&from_str, &to_str, amount) {
        Ok(()) => 0,
        Err(_) => -1,
    }
}

#[no_mangle]
pub extern "C" fn balance_of(
    state: *const ContractState,
    account: *const u8,
    account_len: usize
) -> u64 {
    let state = unsafe { &*state };

    let account_slice = unsafe { std::slice::from_raw_parts(account, account_len) };
    let account_str = String::from_utf8_lossy(account_slice);

    state.balance_of(&account_str)
}
