use thiserror::Error;
use cosmwasm_std::StdError;

#[derive(Error, Debug)]
pub enum ContractError {
    #[error("{0}")]
    Std(#[from] StdError),

    #[error("Overflow")]
    Overflow(#[from] cosmwasm_std::OverflowError),

    #[error("Unauthorized")]
    Unauthorized {},

    #[error("Asset not supported")]
    AssetNotSupported {},

    #[error("Insufficient balance")]
    InsufficientBalance {},

    #[error("Transaction already processed")]
    TransactionAlreadyProcessed {},

    #[error("Invalid signatures")]
    InvalidSignatures {},

    #[error("Contract is paused")]
    ContractPaused {},

    #[error("Invalid threshold")]
    InvalidThreshold {},

    #[error("Fee too high")]
    FeeTooHigh {},
}
