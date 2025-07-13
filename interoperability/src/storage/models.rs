//! Database Models for Bridge Storage
//!
//! Defines the database models and structures for bridge persistence.

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct BridgeTransactionModel {
    pub id: String,
    pub asset_id: String,
    pub asset_amount: i64,
    pub asset_decimals: i32,
    pub source_chain: String,
    pub dest_chain: String,
    pub source_address: String,
    pub dest_address: String,
    pub source_tx_hash: Option<String>,
    pub dest_tx_hash: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub validator_signatures: serde_json::Value,
    pub metadata: serde_json::Value,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct AssetMetadataModel {
    pub asset_id: String,
    pub name: String,
    pub symbol: String,
    pub description: Option<String>,
    pub decimals: i32,
    pub icon_url: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct ValidatorSignatureModel {
    pub id: i32,
    pub bridge_tx_id: String,
    pub validator_id: String,
    pub signature_data: Vec<u8>,
    pub signature_type: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct ChainConfigModel {
    pub chain_name: String,
    pub chain_type: String,
    pub config_data: serde_json::Value,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct BridgeStateModel {
    pub key: String,
    pub value: serde_json::Value,
    pub updated_at: DateTime<Utc>,
}
