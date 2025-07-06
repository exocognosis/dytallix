//! AI Integration Module for Blockchain Consensus
//!
//! This module integrates AI Oracle signature verification into the blockchain
//! consensus and transaction validation pipeline. It provides high-level APIs
//! for validating AI responses and managing oracle interactions.

use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::RwLock;
use chrono;

use crate::consensus::{
    SignedAIOracleResponse, AIResponsePayload, AIOracleClient, AIServiceConfig,
    signature_verification::{SignatureVerifier, VerificationConfig, VerificationError, OracleRegistryEntry}
};

/// AI integration configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIIntegrationConfig {
    /// Signature verification configuration
    pub verification_config: VerificationConfig,
    /// AI service configuration
    pub ai_service_config: AIServiceConfig,
    /// Whether AI verification is required for transactions
    pub require_ai_verification: bool,
    /// Whether to fail transactions if AI service is unavailable
    pub fail_on_ai_unavailable: bool,
    /// Maximum time to wait for AI response (milliseconds)
    pub ai_timeout_ms: u64,
    /// Whether to cache AI responses
    pub enable_response_caching: bool,
    /// Response cache TTL in seconds
    pub response_cache_ttl: u64,
}

impl Default for AIIntegrationConfig {
    fn default() -> Self {
        Self {
            verification_config: VerificationConfig::default(),
            ai_service_config: AIServiceConfig::default(),
            require_ai_verification: false, // Start with optional verification
            fail_on_ai_unavailable: false,  // Graceful degradation by default
            ai_timeout_ms: 5000,            // 5 second timeout
            enable_response_caching: true,
            response_cache_ttl: 300,         // 5 minutes
        }
    }
}

/// AI verification result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AIVerificationResult {
    /// Verification passed
    Verified {
        oracle_id: String,
        response_id: String,
        risk_score: Option<f64>,
        confidence: Option<f64>,
    },
    /// Verification failed
    Failed {
        error: String,
        oracle_id: Option<String>,
        response_id: Option<String>,
    },
    /// AI service unavailable
    Unavailable {
        error: String,
        fallback_allowed: bool,
    },
    /// Verification skipped (if not required)
    Skipped {
        reason: String,
    },
}

/// Cached AI response
#[derive(Debug, Clone)]
struct CachedResponse {
    response: SignedAIOracleResponse,
    cached_at: u64,
    verification_result: AIVerificationResult,
}

/// AI Integration Manager
pub struct AIIntegrationManager {
    /// Configuration
    config: AIIntegrationConfig,
    /// Signature verifier
    verifier: Arc<SignatureVerifier>,
    /// AI oracle client
    ai_client: Arc<AIOracleClient>,
    /// Response cache
    response_cache: Arc<RwLock<std::collections::HashMap<String, CachedResponse>>>,
    /// Statistics
    stats: Arc<RwLock<AIIntegrationStats>>,
}

/// AI integration statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIIntegrationStats {
    /// Total AI verification requests
    pub total_requests: u64,
    /// Successful verifications
    pub successful_verifications: u64,
    /// Failed verifications
    pub failed_verifications: u64,
    /// AI service unavailable count
    pub service_unavailable_count: u64,
    /// Cache hits
    pub cache_hits: u64,
    /// Cache misses
    pub cache_misses: u64,
    /// Average verification time (milliseconds)
    pub avg_verification_time_ms: f64,
    /// Last update timestamp
    pub last_updated: u64,
}

impl Default for AIIntegrationStats {
    fn default() -> Self {
        Self {
            total_requests: 0,
            successful_verifications: 0,
            failed_verifications: 0,
            service_unavailable_count: 0,
            cache_hits: 0,
            cache_misses: 0,
            avg_verification_time_ms: 0.0,
            last_updated: chrono::Utc::now().timestamp() as u64,
        }
    }
}

impl AIIntegrationManager {
    /// Create a new AI integration manager
    pub async fn new(config: AIIntegrationConfig) -> Result<Self> {
        let verifier = Arc::new(SignatureVerifier::new(config.verification_config.clone())?);
        let ai_client = Arc::new(AIOracleClient::new(config.ai_service_config.base_url.clone())?);
        
        Ok(Self {
            config,
            verifier,
            ai_client,
            response_cache: Arc::new(RwLock::new(std::collections::HashMap::new())),
            stats: Arc::new(RwLock::new(AIIntegrationStats::default())),
        })
    }
    
    /// Register an oracle in the verification system
    pub async fn register_oracle(&self, oracle_identity: crate::consensus::OracleIdentity, 
                                stake_amount: u64) -> Result<()> {
        self.verifier.register_oracle(oracle_identity, stake_amount)
    }
    
    /// Verify a signed AI response
    pub async fn verify_ai_response(&self, signed_response: &SignedAIOracleResponse,
                                   request_hash: Option<&[u8]>) -> AIVerificationResult {
        let start_time = std::time::Instant::now();
        let mut stats = self.stats.write().await;
        stats.total_requests += 1;
        drop(stats);
        
        // Check cache first
        if self.config.enable_response_caching {
            if let Some(cached) = self.check_response_cache(&signed_response.response.id).await {
                let mut stats = self.stats.write().await;
                stats.cache_hits += 1;
                return cached.verification_result;
            } else {
                let mut stats = self.stats.write().await;
                stats.cache_misses += 1;
            }
        }
        
        // Perform verification
        let result = match self.verifier.verify_signed_response(signed_response, request_hash) {
            Ok(()) => {
                // Extract relevant information from the response
                let risk_score = self.extract_risk_score(&signed_response.response);
                let confidence = self.extract_confidence(&signed_response.response);
                
                let result = AIVerificationResult::Verified {
                    oracle_id: signed_response.oracle_identity.oracle_id.clone(),
                    response_id: signed_response.response.id.clone(),
                    risk_score,
                    confidence,
                };
                
                let mut stats = self.stats.write().await;
                stats.successful_verifications += 1;
                result
            }
            Err(verification_error) => {
                let result = AIVerificationResult::Failed {
                    error: format!("{:?}", verification_error),
                    oracle_id: Some(signed_response.oracle_identity.oracle_id.clone()),
                    response_id: Some(signed_response.response.id.clone()),
                };
                
                let mut stats = self.stats.write().await;
                stats.failed_verifications += 1;
                result
            }
        };
        
        // Cache the result
        if self.config.enable_response_caching {
            self.cache_response(signed_response.clone(), result.clone()).await;
        }
        
        // Update timing statistics
        let verification_time = start_time.elapsed().as_millis() as f64;
        let mut stats = self.stats.write().await;
        stats.avg_verification_time_ms = 
            (stats.avg_verification_time_ms * (stats.total_requests - 1) as f64 + verification_time) 
            / stats.total_requests as f64;
        stats.last_updated = chrono::Utc::now().timestamp() as u64;
        
        result
    }
    
    /// Request AI analysis for a transaction and verify the response
    pub async fn request_and_verify_ai_analysis(&self, transaction_data: serde_json::Value,
                                               analysis_type: &str) -> AIVerificationResult {
        if !self.config.require_ai_verification {
            return AIVerificationResult::Skipped {
                reason: "AI verification not required".to_string(),
            };
        }
        
        // Request AI analysis
        let request_payload = crate::consensus::AIRequestPayload {
            id: uuid::Uuid::new_v4().to_string(),
            service_type: crate::consensus::AIServiceType::TransactionValidation,
            request_data: transaction_data,
            timestamp: chrono::Utc::now().timestamp() as u64,
            metadata: None,
            priority: crate::consensus::RequestPriority::Normal,
            timeout: Some(30),
            callback_url: None,
            signature: None,
        };
        
        match self.ai_client.send_ai_request(&request_payload).await {
            Ok(response) => {
                // Convert the response to JSON
                match response.text().await {
                    Ok(response_text) => {
                        // Try to parse as signed response
                        if let Ok(signed_response) = serde_json::from_str::<SignedAIOracleResponse>(&response_text) {
                            self.verify_ai_response(&signed_response, None).await
                        } else {
                            // Handle as regular response
                            AIVerificationResult::Failed {
                                error: "Could not parse AI response".to_string(),
                                oracle_id: None,
                                response_id: None,
                            }
                        }
                    }
                    Err(e) => {
                        AIVerificationResult::Failed {
                            error: format!("Failed to read response: {}", e),
                            oracle_id: None,
                            response_id: None,
                        }
                    }
                }
            }
            Err(e) => {
                let mut stats = self.stats.write().await;
                stats.service_unavailable_count += 1;
                
                AIVerificationResult::Unavailable {
                    error: format!("AI service error: {}", e),
                    fallback_allowed: !self.config.fail_on_ai_unavailable,
                }
            }
        }
    }
    
    /// Validate a transaction using AI analysis
    pub async fn validate_transaction_with_ai(&self, transaction_data: serde_json::Value) -> Result<AIVerificationResult> {
        // Request fraud detection analysis
        let fraud_result = self.request_and_verify_ai_analysis(
            transaction_data.clone(), 
            "fraud_detection"
        ).await;
        
        // Request risk scoring analysis
        let risk_result = self.request_and_verify_ai_analysis(
            transaction_data, 
            "risk_scoring"
        ).await;
        
        // Combine results (simplified logic)
        match (fraud_result, risk_result) {
            (AIVerificationResult::Verified { risk_score: fraud_score, .. }, 
             AIVerificationResult::Verified { risk_score: risk_score, oracle_id, response_id, .. }) => {
                // Calculate combined risk score
                let combined_score = match (fraud_score, risk_score) {
                    (Some(f), Some(r)) => Some((f + r) / 2.0),
                    (Some(score), None) | (None, Some(score)) => Some(score),
                    _ => None,
                };
                
                Ok(AIVerificationResult::Verified {
                    oracle_id,
                    response_id,
                    risk_score: combined_score,
                    confidence: None, // Could be calculated from both results
                })
            }
            (AIVerificationResult::Failed { error, .. }, _) |
            (_, AIVerificationResult::Failed { error, .. }) => {
                Ok(AIVerificationResult::Failed {
                    error: format!("AI verification failed: {}", error),
                    oracle_id: None,
                    response_id: None,
                })
            }
            (AIVerificationResult::Unavailable { fallback_allowed, .. }, _) |
            (_, AIVerificationResult::Unavailable { fallback_allowed, .. }) => {
                Ok(AIVerificationResult::Unavailable {
                    error: "AI service unavailable".to_string(),
                    fallback_allowed,
                })
            }
            _ => {
                Ok(AIVerificationResult::Skipped {
                    reason: "AI verification skipped or mixed results".to_string(),
                })
            }
        }
    }
    
    /// Check response cache
    async fn check_response_cache(&self, response_id: &str) -> Option<CachedResponse> {
        let cache = self.response_cache.read().await;
        
        if let Some(cached) = cache.get(response_id) {
            let now = chrono::Utc::now().timestamp() as u64;
            if now - cached.cached_at <= self.config.response_cache_ttl {
                return Some(cached.clone());
            }
        }
        
        None
    }
    
    /// Cache a response
    async fn cache_response(&self, response: SignedAIOracleResponse, result: AIVerificationResult) {
        let mut cache = self.response_cache.write().await;
        
        let cached_response = CachedResponse {
            response: response.clone(),
            cached_at: chrono::Utc::now().timestamp() as u64,
            verification_result: result,
        };
        
        cache.insert(response.response.id.clone(), cached_response);
        
        // Clean up old entries if cache is too large
        if cache.len() > 10000 { // Configurable limit
            let cutoff_time = chrono::Utc::now().timestamp() as u64 - self.config.response_cache_ttl;
            cache.retain(|_, cached| cached.cached_at > cutoff_time);
        }
    }
    
    /// Extract risk score from AI response
    fn extract_risk_score(&self, response: &AIResponsePayload) -> Option<f64> {
        // Try to extract risk score from response data
        if let Some(risk_score) = response.response_data.get("risk_score") {
            risk_score.as_f64()
        } else if let Some(fraud_score) = response.response_data.get("fraud_score") {
            fraud_score.as_f64()
        } else {
            None
        }
    }
    
    /// Extract confidence from AI response
    fn extract_confidence(&self, response: &AIResponsePayload) -> Option<f64> {
        response.response_data.get("confidence").and_then(|c| c.as_f64())
    }
    
    /// Get oracle information
    pub async fn get_oracle(&self, oracle_id: &str) -> Option<OracleRegistryEntry> {
        self.verifier.get_oracle(oracle_id)
    }
    
    /// List all oracles
    pub async fn list_oracles(&self) -> Vec<OracleRegistryEntry> {
        self.verifier.list_oracles()
    }
    
    /// Update oracle reputation
    pub async fn update_oracle_reputation(&self, oracle_id: &str, new_reputation: f64) -> Result<()> {
        self.verifier.update_oracle_reputation(oracle_id, new_reputation)
    }
    
    /// Deactivate an oracle
    pub async fn deactivate_oracle(&self, oracle_id: &str) -> Result<()> {
        self.verifier.deactivate_oracle(oracle_id)
    }
    
    /// Get integration statistics
    pub async fn get_statistics(&self) -> AIIntegrationStats {
        self.stats.read().await.clone()
    }
    
    /// Get verification statistics
    pub async fn get_verification_statistics(&self) -> std::collections::HashMap<String, serde_json::Value> {
        self.verifier.get_verification_stats()
    }
    
    /// Clean up expired cache entries and old data
    pub async fn cleanup(&self) {
        // Clean up signature verifier
        self.verifier.cleanup();
        
        // Clean up response cache
        let mut cache = self.response_cache.write().await;
        let cutoff_time = chrono::Utc::now().timestamp() as u64 - self.config.response_cache_ttl;
        cache.retain(|_, cached| cached.cached_at > cutoff_time);
    }
    
    /// Health check for AI integration
    pub async fn health_check(&self) -> Result<serde_json::Value> {
        let ai_health = self.ai_client.health_check().await.is_ok();
        let stats = self.get_statistics().await;
        let verification_stats = self.get_verification_statistics().await;
        
        Ok(serde_json::json!({
            "ai_service_available": ai_health,
            "total_oracles": self.list_oracles().await.len(),
            "active_oracles": self.list_oracles().await.iter().filter(|o| o.is_active).count(),
            "verification_stats": verification_stats,
            "integration_stats": stats,
            "cache_size": self.response_cache.read().await.len(),
            "config": {
                "require_ai_verification": self.config.require_ai_verification,
                "fail_on_ai_unavailable": self.config.fail_on_ai_unavailable,
                "enable_response_caching": self.config.enable_response_caching,
            }
        }))
    }
    
    /// Check if AI verification is required
    pub fn is_ai_verification_required(&self) -> bool {
        self.config.require_ai_verification
    }
}

/// Helper function to create default AI integration manager
pub async fn create_default_ai_integration() -> Result<AIIntegrationManager> {
    let config = AIIntegrationConfig::default();
    AIIntegrationManager::new(config).await
}

/// Helper function to create AI integration manager with custom config
pub async fn create_ai_integration_with_config(config: AIIntegrationConfig) -> Result<AIIntegrationManager> {
    AIIntegrationManager::new(config).await
}