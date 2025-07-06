use anyhow::Result;
use reqwest::{Client, ClientBuilder};
use serde::{Deserialize, Serialize};
use std::time::Duration;
use std::collections::HashMap;
use uuid;
use chrono;
use serde_json;

// Temporarily stub out problematic code
pub struct DytallixConsensus;

/// Response status for AI service responses
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ResponseStatus {
    Success,
    Failure,
    Timeout,
    RateLimited,
    ServiceUnavailable,
    InvalidRequest,
    InternalError,
}

/// Categories of errors that can occur in AI responses
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ErrorCategory {
    ValidationError,
    ProcessingError,
    NetworkError,
    AuthenticationError,
    RateLimitError,
    ServiceError,
    UnknownError,
}

/// Error information for failed AI responses
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIResponseError {
    /// Error code for programmatic handling
    pub code: String,
    /// Human-readable error message
    pub message: String,
    /// Detailed error description
    pub details: Option<String>,
    /// Error category for classification
    pub category: ErrorCategory,
    /// Whether the error is retryable
    pub retryable: bool,
}

/// Metadata associated with AI responses
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIResponseMetadata {
    /// AI model version used for processing
    pub model_version: String,
    /// Confidence score for the response (0.0 to 1.0)
    pub confidence_score: Option<f64>,
    /// Processing details and statistics
    pub processing_stats: Option<serde_json::Value>,
    /// Additional context or debug information
    pub context: Option<serde_json::Value>,
    /// Oracle reputation score at time of response
    pub oracle_reputation: Option<f64>,
    /// Response correlation ID for grouping related responses
    pub correlation_id: Option<String>,
}

/// Enhanced AI Response Payload for Oracle Communication
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIResponsePayload {
    /// Unique response identifier matching the request
    pub id: String,
    /// Original request ID for correlation
    pub request_id: String,
    /// Type of AI service that generated the response
    pub service_type: AIServiceType,
    /// Response data specific to the service type
    pub response_data: serde_json::Value,
    /// Timestamp when the response was generated
    pub timestamp: u64,
    /// Processing time in milliseconds
    pub processing_time_ms: u64,
    /// Response status indicating success or failure
    pub status: ResponseStatus,
    /// Optional response metadata
    pub metadata: Option<AIResponseMetadata>,
    /// Error information if the response indicates failure
    pub error: Option<AIResponseError>,
    /// Digital signature for response verification
    pub signature: Option<String>,
    /// Oracle ID that generated this response
    pub oracle_id: Option<String>,
}

/// Priority levels for AI requests
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum RequestPriority {
    Low,
    Normal,
    High,
    Critical,
}

/// Service types for AI Oracle requests
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum AIServiceType {
    FraudDetection,
    RiskScoring,
    ContractAnalysis,
    AddressReputation,
    KYC,
    AML,
    CreditAssessment,
    TransactionValidation,
    PatternAnalysis,
    ThreatDetection,
    Unknown,
}

impl Default for ResponseStatus {
    fn default() -> Self {
        ResponseStatus::Success
    }
}

impl Default for RequestPriority {
    fn default() -> Self {
        RequestPriority::Normal
    }
}

impl std::fmt::Display for ResponseStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ResponseStatus::Success => write!(f, "success"),
            ResponseStatus::Failure => write!(f, "failure"),
            ResponseStatus::Timeout => write!(f, "timeout"),
            ResponseStatus::RateLimited => write!(f, "rate-limited"),
            ResponseStatus::ServiceUnavailable => write!(f, "service-unavailable"),
            ResponseStatus::InvalidRequest => write!(f, "invalid-request"),
            ResponseStatus::InternalError => write!(f, "internal-error"),
        }
    }
}

impl std::fmt::Display for ErrorCategory {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ErrorCategory::ValidationError => write!(f, "validation-error"),
            ErrorCategory::ProcessingError => write!(f, "processing-error"),
            ErrorCategory::NetworkError => write!(f, "network-error"),
            ErrorCategory::AuthenticationError => write!(f, "authentication-error"),
            ErrorCategory::RateLimitError => write!(f, "rate-limit-error"),
            ErrorCategory::ServiceError => write!(f, "service-error"),
            ErrorCategory::UnknownError => write!(f, "unknown-error"),
        }
    }
}

impl std::fmt::Display for RequestPriority {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            RequestPriority::Low => write!(f, "Low"),
            RequestPriority::Normal => write!(f, "Normal"),
            RequestPriority::High => write!(f, "High"),
            RequestPriority::Critical => write!(f, "Critical"),
        }
    }
}

impl std::fmt::Display for AIServiceType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AIServiceType::FraudDetection => write!(f, "Fraud Detection"),
            AIServiceType::RiskScoring => write!(f, "Risk Scoring"),
            AIServiceType::ContractAnalysis => write!(f, "Contract Analysis"),
            AIServiceType::AddressReputation => write!(f, "Address Reputation"),
            AIServiceType::KYC => write!(f, "KYC"),
            AIServiceType::AML => write!(f, "AML"),
            AIServiceType::CreditAssessment => write!(f, "Credit Assessment"),
            AIServiceType::TransactionValidation => write!(f, "Transaction Validation"),
            AIServiceType::PatternAnalysis => write!(f, "Pattern Analysis"),
            AIServiceType::ThreatDetection => write!(f, "Threat Detection"),
            AIServiceType::Unknown => write!(f, "Unknown"),
        }
    }
}

impl AIResponsePayload {
    /// Create a new response payload with minimal required fields
    pub fn new(
        request_id: String,
        service_type: AIServiceType,
        response_data: serde_json::Value,
        status: ResponseStatus,
    ) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            request_id,
            service_type,
            response_data,
            timestamp: chrono::Utc::now().timestamp() as u64,
            processing_time_ms: 0,
            status,
            metadata: None,
            error: None,
            signature: None,
            oracle_id: None,
        }
    }

    /// Create a successful response
    pub fn success(
        request_id: String,
        service_type: AIServiceType,
        response_data: serde_json::Value,
    ) -> Self {
        Self::new(request_id, service_type, response_data, ResponseStatus::Success)
    }

    /// Create a failed response
    pub fn failure(
        request_id: String,
        service_type: AIServiceType,
        error: AIResponseError,
    ) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            request_id,
            service_type,
            response_data: serde_json::Value::Null,
            timestamp: chrono::Utc::now().timestamp() as u64,
            processing_time_ms: 0,
            status: ResponseStatus::Failure,
            metadata: None,
            error: Some(error),
            signature: None,
            oracle_id: None,
        }
    }

    /// Create a timeout response
    pub fn timeout(request_id: String, service_type: AIServiceType) -> Self {
        let error = AIResponseError {
            code: "TIMEOUT".to_string(),
            message: "Request timed out".to_string(),
            details: None,
            category: ErrorCategory::NetworkError,
            retryable: true,
        };
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            request_id,
            service_type,
            response_data: serde_json::Value::Null,
            timestamp: chrono::Utc::now().timestamp() as u64,
            processing_time_ms: 0,
            status: ResponseStatus::Timeout,
            metadata: None,
            error: Some(error),
            signature: None,
            oracle_id: None,
        }
    }

    /// Set the processing time
    pub fn with_processing_time(mut self, processing_time_ms: u64) -> Self {
        self.processing_time_ms = processing_time_ms;
        self
    }

    /// Set the response metadata
    pub fn with_metadata(mut self, metadata: AIResponseMetadata) -> Self {
        self.metadata = Some(metadata);
        self
    }

    /// Set the response signature
    pub fn with_signature(mut self, signature: String) -> Self {
        self.signature = Some(signature);
        self
    }

    /// Set the oracle ID
    pub fn with_oracle_id(mut self, oracle_id: String) -> Self {
        self.oracle_id = Some(oracle_id);
        self
    }

    /// Serialize this response to a JSON string
    pub fn to_json(&self) -> Result<String, serde_json::Error> {
        serde_json::to_string(self)
    }

    /// Serialize this response to pretty JSON string
    pub fn to_json_pretty(&self) -> Result<String, serde_json::Error> {
        serde_json::to_string_pretty(self)
    }

    /// Deserialize a response from a JSON string
    pub fn from_json(data: &str) -> Result<Self, serde_json::Error> {
        serde_json::from_str(data)
    }

    /// Validate the response payload
    pub fn validate(&self) -> Result<(), String> {
        if self.id.is_empty() {
            return Err("Response ID cannot be empty".to_string());
        }

        if self.request_id.is_empty() {
            return Err("Request ID cannot be empty".to_string());
        }

        if self.timestamp == 0 {
            return Err("Timestamp cannot be zero".to_string());
        }

        // Check if timestamp is not too far in the future (1 hour)
        let now = chrono::Utc::now().timestamp() as u64;
        if self.timestamp > now && (self.timestamp - now) > 3600 {
            return Err("Response timestamp is too far in the future".to_string());
        }

        // Validate that failure responses have error information
        if matches!(self.status, ResponseStatus::Failure) && self.error.is_none() {
            return Err("Failure responses must include error information".to_string());
        }

        // Validate confidence score if present
        if let Some(ref metadata) = self.metadata {
            if let Some(confidence) = metadata.confidence_score {
                if confidence < 0.0 || confidence > 1.0 {
                    return Err("Confidence score must be between 0.0 and 1.0".to_string());
                }
            }
        }

        Ok(())
    }

    /// Get the age of the response in seconds
    pub fn age_seconds(&self) -> u64 {
        let now = chrono::Utc::now().timestamp() as u64;
        if now > self.timestamp {
            now - self.timestamp
        } else {
            0
        }
    }

    /// Check if the response is successful
    pub fn is_successful(&self) -> bool {
        matches!(self.status, ResponseStatus::Success)
    }

    /// Check if the response is a failure
    pub fn is_failure(&self) -> bool {
        matches!(self.status, ResponseStatus::Failure)
    }

    /// Check if the response is retryable
    pub fn is_retryable(&self) -> bool {
        match self.status {
            ResponseStatus::Timeout | ResponseStatus::RateLimited | ResponseStatus::ServiceUnavailable => true,
            ResponseStatus::Failure => {
                self.error.as_ref().map_or(false, |e| e.retryable)
            }
            _ => false,
        }
    }

    /// Get the error message if the response is a failure
    pub fn error_message(&self) -> Option<&str> {
        self.error.as_ref().map(|e| e.message.as_str())
    }

    /// Get the confidence score if available
    pub fn confidence_score(&self) -> Option<f64> {
        self.metadata.as_ref().and_then(|m| m.confidence_score)
    }
}

impl AIResponseMetadata {
    /// Create new response metadata with minimal fields
    pub fn new(model_version: String) -> Self {
        Self {
            model_version,
            confidence_score: None,
            processing_stats: None,
            context: None,
            oracle_reputation: None,
            correlation_id: None,
        }
    }

    /// Set the confidence score
    pub fn with_confidence_score(mut self, score: f64) -> Self {
        self.confidence_score = Some(score);
        self
    }

    /// Set the processing statistics
    pub fn with_processing_stats(mut self, stats: serde_json::Value) -> Self {
        self.processing_stats = Some(stats);
        self
    }

    /// Set the context
    pub fn with_context(mut self, context: serde_json::Value) -> Self {
        self.context = Some(context);
        self
    }

    /// Set the oracle reputation
    pub fn with_oracle_reputation(mut self, reputation: f64) -> Self {
        self.oracle_reputation = Some(reputation);
        self
    }

    /// Set the correlation ID
    pub fn with_correlation_id(mut self, correlation_id: String) -> Self {
        self.correlation_id = Some(correlation_id);
        self
    }
}

impl AIResponseError {
    /// Create a new error with minimal fields
    pub fn new(code: String, message: String, category: ErrorCategory) -> Self {
        Self {
            code,
            message,
            details: None,
            category,
            retryable: false,
        }
    }

    /// Create a retryable error
    pub fn retryable(code: String, message: String, category: ErrorCategory) -> Self {
        Self {
            code,
            message,
            details: None,
            category,
            retryable: true,
        }
    }

    /// Set the error details
    pub fn with_details(mut self, details: String) -> Self {
        self.details = Some(details);
        self
    }

    /// Set whether the error is retryable
    pub fn with_retryable(mut self, retryable: bool) -> Self {
        self.retryable = retryable;
        self
    }
}

/// AI Oracle Client for communicating with AI services
#[derive(Debug, Clone)]
pub struct AIOracleClient {
    /// HTTP client with connection pooling
    client: Client,
    /// Base URL for the AI service
    base_url: String,
    /// Request timeout duration
    timeout: Duration,
}

impl AIOracleClient {
    /// Create a new AIOracleClient with default configuration
    pub fn new(base_url: String) -> Result<Self> {
        let client = ClientBuilder::new()
            .timeout(Duration::from_secs(30))
            .pool_max_idle_per_host(10)
            .pool_idle_timeout(Duration::from_secs(90))
            .tcp_keepalive(Duration::from_secs(60))
            .build()?;

        Ok(Self {
            client,
            base_url,
            timeout: Duration::from_secs(30),
        })
    }

    /// Create a new AIOracleClient with custom timeout
    pub fn with_timeout(base_url: String, timeout: Duration) -> Result<Self> {
        let client = ClientBuilder::new()
            .timeout(timeout)
            .pool_max_idle_per_host(10)
            .pool_idle_timeout(Duration::from_secs(90))
            .tcp_keepalive(Duration::from_secs(60))
            .build()?;

        Ok(Self {
            client,
            base_url,
            timeout,
        })
    }

    /// Create a new AIOracleClient with custom configuration
    pub fn with_config(
        base_url: String,
        timeout: Duration,
        max_idle_per_host: usize,
        idle_timeout: Duration,
        keepalive: Duration,
    ) -> Result<Self> {
        let client = ClientBuilder::new()
            .timeout(timeout)
            .pool_max_idle_per_host(max_idle_per_host)
            .pool_idle_timeout(idle_timeout)
            .tcp_keepalive(keepalive)
            .build()?;

        Ok(Self {
            client,
            base_url,
            timeout,
        })
    }

    /// Create a new AIOracleClient with connection pool configuration
    pub fn with_pool_config(
        base_url: String,
        timeout: Duration,
        pool_config: ConnectionPoolConfig,
    ) -> Result<Self> {
        let mut client_builder = ClientBuilder::new()
            .timeout(timeout)
            .pool_max_idle_per_host(pool_config.max_idle_per_host)
            .pool_idle_timeout(pool_config.idle_timeout)
            .tcp_keepalive(pool_config.tcp_keepalive);

        // Enable HTTP/2 if configured
        if pool_config.http2_prior_knowledge {
            client_builder = client_builder.http2_prior_knowledge();
        }

        // Set maximum total connections if specified
        if let Some(max_total) = pool_config.max_total_connections {
            client_builder = client_builder.pool_max_idle_per_host(
                std::cmp::min(pool_config.max_idle_per_host, max_total)
            );
        }

        let client = client_builder.build()?;

        Ok(Self {
            client,
            base_url,
            timeout,
        })
    }

    /// Create a new AIOracleClient optimized for high-performance scenarios
    pub fn high_performance(base_url: String, timeout: Duration) -> Result<Self> {
        Self::with_pool_config(base_url, timeout, ConnectionPoolConfig::high_performance())
    }

    /// Create a new AIOracleClient optimized for low-resource scenarios
    pub fn low_resource(base_url: String, timeout: Duration) -> Result<Self> {
        Self::with_pool_config(base_url, timeout, ConnectionPoolConfig::low_resource())
    }

    /// Test basic connectivity to the AI service endpoint
    pub async fn test_connectivity(&self) -> Result<bool> {
        let url = format!("{}/health", self.base_url);

        match self.client.get(&url).send().await {
            Ok(response) => {
                log::info!("AI service connectivity test: HTTP {}", response.status());
                Ok(response.status().is_success())
            }
            Err(e) => {
                log::error!("AI service connectivity test failed: {}", e);
                Ok(false)
            }
        }
    }

    /// Make a GET request to the AI service
    pub async fn get(&self, endpoint: &str) -> Result<reqwest::Response> {
        let url = format!("{}/{}", self.base_url.trim_end_matches('/'), endpoint.trim_start_matches('/'));

        log::debug!("Making GET request to: {}", url);

        let response = self.client
            .get(&url)
            .send()
            .await?;

        log::debug!("GET request completed with status: {}", response.status());
        Ok(response)
    }

    /// Make a POST request to the AI service with JSON payload
    pub async fn post_json<T>(&self, endpoint: &str, payload: &T) -> Result<reqwest::Response>
    where
        T: Serialize,
    {
        let url = format!("{}/{}", self.base_url.trim_end_matches('/'), endpoint.trim_start_matches('/'));

        log::debug!("Making POST request to: {}", url);

        let response = self.client
            .post(&url)
            .json(payload)
            .send()
            .await?;

        log::debug!("POST request completed with status: {}", response.status());
        Ok(response)
    }

    /// Make a POST request to the AI service with custom headers
    pub async fn post_json_with_headers<T>(
        &self,
        endpoint: &str,
        payload: &T,
        headers: &[(&str, &str)],
    ) -> Result<reqwest::Response>
    where
        T: Serialize,
    {
        let url = format!("{}/{}", self.base_url.trim_end_matches('/'), endpoint.trim_start_matches('/'));

        log::debug!("Making POST request with headers to: {}", url);

        let mut request = self.client.post(&url).json(payload);

        for (key, value) in headers {
            request = request.header(*key, *value);
        }

        let response = request.send().await?;

        log::debug!("POST request with headers completed with status: {}", response.status());
        Ok(response)
    }

    /// Make a request and deserialize the JSON response
    pub async fn get_json<T>(&self, endpoint: &str) -> Result<T>
    where
        T: for<'de> Deserialize<'de>,
    {
        let response = self.get(endpoint).await?;

        if !response.status().is_success() {
            return Err(anyhow::anyhow!(
                "Request failed with status: {} for endpoint: {}",
                response.status(),
                endpoint
            ));
        }

        let json_response = response.json::<T>().await?;
        Ok(json_response)
    }

    /// Make a POST request and deserialize the JSON response
    pub async fn post_json_response<T, R>(&self, endpoint: &str, payload: &T) -> Result<R>
    where
        T: Serialize,
        R: for<'de> Deserialize<'de>,
    {
        let response = self.post_json(endpoint, payload).await?;

        if !response.status().is_success() {
            return Err(anyhow::anyhow!(
                "Request failed with status: {} for endpoint: {}",
                response.status(),
                endpoint
            ));
        }

        let json_response = response.json::<R>().await?;
        Ok(json_response)
    }

    /// Send an AI request using the AIRequestPayload structure
    pub async fn send_ai_request(&self, payload: &AIRequestPayload) -> Result<reqwest::Response> {
        // Validate the payload before sending
        payload.validate().map_err(|e| anyhow::anyhow!("Invalid request payload: {}", e))?;
        
        let endpoint = match payload.service_type {
            AIServiceType::FraudDetection => "fraud-detection",
            AIServiceType::RiskScoring => "risk-scoring",
            AIServiceType::ContractAnalysis => "contract-analysis",
            AIServiceType::AddressReputation => "address-reputation",
            AIServiceType::KYC => "kyc",
            AIServiceType::AML => "aml",
            AIServiceType::CreditAssessment => "credit-assessment",
            AIServiceType::TransactionValidation => "transaction-validation",
            AIServiceType::PatternAnalysis => "pattern-analysis",
            AIServiceType::ThreatDetection => "threat-detection",
            AIServiceType::Unknown => "unknown",
        };
        
        log::info!("Sending AI request {} to {} service", payload.id, endpoint);
        
        // Create string values for headers to avoid temporary value issues
        let service_type_str = payload.service_type.to_string();
        let priority_str = payload.priority.to_string();
        let timeout_str = payload.timeout.map(|t| t.to_string());
        
        // Set up headers
        let mut headers = vec![
            ("Content-Type", "application/json"),
            ("X-Request-ID", payload.id.as_str()),
            ("X-Service-Type", service_type_str.as_str()),
            ("X-Priority", priority_str.as_str()),
        ];
        
        // Add timeout header if specified
        if let Some(ref timeout_value) = timeout_str {
            headers.push(("X-Timeout", timeout_value.as_str()));
        }
        
        // Add signature header if present
        if let Some(ref signature) = payload.signature {
            headers.push(("X-Signature", signature));
        }
        
        // Add correlation ID if available
        if let Some(ref metadata) = payload.metadata {
            if let Some(ref correlation_id) = metadata.correlation_id {
                headers.push(("X-Correlation-ID", correlation_id));
            }
        }
        
        self.post_json_with_headers(endpoint, payload, &headers).await
    }

    /// Send an AI request and get an AIResponsePayload
    pub async fn send_ai_request_response(&self, payload: &AIRequestPayload) -> Result<AIResponsePayload> {
        let start_time = std::time::Instant::now();
        
        match self.send_ai_request(payload).await {
            Ok(response) => {
                let processing_time = start_time.elapsed().as_millis() as u64;
                let status_code = response.status();
                
                if status_code.is_success() {
                    // Parse the response body as JSON
                    match response.json::<serde_json::Value>().await {
                        Ok(response_data) => {
                            let ai_response = AIResponsePayload::success(
                                payload.id.clone(),
                                payload.service_type.clone(),
                                response_data,
                            ).with_processing_time(processing_time);
                            
                            Ok(ai_response)
                        }
                        Err(e) => {
                            let error = AIResponseError::new(
                                "PARSE_ERROR".to_string(),
                                format!("Failed to parse response JSON: {}", e),
                                ErrorCategory::ProcessingError,
                            );
                            let ai_response = AIResponsePayload::failure(
                                payload.id.clone(),
                                payload.service_type.clone(),
                                error,
                            ).with_processing_time(processing_time);
                            
                            Ok(ai_response)
                        }
                    }
                } else {
                    // Handle non-success HTTP status codes
                    let status = if status_code.is_client_error() {
                        ResponseStatus::InvalidRequest
                    } else if status_code.is_server_error() {
                        ResponseStatus::ServiceUnavailable
                    } else {
                        ResponseStatus::Failure
                    };
                    
                    let error = AIResponseError::new(
                        format!("HTTP_{}", status_code.as_u16()),
                        format!("HTTP request failed with status: {}", status_code),
                        ErrorCategory::NetworkError,
                    ).with_retryable(status_code.is_server_error());
                    
                    let ai_response = AIResponsePayload::new(
                        payload.id.clone(),
                        payload.service_type.clone(),
                        serde_json::Value::Null,
                        status,
                    )
                    .with_processing_time(processing_time);
                    
                    Ok(ai_response)
                }
            }
            Err(e) => {
                let processing_time = start_time.elapsed().as_millis() as u64;
                let error_str = e.to_string();
                
                let (status, category, retryable) = if error_str.contains("timeout") {
                    (ResponseStatus::Timeout, ErrorCategory::NetworkError, true)
                } else if error_str.contains("connection") {
                    (ResponseStatus::ServiceUnavailable, ErrorCategory::NetworkError, true)
                } else {
                    (ResponseStatus::Failure, ErrorCategory::NetworkError, false)
                };
                
                let error = AIResponseError::new(
                    "REQUEST_FAILED".to_string(),
                    error_str,
                    category,
                ).with_retryable(retryable);
                
                let ai_response = AIResponsePayload::new(
                    payload.id.clone(),
                    payload.service_type.clone(),
                    serde_json::Value::Null,
                    status,
                )
                .with_processing_time(processing_time);
                
                Ok(ai_response)
            }
        }
    }

    /// Send an AI request and get a typed response wrapped in AIResponsePayload
    pub async fn send_ai_request_typed_response<T>(&self, payload: &AIRequestPayload) -> Result<AIResponsePayload>
    where
        T: for<'de> serde::Deserialize<'de> + serde::Serialize,
    {
        let ai_response = self.send_ai_request_response(payload).await?;
        
        if ai_response.is_successful() {
            // Try to deserialize the response data to the expected type
            match serde_json::from_value::<T>(ai_response.response_data.clone()) {
                Ok(typed_data) => {
                    // Re-serialize to ensure consistent JSON format
                    let serialized_data = serde_json::to_value(typed_data)?;
                    let mut updated_response = ai_response;
                    updated_response.response_data = serialized_data;
                    Ok(updated_response)
                }
                Err(e) => {
                    let error = AIResponseError::new(
                        "TYPE_MISMATCH".to_string(),
                        format!("Response data doesn't match expected type: {}", e),
                        ErrorCategory::ProcessingError,
                    );
                    let failure_response = AIResponsePayload::failure(
                        payload.id.clone(),
                        payload.service_type.clone(),
                        error,
                    ).with_processing_time(ai_response.processing_time_ms);
                    
                    Ok(failure_response)
                }
            }
        } else {
            Ok(ai_response)
        }
    }

    /// Batch send multiple AI requests and get responses
    pub async fn send_ai_request_batch(&self, payloads: &[AIRequestPayload]) -> Result<Vec<AIResponsePayload>> {
        let mut responses = Vec::new();
        
        // Process requests concurrently
        let mut handles = Vec::new();
        for payload in payloads {
            let client = self.clone();
            let payload_clone = payload.clone();
            let handle = tokio::spawn(async move {
                client.send_ai_request_response(&payload_clone).await
            });
            handles.push(handle);
        }
        
        // Collect all responses
        for handle in handles {
            match handle.await {
                Ok(Ok(response)) => responses.push(response),
                Ok(Err(e)) => {
                    log::error!("Batch request failed: {}", e);
                    // Create a failure response for this request
                    let error = AIResponseError::new(
                        "BATCH_REQUEST_FAILED".to_string(),
                        e.to_string(),
                        ErrorCategory::ProcessingError,
                    );
                    let failure_response = AIResponsePayload::failure(
                        "unknown".to_string(),
                        AIServiceType::Unknown,
                        error,
                    );
                    responses.push(failure_response);
                }
                Err(e) => {
                    log::error!("Batch request task failed: {}", e);
                    let error = AIResponseError::new(
                        "TASK_FAILED".to_string(),
                        e.to_string(),
                        ErrorCategory::ProcessingError,
                    );
                    let failure_response = AIResponsePayload::failure(
                        "unknown".to_string(),
                        AIServiceType::Unknown,
                        error,
                    );
                    responses.push(failure_response);
                }
            }
        }
        
        Ok(responses)
    }

    /// Get the configured base URL
    pub fn base_url(&self) -> &str {
        &self.base_url
    }

    /// Get the configured timeout
    pub fn timeout(&self) -> Duration {
        self.timeout
    }

    /// Get a reference to the underlying HTTP client
    pub fn client(&self) -> &Client {
        &self.client
    }

    /// Get connection pool statistics and health information
    pub fn connection_info(&self) -> String {
        format!(
            "AIOracleClient connected to: {} | Timeout: {:?}",
            self.base_url,
            self.timeout
        )
    }

    /// Test connection pool efficiency by making multiple concurrent requests
    pub async fn test_connection_pool(&self, concurrent_requests: usize) -> Result<Vec<bool>> {
        let mut handles = Vec::new();
        
        for i in 0..concurrent_requests {
            let client = self.clone();
            let handle = tokio::spawn(async move {
                log::debug!("Starting concurrent request {}", i);
                let result = client.test_connectivity().await;
                log::debug!("Completed concurrent request {}: {:?}", i, result);
                result.unwrap_or(false)
            });
            handles.push(handle);
        }
        
        let mut results = Vec::new();
        for handle in handles {
            let result = handle.await.unwrap_or(false);
            results.push(result);
        }
        
        log::info!(
            "Connection pool test completed: {}/{} requests successful",
            results.iter().filter(|&&x| x).count(),
            concurrent_requests
        );
        
        Ok(results)
    }
}

/// Configuration for AI service communication and behavior
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIServiceConfig {
    /// Base URL for AI service endpoints
    pub base_url: String,
    /// API key for authentication with AI service
    pub api_key: Option<String>,
    /// Request timeout in seconds
    pub timeout_seconds: u64,
    /// Maximum number of retry attempts
    pub max_retries: u32,
    /// Base delay for exponential backoff in milliseconds
    pub base_retry_delay_ms: u64,
    /// Maximum delay for exponential backoff in milliseconds  
    pub max_retry_delay_ms: u64,
    /// Jitter factor for retry delays (0.0 to 1.0)
    pub retry_jitter: f64,
    /// Health check interval in seconds
    pub health_check_interval_seconds: u64,
    /// Health check timeout in seconds
    pub health_check_timeout_seconds: u64,
    /// Number of consecutive failed health checks before marking service as unhealthy
    pub health_check_failure_threshold: u32,
    /// Number of consecutive successful health checks before marking service as healthy
    pub health_check_success_threshold: u32,
    /// Circuit breaker failure threshold (percentage)
    pub circuit_breaker_failure_threshold: f64,
    /// Circuit breaker recovery time in seconds
    pub circuit_breaker_recovery_time_seconds: u64,
    /// Connection pool configuration
    pub connection_pool: ConnectionPoolConfig,
    /// Request rate limit (requests per second)
    pub rate_limit_per_second: Option<u32>,
    /// Batch size for bulk operations
    pub batch_size: u32,
    /// Cache TTL for responses in seconds
    pub cache_ttl_seconds: u64,
    /// Enable request/response logging
    pub enable_request_logging: bool,
    /// Enable metrics collection
    pub enable_metrics: bool,
    /// Custom headers to include in requests
    pub custom_headers: std::collections::HashMap<String, String>,
    /// AI service endpoints for different service types
    pub endpoints: AIServiceEndpoints,
    /// Risk score configuration
    pub risk_config: RiskScoringConfig,
    /// Fallback configuration when AI service is unavailable
    pub fallback_config: FallbackConfig,
}

/// Configuration for AI service endpoints
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIServiceEndpoints {
    /// Fraud detection endpoint
    pub fraud_detection: String,
    /// Risk scoring endpoint
    pub risk_scoring: String,
    /// Contract analysis endpoint
    pub contract_analysis: String,
    /// Address reputation endpoint
    pub address_reputation: String,
    /// KYC verification endpoint
    pub kyc: String,
    /// AML compliance endpoint
    pub aml: String,
    /// Credit assessment endpoint
    pub credit_assessment: String,
    /// Transaction validation endpoint
    pub transaction_validation: String,
    /// Pattern analysis endpoint
    pub pattern_analysis: String,
    /// Threat detection endpoint
    pub threat_detection: String,
    /// Health check endpoint
    pub health_check: String,
    /// Batch processing endpoint
    pub batch_processing: String,
}

/// Configuration for risk scoring thresholds and policies
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskScoringConfig {
    /// Low risk threshold (0.0 to 1.0)
    pub low_risk_threshold: f64,
    /// Medium risk threshold (0.0 to 1.0)
    pub medium_risk_threshold: f64,
    /// High risk threshold (0.0 to 1.0)
    pub high_risk_threshold: f64,
    /// Auto-approve transactions below this threshold
    pub auto_approve_threshold: f64,
    /// Auto-reject transactions above this threshold
    pub auto_reject_threshold: f64,
    /// Require manual review for scores in this range
    pub manual_review_threshold_range: (f64, f64),
    /// Default risk score when AI service is unavailable
    pub default_risk_score: f64,
    /// Enable risk-based processing
    pub enable_risk_based_processing: bool,
    /// Risk score weights for different transaction types
    pub transaction_type_weights: std::collections::HashMap<String, f64>,
}

/// Configuration for fallback behavior when AI service is unavailable
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FallbackConfig {
    /// Enable fallback processing
    pub enable_fallback: bool,
    /// Fallback mode: "permissive" (allow all), "restrictive" (block all), or "default_scores"
    pub fallback_mode: String,
    /// Default risk scores by service type when in fallback mode
    pub default_scores: std::collections::HashMap<String, f64>,
    /// Cache previous results for fallback processing
    pub use_cached_results: bool,
    /// Cache retention time in seconds
    pub cache_retention_seconds: u64,
    /// Log fallback operations
    pub log_fallback_operations: bool,
}

impl Default for AIServiceConfig {
    fn default() -> Self {
        let mut custom_headers = std::collections::HashMap::new();
        custom_headers.insert("User-Agent".to_string(), "Dytallix-Blockchain/1.0".to_string());
        custom_headers.insert("Content-Type".to_string(), "application/json".to_string());

        let mut transaction_type_weights = std::collections::HashMap::new();
        transaction_type_weights.insert("transfer".to_string(), 1.0);
        transaction_type_weights.insert("contract_call".to_string(), 1.5);
        transaction_type_weights.insert("contract_deploy".to_string(), 2.0);
        transaction_type_weights.insert("stake".to_string(), 1.2);

        let mut default_scores = std::collections::HashMap::new();
        default_scores.insert("fraud_detection".to_string(), 0.5);
        default_scores.insert("risk_scoring".to_string(), 0.5);
        default_scores.insert("contract_analysis".to_string(), 0.3);
        default_scores.insert("address_reputation".to_string(), 0.5);

        Self {
            base_url: "http://localhost:8080".to_string(),
            api_key: None,
            timeout_seconds: 30,
            max_retries: 3,
            base_retry_delay_ms: 100,
            max_retry_delay_ms: 5000,
            retry_jitter: 0.1,
            health_check_interval_seconds: 30,
            health_check_timeout_seconds: 5,
            health_check_failure_threshold: 3,
            health_check_success_threshold: 2,
            circuit_breaker_failure_threshold: 0.5,
            circuit_breaker_recovery_time_seconds: 60,
            connection_pool: ConnectionPoolConfig::default(),
            rate_limit_per_second: Some(100),
            batch_size: 10,
            cache_ttl_seconds: 300,
            enable_request_logging: true,
            enable_metrics: true,
            custom_headers,
            endpoints: AIServiceEndpoints::default(),
            risk_config: RiskScoringConfig::default(),
            fallback_config: FallbackConfig::default(),
        }
    }
}

impl Default for AIServiceEndpoints {
    fn default() -> Self {
        Self {
            fraud_detection: "/api/v1/fraud-detection".to_string(),
            risk_scoring: "/api/v1/risk-scoring".to_string(),
            contract_analysis: "/api/v1/contract-analysis".to_string(),
            address_reputation: "/api/v1/address-reputation".to_string(),
            kyc: "/api/v1/kyc".to_string(),
            aml: "/api/v1/aml".to_string(),
            credit_assessment: "/api/v1/credit-assessment".to_string(),
            transaction_validation: "/api/v1/transaction-validation".to_string(),
            pattern_analysis: "/api/v1/pattern-analysis".to_string(),
            threat_detection: "/api/v1/threat-detection".to_string(),
            health_check: "/health".to_string(),
            batch_processing: "/api/v1/batch".to_string(),
        }
    }
}

impl Default for RiskScoringConfig {
    fn default() -> Self {
        Self {
            low_risk_threshold: 0.3,
            medium_risk_threshold: 0.6,
            high_risk_threshold: 0.8,
            auto_approve_threshold: 0.2,
            auto_reject_threshold: 0.9,
            manual_review_threshold_range: (0.2, 0.9),
            default_risk_score: 0.5,
            enable_risk_based_processing: true,
            transaction_type_weights: std::collections::HashMap::new(),
        }
    }
}

impl Default for FallbackConfig {
    fn default() -> Self {
        Self {
            enable_fallback: true,
            fallback_mode: "default_scores".to_string(),
            default_scores: std::collections::HashMap::new(),
            use_cached_results: true,
            cache_retention_seconds: 3600,
            log_fallback_operations: true,
        }
    }
}

impl AIServiceConfig {
    /// Create a new configuration with minimal required fields
    pub fn new(base_url: String) -> Self {
        Self {
            base_url,
            ..Default::default()
        }
    }

    /// Create a configuration optimized for development
    pub fn development() -> Self {
        Self {
            base_url: "http://localhost:8080".to_string(),
            timeout_seconds: 10,
            max_retries: 2,
            health_check_interval_seconds: 60,
            enable_request_logging: true,
            enable_metrics: false,
            connection_pool: ConnectionPoolConfig::low_resource(),
            fallback_config: FallbackConfig {
                enable_fallback: true,
                fallback_mode: "permissive".to_string(),
                ..Default::default()
            },
            ..Default::default()
        }
    }

    /// Create a configuration optimized for production
    pub fn production() -> Self {
        Self {
            base_url: "https://ai-service.dytallix.com".to_string(),
            timeout_seconds: 30,
            max_retries: 5,
            health_check_interval_seconds: 15,
            enable_request_logging: false,
            enable_metrics: true,
            connection_pool: ConnectionPoolConfig::high_performance(),
            fallback_config: FallbackConfig {
                enable_fallback: true,
                fallback_mode: "restrictive".to_string(),
                ..Default::default()
            },
            ..Default::default()
        }
    }

    /// Create a configuration for testing
    pub fn testing() -> Self {
        Self {
            base_url: "http://localhost:8081".to_string(),
            timeout_seconds: 5,
            max_retries: 1,
            health_check_interval_seconds: 10,
            enable_request_logging: true,
            enable_metrics: true,
            connection_pool: ConnectionPoolConfig::low_resource(),
            fallback_config: FallbackConfig {
                enable_fallback: false,
                fallback_mode: "default_scores".to_string(),
                ..Default::default()
            },
            ..Default::default()
        }
    }

    /// Set API key for authentication
    pub fn with_api_key(mut self, api_key: String) -> Self {
        self.api_key = Some(api_key);
        self
    }

    /// Set request timeout
    pub fn with_timeout(mut self, timeout_seconds: u64) -> Self {
        self.timeout_seconds = timeout_seconds;
        self
    }

    /// Set retry configuration
    pub fn with_retry_config(mut self, max_retries: u32, base_delay_ms: u64, max_delay_ms: u64) -> Self {
        self.max_retries = max_retries;
        self.base_retry_delay_ms = base_delay_ms;
        self.max_retry_delay_ms = max_delay_ms;
        self
    }

    /// Set health check configuration
    pub fn with_health_check_config(mut self, interval_seconds: u64, timeout_seconds: u64, failure_threshold: u32) -> Self {
        self.health_check_interval_seconds = interval_seconds;
        self.health_check_timeout_seconds = timeout_seconds;
        self.health_check_failure_threshold = failure_threshold;
        self
    }

    /// Set circuit breaker configuration
    pub fn with_circuit_breaker_config(mut self, failure_threshold: f64, recovery_time_seconds: u64) -> Self {
        self.circuit_breaker_failure_threshold = failure_threshold;
        self.circuit_breaker_recovery_time_seconds = recovery_time_seconds;
        self
    }

    /// Set connection pool configuration
    pub fn with_connection_pool(mut self, pool_config: ConnectionPoolConfig) -> Self {
        self.connection_pool = pool_config;
        self
    }

    /// Add custom header
    pub fn with_custom_header(mut self, key: String, value: String) -> Self {
        self.custom_headers.insert(key, value);
        self
    }

    /// Set risk scoring configuration
    pub fn with_risk_config(mut self, risk_config: RiskScoringConfig) -> Self {
        self.risk_config = risk_config;
        self
    }

    /// Set fallback configuration
    pub fn with_fallback_config(mut self, fallback_config: FallbackConfig) -> Self {
        self.fallback_config = fallback_config;
        self
    }

    /// Validate the configuration
    pub fn validate(&self) -> Result<(), String> {
        if self.base_url.is_empty() {
            return Err("Base URL cannot be empty".to_string());
        }

        if self.timeout_seconds == 0 {
            return Err("Timeout must be greater than 0".to_string());
        }

        if self.max_retries > 10 {
            return Err("Max retries cannot exceed 10".to_string());
        }

        if self.base_retry_delay_ms >= self.max_retry_delay_ms {
            return Err("Base retry delay must be less than max retry delay".to_string());
        }

        if self.retry_jitter < 0.0 || self.retry_jitter > 1.0 {
            return Err("Retry jitter must be between 0.0 and 1.0".to_string());
        }

        if self.circuit_breaker_failure_threshold < 0.0 || self.circuit_breaker_failure_threshold > 1.0 {
            return Err("Circuit breaker failure threshold must be between 0.0 and 1.0".to_string());
        }

        if self.health_check_failure_threshold == 0 {
            return Err("Health check failure threshold must be greater than 0".to_string());
        }

        if self.health_check_success_threshold == 0 {
            return Err("Health check success threshold must be greater than 0".to_string());
        }

        // Validate risk scoring configuration
        if self.risk_config.low_risk_threshold >= self.risk_config.medium_risk_threshold {
            return Err("Low risk threshold must be less than medium risk threshold".to_string());
        }

        if self.risk_config.medium_risk_threshold >= self.risk_config.high_risk_threshold {
            return Err("Medium risk threshold must be less than high risk threshold".to_string());
        }

        if self.risk_config.auto_approve_threshold >= self.risk_config.auto_reject_threshold {
            return Err("Auto-approve threshold must be less than auto-reject threshold".to_string());
        }

        // Validate fallback configuration
        let valid_fallback_modes = ["permissive", "restrictive", "default_scores"];
        if !valid_fallback_modes.contains(&self.fallback_config.fallback_mode.as_str()) {
            return Err(format!("Invalid fallback mode: {}. Must be one of: {:?}", 
                              self.fallback_config.fallback_mode, valid_fallback_modes));
        }

        Ok(())
    }

    /// Load configuration from environment variables
    pub fn from_env() -> Result<Self, String> {
        let mut config = Self::default();

        if let Ok(base_url) = std::env::var("AI_SERVICE_BASE_URL") {
            config.base_url = base_url;
        }

        if let Ok(api_key) = std::env::var("AI_SERVICE_API_KEY") {
            config.api_key = Some(api_key);
        }

        if let Ok(timeout) = std::env::var("AI_SERVICE_TIMEOUT_SECONDS") {
            config.timeout_seconds = timeout.parse()
                .map_err(|_| "Invalid AI_SERVICE_TIMEOUT_SECONDS format")?;
        }

        if let Ok(max_retries) = std::env::var("AI_SERVICE_MAX_RETRIES") {
            config.max_retries = max_retries.parse()
                .map_err(|_| "Invalid AI_SERVICE_MAX_RETRIES format")?;
        }

        if let Ok(base_delay) = std::env::var("AI_SERVICE_BASE_RETRY_DELAY_MS") {
            config.base_retry_delay_ms = base_delay.parse()
                .map_err(|_| "Invalid AI_SERVICE_BASE_RETRY_DELAY_MS format")?;
        }

        if let Ok(max_delay) = std::env::var("AI_SERVICE_MAX_RETRY_DELAY_MS") {
            config.max_retry_delay_ms = max_delay.parse()
                .map_err(|_| "Invalid AI_SERVICE_MAX_RETRY_DELAY_MS format")?;
        }

        if let Ok(health_interval) = std::env::var("AI_SERVICE_HEALTH_CHECK_INTERVAL_SECONDS") {
            config.health_check_interval_seconds = health_interval.parse()
                .map_err(|_| "Invalid AI_SERVICE_HEALTH_CHECK_INTERVAL_SECONDS format")?;
        }

        if let Ok(enable_logging) = std::env::var("AI_SERVICE_ENABLE_REQUEST_LOGGING") {
            config.enable_request_logging = enable_logging.parse()
                .map_err(|_| "Invalid AI_SERVICE_ENABLE_REQUEST_LOGGING format")?;
        }

        if let Ok(enable_metrics) = std::env::var("AI_SERVICE_ENABLE_METRICS") {
            config.enable_metrics = enable_metrics.parse()
                .map_err(|_| "Invalid AI_SERVICE_ENABLE_METRICS format")?;
        }

        if let Ok(fallback_mode) = std::env::var("AI_SERVICE_FALLBACK_MODE") {
            config.fallback_config.fallback_mode = fallback_mode;
        }

        if let Ok(low_risk) = std::env::var("AI_SERVICE_LOW_RISK_THRESHOLD") {
            config.risk_config.low_risk_threshold = low_risk.parse()
                .map_err(|_| "Invalid AI_SERVICE_LOW_RISK_THRESHOLD format")?;
        }

        if let Ok(high_risk) = std::env::var("AI_SERVICE_HIGH_RISK_THRESHOLD") {
            config.risk_config.high_risk_threshold = high_risk.parse()
                .map_err(|_| "Invalid AI_SERVICE_HIGH_RISK_THRESHOLD format")?;
        }

        config.validate()?;
        Ok(config)
    }

    /// Get the full URL for a specific service endpoint
    pub fn get_endpoint_url(&self, service_type: &AIServiceType) -> String {
        let endpoint = match service_type {
            AIServiceType::FraudDetection => &self.endpoints.fraud_detection,
            AIServiceType::RiskScoring => &self.endpoints.risk_scoring,
            AIServiceType::ContractAnalysis => &self.endpoints.contract_analysis,
            AIServiceType::AddressReputation => &self.endpoints.address_reputation,
            AIServiceType::KYC => &self.endpoints.kyc,
            AIServiceType::AML => &self.endpoints.aml,
            AIServiceType::CreditAssessment => &self.endpoints.credit_assessment,
            AIServiceType::TransactionValidation => &self.endpoints.transaction_validation,
            AIServiceType::PatternAnalysis => &self.endpoints.pattern_analysis,
            AIServiceType::ThreatDetection => &self.endpoints.threat_detection,
            AIServiceType::Unknown => "/api/v1/unknown",
        };

        format!("{}{}", self.base_url.trim_end_matches('/'), endpoint)
    }

    /// Get health check URL
    pub fn get_health_check_url(&self) -> String {
        format!("{}{}", self.base_url.trim_end_matches('/'), self.endpoints.health_check)
    }

    /// Get batch processing URL
    pub fn get_batch_url(&self) -> String {
        format!("{}{}", self.base_url.trim_end_matches('/'), self.endpoints.batch_processing)
    }

    /// Calculate retry delay with exponential backoff and jitter
    pub fn calculate_retry_delay(&self, attempt: u32) -> Duration {
        let base_delay = self.base_retry_delay_ms as f64;
        let max_delay = self.max_retry_delay_ms as f64;
        let jitter = self.retry_jitter;

        // Exponential backoff: delay = base_delay * 2^attempt
        let exponential_delay = base_delay * (2_f64.powi(attempt as i32));
        let capped_delay = exponential_delay.min(max_delay);

        // Add jitter: final_delay = delay * (1 + random(-jitter, jitter))
        let jitter_factor = 1.0 + (rand::random::<f64>() - 0.5) * 2.0 * jitter;
        let final_delay = capped_delay * jitter_factor;

        Duration::from_millis(final_delay.max(0.0) as u64)
    }
}

/// Configuration for connection pooling and keep-alive settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionPoolConfig {
    /// Maximum number of idle connections per host
    pub max_idle_per_host: usize,
    /// Timeout for idle connections in the pool
    pub idle_timeout: Duration,
    /// TCP keep-alive interval
    pub tcp_keepalive: Duration,
    /// Maximum total connections in the pool
    pub max_total_connections: Option<usize>,
    /// Enable HTTP/2 support
    pub http2_prior_knowledge: bool,
}

impl Default for ConnectionPoolConfig {
    fn default() -> Self {
        Self {
            max_idle_per_host: 10,
            idle_timeout: Duration::from_secs(90),
            tcp_keepalive: Duration::from_secs(60),
            max_total_connections: Some(100),
            http2_prior_knowledge: false,
        }
    }
}

impl ConnectionPoolConfig {
    /// Create a new connection pool configuration for high-performance scenarios
    pub fn high_performance() -> Self {
        Self {
            max_idle_per_host: 50,
            idle_timeout: Duration::from_secs(120),
            tcp_keepalive: Duration::from_secs(30),
            max_total_connections: Some(500),
            http2_prior_knowledge: true,
        }
    }

    /// Create a new connection pool configuration for low-resource scenarios
    pub fn low_resource() -> Self {
        Self {
            max_idle_per_host: 2,
            idle_timeout: Duration::from_secs(30),
            tcp_keepalive: Duration::from_secs(120),
            max_total_connections: Some(10),
            http2_prior_knowledge: false,
        }
    }
}

/// Enhanced AI Request Payload for Oracle Communication
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIRequestPayload {
    /// Unique request identifier for tracking
    pub id: String,
    /// Type of AI service being requested
    pub service_type: AIServiceType,
    /// Request data specific to the service type
    pub request_data: serde_json::Value,
    /// Timestamp when the request was created
    pub timestamp: u64,
    /// Optional request metadata
    pub metadata: Option<AIRequestMetadata>,
    /// Request priority level
    pub priority: RequestPriority,
    /// Maximum time to wait for response (in seconds)
    pub timeout: Option<u64>,
    /// Callback URL for async responses
    pub callback_url: Option<String>,
    /// Request signature for authentication
    pub signature: Option<String>,
}

/// Metadata associated with AI requests
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIRequestMetadata {
    /// Source of the request (e.g., "consensus", "validation", "fraud_detection")
    pub source: String,
    /// Version of the request format
    pub version: String,
    /// Additional context or parameters
    pub context: Option<serde_json::Value>,
    /// Request correlation ID for grouping related requests
    pub correlation_id: Option<String>,
    /// User or system that initiated the request
    pub requester: Option<String>,
}

impl AIRequestPayload {
    /// Create a new request payload with minimal required fields
    pub fn new(service_type: AIServiceType, request_data: serde_json::Value) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            service_type,
            request_data,
            timestamp: chrono::Utc::now().timestamp() as u64,
            metadata: None,
            priority: RequestPriority::default(),
            timeout: None,
            callback_url: None,
            signature: None,
        }
    }

    /// Create a new request payload with full configuration
    pub fn new_with_config(
        service_type: AIServiceType,
        request_data: serde_json::Value,
        metadata: Option<AIRequestMetadata>,
        priority: RequestPriority,
        timeout: Option<u64>,
        callback_url: Option<String>,
    ) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            service_type,
            request_data,
            timestamp: chrono::Utc::now().timestamp() as u64,
            metadata,
            priority,
            timeout,
            callback_url,
            signature: None,
        }
    }

    /// Create a fraud detection request
    pub fn fraud_detection(transaction_data: serde_json::Value) -> Self {
        Self::new(AIServiceType::FraudDetection, transaction_data)
    }

    /// Create a risk scoring request
    pub fn risk_scoring(transaction_data: serde_json::Value) -> Self {
        Self::new(AIServiceType::RiskScoring, transaction_data)
    }

    /// Create a contract analysis request
    pub fn contract_analysis(contract_data: serde_json::Value) -> Self {
        Self::new(AIServiceType::ContractAnalysis, contract_data)
    }

    /// Create a transaction validation request
    pub fn transaction_validation(transaction_data: serde_json::Value) -> Self {
        Self::new(AIServiceType::TransactionValidation, transaction_data)
    }

    /// Set the request priority
    pub fn with_priority(mut self, priority: RequestPriority) -> Self {
        self.priority = priority;
        self
    }

    /// Set the request timeout
    pub fn with_timeout(mut self, timeout: u64) -> Self {
        self.timeout = Some(timeout);
        self
    }

    /// Set the callback URL
    pub fn with_callback(mut self, callback_url: String) -> Self {
        self.callback_url = Some(callback_url);
        self
    }

    /// Set the request metadata
    pub fn with_metadata(mut self, metadata: AIRequestMetadata) -> Self {
        self.metadata = Some(metadata);
        self
    }

    /// Set the request signature
    pub fn with_signature(mut self, signature: String) -> Self {
        self.signature = Some(signature);
        self
    }

    /// Serialize this payload to a JSON string
    pub fn to_json(&self) -> Result<String, serde_json::Error> {
        serde_json::to_string(self)
    }

    /// Serialize this payload to pretty JSON string
    pub fn to_json_pretty(&self) -> Result<String, serde_json::Error> {
        serde_json::to_string_pretty(self)
    }

    /// Deserialize a payload from a JSON string
    pub fn from_json(data: &str) -> Result<Self, serde_json::Error> {
        serde_json::from_str(data)
    }

    /// Validate the request payload
    pub fn validate(&self) -> Result<(), String> {
        if self.id.is_empty() {
            return Err("Request ID cannot be empty".to_string());
        }

        if self.timestamp == 0 {
            return Err("Timestamp cannot be zero".to_string());
        }

        // Check if timestamp is not too old (24 hours)
        let now = chrono::Utc::now().timestamp() as u64;
        if now > self.timestamp && (now - self.timestamp) > 86400 {
            return Err("Request timestamp is too old".to_string());
        }

        // Check if timestamp is not too far in the future (1 hour)
        if self.timestamp > now && (self.timestamp - now) > 3600 {
            return Err("Request timestamp is too far in the future".to_string());
        }

        // Validate timeout if set
        if let Some(timeout) = self.timeout {
            if timeout == 0 {
                return Err("Timeout cannot be zero".to_string());
            }
            if timeout > 300 {
                return Err("Timeout cannot exceed 300 seconds".to_string());
            }
        }

        // Validate callback URL if set
        if let Some(ref callback_url) = self.callback_url {
            if callback_url.is_empty() {
                return Err("Callback URL cannot be empty".to_string());
            }
            if !callback_url.starts_with("http://") && !callback_url.starts_with("https://") {
                return Err("Callback URL must be a valid HTTP(S) URL".to_string());
            }
        }

        Ok(())
    }

    /// Get the age of the request in seconds
    pub fn age_seconds(&self) -> u64 {
        let now = chrono::Utc::now().timestamp() as u64;
        if now > self.timestamp {
            now - self.timestamp
        } else {
            0
        }
    }

    /// Check if the request has expired based on timeout
    pub fn is_expired(&self) -> bool {
        if let Some(timeout) = self.timeout {
            self.age_seconds() > timeout
        } else {
            false
        }
    }

    /// Get the effective timeout (default to 30 seconds if not set)
    pub fn effective_timeout(&self) -> u64 {
        self.timeout.unwrap_or(30)
    }
}

impl AIRequestMetadata {
    /// Create new metadata with minimal fields
    pub fn new(source: String, version: String) -> Self {
        Self {
            source,
            version,
            context: None,
            correlation_id: None,
            requester: None,
        }
    }

    /// Create metadata with full configuration
    pub fn new_with_config(
        source: String,
        version: String,
        context: Option<serde_json::Value>,
        correlation_id: Option<String>,
        requester: Option<String>,
    ) -> Self {
        Self {
            source,
            version,
            context,
            correlation_id,
            requester,
        }
    }

    /// Set the context
    pub fn with_context(mut self, context: serde_json::Value) -> Self {
        self.context = Some(context);
        self
    }

    /// Set the correlation ID
    pub fn with_correlation_id(mut self, correlation_id: String) -> Self {
        self.correlation_id = Some(correlation_id);
        self
    }

    /// Set the requester
    pub fn with_requester(mut self, requester: String) -> Self {
        self.requester = Some(requester);
        self
    }
}


#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_ai_oracle_client_creation() {
        let client = AIOracleClient::new("http://localhost:8080".to_string());
        assert!(client.is_ok());

        let client = client.unwrap();
        assert_eq!(client.base_url(), "http://localhost:8080");
        assert_eq!(client.timeout(), Duration::from_secs(30));
    }

    #[test]
    fn test_ai_oracle_client_with_timeout() {
        let timeout = Duration::from_secs(60);
        let client = AIOracleClient::with_timeout("http://localhost:8080".to_string(), timeout);
        assert!(client.is_ok());

        let client = client.unwrap();
        assert_eq!(client.timeout(), timeout);
    }

    #[tokio::test]
    async fn test_connectivity_with_invalid_url() {
        let client = AIOracleClient::new("http://invalid-url-12345.com".to_string()).unwrap();
        let result = client.test_connectivity().await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), false);
    }

    #[test]
    fn test_url_formatting() {
        let client = AIOracleClient::new("http://localhost:8080/".to_string()).unwrap();
        assert_eq!(client.base_url(), "http://localhost:8080/");
        
        let client = AIOracleClient::new("http://localhost:8080".to_string()).unwrap();
        assert_eq!(client.base_url(), "http://localhost:8080");
    }

    #[test]
    fn test_custom_config() {
        use std::time::Duration;
        
        let client = AIOracleClient::with_config(
            "http://localhost:8080".to_string(),
            Duration::from_secs(45),
            20,
            Duration::from_secs(120),
            Duration::from_secs(90),
        );
        
        assert!(client.is_ok());
        let client = client.unwrap();
        assert_eq!(client.timeout(), Duration::from_secs(45));
    }

    #[test]
    fn test_connection_pool_config() {
        let config = ConnectionPoolConfig::default();
        assert_eq!(config.max_idle_per_host, 10);
        assert_eq!(config.idle_timeout, Duration::from_secs(90));
        assert_eq!(config.tcp_keepalive, Duration::from_secs(60));
        
        let high_perf = ConnectionPoolConfig::high_performance();
        assert_eq!(high_perf.max_idle_per_host, 50);
        assert!(high_perf.http2_prior_knowledge);
        
        let low_res = ConnectionPoolConfig::low_resource();
        assert_eq!(low_res.max_idle_per_host, 2);
        assert!(!low_res.http2_prior_knowledge);
    }

    #[test]
    fn test_client_with_pool_config() {
        let config = ConnectionPoolConfig::default();
        let client = AIOracleClient::with_pool_config(
            "http://localhost:8080".to_string(),
            Duration::from_secs(30),
            config,
        );
        assert!(client.is_ok());
    }

    #[test]
    fn test_high_performance_client() {
        let client = AIOracleClient::high_performance(
            "http://localhost:8080".to_string(),
            Duration::from_secs(30),
        );
        assert!(client.is_ok());
    }

    #[test]
    fn test_low_resource_client() {
        let client = AIOracleClient::low_resource(
            "http://localhost:8080".to_string(),
            Duration::from_secs(30),
        );
        assert!(client.is_ok());
    }

    #[tokio::test]
    async fn test_connection_pool_concurrent_requests() {
        let client = AIOracleClient::new("http://httpbin.org".to_string()).unwrap();
        
        // Test with a small number of concurrent requests
        let results = client.test_connection_pool(3).await;
        assert!(results.is_ok());
        
        // The actual success depends on network availability, so we just check the structure
        let results = results.unwrap();
        assert_eq!(results.len(), 3);
    }

    #[test]
    fn test_request_payload_serialization() {
        let payload = AIRequestPayload::new(
            AIServiceType::FraudDetection,
            json!({"amount": 1000, "currency": "USD"})
        );
        
        // Test JSON serialization
        let json = payload.to_json();
        assert!(json.is_ok());
        let json_str = json.unwrap();
        assert!(json_str.contains("\"id\""));
        assert!(json_str.contains("\"service_type\":\"FraudDetection\""));
        assert!(json_str.contains("\"request_data\":{\"amount\":1000,\"currency\":\"USD\"}"));
        
        // Test pretty JSON serialization
        let json_pretty = payload.to_json_pretty();
        assert!(json_pretty.is_ok());
        let json_pretty_str = json_pretty.unwrap();
        assert!(json_pretty_str.contains("\"id\""));
        assert!(json_pretty_str.contains("\"service_type\": \"FraudDetection\""));
        assert!(json_pretty_str.contains("\"request_data\": {\n    \"amount\": 1000,\n    \"currency\": \"USD\"\n  }"));
    }

    #[test]
    fn test_request_payload_deserialization() {
        let json_data = r#"{
            "id": "1234",
            "service_type": "RiskScoring",
            "request_data": {"score": 750},
            "timestamp": 1633072800,
            "metadata": {
                "source": "consensus",
                "version": "1.0",
                "context": {"key": "value"},
                "correlation_id": "abcd-efgh",
                "requester": "user123"
            },
            "priority": "High",
            "timeout": 60,
            "callback_url": "http://localhost/callback",
            "signature": "sig1234"
        }"#;
        
        let payload: AIRequestPayload = serde_json::from_str(json_data).unwrap();
        assert_eq!(payload.id, "1234");
        assert_eq!(payload.service_type, AIServiceType::RiskScoring);
        assert_eq!(payload.request_data, json!({"score": 750}));
        assert_eq!(payload.timestamp, 1633072800);
        assert!(payload.metadata.is_some());
        assert_eq!(payload.priority, RequestPriority::High);
        assert_eq!(payload.timeout, Some(60));
        assert_eq!(payload.callback_url, Some("http://localhost/callback".to_string()));
        assert_eq!(payload.signature, Some("sig1234".to_string()));
    }

    #[test]
    fn test_request_payload_validation() {
        let mut payload = AIRequestPayload::new(
            AIServiceType::KYC,
            json!({"name": "John Doe", "document": "123456789"})
        );
        
        // Valid payload
        let validation_result = payload.validate();
        assert!(validation_result.is_ok());
        
        // Invalid payload: empty ID
        payload.id = "".to_string();
        let validation_result = payload.validate();
        assert!(validation_result.is_err());
        assert_eq!(validation_result.err().unwrap(), "Request ID cannot be empty");
        
        // Invalid payload: timestamp too old
        payload.id = uuid::Uuid::new_v4().to_string();
        payload.timestamp = 0;
        let validation_result = payload.validate();
        assert!(validation_result.is_err());
        assert_eq!(validation_result.err().unwrap(), "Timestamp cannot be zero");
        
        // Invalid payload: timeout exceeds maximum
        payload.timestamp = chrono::Utc::now().timestamp() as u64;
        payload.timeout = Some(400);
        let validation_result = payload.validate();
        assert!(validation_result.is_err());
        assert_eq!(validation_result.err().unwrap(), "Timeout cannot exceed 300 seconds");
        
        // Invalid payload: callback URL invalid
        payload.timeout = Some(60);
        payload.callback_url = Some("invalid-url".to_string());
        let validation_result = payload.validate();
        assert!(validation_result.is_err());
        assert_eq!(validation_result.err().unwrap(), "Callback URL must be a valid HTTP(S) URL");
    }

    #[test]
    fn test_metadata_serialization() {
        let metadata = AIRequestMetadata::new("consensus".to_string(), "1.0".to_string())
            .with_context(json!({"key": "value"}))
            .with_correlation_id("abcd-efgh".to_string())
            .with_requester("user123".to_string());
        
        // Test that metadata can be serialized as part of a request payload
        let payload = AIRequestPayload::new(AIServiceType::FraudDetection, json!({"test": "data"}))
            .with_metadata(metadata);
        
        let json_str = payload.to_json().unwrap();
        assert!(!json_str.is_empty());
        assert!(json_str.contains("\"source\":\"consensus\""));
        assert!(json_str.contains("\"version\":\"1.0\""));
        assert!(json_str.contains("\"correlation_id\":\"abcd-efgh\""));
        assert!(json_str.contains("\"requester\":\"user123\""));
    }

    #[test]
    fn test_metadata_deserialization() {
        let json_data = r#"{
            "source": "validation",
            "version": "1.0",
            "context": {"key": "value"},
            "correlation_id": "ijkl-mnop",
            "requester": "user456"
        }"#;
        
        let metadata: AIRequestMetadata = serde_json::from_str(json_data).unwrap();
        assert_eq!(metadata.source, "validation");
        assert_eq!(metadata.version, "1.0");
        assert!(metadata.context.is_some());
        assert_eq!(metadata.correlation_id, Some("ijkl-mnop".to_string()));
        assert_eq!(metadata.requester, Some("user456".to_string()));
    }

    #[test]
    fn test_ai_request_payload_creation() {
        let request_data = serde_json::json!({
            "transaction_id": "tx123",
            "amount": 1000
        });
        
        let payload = AIRequestPayload::new(AIServiceType::FraudDetection, request_data);
        
        assert!(!payload.id.is_empty());
        assert_eq!(payload.service_type, AIServiceType::FraudDetection);
        assert_eq!(payload.priority, RequestPriority::Normal);
        assert!(payload.timestamp > 0);
        assert!(payload.metadata.is_none());
        assert!(payload.timeout.is_none());
        assert!(payload.callback_url.is_none());
        assert!(payload.signature.is_none());
    }

    #[test]
    fn test_ai_request_payload_builder_pattern() {
        let request_data = serde_json::json!({
            "transaction_id": "tx123",
            "amount": 1000
        });
        
        let metadata = AIRequestMetadata::new(
            "consensus".to_string(),
            "1.0".to_string(),
        );
        
        let payload = AIRequestPayload::new(AIServiceType::RiskScoring, request_data)
            .with_priority(RequestPriority::High)
            .with_timeout(60)
            .with_callback("https://example.com/callback".to_string())
            .with_metadata(metadata)
            .with_signature("signature123".to_string());
        
        assert_eq!(payload.service_type, AIServiceType::RiskScoring);
        assert_eq!(payload.priority, RequestPriority::High);
        assert_eq!(payload.timeout, Some(60));
        assert_eq!(payload.callback_url, Some("https://example.com/callback".to_string()));
        assert!(payload.metadata.is_some());
        assert_eq!(payload.signature, Some("signature123".to_string()));
    }

    #[test]
    fn test_ai_request_payload_convenience_methods() {
        let tx_data = serde_json::json!({"tx_id": "123"});
        
        let fraud_payload = AIRequestPayload::fraud_detection(tx_data.clone());
        assert_eq!(fraud_payload.service_type, AIServiceType::FraudDetection);
        
        let risk_payload = AIRequestPayload::risk_scoring(tx_data.clone());
        assert_eq!(risk_payload.service_type, AIServiceType::RiskScoring);
        
        let contract_payload = AIRequestPayload::contract_analysis(tx_data.clone());
        assert_eq!(contract_payload.service_type, AIServiceType::ContractAnalysis);
        
        let validation_payload = AIRequestPayload::transaction_validation(tx_data);
        assert_eq!(validation_payload.service_type, AIServiceType::TransactionValidation);
    }

    #[test]
    fn test_ai_request_payload_validation() {
        let response_data = serde_json::json!({"test": "data"});
        let payload = AIRequestPayload::new(AIServiceType::FraudDetection, response_data);
        
        // Should validate successfully
        assert!(payload.validate().is_ok());
        
        // Test with invalid callback URL
        let invalid_payload = AIRequestPayload::new(AIServiceType::FraudDetection, serde_json::json!({}))
            .with_callback("invalid-url".to_string());
        
        assert!(invalid_payload.validate().is_err());
        
        // Test with zero timeout
        let zero_timeout_payload = AIRequestPayload::new(AIServiceType::FraudDetection, serde_json::json!({}))
            .with_timeout(0);
        
        assert!(zero_timeout_payload.validate().is_err());
        
        // Test with excessive timeout
        let excessive_timeout_payload = AIRequestPayload::new(AIServiceType::FraudDetection, serde_json::json!({}))
            .with_timeout(400);
        
        assert!(excessive_timeout_payload.validate().is_err());
    }

    #[test]
    fn test_ai_service_config_creation() {
        let config = AIServiceConfig::new("https://api.example.com".to_string());
        assert_eq!(config.base_url, "https://api.example.com");
        assert_eq!(config.timeout_seconds, 30);
        assert_eq!(config.max_retries, 3);
        assert!(config.api_key.is_none());
    }

    #[test]
    fn test_ai_service_config_presets() {
        let dev_config = AIServiceConfig::development();
        assert_eq!(dev_config.base_url, "http://localhost:8080");
        assert_eq!(dev_config.timeout_seconds, 10);
        assert_eq!(dev_config.max_retries, 2);
        assert_eq!(dev_config.fallback_config.fallback_mode, "permissive");

        let prod_config = AIServiceConfig::production();
        assert_eq!(prod_config.base_url, "https://ai-service.dytallix.com");
        assert_eq!(prod_config.timeout_seconds, 30);
        assert_eq!(prod_config.max_retries, 5);
        assert_eq!(prod_config.fallback_config.fallback_mode, "restrictive");

        let test_config = AIServiceConfig::testing();
        assert_eq!(test_config.base_url, "http://localhost:8081");
        assert_eq!(test_config.timeout_seconds, 5);
        assert_eq!(test_config.max_retries, 1);
        assert!(!test_config.fallback_config.enable_fallback);
    }

    #[test]
    fn test_ai_service_config_builder_pattern() {
        let config = AIServiceConfig::new("https://api.example.com".to_string())
            .with_api_key("secret-key".to_string())
            .with_timeout(60)
            .with_retry_config(5, 200, 10000)
            .with_health_check_config(20, 3, 5)
            .with_circuit_breaker_config(0.7, 120);

        assert_eq!(config.api_key, Some("secret-key".to_string()));
        assert_eq!(config.timeout_seconds, 60);
        assert_eq!(config.max_retries, 5);
        assert_eq!(config.base_retry_delay_ms, 200);
        assert_eq!(config.max_retry_delay_ms, 10000);
        assert_eq!(config.health_check_interval_seconds, 20);
        assert_eq!(config.health_check_timeout_seconds, 3);
        assert_eq!(config.health_check_failure_threshold, 5);
        assert_eq!(config.circuit_breaker_failure_threshold, 0.7);
        assert_eq!(config.circuit_breaker_recovery_time_seconds, 120);
    }

    #[test]
    fn test_ai_service_config_validation() {
        let mut config = AIServiceConfig::new("https://api.example.com".to_string());
        assert!(config.validate().is_ok());

        // Test invalid base URL
        config.base_url = "".to_string();
        assert!(config.validate().is_err());

        // Test invalid timeout
        config.base_url = "https://api.example.com".to_string();
        config.timeout_seconds = 0;
        assert!(config.validate().is_err());

        // Test invalid max retries
        config.timeout_seconds = 30;
        config.max_retries = 11;
        assert!(config.validate().is_err());

        // Test invalid retry delays
        config.max_retries = 3;
        config.base_retry_delay_ms = 5000;
        config.max_retry_delay_ms = 1000;
        assert!(config.validate().is_err());

        // Test invalid jitter
        config.base_retry_delay_ms = 100;
        config.max_retry_delay_ms = 5000;
        config.retry_jitter = 1.5;
        assert!(config.validate().is_err());

        // Test invalid circuit breaker threshold
        config.retry_jitter = 0.1;
        config.circuit_breaker_failure_threshold = 1.5;
        assert!(config.validate().is_err());

        // Test invalid risk thresholds
        config.circuit_breaker_failure_threshold = 0.5;
        config.risk_config.low_risk_threshold = 0.8;
        config.risk_config.medium_risk_threshold = 0.6;
        assert!(config.validate().is_err());

        // Test invalid auto thresholds
        config.risk_config.low_risk_threshold = 0.3;
        config.risk_config.medium_risk_threshold = 0.6;
        config.risk_config.auto_approve_threshold = 0.9;
        config.risk_config.auto_reject_threshold = 0.1;
        assert!(config.validate().is_err());

        // Test invalid fallback mode
        config.risk_config.auto_approve_threshold = 0.2;
        config.risk_config.auto_reject_threshold = 0.9;
        config.fallback_config.fallback_mode = "invalid_mode".to_string();
        assert!(config.validate().is_err());
    }

    #[test]
    fn test_ai_service_config_endpoint_urls() {
        let config = AIServiceConfig::new("https://api.example.com".to_string());
        
        assert_eq!(
            config.get_endpoint_url(&AIServiceType::FraudDetection),
            "https://api.example.com/api/v1/fraud-detection"
        );
        assert_eq!(
            config.get_endpoint_url(&AIServiceType::RiskScoring),
            "https://api.example.com/api/v1/risk-scoring"
        );
        assert_eq!(
            config.get_endpoint_url(&AIServiceType::KYC),
            "https://api.example.com/api/v1/kyc"
        );
        assert_eq!(
            config.get_health_check_url(),
            "https://api.example.com/health"
        );
        assert_eq!(
            config.get_batch_url(),
            "https://api.example.com/api/v1/batch"
        );
    }

    #[test]
    fn test_ai_service_config_endpoint_urls_with_trailing_slash() {
        let config = AIServiceConfig::new("https://api.example.com/".to_string());
        
        assert_eq!(
            config.get_endpoint_url(&AIServiceType::FraudDetection),
            "https://api.example.com/api/v1/fraud-detection"
        );
        assert_eq!(
            config.get_health_check_url(),
            "https://api.example.com/health"
        );
    }

    #[test]
    fn test_ai_service_config_retry_delay_calculation() {
        let config = AIServiceConfig::new("https://api.example.com".to_string())
            .with_retry_config(5, 100, 5000);

        // Test exponential backoff
        let delay1 = config.calculate_retry_delay(0);
        let delay2 = config.calculate_retry_delay(1);
        let delay3 = config.calculate_retry_delay(2);

        // First retry should be around base_delay * 2^0 = 100ms
        assert!(delay1.as_millis() >= 80 && delay1.as_millis() <= 120);
        
        // Second retry should be around base_delay * 2^1 = 200ms  
        assert!(delay2.as_millis() >= 160 && delay2.as_millis() <= 240);
        
        // Third retry should be around base_delay * 2^2 = 400ms
        assert!(delay3.as_millis() >= 320 && delay3.as_millis() <= 480);

        // Test that delay is capped at max_retry_delay_ms
        let long_delay = config.calculate_retry_delay(10);
        assert!(long_delay.as_millis() <= 5500); // Should be capped + jitter
    }

    #[test]
    fn test_ai_service_config_serialization() {
        let config = AIServiceConfig::development();
        
        // Test JSON serialization
        let json_str = serde_json::to_string(&config).unwrap();
        assert!(json_str.contains("\"base_url\""));
        assert!(json_str.contains("\"timeout_seconds\""));
        assert!(json_str.contains("\"max_retries\""));

        // Test JSON deserialization
        let deserialized: AIServiceConfig = serde_json::from_str(&json_str).unwrap();
        assert_eq!(deserialized.base_url, config.base_url);
        assert_eq!(deserialized.timeout_seconds, config.timeout_seconds);
        assert_eq!(deserialized.max_retries, config.max_retries);
    }

    #[test]
    fn test_ai_service_config_environment_loading() {
        // Set some environment variables for testing
        std::env::set_var("AI_SERVICE_BASE_URL", "https://test.example.com");
        std::env::set_var("AI_SERVICE_API_KEY", "test-key");
        std::env::set_var("AI_SERVICE_TIMEOUT_SECONDS", "45");
        std::env::set_var("AI_SERVICE_MAX_RETRIES", "7");
        std::env::set_var("AI_SERVICE_FALLBACK_MODE", "restrictive");

        let config = AIServiceConfig::from_env().unwrap();
        assert_eq!(config.base_url, "https://test.example.com");
        assert_eq!(config.api_key, Some("test-key".to_string()));
        assert_eq!(config.timeout_seconds, 45);
        assert_eq!(config.max_retries, 7);
        assert_eq!(config.fallback_config.fallback_mode, "restrictive");

        // Clean up environment variables
        std::env::remove_var("AI_SERVICE_BASE_URL");
        std::env::remove_var("AI_SERVICE_API_KEY");
        std::env::remove_var("AI_SERVICE_TIMEOUT_SECONDS");
        std::env::remove_var("AI_SERVICE_MAX_RETRIES");
        std::env::remove_var("AI_SERVICE_FALLBACK_MODE");
    }

    #[test]
    fn test_ai_service_config_risk_scoring_config() {
        let risk_config = RiskScoringConfig::default();
        assert_eq!(risk_config.low_risk_threshold, 0.3);
        assert_eq!(risk_config.medium_risk_threshold, 0.6);
        assert_eq!(risk_config.high_risk_threshold, 0.8);
        assert_eq!(risk_config.auto_approve_threshold, 0.2);
        assert_eq!(risk_config.auto_reject_threshold, 0.9);
        assert_eq!(risk_config.manual_review_threshold_range, (0.2, 0.9));
        assert_eq!(risk_config.default_risk_score, 0.5);
        assert!(risk_config.enable_risk_based_processing);
    }

    #[test]
    fn test_ai_service_config_fallback_config() {
        let fallback_config = FallbackConfig::default();
        assert!(fallback_config.enable_fallback);
        assert_eq!(fallback_config.fallback_mode, "default_scores");
        assert!(fallback_config.use_cached_results);
        assert_eq!(fallback_config.cache_retention_seconds, 3600);
        assert!(fallback_config.log_fallback_operations);
    }
}
