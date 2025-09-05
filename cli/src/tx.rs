// Legacy tx.rs - kept for backward compatibility
// New canonical types are in types/tx.rs

use anyhow::Result;
use serde::{Deserialize, Deserializer};

use crate::crypto::{canonical_json, sha3_256, ActivePQC, PQC};

// Re-export canonical types
pub use crate::types::{Msg, SignedTx, Tx};

// Legacy types for compatibility
#[allow(dead_code)]
#[derive(Clone, Debug)]
pub enum NonceSpec {
    Auto,
    Exact(u64),
}

pub fn de_u128_string<'de, D: Deserializer<'de>>(d: D) -> Result<u128, D::Error> {
    let s = String::deserialize(d)?;
    s.parse().map_err(serde::de::Error::custom)
}

pub fn de_nonce<'de, D: Deserializer<'de>>(d: D) -> Result<NonceSpec, D::Error> {
    let v = serde_json::Value::deserialize(d)?;
    if v.is_string() && v.as_str().unwrap() == "auto" {
        return Ok(NonceSpec::Auto);
    }
    if let Some(n) = v.as_u64() {
        return Ok(NonceSpec::Exact(n));
    }
    Err(serde::de::Error::custom("invalid nonce spec"))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn tx_hash_and_sign_verify() {
        let (sk, pk) = ActivePQC::keypair();
        let msg = Msg::Send {
            from: "a".into(),
            to: "b".into(),
            denom: "DGT".into(),
            amount: 10,
        };
        let tx = Tx::new("chain", 1, vec![msg], 1, "").unwrap();
        let stx = SignedTx::sign(tx.clone(), &sk, &pk, 21000, 1000).unwrap();
        stx.verify().unwrap();
        assert_eq!(stx.algorithm, ActivePQC::ALG);
        assert_eq!(stx.version, 1);
        assert_eq!(stx.gas_limit, 21000);
        assert_eq!(stx.gas_price, 1000);
        let tx2 = Tx::new(
            "chain",
            1,
            vec![Msg::Send {
                from: "a".into(),
                to: "b".into(),
                denom: "DGT".into(),
                amount: 10,
            }],
            1,
            "",
        )
        .unwrap();
        let bytes1 = canonical_json(&tx).unwrap();
        let bytes2 = canonical_json(&tx2).unwrap();
        assert_eq!(sha3_256(&bytes1), sha3_256(&bytes2));
    }
}
