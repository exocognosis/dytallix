use rocksdb::DB;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AiRiskRecord {
    pub tx_hash: String,
    pub score: f32,
    pub signature: Option<String>,
    pub oracle_pubkey: Option<String>,
}

pub struct OracleStore<'a> {
    pub db: &'a DB,
}

impl<'a> OracleStore<'a> {
    fn key(tx_hash: &str) -> String {
        format!("oracle:ai:{}", tx_hash)
    }

    pub fn put_ai_risk(&self, rec: &AiRiskRecord) -> anyhow::Result<()> {
        self.db
            .put(Self::key(&rec.tx_hash), serde_json::to_vec(rec)?)?;
        Ok(())
    }

    pub fn get_ai_risk(&self, tx_hash: &str) -> Option<AiRiskRecord> {
        self.db
            .get(Self::key(tx_hash))
            .ok()
            .flatten()
            .and_then(|v| serde_json::from_slice(&v).ok())
    }
}
