use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Block {
    pub height: u64,
    pub hash: String,
    pub time: String,
    pub tx_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Transaction {
    pub hash: String,
    pub height: u64,
    pub sender: Option<String>,
    pub recipient: Option<String>,
    pub amount: Option<String>,
    pub denom: Option<String>,
    pub status: i32,
    pub gas_used: u64,
}

#[derive(Debug, Deserialize)]
pub struct RpcBlock {
    pub height: u64,
    pub hash: String,
    pub txs: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct RpcBlockResponse {
    pub blocks: Vec<RpcBlock>,
}

#[derive(Debug, Deserialize)]
pub struct RpcTransaction {
    pub hash: String,
    pub height: Option<u64>,
    pub from: Option<String>,
    pub to: Option<String>,
    pub amount: Option<String>,
    pub denom: Option<String>,
    pub status: Option<String>,
    pub gas_used: Option<u64>,
}

#[derive(Debug, Deserialize)]
pub struct RpcLatestResponse {
    pub height: u64, // used externally; keep field
}
