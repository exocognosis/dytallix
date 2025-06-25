use std::sync::Arc;
use tokio::sync::Mutex;
use serde::{Serialize, Deserialize};
use log::{info, debug, warn, error};

use crate::runtime::DytallixRuntime;
use crate::crypto::{PQCManager, PQCSignature};
use crate::types::{Transaction, Block, BlockHeader, AIRequestTransaction, AIServiceType}; // Import from types

// AI Service Integration
use std::collections::HashMap;
use tokio::time::{Duration, timeout};
use reqwest::Client;

/// AI Oracle Response with signed validation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SignedAIOracleResponse {
    pub oracle_id: String,
    pub timestamp: u64,
    pub request_hash: String,
    pub ai_result: AIAnalysisResult,
    pub signature: AIResponseSignature,
    pub confidence_score: f64,
}

/// AI Analysis Result structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIAnalysisResult {
    pub service_type: AIServiceType,
    pub risk_score: f64,
    pub fraud_probability: f64,
    pub reputation_score: u32,
    pub compliance_flags: Vec<String>,
    pub recommendations: Vec<String>,
    pub metadata: HashMap<String, String>,
}

/// AI Response Signature (PQC-based)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIResponseSignature {
    pub algorithm: String,
    pub signature_data: Vec<u8>,
    pub public_key: Vec<u8>,
    pub certificate_chain: Vec<Vec<u8>>,
}

/// AI Service Configuration
#[derive(Debug, Clone)]
pub struct AIServiceConfig {
    pub endpoint: String,
    pub api_key: Option<String>,
    pub timeout_seconds: u64,
    pub max_retries: u32,
    pub risk_threshold: f64,
}

impl Default for AIServiceConfig {
    fn default() -> Self {
        Self {
            endpoint: "http://localhost:8888".to_string(),
            api_key: None,
            timeout_seconds: 30,
            max_retries: 3,
            risk_threshold: 0.8,
        }
    }
}

#[derive(Debug)]
pub struct ConsensusEngine {
    runtime: Arc<DytallixRuntime>,
    pqc_manager: Arc<PQCManager>,
    current_block: Arc<Mutex<Option<Block>>>,
    validators: Arc<Mutex<Vec<String>>>,
    is_validator: bool,
}

impl ConsensusEngine {
    pub fn new(
        runtime: Arc<DytallixRuntime>,
        pqc_manager: Arc<PQCManager>,
    ) -> Result<Self, Box<dyn std::error::Error>> {
        Ok(Self {
            runtime,
            pqc_manager,
            current_block: Arc::new(Mutex::new(None)),
            validators: Arc::new(Mutex::new(Vec::new())),
            is_validator: true, // For development
        })
    }
    
    pub async fn start(&self) -> Result<(), Box<dyn std::error::Error>> {
        info!("Starting consensus engine...");
        
        if self.is_validator {
            self.start_validator_loop().await?;
        }
        
        Ok(())
    }
    
    pub async fn stop(&self) -> Result<(), Box<dyn std::error::Error>> {
        info!("Stopping consensus engine...");
        Ok(())
    }
    
    async fn start_validator_loop(&self) -> Result<(), Box<dyn std::error::Error>> {
        info!("Starting validator loop...");
        
        let runtime = Arc::clone(&self.runtime);
        let pqc_manager = Arc::clone(&self.pqc_manager);
        let current_block = Arc::clone(&self.current_block);
        
        tokio::spawn(async move {
            let mut block_number = 0u64;
            
            loop {
                debug!("Validator tick - producing block #{}", block_number);
                
                // Create a sample transaction for demonstration
                let mut sample_tx = crate::types::TransferTransaction {
                    hash: String::new(), // Will be calculated
                    from: "dyt1genesis".to_string(),
                    to: format!("dyt1addr{}", block_number % 5), // Rotate between addresses
                    amount: 100 + (block_number * 10), // Variable amounts
                    fee: 1,
                    nonce: block_number,
                    timestamp: std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_secs(),
                    signature: crate::types::PQCTransactionSignature {
                        signature: dytallix_pqc::Signature {
                            data: Vec::new(),
                            algorithm: dytallix_pqc::SignatureAlgorithm::Dilithium5,
                        },
                        public_key: Vec::new(),
                    },
                    ai_risk_score: Some(0.1), // Low risk
                };
                
                // Calculate hash
                sample_tx.hash = sample_tx.calculate_hash();
                
                let transaction = Transaction::Transfer(sample_tx);
                let transactions = vec![transaction];
                
                // Create block proposal
                match Self::create_block_proposal(&runtime, &pqc_manager, &current_block, transactions, block_number).await {
                    Ok(block) => {
                        info!("✅ Successfully created block #{} with {} transactions", 
                              block.header.number, block.transactions.len());
                        
                        // Validate the block
                        match Self::validate_block_static(&runtime, &pqc_manager, &block).await {
                            Ok(true) => {
                                info!("✅ Block #{} validation successful", block.header.number);
                                
                                // Apply block to state
                                if let Err(e) = Self::apply_block_to_state(&runtime, &block).await {
                                    log::error!("Failed to apply block to state: {}", e);
                                } else {
                                    // Update current block
                                    let mut current = current_block.lock().await;
                                    *current = Some(block);
                                    block_number += 1;
                                }
                            }
                            Ok(false) => {
                                log::error!("❌ Block #{} validation failed", block.header.number);
                            }
                            Err(e) => {
                                log::error!("❌ Error validating block #{}: {}", block.header.number, e);
                            }
                        }
                    }
                    Err(e) => {
                        log::error!("Failed to create block proposal: {}", e);
                    }
                }
                
                tokio::time::sleep(tokio::time::Duration::from_secs(10)).await;
            }
        });
        
        Ok(())
    }
    
    pub async fn propose_block(&self, transactions: Vec<Transaction>) -> Result<Block, String> {
        Self::create_block_proposal(&self.runtime, &self.pqc_manager, &self.current_block, transactions, 0).await
    }
    
    pub async fn validate_block(&self, block: &Block) -> Result<bool, String> {
        Self::validate_block_static(&self.runtime, &self.pqc_manager, block).await
    }
    
    fn calculate_merkle_root(&self, transactions: &[Transaction]) -> String {
        Self::calculate_merkle_root_static(transactions)
    }
    
    // Static helper methods for use in async tasks
    async fn create_block_proposal(
        runtime: &Arc<DytallixRuntime>,
        pqc_manager: &Arc<PQCManager>,
        current_block: &Arc<Mutex<Option<Block>>>,
        transactions: Vec<Transaction>,
        block_number: u64,
    ) -> Result<Block, String> {
        let previous_block = current_block.lock().await;
        let parent_hash = match &*previous_block {
            Some(block) => Self::calculate_block_hash_static(&block.header),
            None => "0".repeat(64), // Genesis block
        };
        drop(previous_block);
        
        let transactions_root = Self::calculate_merkle_root_static(&transactions);
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|e| e.to_string())?
            .as_secs();
        
        // Create a placeholder signature (to be replaced)
        let placeholder_signature = crate::types::PQCBlockSignature {
            signature: dytallix_pqc::Signature {
                data: Vec::new(),
                algorithm: dytallix_pqc::SignatureAlgorithm::Dilithium5,
            },
            public_key: Vec::new(),
        };
        
        let header = BlockHeader {
            number: block_number,
            parent_hash,
            transactions_root,
            state_root: "0".repeat(64), // TODO: Calculate actual state root
            timestamp,
            validator: "dyt1validator".to_string(), // TODO: Use actual validator address
            signature: placeholder_signature.clone(),
            nonce: 0,
        };
        
        let mut block = Block {
            header,
            transactions,
        };
        
        // Sign the block with PQC signature
        let block_hash = Self::calculate_block_hash_static(&block.header);
        let signature = pqc_manager.sign_message(block_hash.as_bytes())
            .map_err(|e| e.to_string())?;
        
        // Update the block header with real signature
        block.header.signature = crate::types::PQCBlockSignature {
            signature: dytallix_pqc::Signature {
                data: signature.signature,
                algorithm: dytallix_pqc::SignatureAlgorithm::Dilithium5,
            },
            public_key: pqc_manager.get_dilithium_public_key().to_vec(),
        };
        
        Ok(block)
    }
    
    async fn validate_block_static(
        runtime: &Arc<DytallixRuntime>,
        pqc_manager: &Arc<PQCManager>,
        block: &Block,
    ) -> Result<bool, String> {
        // Validate block structure
        if block.transactions.is_empty() {
            return Ok(false);
        }
        
        // Validate PQC signature
        if block.header.signature.signature.data.is_empty() {
            error!("Block #{} missing signature data", block.header.number);
            return Ok(false);
        }
        if block.header.signature.public_key.is_empty() {
            error!("Block #{} missing signer public key", block.header.number);
            return Ok(false);
        }

        if block.header.signature.signature.algorithm != *pqc_manager.get_signature_algorithm() {
            error!(
                "Block #{} uses unsupported signature algorithm: {:?}",
                block.header.number,
                block.header.signature.signature.algorithm
            );
            return Ok(false);
        }

        let block_hash = Self::calculate_block_hash_static(&block.header);
        match pqc_manager.verify_signature(
            block_hash.as_bytes(),
            &crate::crypto::PQCSignature {
                signature: block.header.signature.signature.data.clone(),
                algorithm: format!("{:?}", block.header.signature.signature.algorithm),
            },
            &block.header.signature.public_key,
        ) {
            Ok(true) => {}
            Ok(false) => {
                error!("Invalid signature for block #{}", block.header.number);
                return Ok(false);
            }
            Err(e) => {
                error!("Error verifying block #{} signature: {}", block.header.number, e);
                return Err(e.to_string());
            }
        }
        
        // Validate transactions
        for tx in &block.transactions {
            if !Self::validate_transaction_static(runtime, pqc_manager, tx).await? {
                return Ok(false);
            }
        }
        
        Ok(true)
    }
    
    async fn validate_transaction_static(
        runtime: &Arc<DytallixRuntime>,
        pqc_manager: &Arc<PQCManager>,
        tx: &Transaction,
    ) -> Result<bool, String> {
        match tx {
            Transaction::Transfer(transfer_tx) => {
                // Basic validation
                if transfer_tx.amount == 0 {
                    return Ok(false);
                }
                
                // Check AI risk score if present
                if let Some(risk_score) = transfer_tx.ai_risk_score {
                    if risk_score > 0.8 {
                        info!("Transaction rejected due to high AI risk score: {}", risk_score);
                        return Ok(false);
                    }
                }
                
                // Check balance for transfers (skip for genesis)
                if transfer_tx.from != "dyt1genesis" {
                    let balance = runtime.get_balance(&transfer_tx.from).await
                        .map_err(|e| e.to_string())?;
                    if balance < transfer_tx.amount {
                        info!("Transaction rejected due to insufficient balance: {} < {}", balance, transfer_tx.amount);
                        return Ok(false);
                    }
                }
                
                let is_valid = Self::verify_tx_signature_static(
                    pqc_manager,
                    transfer_tx.hash.as_bytes(),
                    &transfer_tx.signature,
                )?;
                if !is_valid {
                    warn!("Invalid signature for transfer tx: {}", transfer_tx.hash);
                    return Ok(false);
                }
                Ok(true)
            }
            Transaction::Deploy(deploy_tx) => {
                let is_valid = Self::verify_tx_signature_static(
                    pqc_manager,
                    deploy_tx.hash.as_bytes(),
                    &deploy_tx.signature,
                )?;
                if !is_valid {
                    warn!("Invalid signature for deploy tx: {}", deploy_tx.hash);
                    return Ok(false);
                }
                Ok(true)
            }
            Transaction::Call(call_tx) => {
                let is_valid = Self::verify_tx_signature_static(
                    pqc_manager,
                    call_tx.hash.as_bytes(),
                    &call_tx.signature,
                )?;
                if !is_valid {
                    warn!("Invalid signature for call tx: {}", call_tx.hash);
                    return Ok(false);
                }
                Ok(true)
            }
            Transaction::Stake(stake_tx) => {
                let is_valid = Self::verify_tx_signature_static(
                    pqc_manager,
                    stake_tx.hash.as_bytes(),
                    &stake_tx.signature,
                )?;
                if !is_valid {
                    warn!("Invalid signature for stake tx: {}", stake_tx.hash);
                    return Ok(false);
                }
                Ok(true)
            }
            Transaction::AIRequest(ai_request_tx) => {
                // Validate AI request transaction
                if ai_request_tx.service_type == AIServiceType::Unknown {
                    return Ok(false);
                }
                
                // Check for required fields based on service type
                match ai_request_tx.service_type {
                    AIServiceType::KYC | AIServiceType::AML => {
                        if ai_request_tx.payload.get("identity").is_none() {
                            return Ok(false);
                        }
                    },
                    AIServiceType::CreditAssessment => {
                        if ai_request_tx.payload.get("social_security_number").is_none() {
                            return Ok(false);
                        }
                    },
                    _ => {}
                }
                
                // Check AI risk score if present
                if let Some(risk_score) = ai_request_tx.ai_risk_score {
                    if risk_score > 0.8 {
                        info!("AI request rejected due to high risk score: {}", risk_score);
                        return Ok(false);
                    }
                }
                let is_valid = Self::verify_tx_signature_static(
                    pqc_manager,
                    ai_request_tx.hash.as_bytes(),
                    &ai_request_tx.signature,
                )?;
                if !is_valid {
                    warn!("Invalid signature for AI request tx: {}", ai_request_tx.hash);
                    return Ok(false);
                }

                Ok(true)
            }
        }
    }
    
    async fn apply_block_to_state(
        runtime: &Arc<DytallixRuntime>,
        block: &Block,
    ) -> Result<(), String> {
        info!("Applying block #{} to state", block.header.number);
        
        for tx in &block.transactions {
            match tx {
                Transaction::Transfer(transfer_tx) => {
                    // Apply transfer transaction to state
                    if transfer_tx.from != "dyt1genesis" {
                        // Deduct from sender (skip for genesis)
                        let sender_balance = runtime.get_balance(&transfer_tx.from).await.unwrap_or(0);
                        if sender_balance >= transfer_tx.amount {
                            runtime.set_balance(&transfer_tx.from, sender_balance - transfer_tx.amount).await
                                .map_err(|e| e.to_string())?;
                            runtime.increment_nonce(&transfer_tx.from).await
                                .map_err(|e| e.to_string())?;
                        }
                    }
                    
                    // Add to recipient
                    let recipient_balance = runtime.get_balance(&transfer_tx.to).await.unwrap_or(0);
                    runtime.set_balance(&transfer_tx.to, recipient_balance + transfer_tx.amount).await
                        .map_err(|e| e.to_string())?;
                    
                    info!("Applied transfer: {} -> {} ({})", transfer_tx.from, transfer_tx.to, transfer_tx.amount);
                }
                Transaction::Deploy(deploy_tx) => {
                    // TODO: Deploy smart contract
                    info!("Applied contract deployment: {}", deploy_tx.hash);
                }
                Transaction::Call(call_tx) => {
                    // TODO: Execute smart contract call
                    info!("Applied contract call: {}", call_tx.hash);
                }
                Transaction::Stake(stake_tx) => {
                    // TODO: Process staking transaction
                    info!("Applied staking transaction: {}", stake_tx.hash);
                }
                Transaction::AIRequest(ai_tx) => {
                    // TODO: Process AI service request
                    info!("Applied AI request: {}", ai_tx.hash);
                }
            }
        }
        
        // Save state to storage
        runtime.save_state().await.map_err(|e| e.to_string())?;
        
        Ok(())
    }
    
    fn calculate_block_hash_static(header: &BlockHeader) -> String {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        
        let mut hasher = DefaultHasher::new();
        header.number.hash(&mut hasher);
        header.parent_hash.hash(&mut hasher);
        header.transactions_root.hash(&mut hasher);
        header.state_root.hash(&mut hasher);
        header.timestamp.hash(&mut hasher);
        header.validator.hash(&mut hasher);
        header.nonce.hash(&mut hasher);
        
        format!("{:x}", hasher.finish())
    }
    
    fn calculate_merkle_root_static(transactions: &[Transaction]) -> String {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        
        let mut hasher = DefaultHasher::new();
        for tx in transactions {
            // Hash the transaction based on its type
            match tx {
                Transaction::Transfer(transfer_tx) => {
                    transfer_tx.from.hash(&mut hasher);
                    transfer_tx.to.hash(&mut hasher);
                    transfer_tx.amount.hash(&mut hasher);
                }
                Transaction::Deploy(deploy_tx) => {
                    deploy_tx.hash.hash(&mut hasher);
                }
                Transaction::Call(call_tx) => {
                    call_tx.hash.hash(&mut hasher);
                }
                Transaction::Stake(stake_tx) => {
                    stake_tx.hash.hash(&mut hasher);
                }
                Transaction::AIRequest(ai_tx) => {
                    ai_tx.hash.hash(&mut hasher);
                }
            }
        }
        
        format!("{:x}", hasher.finish())
    }

    fn verify_tx_signature_static(
        pqc_manager: &Arc<PQCManager>,
        tx_hash: &[u8],
        sig: &crate::types::PQCTransactionSignature,
    ) -> Result<bool, String> {
        if sig.signature.data.is_empty() {
            return Ok(false);
        }
        if sig.public_key.is_empty() {
            return Ok(false);
        }
        if sig.signature.algorithm != *pqc_manager.get_signature_algorithm() {
            return Ok(false);
        }

        pqc_manager
            .verify_signature(
                tx_hash,
                &crate::crypto::PQCSignature {
                    signature: sig.signature.data.clone(),
                    algorithm: format!("{:?}", sig.signature.algorithm),
                },
                &sig.public_key,
            )
            .map_err(|e| e.to_string())
    }
}
