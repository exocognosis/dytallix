// Token contract implementation (simplified for brevity)
use std::collections::HashMap;

#[derive(Default)]
pub struct TokenContract {
    total_supply: u64,
    balances: HashMap<String, u64>,
    name: String,
}

impl TokenContract {
    pub fn new(name: String, initial_supply: u64) -> Self {
        let mut contract = Self {
            total_supply: initial_supply,
            balances: HashMap::new(),
            name,
        };
        contract.balances.insert("deployer".to_string(), initial_supply);
        contract
    }

    pub fn balance_of(&self, account: &str) -> u64 {
        *self.balances.get(account).unwrap_or(&0)
    }

    pub fn transfer(&mut self, from: &str, to: &str, amount: u64) -> Result<(), &'static str> {
        let from_balance = self.balance_of(from);
        if from_balance < amount {
            return Err("Insufficient balance");
        }
        let to_balance = self.balance_of(to);
        self.balances.insert(from.to_string(), from_balance - amount);
        self.balances.insert(to.to_string(), to_balance + amount);
        Ok(())
    }
}