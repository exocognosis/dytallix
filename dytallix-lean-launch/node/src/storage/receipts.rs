use serde::{Serialize, Deserialize, Serializer};
use super::tx::Transaction;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum TxStatus { Pending, Success, Failed }

fn as_str<S: Serializer>(v: &u128, s: S) -> Result<S::Ok, S::Error> { s.serialize_str(&v.to_string()) }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TxReceipt {
    pub tx_hash:String,
    pub status: TxStatus,
    pub block_height: Option<u64>,
    pub index: Option<u32>,
    pub from:String,
    pub to:String,
    #[serde(serialize_with="as_str")] pub amount:u128,
    #[serde(serialize_with="as_str")] pub fee:u128,
    pub nonce:u64,
    pub error: Option<String>
}

impl TxReceipt { pub fn pending(tx: &Transaction) -> Self { Self { tx_hash: tx.hash.clone(), status: TxStatus::Pending, block_height: None, index: None, from: tx.from.clone(), to: tx.to.clone(), amount: tx.amount, fee: tx.fee, nonce: tx.nonce, error: None } } }
