//! SDK Error types

use thiserror::Error;

/// SDK Result type alias
pub type Result<T> = std::result::Result<T, SdkError>;

/// SDK Error types
#[derive(Debug, Error)]
pub enum SdkError {
    /// PQC key generation failed
    #[error("Key generation failed: {0}")]
    KeyGeneration(String),

    /// Signing operation failed
    #[error("Signing failed: {0}")]
    Signing(String),

    /// Verification failed
    #[error("Signature verification failed")]
    Verification,

    /// Network/HTTP error
    #[error("Network error: {0}")]
    Network(#[from] reqwest::Error),

    /// API error response
    #[error("API error: {0}")]
    Api(String),

    /// Serialization error
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    /// Invalid address format
    #[error("Invalid address: {0}")]
    InvalidAddress(String),

    /// Transaction timeout
    #[error("Transaction confirmation timeout")]
    Timeout,

    /// File I/O error
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}
