//! Block Processing Module
//!
//! This module handles block creation, validation, and processing logic
//! including Merkle tree calculations and AI-enhanced block validation.

use std::sync::Arc;
use std::collections::HashMap;
use anyhow::{Result, anyhow};
use log::{info, warn, error};
use tokio::sync::RwLock;
use serde_json::Value;
use sha2::{Sha256, Digest};

use crate::types::{Transaction, Block, BlockHeader};
use crate::consensus::transaction_validation::{TransactionValidator, ValidationResult};
use crate::consensus::ai_oracle_client::AIOracleClient;
use crate::consensus::ai_integration::AIIntegrationManager;
use crate::consensus::types::AIServiceType;
use dytallix_pqc::SignatureAlgorithm;

/// Block validation result
#[derive(Debug, Clone)]
pub struct BlockValidationResult {
    pub is_valid: bool,
    pub confidence_score: f64,
    pub risk_score: f64,
    pub validation_time_ms: u64,
    pub transaction_results: Vec<ValidationResult>,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
    pub ai_analysis: Option<serde_json::Value>,
}

impl BlockValidationResult {
    /// Create a successful block validation result
    pub fn success() -> Self {
        Self {
            is_valid: true,
            confidence_score: 1.0,
            risk_score: 0.0,
            validation_time_ms: 0,
            transaction_results: Vec::new(),
            errors: Vec::new(),
            warnings: Vec::new(),
            ai_analysis: None,
        }
    }

    /// Create a failed block validation result
    pub fn failure(error: String) -> Self {
        Self {
            is_valid: false,
            confidence_score: 0.0,
            risk_score: 1.0,
            validation_time_ms: 0,
            transaction_results: Vec::new(),
            errors: vec![error],
            warnings: Vec::new(),
            ai_analysis: None,
        }
    }

    /// Add an error to the result
    pub fn add_error(&mut self, error: String) {
        self.errors.push(error);
        self.is_valid = false;
    }

    /// Add a warning to the result
    pub fn add_warning(&mut self, warning: String) {
        self.warnings.push(warning);
    }
}

/// Block Processor
#[derive(Debug)]
pub struct BlockProcessor {
    current_block: Arc<RwLock<Option<Block>>>,
    transaction_validator: Arc<TransactionValidator>,
    ai_client: Arc<AIOracleClient>,
    ai_integration: Option<Arc<AIIntegrationManager>>,
}

impl BlockProcessor {
    /// Create new block processor
    pub fn new(
        current_block: Arc<RwLock<Option<Block>>>,
        transaction_validator: Arc<TransactionValidator>,
        ai_client: Arc<AIOracleClient>,
        ai_integration: Option<Arc<AIIntegrationManager>>,
    ) -> Self {
        Self {
            current_block,
            transaction_validator,
            ai_client,
            ai_integration,
        }
    }

    /// Propose a new block with the given transactions
    pub async fn propose_block(&self, transactions: Vec<Transaction>) -> Result<Block> {
        let start_time = std::time::Instant::now();
        
        // Validate all transactions first
        let mut valid_transactions = Vec::new();
        let mut rejected_count = 0;
        
        for tx in transactions {
            match self.transaction_validator.validate_transaction(&tx).await {
                Ok(result) if result.is_valid => {
                    valid_transactions.push(tx);
                }
                Ok(result) => {
                    rejected_count += 1;
                    warn!("Transaction rejected: {:?}", result.errors);
                }
                Err(e) => {
                    rejected_count += 1;
                    error!("Transaction validation error: {}", e);
                }
            }
        }
        
        if rejected_count > 0 {
            warn!("Rejected {} transactions during block proposal", rejected_count);
        }
        
        // Calculate Merkle root
        let merkle_root = self.calculate_merkle_root(&valid_transactions);
        
        // Get current block for previous hash
        let current_block = self.current_block.read().await;
        let previous_hash = if let Some(block) = current_block.as_ref() {
            block.header.parent_hash.clone()
        } else {
            "0".repeat(64) // Genesis block
        };
        
        // Create block header
        let header = BlockHeader {
            number: 0, // TODO: Get actual block number
            parent_hash: previous_hash,
            transactions_root: merkle_root,
            state_root: "0".repeat(64), // TODO: Calculate state root
            timestamp: chrono::Utc::now().timestamp() as u64,
            validator: "validator_address".to_string(), // TODO: Get actual validator address
            signature: crate::types::PQCBlockSignature {
                signature: dytallix_pqc::Signature {
                    data: Vec::new(),
                    algorithm: SignatureAlgorithm::Dilithium5,
                },
                public_key: Vec::new(),
            },
            nonce: 0,
        };
        
        // Create the block
        let block = Block {
            header,
            transactions: valid_transactions,
        };
        
        let processing_time = start_time.elapsed().as_millis();
        info!("Block proposed with {} transactions in {}ms", 
              block.transactions.len(), processing_time);
        
        Ok(block)
    }

    /// Validate a block
    pub async fn validate_block(&self, block: &Block) -> Result<BlockValidationResult> {
        let start_time = std::time::Instant::now();
        let mut result = BlockValidationResult::success();
        
        // 1. Basic block validation
        if let Err(e) = self.validate_basic_block(block) {
            result.add_error(format!("Basic block validation failed: {}", e));
            return Ok(result);
        }
        
        // 2. Validate all transactions
        let mut transaction_results = Vec::new();
        let mut total_risk_score = 0.0;
        let mut total_confidence_score = 0.0;
        
        for tx in &block.transactions {
            match self.transaction_validator.validate_transaction(tx).await {
                Ok(tx_result) => {
                    if !tx_result.is_valid {
                        result.add_error(format!("Transaction validation failed: {:?}", tx_result.errors));
                    }
                    total_risk_score += tx_result.risk_score;
                    total_confidence_score += tx_result.confidence_score;
                    transaction_results.push(tx_result);
                }
                Err(e) => {
                    result.add_error(format!("Transaction validation error: {}", e));
                }
            }
        }
        
        // Calculate average scores
        let tx_count = block.transactions.len() as f64;
        if tx_count > 0.0 {
            result.risk_score = total_risk_score / tx_count;
            result.confidence_score = total_confidence_score / tx_count;
        }
        
        result.transaction_results = transaction_results;
        
        // 3. AI-enhanced block validation (if available)
        if let Some(ai_integration) = &self.ai_integration {
            match self.validate_block_with_ai(block, ai_integration.clone()).await {
                Ok(ai_result) => {
                    result.ai_analysis = Some(ai_result);
                }
                Err(e) => {
                    result.add_warning(format!("AI block validation failed: {}", e));
                }
            }
        }
        
        // 4. Record validation time
        result.validation_time_ms = start_time.elapsed().as_millis() as u64;
        
        info!("Block validation completed in {}ms: valid={}, risk={:.2}, confidence={:.2}",
              result.validation_time_ms, result.is_valid, result.risk_score, result.confidence_score);
        
        Ok(result)
    }

    /// Basic block validation without AI
    fn validate_basic_block(&self, block: &Block) -> Result<()> {
        // 1. Check block structure
        if block.transactions.is_empty() {
            return Err(anyhow!("Block cannot be empty"));
        }
        
        // 2. Verify Merkle root
        let calculated_merkle_root = self.calculate_merkle_root(&block.transactions);
        if calculated_merkle_root != block.header.transactions_root {
            return Err(anyhow!("Invalid Merkle root"));
        }
        
        // 3. Verify block hash
        let calculated_hash = self.calculate_block_hash(block);
        // Note: We don't have a hash field in BlockHeader, so we skip this check for now
        // TODO: Add hash field to BlockHeader or implement proper hash verification
        
        // 4. Check timestamp (should be recent)
        let current_time = chrono::Utc::now().timestamp() as u64;
        if block.header.timestamp > current_time + 7200 {
            return Err(anyhow!("Block timestamp too far in the future"));
        }
        
        Ok(())
    }

    /// Validate block with AI integration
    async fn validate_block_with_ai(&self, block: &Block, ai_integration: Arc<AIIntegrationManager>) -> Result<serde_json::Value> {
        // Prepare block data for AI analysis
        let mut analysis_data = HashMap::new();
        
        // Block metadata
        analysis_data.insert("transaction_count".to_string(), 
            Value::Number(block.transactions.len().into()));
        analysis_data.insert("block_size".to_string(), 
            Value::Number(self.calculate_block_size(block).into()));
        analysis_data.insert("timestamp".to_string(), 
            Value::Number(block.header.timestamp.into()));
        
        // Transaction type distribution
        let mut tx_types = HashMap::new();
        for tx in &block.transactions {
            let tx_type = match tx {
                Transaction::Transfer(_) => "transfer",
                Transaction::AIRequest(_) => "ai_request",
                Transaction::Deploy(_) => "deploy",
                Transaction::Call(_) => "call",
                Transaction::Stake(_) => "stake",
            };
            *tx_types.entry(tx_type).or_insert(0) += 1;
        }
        analysis_data.insert("transaction_types".to_string(), 
            serde_json::to_value(tx_types)?);
        
        // Request AI analysis
        let ai_response = self.ai_client.request_ai_analysis(
            AIServiceType::PatternAnalysis,
            analysis_data
        ).await?;
        
        Ok(serde_json::to_value(ai_response)?)
    }

    /// Calculate Merkle root for transactions
    fn calculate_merkle_root(&self, transactions: &[Transaction]) -> String {
        if transactions.is_empty() {
            return "0".repeat(64);
        }
        
        // For simplicity, just hash all transaction data together
        // In a real implementation, you'd build a proper Merkle tree
        let mut hasher = Sha256::new();
        
        for tx in transactions {
            let tx_data = serde_json::to_string(tx).unwrap_or_default();
            hasher.update(tx_data.as_bytes());
        }
        
        hex::encode(hasher.finalize())
    }

    /// Calculate block hash
    fn calculate_block_hash(&self, block: &Block) -> String {
        let mut hasher = Sha256::new();
        
        // Hash header fields
        hasher.update(block.header.number.to_be_bytes());
        hasher.update(block.header.parent_hash.as_bytes());
        hasher.update(block.header.transactions_root.as_bytes());
        hasher.update(block.header.state_root.as_bytes());
        hasher.update(block.header.timestamp.to_be_bytes());
        hasher.update(block.header.validator.as_bytes());
        hasher.update(block.header.nonce.to_be_bytes());
        
        hex::encode(hasher.finalize())
    }

    /// Calculate block size in bytes
    fn calculate_block_size(&self, block: &Block) -> usize {
        serde_json::to_string(block).unwrap_or_default().len()
    }

    /// Get current block
    pub async fn get_current_block(&self) -> Option<Block> {
        self.current_block.read().await.clone()
    }

    /// Set current block
    pub async fn set_current_block(&self, block: Block) {
        let mut current_block = self.current_block.write().await;
        *current_block = Some(block);
    }

    /// Get block processing statistics
    pub async fn get_stats(&self) -> HashMap<String, Value> {
        let mut stats = HashMap::new();
        
        // Current block info
        if let Some(block) = self.get_current_block().await {
            stats.insert("current_block_height".to_string(), 
                Value::Number(1.into())); // Placeholder
            stats.insert("current_block_tx_count".to_string(), 
                Value::Number(block.transactions.len().into()));
            stats.insert("current_block_size".to_string(), 
                Value::Number(self.calculate_block_size(&block).into()));
        }
        
        // Validation stats
        let validation_stats = self.transaction_validator.get_validation_stats().await;
        stats.insert("validation_stats".to_string(), 
            serde_json::to_value(validation_stats).unwrap_or_default());
        
        stats
    }

    /// Check if AI validation is available
    pub fn has_ai_validation(&self) -> bool {
        self.ai_integration.is_some()
    }

    /// Get AI integration statistics
    pub async fn get_ai_integration_stats(&self) -> Option<Value> {
        self.transaction_validator.get_ai_integration_stats().await
    }
}
