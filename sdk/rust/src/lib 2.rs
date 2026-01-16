//! Dytallix SDK - Official Rust SDK for the Dytallix blockchain
//!
//! This SDK provides:
//! - PQC wallet generation (ML-DSA / Dilithium3)
//! - Transaction signing
//! - RPC client for chain interaction
//!
//! # Quick Start
//!
//! ```rust,no_run
//! use dytallix_sdk::{Wallet, Client};
//!
//! #[tokio::main]
//! async fn main() -> anyhow::Result<()> {
//!     // Generate a new PQC wallet
//!     let wallet = Wallet::generate()?;
//!     println!("Address: {}", wallet.address());
//!
//!     // Connect to testnet
//!     let client = Client::testnet();
//!     let status = client.get_status().await?;
//!     println!("Block height: {}", status.block_height);
//!
//!     Ok(())
//! }
//! ```

mod wallet;
mod client;
mod error;

pub use wallet::Wallet;
pub use client::{Client, ChainStatus, AccountInfo, FaucetResponse, FaucetDispensed, Block, StakingRewards, RewardsBalance, TransactionReceipt};
pub use error::{SdkError, Result};

/// Testnet RPC endpoint
pub const TESTNET_RPC: &str = "https://dytallix.com/rpc";

/// Testnet chain ID
pub const TESTNET_CHAIN_ID: &str = "dytallix-testnet-1";
