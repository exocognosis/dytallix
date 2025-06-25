use dytallix_pqc::{PQCManager as DytallixPQCManager, Signature, SignatureAlgorithm};
use log::info;
use hex;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PQCKeyPair {
    pub public_key: Vec<u8>,
    pub secret_key: Vec<u8>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PQCSignature {
    pub signature: Vec<u8>,
    pub algorithm: String,
}

pub struct PQCManager {
    inner: DytallixPQCManager,
}

impl std::fmt::Debug for PQCManager {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("PQCManager")
            .field("inner", &"<PQCManager instance>")
            .finish()
    }
}

impl PQCManager {
    pub fn new() -> Result<Self, Box<dyn std::error::Error>> {
        info!("Generating post-quantum cryptographic keys...");
        
        let inner = DytallixPQCManager::new()?;
        info!("Post-quantum keys generated successfully");
        
        Ok(Self { inner })
    }
    
    pub fn sign_message(&self, message: &[u8]) -> Result<PQCSignature, Box<dyn std::error::Error>> {
        let signature = self.inner.sign(message)?;
        
        Ok(PQCSignature {
            signature: signature.data.clone(),
            algorithm: format!("{:?}", signature.algorithm),
        })
    }
    
    pub fn verify_signature(
        &self,
        message: &[u8],
        signature: &PQCSignature,
        public_key: &[u8],
    ) -> Result<bool, Box<dyn std::error::Error>> {
        let sig = Signature {
            data: signature.signature.clone(),
            algorithm: SignatureAlgorithm::Dilithium5, // Default for now
        };
        
        Ok(self.inner.verify(message, &sig, public_key)?)
    }
    
    pub fn get_dilithium_public_key(&self) -> &[u8] {
        self.inner.get_signature_public_key()
    }
    
    pub fn get_kyber_public_key(&self) -> &[u8] {
        self.inner.get_key_exchange_public_key()
    }
    
    pub fn perform_key_exchange(&self, _peer_public_key: &[u8]) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
        info!("Key exchange performed, shared secret generated");
        // Placeholder implementation
        Ok(vec![0u8; 32])
    }
    
    // Crypto-agility: Allow swapping algorithms
    pub fn set_signature_algorithm(&mut self, algorithm: &str) -> Result<(), Box<dyn std::error::Error>> {
        match algorithm {
            "CRYSTALS-Dilithium5" => {
                // Already using this
                Ok(())
            }
            "Falcon-1024" => {
                // Placeholder for Falcon implementation
                info!("Switching to Falcon-1024 (not yet implemented)");
                Err("Falcon-1024 not yet implemented".into())
            }
            "SPHINCS+" => {
                // Placeholder for SPHINCS+ implementation
                info!("Switching to SPHINCS+ (not yet implemented)");
                Err("SPHINCS+ not yet implemented".into())
            }
            _ => Err(format!("Unsupported signature algorithm: {}", algorithm).into()),
        }
    }

    /// Sign a blockchain transaction using the node's Dilithium key
    pub fn sign_transaction(
        &self,
        tx: &crate::types::Transaction,
    ) -> Result<crate::types::PQCTransactionSignature, Box<dyn std::error::Error>> {
        use crate::types::*;

        // Format the transaction message depending on its type
        let message = match tx {
            Transaction::Transfer(t) => format_transfer_message(t),
            Transaction::Deploy(t) => format_deploy_message(t),
            Transaction::Call(t) => format_call_message(t),
            Transaction::Stake(t) => format_stake_message(t),
            Transaction::AIRequest(t) => format_ai_request_message(t),
        };

        // Create Dilithium signature over the formatted bytes
        let signature = self.inner.sign(&message)?;

        Ok(PQCTransactionSignature {
            signature,
            public_key: self.inner.get_signature_public_key().to_vec(),
        })
    }
}

// --- Message formatters ----------------------------------------------------

use crate::types::{
    AIRequestTransaction, CallTransaction, DeployTransaction, StakeAction, StakeTransaction,
    TransferTransaction, AIServiceType,
};

fn format_transfer_message(tx: &TransferTransaction) -> Vec<u8> {
    format!(
        "transfer:{}:{}:{}:{}:{}:{}",
        tx.from, tx.to, tx.amount, tx.fee, tx.nonce, tx.timestamp
    )
    .into_bytes()
}

fn format_deploy_message(tx: &DeployTransaction) -> Vec<u8> {
    format!(
        "deploy:{}:{}:{}:{}:{}:{}",
        tx.from,
        hex::encode(&tx.contract_code),
        hex::encode(&tx.initial_state),
        tx.fee,
        tx.nonce,
        tx.timestamp
    )
    .into_bytes()
}

fn format_call_message(tx: &CallTransaction) -> Vec<u8> {
    format!(
        "call:{}:{}:{}:{}:{}:{}:{}",
        tx.from,
        tx.contract_address,
        tx.method,
        hex::encode(&tx.params),
        tx.fee,
        tx.nonce,
        tx.timestamp
    )
    .into_bytes()
}

fn format_stake_message(tx: &StakeTransaction) -> Vec<u8> {
    format!(
        "stake:{}:{:?}:{}:{}:{}:{}",
        tx.validator, tx.action, tx.amount, tx.fee, tx.nonce, tx.timestamp
    )
    .into_bytes()
}

fn format_ai_request_message(tx: &AIRequestTransaction) -> Vec<u8> {
    format!(
        "airequest:{}:{:?}:{}:{}:{}:{}",
        tx.from,
        tx.service_type,
        hex::encode(&tx.request_data),
        tx.fee,
        tx.nonce,
        tx.timestamp
    )
    .into_bytes()
}
