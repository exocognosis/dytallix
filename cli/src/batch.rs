use anyhow::{Result, anyhow};
use serde::Deserialize;
use std::io::Read;

use crate::tx::{de_u128_string, de_nonce, NonceSpec};

#[derive(Deserialize, Debug)]
pub struct Batch {
    pub chain_id: String,
    pub from: String,
    #[serde(deserialize_with = "de_nonce")] pub nonce: NonceSpec,
    #[serde(deserialize_with = "de_u128_string")] pub fee: u128,
    #[serde(default)] pub memo: String,
    pub messages: Vec<BatchMsg>,
    #[serde(default)] pub broadcast: bool,
}

#[derive(Deserialize, Debug)]
#[serde(tag = "type")]
pub enum BatchMsg {
    #[serde(rename = "send")]
    Send { to: String, denom: String, #[serde(deserialize_with="de_u128_string")] amount: u128 },
}

impl Batch {
    pub fn validate(&mut self) -> Result<()> {
        if self.chain_id.trim().is_empty() { return Err(anyhow!("empty chain_id")); }
        if self.messages.is_empty() { return Err(anyhow!("no messages")); }
        self.memo = self.memo.trim().to_string();
        for m in &mut self.messages { match m { BatchMsg::Send { denom, amount, .. } => {
            if *amount == 0 { return Err(anyhow!("amount must be > 0")); }
            *denom = denom.to_ascii_uppercase();
            if denom != "DGT" && denom != "DRT" { return Err(anyhow!("invalid denom")); }
        } } }
        Ok(())
    }
}

pub fn read_batch(path: Option<&str>) -> Result<Batch> {
    let mut data = Vec::new();
    match path {
        Some(p) if p != "-" => {
            data = std::fs::read(p)?;
        },
        _ => { // stdin
            let mut stdin = std::io::stdin();
            stdin.read_to_end(&mut data)?;
        }
    }
    let mut batch: Batch = serde_json::from_slice(&data)?;
    batch.validate()?;
    Ok(batch)
}
