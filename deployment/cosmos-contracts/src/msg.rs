use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use cosmwasm_std::{Addr, Uint128};

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct InstantiateMsg {
    pub admin: Option<String>,
    pub validator_threshold: u64,
    pub bridge_fee_bps: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub enum ExecuteMsg {
    /// Lock assets for cross-chain transfer
    LockAsset {
        asset: String,
        amount: Uint128,
        destination_chain: String,
        recipient: String,
    },
    /// Unlock assets after cross-chain validation
    UnlockAsset {
        transaction_id: String,
        asset: String,
        recipient: String,
        amount: Uint128,
        signatures: Vec<String>,
    },
    /// Add supported asset
    AddSupportedAsset { asset: String },
    /// Remove supported asset
    RemoveSupportedAsset { asset: String },
    /// Add validator
    AddValidator { validator: String },
    /// Remove validator
    RemoveValidator { validator: String },
    /// Update bridge configuration
    UpdateConfig {
        validator_threshold: Option<u64>,
        bridge_fee_bps: Option<u64>,
    },
    /// Emergency pause
    Pause {},
    /// Unpause
    Unpause {},
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub enum QueryMsg {
    /// Get bridge configuration
    Config {},
    /// Get supported assets
    SupportedAssets {},
    /// Get locked balance for asset
    LockedBalance { asset: String },
    /// Check if transaction is processed
    IsTransactionProcessed { transaction_id: String },
    /// Get validators
    Validators {},
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct ConfigResponse {
    pub admin: Addr,
    pub validator_threshold: u64,
    pub bridge_fee_bps: u64,
    pub paused: bool,
    pub nonce: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct SupportedAssetsResponse {
    pub assets: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct LockedBalanceResponse {
    pub balance: Uint128,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct ValidatorsResponse {
    pub validators: Vec<Addr>,
}
