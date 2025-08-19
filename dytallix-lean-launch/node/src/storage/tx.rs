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
    // Message data for staking support
    #[serde(default)]
    pub msg_data: Option<String>, // JSON-encoded message data
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
            msg_data: None,
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
            msg_data: None,
        }
    }
    
    pub fn with_messages(
        hash: String,
        from: String,
        fee: u128,
        nonce: u64,
        signature: Option<String>,
        msg_data: String,
    ) -> Self {
        Self {
            hash,
            from,
            to: String::new(), // Not used for message-based transactions
            amount: 0,         // Not used for message-based transactions
            fee,
            nonce,
            signature,
            gas_limit: 0,
            gas_price: 0,
            msg_data: Some(msg_data),
        }
    }
}
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
        }
    }
}
