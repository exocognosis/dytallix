//! AI Oracle Client Module
//!
//! This module provides the HTTP client for communicating with external AI services
//! and handles all AI Oracle-related operations including health checks, service discovery,
//! and analysis requests.

use anyhow::{anyhow, Result};
use log::{info, warn};
use reqwest::Client;
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tokio::time::Duration;

use crate::consensus::types::AIServiceType;
use crate::consensus::types::{
    AIHealthCheckResponse, AIRequestPayload, AIResponsePayload, AIServiceStatus,
};
use crate::consensus::types::{CircuitBreakerContext, CircuitBreakerState};
use crate::consensus::FallbackResponse;
use crate::consensus::SignedAIOracleResponse;

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

/// AI Service Information for discovery
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIServiceInfo {
    pub service_id: String,
    pub service_type: AIServiceType,
    pub endpoint: String,
    pub version: String,
    pub capabilities: Vec<String>,
    pub availability_score: f64,
    pub last_heartbeat: u64,
}

/// AI Analysis Request structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIAnalysisRequest {
    pub request_id: String,
    pub service_type: AIServiceType,
    pub data: HashMap<String, Value>,
    pub requester_id: String,
    pub timestamp: u64,
    pub priority: u8,
}

/// AI Service Configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIServiceConfig {
    /// Base URL for AI Oracle services
    pub base_url: String,
    /// Timeout for AI requests in seconds
    pub timeout_seconds: u64,
    /// API key for authentication
    pub api_key: String,
    /// Risk threshold for AI analysis confidence
    pub risk_threshold: f64,
    /// Maximum retries for failed requests
    pub max_retries: u32,
    /// Retry delay in milliseconds
    pub retry_delay_ms: u64,
}

impl Default for AIServiceConfig {
    fn default() -> Self {
        Self {
            base_url: "http://localhost:8080".to_string(),
            timeout_seconds: 30,
            api_key: "default_api_key".to_string(),
            risk_threshold: 0.7,
            max_retries: 3,
            retry_delay_ms: 1000,
        }
    }
}

/// HTTP client for communicating with external AI services
#[derive(Debug)]
pub struct AIOracleClient {
    client: Client,
    config: AIServiceConfig,
    /// Circuit breaker context (optional)
    circuit_breaker: Option<Arc<Mutex<CircuitBreakerContext>>>,
}

impl AIOracleClient {
    /// Create new AI Oracle client with configuration
    pub fn new(config: AIServiceConfig) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(config.timeout_seconds))
            .build()
            .expect("Failed to create HTTP client");

        Self {
            client,
            config,
            circuit_breaker: None,
        }
    }

    /// Create a client with a simple circuit breaker
    pub fn with_circuit_breaker(
        base_url: String,
        timeout: Duration,
        failure_threshold: f64,
        recovery_time_seconds: u64,
    ) -> Result<Self> {
        let config = AIServiceConfig {
            base_url,
            timeout_seconds: timeout.as_secs(),
            ..AIServiceConfig::default()
        };
        let client = Client::builder()
            .timeout(timeout)
            .build()
            .map_err(|e| anyhow!("Failed to create HTTP client: {e}"))?;

        let breaker = CircuitBreakerContext::new(failure_threshold, recovery_time_seconds);
        Ok(Self {
            client,
            config,
            circuit_breaker: Some(Arc::new(Mutex::new(breaker))),
        })
    }

    /// Convenience constructor using only a base URL
    pub fn from_base_url(base_url: String) -> Result<Self> {
        let config = AIServiceConfig {
            base_url,
            ..AIServiceConfig::default()
        };
        // Build client explicitly to surface errors as Result
        let client = Client::builder()
            .timeout(Duration::from_secs(config.timeout_seconds))
            .build()
            .map_err(|e| anyhow!("Failed to create HTTP client: {e}"))?;
        Ok(Self {
            client,
            config,
            circuit_breaker: None,
        })
    }

    fn record_success(&self) {
        if let Some(cb) = &self.circuit_breaker {
            if let Ok(mut guard) = cb.lock() {
                guard.record_success(0);
            }
        }
    }

    fn record_failure(&self) {
        if let Some(cb) = &self.circuit_breaker {
            if let Ok(mut guard) = cb.lock() {
                guard.record_failure();
            }
        }
    }

    fn is_open(&self) -> bool {
        if let Some(cb) = &self.circuit_breaker {
            if let Ok(guard) = cb.lock() {
                return guard.is_open();
            }
        }
        false
    }

    /// Returns a simple JSON-like status map
    pub fn get_circuit_breaker_status(&self) -> Result<serde_json::Value> {
        if let Some(cb) = &self.circuit_breaker {
            let guard = cb.lock().map_err(|_| anyhow!("circuit breaker poisoned"))?;
            let state = match guard.state {
                CircuitBreakerState::Closed => "closed",
                CircuitBreakerState::Open => "open",
                CircuitBreakerState::HalfOpen => "half_open",
            };
            let status = serde_json::json!({
                "state": state,
                "failure_count": guard.stats.failure_count,
                "success_count": guard.stats.success_count,
                "total_requests": guard.stats.total_requests,
                "failure_rate": guard.stats.failure_rate,
                "failure_threshold": guard.failure_threshold,
                "recovery_time_seconds": guard.recovery_time_seconds,
            });
            return Ok(status);
        }
        Ok(serde_json::json!({
            "state": "disabled",
            "failure_count": 0,
            "success_count": 0,
            "total_requests": 0,
            "failure_rate": 0.0,
            "failure_threshold": serde_json::Value::Null,
            "recovery_time_seconds": serde_json::Value::Null,
        }))
    }

    pub fn reset_circuit_breaker(&self) -> Result<()> {
        if let Some(cb) = &self.circuit_breaker {
            let mut guard = cb.lock().map_err(|_| anyhow!("circuit breaker poisoned"))?;
            guard.reset();
        }
        Ok(())
    }

    /// Perform a simple GET with circuit breaker and fallback
    pub async fn get_with_fallback(&self, path: &str) -> Result<String> {
        if self.is_open() {
            self.record_failure();
            return Ok("circuit_open".to_string());
        }

        let url = format!("{}/{}", self.config.base_url, path);
        let res = self.client.get(&url).send().await;
        match res {
            Ok(resp) => {
                if resp.status().is_success() {
                    self.record_success();
                    Ok(resp.text().await.unwrap_or_default())
                } else {
                    self.record_failure();
                    Err(anyhow!("HTTP status {}", resp.status()))
                }
            }
            Err(e) => {
                self.record_failure();
                Err(anyhow!(e))
            }
        }
    }

    /// Health check with circuit breaker, returns typed response or fallback
    pub async fn health_check_with_circuit_breaker(&self) -> Result<AIHealthCheckResponse> {
        if self.is_open() {
            return Ok(AIHealthCheckResponse {
                status: AIServiceStatus::Unhealthy,
                timestamp: chrono::Utc::now().timestamp() as u64,
                response_time_ms: 0,
                version: None,
                details: Some(serde_json::json!({
                    "fallback": true,
                    "service_unavailable": true,
                    "reason": "circuit_open"
                })),
                endpoints: None,
                load: None,
            });
        }

        let start = std::time::Instant::now();
        let ok = self.health_check().await.unwrap_or(false);
        let elapsed = start.elapsed().as_millis() as u64;
        if ok {
            self.record_success();
            Ok(AIHealthCheckResponse {
                status: AIServiceStatus::Healthy,
                timestamp: chrono::Utc::now().timestamp() as u64,
                response_time_ms: elapsed,
                version: None,
                details: None,
                endpoints: None,
                load: None,
            })
        } else {
            self.record_failure();
            Ok(AIHealthCheckResponse {
                status: AIServiceStatus::Unhealthy,
                timestamp: chrono::Utc::now().timestamp() as u64,
                response_time_ms: elapsed,
                version: None,
                details: Some(serde_json::json!({"fallback": false})),
                endpoints: None,
                load: None,
            })
        }
    }

    /// Send AI request with circuit breaker; returns response or fallback failure
    pub async fn send_ai_request_with_circuit_breaker(
        &self,
        req: &AIRequestPayload,
    ) -> Result<AIResponsePayload> {
        if self.is_open() {
            // Return a fallback failure payload
            let err = crate::consensus::types::AIResponseError::new(
                "CIRCUIT_OPEN".to_string(),
                "Circuit breaker open".to_string(),
                crate::consensus::types::ErrorCategory::NetworkError,
                true,
            );
            let payload = AIResponsePayload::failure(req.id.clone(), req.service_type.clone(), err);
            return Ok(payload);
        }

        // Here we could call a real endpoint; use placeholder behavior using request_ai_analysis
        let mut data = std::collections::HashMap::new();
        data.insert("request".to_string(), req.request_data.clone());
        match self
            .request_ai_analysis(req.service_type.clone(), data)
            .await
        {
            Ok(signed) => {
                self.record_success();
                let payload = AIResponsePayload::success(
                    signed.response.id.clone(),
                    signed.response.service_type.clone(),
                    signed.response.response_data.clone(),
                );
                Ok(payload)
            }
            Err(_e) => {
                self.record_failure();
                let err = crate::consensus::types::AIResponseError::new(
                    "REQUEST_FAILED".to_string(),
                    "AI request failed".to_string(),
                    crate::consensus::types::ErrorCategory::NetworkError,
                    true,
                );
                Ok(AIResponsePayload::failure(
                    req.id.clone(),
                    req.service_type.clone(),
                    err,
                ))
            }
        }
    }

    /// Health check endpoint for AI services
    pub async fn health_check(&self) -> Result<bool> {
        let url = format!("{}/health", self.config.base_url);
        let response = self.client.get(&url).send().await?;
        Ok(response.status().is_success())
    }

    /// Service discovery - get available AI services and their capabilities
    pub async fn discover_services(&self) -> Result<Vec<AIServiceInfo>> {
        let services: Vec<AIServiceInfo> = self.post("services", &serde_json::json!({})).await?;
        Ok(services)
    }

    /// Submit AI analysis request and get signed response
    pub async fn request_analysis(
        &self,
        request: &AIAnalysisRequest,
    ) -> Result<SignedAIOracleResponse> {
        // TODO: Implement actual HTTP request to AI service
        // For now, return a placeholder response

        let analysis_result = AIAnalysisResult {
            service_type: request.service_type.clone(),
            risk_score: 0.1,
            fraud_probability: 0.05,
            reputation_score: 85,
            compliance_flags: Vec::new(),
            recommendations: vec!["Transaction appears legitimate".to_string()],
            metadata: HashMap::new(),
        };

        let oracle_identity = crate::consensus::types::OracleIdentity::new(
            "mock_oracle".to_string(),
            "Mock Oracle".to_string(),
            Vec::new(), // mock public key
            dytallix_pqc::SignatureAlgorithm::Dilithium5,
        );

        let signature = crate::consensus::types::AIResponseSignature::new(
            dytallix_pqc::SignatureAlgorithm::Dilithium5,
            Vec::new(), // mock signature
            Vec::new(), // mock public key
        );

        let payload = crate::consensus::types::AIResponsePayload::success(
            request.request_id.clone(),
            request.service_type.clone(),
            serde_json::to_value(analysis_result)?,
        );

        Ok(SignedAIOracleResponse::new(
            payload,
            signature,
            chrono::Utc::now().timestamp_millis() as u64, // nonce
            (chrono::Utc::now().timestamp() + 3600) as u64, // expires_at (1 hour from now)
            oracle_identity,
        ))
    }

    /// Generic POST request to AI service
    pub async fn post<P: Serialize + ?Sized, R: DeserializeOwned>(
        &self,
        endpoint: &str,
        payload: &P,
    ) -> Result<R> {
        let url = format!("{}/{}", self.config.base_url, endpoint);
        let mut attempts = 0;

        while attempts < self.config.max_retries {
            let response = self
                .client
                .post(&url)
                .header("Authorization", format!("Bearer {}", self.config.api_key))
                .header("Content-Type", "application/json")
                .json(payload)
                .send()
                .await?;

            if response.status().is_success() {
                let result = response.json::<R>().await?;
                return Ok(result);
            } else if response.status().is_server_error() && attempts < self.config.max_retries - 1
            {
                attempts += 1;
                warn!("Server error on attempt {attempts}, retrying...");
                tokio::time::sleep(Duration::from_millis(self.config.retry_delay_ms)).await;
                continue;
            } else {
                return Err(anyhow!(
                    "HTTP error {}: {}",
                    response.status(),
                    response.text().await?
                ));
            }
        }

        Err(anyhow!("Max retries exceeded"))
    }

    /// Get current configuration
    pub fn get_config(&self) -> &AIServiceConfig {
        &self.config
    }

    /// Update timeout configuration
    pub fn set_timeout(&mut self, timeout_seconds: u64) {
        self.config.timeout_seconds = timeout_seconds;
    }

    /// Request AI analysis for a transaction or data with retry logic
    pub async fn request_ai_analysis(
        &self,
        service_type: AIServiceType,
        data: HashMap<String, Value>,
    ) -> Result<SignedAIOracleResponse> {
        let request = AIAnalysisRequest {
            request_id: format!("req_{}", chrono::Utc::now().timestamp_millis()),
            service_type,
            data,
            requester_id: "consensus_engine".to_string(),
            timestamp: chrono::Utc::now().timestamp_millis() as u64,
            priority: 5, // Medium priority
        };

        let response = self.request_analysis(&request).await?;

        // Validate response confidence score from metadata
        if let Some(metadata) = &response.response.metadata {
            if let Some(confidence) = metadata.confidence_score {
                if confidence < self.config.risk_threshold {
                    warn!("AI analysis confidence score below threshold: {confidence}");
                }
            }
        }

        info!(
            "AI analysis completed: service_type={:?}, response_id={}",
            response.response.service_type, response.response.id
        );

        Ok(response)
    }

    /// Batch request multiple AI analyses
    pub async fn batch_request_analyses(
        &self,
        requests: Vec<AIAnalysisRequest>,
    ) -> Result<Vec<SignedAIOracleResponse>> {
        let batch_payload = serde_json::json!({
            "requests": requests
        });

        let responses: Vec<SignedAIOracleResponse> =
            self.post("batch_analyze", &batch_payload).await?;
        Ok(responses)
    }

    /// Get service statistics from AI Oracle
    pub async fn get_service_stats(&self) -> Result<HashMap<String, Value>> {
        let stats: HashMap<String, Value> = self.post("stats", &serde_json::json!({})).await?;
        Ok(stats)
    }

    /// Check if specific AI service is available
    pub async fn is_service_available(&self, service_type: AIServiceType) -> Result<bool> {
        let services = self.discover_services().await?;
        Ok(services
            .iter()
            .any(|s| s.service_type == service_type && s.availability_score > 0.5))
    }

    /// Get the best available service for a specific type
    pub async fn get_best_service(
        &self,
        service_type: AIServiceType,
    ) -> Result<Option<AIServiceInfo>> {
        let services = self.discover_services().await?;
        let best_service = services
            .into_iter()
            .filter(|s| s.service_type == service_type)
            .max_by(|a, b| {
                a.availability_score
                    .partial_cmp(&b.availability_score)
                    .unwrap_or(std::cmp::Ordering::Equal)
            });

        Ok(best_service)
    }

    pub fn base_url(&self) -> &str {
        &self.config.base_url
    }

    pub fn timeout(&self) -> std::time::Duration {
        std::time::Duration::from_secs(self.config.timeout_seconds)
    }

    /// Simple connectivity test used by tests
    pub async fn test_connectivity(&self) -> Result<bool> {
        let url = format!("{}/status/200", self.config.base_url);
        let res = self.client.get(&url).send().await;
        Ok(matches!(res, Ok(r) if r.status().is_success()))
    }

    /// Create a fallback response used by tests
    pub fn create_fallback_response(&self, response_type: &str, message: &str) -> FallbackResponse {
        FallbackResponse {
            reason: message.to_string(),
            response_data: serde_json::json!({
                "response_type": response_type,
                "fallback": true,
                "service_unavailable": true,
                "recommendation": "retry_later"
            }),
            confidence_score: 0.0,
            timestamp: chrono::Utc::now().timestamp() as u64,
        }
    }
}

impl Default for AIOracleClient {
    fn default() -> Self {
        Self::new(AIServiceConfig::default())
    }
}
