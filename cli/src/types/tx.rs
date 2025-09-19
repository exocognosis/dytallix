use crate::crypto::{canonical_json, sha3_256, ActivePQC, PQC};
use anyhow::{anyhow, Result};
use base64::{engine::general_purpose::STANDARD as B64, Engine};
use serde::{Deserialize, Serialize};

// Helper module to (de)serialize u128 as string for canonical on-wire format.
mod as_str_u128 {
    use serde::{self, Deserialize, Deserializer, Serializer};
    pub fn serialize<S: Serializer>(v: &u128, s: S) -> Result<S::Ok, S::Error> {
        s.serialize_str(&v.to_string())
    }
    pub fn deserialize<'de, D: Deserializer<'de>>(d: D) -> Result<u128, D::Error> {
        let s: String = Deserialize::deserialize(d)?;
        s.parse().map_err(serde::de::Error::custom)
    }
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Msg {
    Send {
        from: String,
        to: String,
        denom: String,
        #[serde(with = "as_str_u128")]
        amount: u128,
    },
}

impl Msg {
    pub fn validate(&self) -> Result<()> {
        match self {
            Msg::Send {
                from,
                to,
                denom,
                amount,
            } => {
                if *amount == 0 {
                    return Err(anyhow!("amount cannot be zero"));
                }
                if from.is_empty() {
                    return Err(anyhow!("from address cannot be empty"));
                }
                if to.is_empty() {
                    return Err(anyhow!("to address cannot be empty"));
                }
                let up = denom.to_ascii_uppercase();
                if up != "DGT" && up != "DRT" {
                    return Err(anyhow!("unsupported denom: {}; valid: DGT, DRT", denom));
                }
            }
        }
        Ok(())
    }

    pub fn from_address(&self) -> &str {
        match self {
            Msg::Send { from, .. } => from,
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct Tx {
    pub chain_id: String,
    pub nonce: u64,
    pub msgs: Vec<Msg>,
    #[serde(with = "as_str_u128")]
    pub fee: u128,
    pub memo: String,
}

impl Tx {
    pub fn new(
        chain_id: impl Into<String>,
        nonce: u64,
        msgs: Vec<Msg>,
        fee: u128,
        memo: impl Into<String>,
    ) -> Result<Self> {
        if msgs.is_empty() {
            return Err(anyhow!("transaction must contain at least one message"));
        }
        for m in &msgs {
            m.validate()?;
        }
        if fee == 0 {
            return Err(anyhow!("fee cannot be zero"));
        }
        let chain_id = chain_id.into();
        if chain_id.is_empty() {
            return Err(anyhow!("chain_id cannot be empty"));
        }
        Ok(Self {
            chain_id,
            nonce,
            msgs,
            fee,
            memo: memo.into(),
        })
    }

    pub fn validate(&self, expected_chain_id: &str) -> Result<()> {
        if self.chain_id != expected_chain_id {
            return Err(anyhow!(
                "invalid chain_id: expected {}, got {}",
                expected_chain_id,
                self.chain_id
            ));
        }
        if self.msgs.is_empty() {
            return Err(anyhow!("transaction must contain at least one message"));
        }
        if self.fee == 0 {
            return Err(anyhow!("fee cannot be zero"));
        }
        for msg in &self.msgs {
            msg.validate()?;
        }
        Ok(())
    }

    pub fn canonical_hash(&self) -> Result<[u8; 32]> {
        let bytes = canonical_json(self)?;
        Ok(sha3_256(&bytes))
    }

    pub fn tx_hash(&self) -> Result<String> {
        let hash = self.canonical_hash()?;
        Ok(format!("0x{}", hex::encode(hash)))
    }
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct SignedTx {
    pub tx: Tx,
    pub public_key: String, // base64
    pub signature: String,  // base64
    pub algorithm: String,  // ActivePQC::ALG
    pub version: u32,       // 1
    pub gas_limit: u64,     // Maximum gas allowed for this transaction
    pub gas_price: u64,     // Price per gas unit in datt (1 DGT = 1_000_000_000 datt)
}

impl SignedTx {
    pub fn sign(tx: Tx, sk: &[u8], pk: &[u8], gas_limit: u64, gas_price: u64) -> Result<Self> {
        let bytes = canonical_json(&tx)?;
        let hash = sha3_256(&bytes);
        let sig = ActivePQC::sign(sk, &hash);
        Ok(Self {
            tx,
            public_key: B64.encode(pk),
            signature: B64.encode(sig),
            algorithm: ActivePQC::ALG.to_string(),
            version: 1,
            gas_limit,
            gas_price,
        })
    }

    pub fn verify(&self) -> Result<()> {
        if self.algorithm != ActivePQC::ALG {
            return Err(anyhow!(
                "unsupported algorithm: expected {}, got {}",
                ActivePQC::ALG,
                self.algorithm
            ));
        }
        if self.version != 1 {
            return Err(anyhow!(
                "unsupported version: expected 1, got {}",
                self.version
            ));
        }
        let bytes = canonical_json(&self.tx)?;
        let hash = sha3_256(&bytes);
        let sig = B64
            .decode(&self.signature)
            .map_err(|e| anyhow!("invalid signature encoding: {}", e))?;
        let pk = B64
            .decode(&self.public_key)
            .map_err(|e| anyhow!("invalid public key encoding: {}", e))?;
        if !ActivePQC::verify(&pk, &hash, &sig) {
            return Err(anyhow!("signature verification failed"));
        }
        Ok(())
    }

    pub fn tx_hash(&self) -> Result<String> {
        self.tx.tx_hash()
    }

    pub fn first_from_address(&self) -> Option<&str> {
        self.tx.msgs.first().map(|m| m.from_address())
    }

    /// Calculate the total fee that will be charged in datt (gas_limit * gas_price)
    pub fn total_fee_datt(&self) -> u128 {
        (self.gas_limit as u128).saturating_mul(self.gas_price as u128)
    }

    /// Get transaction size in bytes for gas calculation
    pub fn tx_size_bytes(&self) -> Result<usize> {
        let bytes = canonical_json(&self.tx)?;
        Ok(bytes.len())
    }

    /// Count additional signatures beyond the first one
    pub fn additional_signatures(&self) -> usize {
        // For now, we only have one signature per transaction
        // This will be extended when multi-sig is implemented
        0
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::crypto::PQC; // only needed in tests for keypair trait bound

    #[test]
    fn test_msg_validation() {
        let valid_msg = Msg::Send {
            from: "alice".into(),
            to: "bob".into(),
            denom: "DGT".into(),
            amount: 100,
        };
        assert!(valid_msg.validate().is_ok());

        let zero_amount = Msg::Send {
            from: "alice".into(),
            to: "bob".into(),
            denom: "DGT".into(),
            amount: 0,
        };
        assert!(zero_amount.validate().is_err());

        let invalid_denom = Msg::Send {
            from: "alice".into(),
            to: "bob".into(),
            denom: "INVALID".into(),
            amount: 100,
        };
        assert!(invalid_denom.validate().is_err());

        let empty_from = Msg::Send {
            from: "".into(),
            to: "bob".into(),
            denom: "DGT".into(),
            amount: 100,
        };
        assert!(empty_from.validate().is_err());
    }

    #[test]
    fn test_tx_creation_and_validation() {
        let msg = Msg::Send {
            from: "alice".into(),
            to: "bob".into(),
            denom: "DGT".into(),
            amount: 100,
        };

        let tx = Tx::new("test-chain", 1, vec![msg], 10, "test memo").unwrap();
        assert!(tx.validate("test-chain").is_ok());
        assert!(tx.validate("wrong-chain").is_err());

        // Test empty msgs
        let empty_tx = Tx::new("test-chain", 1, vec![], 10, "");
        assert!(empty_tx.is_err());

        // Test zero fee
        let zero_fee_tx = Tx::new(
            "test-chain",
            1,
            vec![Msg::Send {
                from: "alice".into(),
                to: "bob".into(),
                denom: "DGT".into(),
                amount: 100,
            }],
            0,
            "",
        );
        assert!(zero_fee_tx.is_err());
    }

    #[test]
    fn test_signed_tx_round_trip() {
        let (sk, pk) = ActivePQC::keypair();
        let msg = Msg::Send {
            from: "alice".into(),
            to: "bob".into(),
            denom: "DGT".into(),
            amount: 100,
        };
        let tx = Tx::new("test-chain", 1, vec![msg], 10, "test").unwrap();
        let signed_tx = SignedTx::sign(tx, &sk, &pk, 21000, 1000).unwrap();

        assert!(signed_tx.verify().is_ok());
        assert_eq!(signed_tx.algorithm, ActivePQC::ALG);
        assert_eq!(signed_tx.version, 1);
        assert_eq!(signed_tx.gas_limit, 21000);
        assert_eq!(signed_tx.gas_price, 1000);
        assert_eq!(signed_tx.total_fee_datt(), 21_000_000);
    }

    #[test]
    fn test_deterministic_hash() {
        let msg1 = Msg::Send {
            from: "alice".into(),
            to: "bob".into(),
            denom: "DGT".into(),
            amount: 100,
        };
        let msg2 = Msg::Send {
            from: "alice".into(),
            to: "bob".into(),
            denom: "DGT".into(),
            amount: 100,
        };
        let tx1 = Tx::new("test-chain", 1, vec![msg1], 10, "test").unwrap();
        let tx2 = Tx::new("test-chain", 1, vec![msg2], 10, "test").unwrap();

        assert_eq!(tx1.tx_hash().unwrap(), tx2.tx_hash().unwrap());
    }

    #[test]
    fn test_serde_u128_string() {
        let msg = Msg::Send {
            from: "alice".into(),
            to: "bob".into(),
            denom: "DGT".into(),
            amount: 1000000000000000000u128,
        };
        let json = serde_json::to_string(&msg).unwrap();
        assert!(json.contains("\"1000000000000000000\""));

        let parsed: Msg = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed, msg);
    }
}
