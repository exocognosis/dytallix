pub mod client;
pub mod wallet;

pub use client::Client;
pub use wallet::Wallet;

// Re-export core types for user convenience
pub use dytallix_node::types::Transaction;
