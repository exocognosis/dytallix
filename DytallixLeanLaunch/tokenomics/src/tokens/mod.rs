//! Token implementations for DGT and DRT

pub mod dgt_token;
pub mod drt_token;

pub use dgt_token::DgtToken;
pub use drt_token::DrtToken;

use serde::{Deserialize, Serialize};

use crate::{Address, Balance, Result};

/// Common token interface
pub trait Token {
    /// Get token name
    fn name(&self) -> &str;
    
    /// Get token symbol
    fn symbol(&self) -> &str;
    
    /// Get number of decimals
    fn decimals(&self) -> u8;
    
    /// Get total supply
    fn total_supply(&self) -> Balance;
    
    /// Get balance of an account
    fn balance_of(&self, account: &Address) -> Balance;
    
    /// Transfer tokens between accounts
    fn transfer(&mut self, from: &Address, to: &Address, amount: Balance) -> Result<()>;
    
    /// Get allowance for spender
    fn allowance(&self, owner: &Address, spender: &Address) -> Balance;
    
    /// Approve spender to spend tokens
    fn approve(&mut self, owner: &Address, spender: &Address, amount: Balance) -> Result<()>;
    
    /// Transfer tokens on behalf of owner
    fn transfer_from(&mut self, spender: &Address, from: &Address, to: &Address, amount: Balance) -> Result<()>;
}

/// Token transfer event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransferEvent {
    /// Source account
    pub from: Address,
    /// Destination account
    pub to: Address,
    /// Amount transferred
    pub amount: Balance,
    /// Block number when transfer occurred
    pub block_number: u64,
    /// Transaction hash
    pub tx_hash: String,
}

/// Token approval event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApprovalEvent {
    /// Token owner
    pub owner: Address,
    /// Approved spender
    pub spender: Address,
    /// Approved amount
    pub amount: Balance,
    /// Block number when approval occurred
    pub block_number: u64,
    /// Transaction hash
    pub tx_hash: String,
}

/// Token mint event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MintEvent {
    /// Account receiving minted tokens
    pub to: Address,
    /// Amount minted
    pub amount: Balance,
    /// Block number when mint occurred
    pub block_number: u64,
    /// Transaction hash
    pub tx_hash: String,
}

/// Token burn event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BurnEvent {
    /// Account from which tokens were burned
    pub from: Address,
    /// Amount burned
    pub amount: Balance,
    /// Block number when burn occurred
    pub block_number: u64,
    /// Transaction hash
    pub tx_hash: String,
    /// Reason for burn
    pub reason: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_transfer_event_serialization() {
        let event = TransferEvent {
            from: "alice".to_string(),
            to: "bob".to_string(),
            amount: 1000,
            block_number: 100,
            tx_hash: "0x123".to_string(),
        };
        
        let json = serde_json::to_string(&event).unwrap();
        let deserialized: TransferEvent = serde_json::from_str(&json).unwrap();
        
        assert_eq!(event.from, deserialized.from);
        assert_eq!(event.to, deserialized.to);
        assert_eq!(event.amount, deserialized.amount);
    }
}