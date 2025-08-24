use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Transaction {
    pub hash: String,
    pub from: String,
    pub to: String,
    pub amount: u128,
    pub fee: u128,
    pub nonce: u64,
    pub signature: Option<String>,
    // Gas accounting fields (with defaults for backward compatibility)
    #[serde(default)]
    pub gas_limit: u64,
    #[serde(default)]
    pub gas_price: u64,
    // PQC signature fields (with defaults for backward compatibility)
    #[serde(default)]
    pub public_key: Option<String>,
    #[serde(default)]
    pub chain_id: String,
    #[serde(default)]
    pub memo: String,
}

impl Transaction {
    pub fn new(
        hash: String,
        from: String,
        to: String,
        amount: u128,
        fee: u128,
        nonce: u64,
        signature: Option<String>,
    ) -> Self {
        Self {
            hash,
            from,
            to,
            amount,
            fee,
            nonce,
            signature,
            gas_limit: 0,
            gas_price: 0,
            public_key: None,
            chain_id: String::new(),
            memo: String::new(),
        }
    }

    pub fn with_gas(
        hash: String,
        from: String,
        to: String,
        amount: u128,
        fee: u128,
        nonce: u64,
        signature: Option<String>,
        gas_limit: u64,
        gas_price: u64,
    ) -> Self {
        Self {
            hash,
            from,
            to,
            amount,
            fee,
            nonce,
            signature,
            gas_limit,
            gas_price,
            public_key: None,
            chain_id: String::new(),
            memo: String::new(),
        }
    }

    pub fn with_pqc(
        hash: String,
        from: String,
        to: String,
        amount: u128,
        fee: u128,
        nonce: u64,
        signature: Option<String>,
        public_key: Option<String>,
        chain_id: String,
        memo: String,
        gas_limit: u64,
        gas_price: u64,
    ) -> Self {
        Self {
            hash,
            from,
            to,
            amount,
            fee,
            nonce,
            signature,
            gas_limit,
            gas_price,
            public_key,
            chain_id,
            memo,
        }
    }

    /// Get canonical transaction fields for signature verification
    pub fn canonical_fields(&self) -> CanonicalTransaction {
        CanonicalTransaction {
            from: self.from.clone(),
            to: self.to.clone(),
            amount: self.amount,
            fee: self.fee,
            nonce: self.nonce,
            chain_id: self.chain_id.clone(),
            memo: self.memo.clone(),
        }
    }
}

/// Canonical transaction structure for signature verification
/// Only includes fields that should be signed (excludes hash, signature, public_key, gas fields)
#[derive(Debug, Clone, Serialize)]
pub struct CanonicalTransaction {
    pub from: String,
    pub to: String,
    pub amount: u128,
    pub fee: u128,
    pub nonce: u64,
    pub chain_id: String,
    pub memo: String,
}
