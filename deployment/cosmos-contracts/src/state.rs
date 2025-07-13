use cosmwasm_std::{Addr, Uint128};
use cw_storage_plus::{Item, Map};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct Config {
    pub admin: Addr,
    pub validator_threshold: u64,
    pub bridge_fee_bps: u64,
    pub paused: bool,
    pub nonce: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct BridgeTransaction {
    pub asset: String,
    pub amount: Uint128,
    pub recipient: String,
    pub destination_chain: String,
    pub nonce: u64,
    pub processed: bool,
}

pub const CONFIG: Item<Config> = Item::new("config");
pub const SUPPORTED_ASSETS: Map<&str, bool> = Map::new("supported_assets");
pub const LOCKED_BALANCES: Map<&str, Uint128> = Map::new("locked_balances");
pub const PROCESSED_TRANSACTIONS: Map<&str, bool> = Map::new("processed_transactions");
pub const VALIDATORS: Map<&Addr, bool> = Map::new("validators");
pub const BRIDGE_TRANSACTIONS: Map<&str, BridgeTransaction> = Map::new("bridge_transactions");
