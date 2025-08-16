use super::tx::Transaction;
use serde::de::{self, Visitor};
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use std::fmt;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum TxStatus {
    Pending,
    Success,
    Failed,
}

fn as_str<S: Serializer>(v: &u128, s: S) -> Result<S::Ok, S::Error> {
    s.serialize_str(&v.to_string())
}

fn de_u128<'de, D: Deserializer<'de>>(d: D) -> Result<u128, D::Error> {
    struct U128Visitor;
    impl<'de> Visitor<'de> for U128Visitor {
        type Value = u128;
        fn expecting(&self, f: &mut fmt::Formatter) -> fmt::Result {
            write!(f, "a string or number representing u128")
        }
        fn visit_str<E: de::Error>(self, v: &str) -> Result<Self::Value, E> {
            v.parse::<u128>()
                .map_err(|_| E::custom("invalid u128 string"))
        }
        fn visit_u64<E: de::Error>(self, v: u64) -> Result<Self::Value, E> {
            Ok(v as u128)
        }
        fn visit_u128<E: de::Error>(self, v: u128) -> Result<Self::Value, E> {
            Ok(v)
        }
    }
    d.deserialize_any(U128Visitor)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TxReceipt {
    pub tx_hash: String,
    pub status: TxStatus,
    pub block_height: Option<u64>,
    pub index: Option<u32>,
    pub from: String,
    pub to: String,
    #[serde(serialize_with = "as_str", deserialize_with = "de_u128")]
    pub amount: u128,
    #[serde(serialize_with = "as_str", deserialize_with = "de_u128")]
    pub fee: u128,
    pub nonce: u64,
    pub error: Option<String>,
}

impl TxReceipt {
    pub fn pending(tx: &Transaction) -> Self {
        Self {
            tx_hash: tx.hash.clone(),
            status: TxStatus::Pending,
            block_height: None,
            index: None,
            from: tx.from.clone(),
            to: tx.to.clone(),
            amount: tx.amount,
            fee: tx.fee,
            nonce: tx.nonce,
            error: None,
        }
    }
}
