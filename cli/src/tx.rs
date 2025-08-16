use serde::{Serialize, Deserialize, Deserializer};
use sha3::{Digest, Sha3_256};
use base64::{engine::general_purpose::STANDARD as B64, Engine};
use anyhow::{Result, anyhow};
use crate::crypto::{ActivePQC, PQC, canonical_json, sha3_256};

// Helper module to (de)serialize u128 as string for canonical on-wire format.
mod as_str_u128 {
    use serde::{self, Serializer, Deserializer, Deserialize};
    pub fn serialize<S: Serializer>(v: &u128, s: S) -> Result<S::Ok, S::Error> { s.serialize_str(&v.to_string()) }
    pub fn deserialize<'de, D: Deserializer<'de>>(d: D) -> Result<u128, D::Error> {
        let s: String = Deserialize::deserialize(d)?; s.parse().map_err(serde::de::Error::custom)
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(tag="type", rename_all="snake_case")]
pub enum Msg {
    Send { from: String, to: String, denom: String, #[serde(with="as_str_u128")] amount: u128 }
}

impl Msg {
    pub fn validate(&self) -> Result<()> {
        match self {
            Msg::Send { denom, amount, .. } => {
                if *amount == 0 { return Err(anyhow!("amount zero")); }
                let up = denom.to_ascii_uppercase();
                if up != "DGT" && up != "DRT" { return Err(anyhow!("unsupported denom: {}; valid: DGT, DRT", denom)); }
            }
        }
        Ok(())
    }
}

// TODO: consider cloning & normalizing upstream rather than only validating.

#[derive(Clone, Debug)]
pub enum NonceSpec { Auto, Exact(u64) }

pub fn de_u128_string<'de, D: Deserializer<'de>>(d: D) -> Result<u128, D::Error> {
    let s = String::deserialize(d)?; s.parse().map_err(serde::de::Error::custom)
}

pub fn de_nonce<'de, D: Deserializer<'de>>(d: D) -> Result<NonceSpec, D::Error> {
    let v = serde_json::Value::deserialize(d)?;
    if v.is_string() && v.as_str().unwrap() == "auto" { return Ok(NonceSpec::Auto); }
    if let Some(n) = v.as_u64() { return Ok(NonceSpec::Exact(n)); }
    Err(serde::de::Error::custom("invalid nonce spec"))
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Tx {
    pub chain_id: String,
    pub nonce: u64,
    pub msgs: Vec<Msg>,
    #[serde(with="as_str_u128")] pub fee: u128,
    pub memo: String,
}

impl Tx {
    pub fn new(chain_id: impl Into<String>, nonce: u64, msgs: Vec<Msg>, fee: u128, memo: impl Into<String>) -> Result<Self> {
        if msgs.is_empty() { return Err(anyhow!("no msgs")); }
        for m in &msgs { m.validate()?; }
        Ok(Self { chain_id: chain_id.into(), nonce, msgs, fee, memo: memo.into() })
    }
    pub fn canonical_json_bytes(&self) -> Result<Vec<u8>> { Ok(serde_json::to_vec(&self)?) }
    pub fn hash(&self) -> Result<[u8;32]> { let bytes = self.canonical_json_bytes()?; let mut h = Sha3_256::new(); h.update(&bytes); let out = h.finalize(); let mut arr = [0u8;32]; arr.copy_from_slice(&out); Ok(arr) }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SignedTx {
    pub tx: Tx,
    pub public_key: String,           // base64
    pub signature: String,            // base64
    pub algorithm: String,            // ActivePQC::ALG
    pub version: u32,                 // 1
}

impl SignedTx {
    pub fn sign(tx: Tx, sk: &[u8], pk: &[u8]) -> Result<Self> {
        let bytes = canonical_json(&tx)?; let hash = sha3_256(&bytes); let sig = ActivePQC::sign(sk, &hash);
        Ok(Self { tx, public_key: B64.encode(pk), signature: B64.encode(sig), algorithm: ActivePQC::ALG.to_string(), version: 1 })
    }
    pub fn verify(&self) -> Result<()> {
        if self.algorithm != ActivePQC::ALG { return Err(anyhow!("algorithm mismatch")); }
        if self.version != 1 { return Err(anyhow!("unsupported version")); }
        let bytes = canonical_json(&self.tx)?; let hash = sha3_256(&bytes);
        let sig = B64.decode(&self.signature)?; let pk = B64.decode(&self.public_key)?;
        if !ActivePQC::verify(&pk, &hash, &sig) { return Err(anyhow!("signature verify failed")); }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn tx_hash_and_sign_verify() {
        let (sk, pk) = ActivePQC::keypair();
        let msg = Msg::Send { from: "a".into(), to: "b".into(), denom: "DGT".into(), amount: 10 }; 
        let tx = Tx::new("chain", 1, vec![msg], 1, "").unwrap();
        let stx = SignedTx::sign(tx.clone(), &sk, &pk).unwrap();
        stx.verify().unwrap();
        assert_eq!(stx.algorithm, ActivePQC::ALG);
        assert_eq!(stx.version, 1);
        let tx2 = Tx::new("chain", 1, vec![Msg::Send { from: "a".into(), to: "b".into(), denom: "DGT".into(), amount: 10 }], 1, "").unwrap();
        let bytes1 = canonical_json(&tx).unwrap();
        let bytes2 = canonical_json(&tx2).unwrap();
        assert_eq!(sha3_256(&bytes1), sha3_256(&bytes2));
    }
}
