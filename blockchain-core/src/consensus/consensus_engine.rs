//! Consensus Engine Module
//!
//! This module contains the main ConsensusEngine struct that coordinates
//! all consensus-related operations including block processing, transaction
//! validation, and AI integration.

use std::sync::Arc;
use std::path::Path;
use anyhow::{Result, anyhow};
use log::{info, debug, warn, error};
use tokio::sync::RwLock;
use serde_json::Value;
use std::collections::HashMap;

use crate::runtime::DytallixRuntime;
use crate::crypto::PQCManager;
use crate::types::{Transaction, Block};
use crate::consensus::types::AIServiceType;
use crate::consensus::ai_oracle_client::{AIOracleClient, AIServiceConfig};
use crate::consensus::ai_integration::{AIIntegrationManager, AIIntegrationConfig};
use crate::consensus::transaction_validation::TransactionValidator;
use crate::consensus::block_processing::BlockProcessor;
use crate::consensus::key_management::{KeyManager, NodeKeyStore};
use crate::consensus::high_risk_queue::{HighRiskQueue, HighRiskQueueConfig};
use crate::consensus::audit_trail::{AuditTrailManager, AuditConfig};
use crate::consensus::performance_optimizer::{PerformanceOptimizer, PerformanceConfig};

/// Main Consensus Engine
#[derive(Debug)]
pub struct ConsensusEngine {
    runtime: Arc<DytallixRuntime>,
    pqc_manager: Arc<PQCManager>,
    current_block: Arc<RwLock<Option<Block>>>,
    validators: Arc<RwLock<Vec<String>>>,
    is_validator: bool,
    
    // Core components
    ai_client: Arc<AIOracleClient>,
    ai_integration: Option<Arc<AIIntegrationManager>>,
    transaction_validator: Arc<TransactionValidator>,
    block_processor: Arc<BlockProcessor>,
    key_manager: Arc<RwLock<KeyManager>>,
    
    // Supporting services
    high_risk_queue: Arc<HighRiskQueue>,
    audit_trail: Arc<AuditTrailManager>,
    performance_optimizer: Arc<PerformanceOptimizer>,
}

impl ConsensusEngine {
    /// Create a new consensus engine
    pub async fn new(
        runtime: Arc<DytallixRuntime>,
        pqc_manager: Arc<PQCManager>,
    ) -> Result<Self, Box<dyn std::error::Error>> {
        // Initialize key management
        let key_file = Path::new("./data/pqc_keys.json");
        let mut key_manager = KeyManager::new(
            key_file.to_string_lossy().to_string(),
            pqc_manager.clone()
        );
        
        // Initialize keys
        if let Err(e) = key_manager.initialize() {
            error!("Failed to initialize key management: {}", e);
            return Err(e.into());
        }
        
        let key_manager = Arc::new(RwLock::new(key_manager));
        
        // Initialize AI client
        let ai_config = AIServiceConfig::default();
        let ai_client = Arc::new(AIOracleClient::new(ai_config));
        
        // Initialize supporting services
        let high_risk_queue = Arc::new(HighRiskQueue::new(HighRiskQueueConfig::default()));
        let audit_trail = Arc::new(AuditTrailManager::new(AuditConfig::default()));
        let performance_optimizer = Arc::new(PerformanceOptimizer::new(PerformanceConfig::default()));
        
        // Initialize AI integration (optional)
        let ai_integration = match AIIntegrationManager::new(AIIntegrationConfig::default()).await {
            Ok(manager) => Some(Arc::new(manager)),
            Err(e) => {
                warn!("AI integration not available: {}", e);
                None
            }
        };
        
        // Initialize transaction validator
        let transaction_validator = Arc::new(TransactionValidator::new(
            ai_client.clone(),
            ai_integration.clone(),
            high_risk_queue.clone(),
            audit_trail.clone(),
            performance_optimizer.clone(),
        ));
        
        // Initialize block processor
        let current_block = Arc::new(RwLock::new(None));
        let block_processor = Arc::new(BlockProcessor::new(
            current_block.clone(),
            transaction_validator.clone(),
            ai_client.clone(),
            ai_integration.clone(),
        ));
        
        Ok(Self {
            runtime,
            pqc_manager,
            current_block,
            validators: Arc::new(RwLock::new(Vec::new())),
            is_validator: false,
            ai_client,
            ai_integration,
            transaction_validator,
            block_processor,
            key_manager,
            high_risk_queue,
            audit_trail,
            performance_optimizer,
        })
    }

    /// Start the consensus engine
    pub async fn start(&self) -> Result<(), Box<dyn std::error::Error>> {
        info!("Starting consensus engine...");
        
        // Check and rotate keys if needed
        {
            let mut key_manager = self.key_manager.write().await;
            if let Err(e) = key_manager.rotate_keys_if_needed() {
                warn!("Failed to rotate keys: {}", e);
            }
        }
        
        // Start supporting services
        // Note: These services are ready to use upon instantiation
        info!("High-risk queue ready");
        info!("Audit trail ready");
        info!("Performance optimizer ready");
        
        // Check AI service health
        if let Err(e) = self.check_ai_service_health().await {
            warn!("AI service health check failed: {}", e);
        }
        
        info!("Consensus engine started successfully");
        Ok(())
    }

    /// Stop the consensus engine
    pub async fn stop(&self) -> Result<(), Box<dyn std::error::Error>> {
        info!("Stopping consensus engine...");
        
        // Stop supporting services
        info!("Shutting down high-risk queue");
        info!("Shutting down audit trail");
        info!("Shutting down performance optimizer");
        
        info!("Consensus engine stopped");
        Ok(())
    }

    /// Check AI service health and connectivity
    pub async fn check_ai_service_health(&self) -> Result<bool, Box<dyn std::error::Error>> {
        let health_status = self.ai_client.health_check().await?;
        if health_status {
            info!("AI service is healthy and responsive");
        } else {
            warn!("AI service health check failed");
        }
        Ok(health_status)
    }

    /// Discover available AI services
    pub async fn discover_ai_services(&self) -> Result<Vec<crate::consensus::ai_oracle_client::AIServiceInfo>, Box<dyn std::error::Error>> {
        let services = self.ai_client.discover_services().await?;
        info!("Discovered {} AI services", services.len());
        for service in &services {
            debug!("AI Service: {} - Type: {:?} - Availability: {:.2}", 
                   service.service_id, service.service_type, service.availability_score);
        }
        Ok(services)
    }

    /// Request AI analysis for a transaction or data
    pub async fn request_ai_analysis(
        &self, 
        service_type: AIServiceType, 
        data: HashMap<String, Value>
    ) -> Result<crate::consensus::SignedAIOracleResponse, Box<dyn std::error::Error>> {
        let response = self.ai_client.request_ai_analysis(service_type, data).await?;
        
        // Validate response confidence score from metadata
        if let Some(metadata) = &response.response.metadata {
            if let Some(confidence) = metadata.confidence_score {
                if confidence < self.ai_client.get_config().risk_threshold {
                    warn!("AI analysis confidence score below threshold: {}", confidence);
                }
            }
        }

        info!("AI analysis completed: service_type={:?}, response_id={}", 
              response.response.service_type, response.response.id);

        Ok(response)
    }

    /// Propose a block with the given transactions
    pub async fn propose_block(&self, transactions: Vec<Transaction>) -> Result<Block, String> {
        self.block_processor.propose_block(transactions).await
            .map_err(|e| e.to_string())
    }

    /// Validate a block
    pub async fn validate_block(&self, block: &Block) -> Result<bool, String> {
        match self.block_processor.validate_block(block).await {
            Ok(result) => Ok(result.is_valid),
            Err(e) => Err(e.to_string()),
        }
    }

    /// Validate a block with AI-enhanced validation
    pub async fn validate_block_with_ai(&self, block: &Block) -> Result<bool, String> {
        self.validate_block(block).await
    }

    /// Validate a single transaction with AI enhancement
    pub async fn validate_transaction_with_ai(&self, tx: &Transaction) -> Result<bool, String> {
        match self.transaction_validator.validate_transaction(tx).await {
            Ok(result) => Ok(result.is_valid),
            Err(e) => Err(e.to_string()),
        }
    }

    /// Check if AI integration is available
    pub fn has_ai_integration(&self) -> bool {
        self.ai_integration.is_some()
    }

    /// Get AI integration statistics (if available)
    pub async fn get_ai_integration_stats(&self) -> Option<Value> {
        self.transaction_validator.get_ai_integration_stats().await
    }

    /// Validate transaction with queue management
    pub async fn validate_transaction_with_queue(&self, tx: &Transaction) -> Result<bool, String> {
        match self.transaction_validator.validate_transaction_with_queue(tx).await {
            Ok(result) => Ok(result.is_valid),
            Err(e) => Err(e.to_string()),
        }
    }

    /// Validate transaction with optimized performance
    pub async fn validate_transaction_optimized(&self, tx: &Transaction) -> Result<bool, String> {
        match self.transaction_validator.validate_transaction_optimized(tx).await {
            Ok(result) => Ok(result.is_valid),
            Err(e) => Err(e.to_string()),
        }
    }

    /// Get comprehensive consensus engine statistics
    pub async fn get_stats(&self) -> HashMap<String, Value> {
        let mut stats = HashMap::new();
        
        // Block processing stats
        let block_stats = self.block_processor.get_stats().await;
        stats.insert("block_processing".to_string(), 
            serde_json::to_value(block_stats).unwrap_or_default());
        
        // Transaction validation stats
        let validation_stats = self.transaction_validator.get_validation_stats().await;
        stats.insert("transaction_validation".to_string(), 
            serde_json::to_value(validation_stats).unwrap_or_default());
        
        // AI integration stats
        if let Some(ai_stats) = self.get_ai_integration_stats().await {
            stats.insert("ai_integration".to_string(), ai_stats);
        }
        
        // Key management stats
        {
            let key_manager = self.key_manager.read().await;
            if let Some(key_store) = key_manager.get_key_store() {
                let mut key_stats = HashMap::new();
                key_stats.insert("node_id".to_string(), Value::String(key_store.node_id.clone()));
                key_stats.insert("created_at".to_string(), Value::Number(key_store.created_at.into()));
                key_stats.insert("version".to_string(), Value::String(key_store.version.clone()));
                key_stats.insert("needs_rotation".to_string(), 
                    Value::Bool(key_manager.needs_key_rotation()));
                
                stats.insert("key_management".to_string(), 
                    serde_json::to_value(key_stats).unwrap_or_default());
            }
        }
        
        // Service health
        let mut health_stats = HashMap::new();
        health_stats.insert("ai_integration_available".to_string(), 
            Value::Bool(self.has_ai_integration()));
        health_stats.insert("block_processor_available".to_string(), 
            Value::Bool(self.block_processor.has_ai_validation()));
        health_stats.insert("transaction_validator_available".to_string(), 
            Value::Bool(self.transaction_validator.has_ai_validation()));
        
        stats.insert("service_health".to_string(), 
            serde_json::to_value(health_stats).unwrap_or_default());
        
        stats
    }

    /// Get node key store information
    pub async fn get_key_store(&self) -> Option<NodeKeyStore> {
        let key_manager = self.key_manager.read().await;
        key_manager.get_key_store().cloned()
    }

    /// Get current block
    pub async fn get_current_block(&self) -> Option<Block> {
        self.block_processor.get_current_block().await
    }

    /// Set current block
    pub async fn set_current_block(&self, block: Block) {
        self.block_processor.set_current_block(block).await
    }

    /// Check if this node is a validator
    pub fn is_validator(&self) -> bool {
        self.is_validator
    }

    /// Set validator status
    pub fn set_validator_status(&mut self, is_validator: bool) {
        self.is_validator = is_validator;
    }

    /// Get validator list
    pub async fn get_validators(&self) -> Vec<String> {
        self.validators.read().await.clone()
    }

    /// Add validator
    pub async fn add_validator(&self, validator: String) {
        let mut validators = self.validators.write().await;
        if !validators.contains(&validator) {
            validators.push(validator);
        }
    }

    /// Remove validator
    pub async fn remove_validator(&self, validator: &str) {
        let mut validators = self.validators.write().await;
        validators.retain(|v| v != validator);
    }

    /// Get runtime reference
    pub fn get_runtime(&self) -> Arc<DytallixRuntime> {
        self.runtime.clone()
    }

    /// Get PQC manager reference
    pub fn get_pqc_manager(&self) -> Arc<PQCManager> {
        self.pqc_manager.clone()
    }

    /// Get AI client reference
    pub fn get_ai_client(&self) -> Arc<AIOracleClient> {
        self.ai_client.clone()
    }

    /// Get transaction validator reference
    pub fn get_transaction_validator(&self) -> Arc<TransactionValidator> {
        self.transaction_validator.clone()
    }

    /// Get block processor reference
    pub fn get_block_processor(&self) -> Arc<BlockProcessor> {
        self.block_processor.clone()
    }
}
