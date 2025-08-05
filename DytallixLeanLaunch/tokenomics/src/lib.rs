//! Dytallix Dual-Token Economic System
//! 
//! This crate implements the complete tokenomics for the Dytallix blockchain,
//! including governance tokens (DGT), reward tokens (DRT), staking, vesting,
//! governance mechanisms, and automated burning.

pub mod config;
pub mod tokens;
pub mod vesting;
pub mod staking;
pub mod governance;
pub mod burning;

use thiserror::Error;

/// Common result type for tokenomics operations
pub type Result<T> = std::result::Result<T, TokenomicsError>;

/// Errors that can occur in the tokenomics system
#[derive(Error, Debug)]
pub enum TokenomicsError {
    #[error("Insufficient balance: required {required}, available {available}")]
    InsufficientBalance { required: u128, available: u128 },
    
    #[error("Token not found: {token_id}")]
    TokenNotFound { token_id: String },
    
    #[error("Vesting schedule not found for account: {account}")]
    VestingNotFound { account: String },
    
    #[error("Governance proposal not found: {proposal_id}")]
    ProposalNotFound { proposal_id: u64 },
    
    #[error("Unauthorized operation for account: {account}")]
    Unauthorized { account: String },
    
    #[error("Invalid configuration: {details}")]
    InvalidConfig { details: String },
    
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
    
    #[error("Calculation overflow")]
    Overflow,
    
    #[error("Invalid timestamp: {timestamp}")]
    InvalidTimestamp { timestamp: u64 },
}

/// Common address type for accounts
pub type Address = String;

/// Common balance type for token amounts
pub type Balance = u128;

/// Timestamp type for time-based operations
pub type Timestamp = u64;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_display() {
        let error = TokenomicsError::InsufficientBalance { 
            required: 1000, 
            available: 500 
        };
        assert!(error.to_string().contains("Insufficient balance"));
    }
}