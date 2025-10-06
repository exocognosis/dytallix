use serde::{Deserialize, Serialize};
// Use canonical SignatureAlgorithm from dytallix_pqc crate
pub use dytallix_pqc::SignatureAlgorithm;

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
    // Multi-denomination support (defaults to "udgt" for backward compatibility)
    #[serde(default = "default_denom")]
    pub denom: String,
    // Store original messages for multi-message transaction support
    // This allows execution engine to process all messages, not just the first one
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub messages: Option<Vec<TxMessage>>,
    // PQC signature algorithm (with default for backward compatibility)
    #[serde(default = "default_algorithm")]
    pub algorithm: String,
}

/// Serializable message format for storage
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum TxMessage {
    Send {
        from: String,
        to: String,
        denom: String,
        amount: u128,
    },
    // Future message types can be added here:
    // Delegate { validator: String, amount: u128 },
    // Vote { proposal_id: u64, option: VoteOption },
}

fn default_denom() -> String {
    "udgt".to_string()
}

fn default_algorithm() -> String {
    "dilithium3".to_string()
}

impl Transaction {
    pub fn base(
        hash: impl Into<String>,
        from: impl Into<String>,
        to: impl Into<String>,
        amount: u128,
        fee: u128,
        nonce: u64,
    ) -> Self {
        Self {
            hash: hash.into(),
            from: from.into(),
            to: to.into(),
            amount,
            fee,
            nonce,
            signature: None,
            gas_limit: 0,
            gas_price: 0,
            public_key: None,
            chain_id: String::new(),
            memo: String::new(),
            denom: "udgt".to_string(),
            messages: None,
            algorithm: "dilithium3".to_string(),
        }
    }

    // New convenience constructor (legacy compatibility with RPC layer)
    pub fn new(
        hash: impl Into<String>,
        from: impl Into<String>,
        to: impl Into<String>,
        amount: u128,
        fee: u128,
        nonce: u64,
        signature: Option<String>,
    ) -> Self {
        let mut tx = Self::base(hash, from, to, amount, fee, nonce);
        tx.signature = signature;
        tx
    }

    pub fn with_signature(mut self, signature: impl Into<String>) -> Self {
        self.signature = Some(signature.into());
        self
    }

    pub fn with_gas(mut self, gas_limit: u64, gas_price: u64) -> Self {
        self.gas_limit = gas_limit;
        self.gas_price = gas_price;
        self
    }

    pub fn with_pqc(
        mut self,
        public_key: impl Into<String>,
        chain_id: impl Into<String>,
        memo: impl Into<String>,
    ) -> Self {
        self.public_key = Some(public_key.into());
        self.chain_id = chain_id.into();
        self.memo = memo.into();
        self
    }

    pub fn with_denom(mut self, denom: impl Into<String>) -> Self {
        self.denom = denom.into();
        self
    }

    pub fn with_messages(mut self, messages: Vec<TxMessage>) -> Self {
        self.messages = Some(messages);
        self
    }

    pub fn with_algorithm(mut self, algorithm: impl Into<String>) -> Self {
        self.algorithm = algorithm.into();
        self
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

    /// Extract the signature algorithm from the transaction
    /// Returns the algorithm field if present, defaults to dilithium3
    pub fn signature_algorithm(&self) -> Option<SignatureAlgorithm> {
        if self.signature.is_none() {
            return None;
        }
        
        // Parse the algorithm string to the enum
        match self.algorithm.as_str() {
            "dilithium3" => Some(SignatureAlgorithm::Dilithium3),
            "dilithium5" => Some(SignatureAlgorithm::Dilithium5),
            "falcon1024" => Some(SignatureAlgorithm::Falcon1024),
            _ => Some(SignatureAlgorithm::Dilithium3), // Default fallback
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
