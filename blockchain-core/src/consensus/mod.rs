use anyhow::Result;
use reqwest::{Client, ClientBuilder};
use serde::{Deserialize, Serialize};
use std::time::Duration;
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

/// Configuration for connection pooling and keep-alive settings
#[derive(Debug, Clone)]
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
    fn test_ai_response_payload_creation() {
        let response_data = serde_json::json!({
            "risk_score": 0.85,
            "confidence": 0.92,
            "flags": ["suspicious_amount", "new_account"]
        });
        
        let response = AIResponsePayload::new(
            "req-123".to_string(),
            AIServiceType::FraudDetection,
            response_data,
            ResponseStatus::Success,
        );
        
        assert!(!response.id.is_empty());
        assert_eq!(response.request_id, "req-123");
        assert_eq!(response.service_type, AIServiceType::FraudDetection);
        assert_eq!(response.status, ResponseStatus::Success);
        assert!(response.timestamp > 0);
        assert_eq!(response.processing_time_ms, 0);
        assert!(response.metadata.is_none());
        assert!(response.error.is_none());
        assert!(response.signature.is_none());
        assert!(response.oracle_id.is_none());
    }

    #[test]
    fn test_ai_response_payload_builder_pattern() {
        let response_data = serde_json::json!({"score": 0.75});
        let metadata = AIResponseMetadata::new("model-v1.0".to_string())
            .with_confidence_score(0.90)
            .with_oracle_reputation(0.95);
        
        let response = AIResponsePayload::success(
            "req-456".to_string(),
            AIServiceType::RiskScoring,
            response_data,
        )
        .with_processing_time(150)
        .with_metadata(metadata)
        .with_oracle_id("oracle-123".to_string())
        .with_signature("sig-abc".to_string());
        
        assert_eq!(response.request_id, "req-456");
        assert_eq!(response.service_type, AIServiceType::RiskScoring);
        assert_eq!(response.status, ResponseStatus::Success);
        assert_eq!(response.processing_time_ms, 150);
        assert!(response.metadata.is_some());
        assert_eq!(response.oracle_id, Some("oracle-123".to_string()));
        assert_eq!(response.signature, Some("sig-abc".to_string()));
    }

    #[test]
    fn test_ai_response_payload_convenience_methods() {
        // Test success response
        let success_response = AIResponsePayload::success(
            "req-123".to_string(),
            AIServiceType::FraudDetection,
            serde_json::json!({"result": "clean"}),
        );
        assert_eq!(success_response.status, ResponseStatus::Success);
        assert!(success_response.is_successful());
        assert!(!success_response.is_failure());
        
        // Test failure response
        let error = AIResponseError::new(
            "VALIDATION_ERROR".to_string(),
            "Invalid input data".to_string(),
            ErrorCategory::ValidationError,
        );
        let failure_response = AIResponsePayload::failure(
            "req-456".to_string(),
            AIServiceType::ContractAnalysis,
            error,
        );
        assert_eq!(failure_response.status, ResponseStatus::Failure);
        assert!(!failure_response.is_successful());
        assert!(failure_response.is_failure());
        assert!(failure_response.error.is_some());
        assert_eq!(failure_response.error_message(), Some("Invalid input data"));
        
        // Test timeout response
        let timeout_response = AIResponsePayload::timeout(
            "req-789".to_string(),
            AIServiceType::KYC,
        );
        assert_eq!(timeout_response.status, ResponseStatus::Timeout);
        assert!(timeout_response.is_retryable());
        assert!(timeout_response.error.is_some());
    }

    #[test]
    fn test_ai_response_payload_serialization() {
        let response_data = serde_json::json!({
            "analysis": "transaction_approved",
            "risk_level": "low"
        });
        
        let metadata = AIResponseMetadata::new("model-v2.1".to_string())
            .with_confidence_score(0.88)
            .with_processing_stats(serde_json::json!({"processing_time": 120}));
        
        let response = AIResponsePayload::success(
            "req-999".to_string(),
            AIServiceType::TransactionValidation,
            response_data,
        )
        .with_processing_time(120)
        .with_metadata(metadata);
        
        // Test JSON serialization
        let json_str = response.to_json().unwrap();
        assert!(!json_str.is_empty());
        assert!(json_str.contains("\"request_id\":\"req-999\""));
        assert!(json_str.contains("\"service_type\":\"TransactionValidation\""));
        assert!(json_str.contains("\"status\":\"Success\""));
        assert!(json_str.contains("\"processing_time_ms\":120"));
        
        // Test JSON deserialization
        let deserialized = AIResponsePayload::from_json(&json_str).unwrap();
        assert_eq!(deserialized.request_id, response.request_id);
        assert_eq!(deserialized.service_type, response.service_type);
        assert_eq!(deserialized.status, response.status);
        assert_eq!(deserialized.processing_time_ms, response.processing_time_ms);
        
        // Test pretty JSON
        let pretty_json = response.to_json_pretty().unwrap();
        assert!(pretty_json.contains("{\n"));
        assert!(pretty_json.contains("\"request_id\": \"req-999\""));
    }

    #[test]
    fn test_ai_response_payload_validation() {
        let response_data = serde_json::json!({"test": "data"});
        let response = AIResponsePayload::success(
            "req-123".to_string(),
            AIServiceType::FraudDetection,
            response_data,
        );
        
        // Should validate successfully
        assert!(response.validate().is_ok());
        
        // Test with empty response ID
        let mut invalid_response = response.clone();
        invalid_response.id = "".to_string();
        let validation_result = invalid_response.validate();
        assert!(validation_result.is_err());
        assert_eq!(validation_result.err().unwrap(), "Response ID cannot be empty");
        
        // Test with empty request ID
        let mut invalid_response = response.clone();
        invalid_response.request_id = "".to_string();
        let validation_result = invalid_response.validate();
        assert!(validation_result.is_err());
        assert_eq!(validation_result.err().unwrap(), "Request ID cannot be empty");
        
        // Test failure response without error
        let mut invalid_response = response.clone();
        invalid_response.status = ResponseStatus::Failure;
        invalid_response.error = None;
        let validation_result = invalid_response.validate();
        assert!(validation_result.is_err());
        assert_eq!(validation_result.err().unwrap(), "Failure responses must include error information");
        
        // Test invalid confidence score
        let mut invalid_response = response.clone();
        let invalid_metadata = AIResponseMetadata::new("model-v1.0".to_string())
            .with_confidence_score(1.5); // Invalid score > 1.0
        invalid_response.metadata = Some(invalid_metadata);
        let validation_result = invalid_response.validate();
        assert!(validation_result.is_err());
        assert_eq!(validation_result.err().unwrap(), "Confidence score must be between 0.0 and 1.0");
    }

    #[test]
    fn test_ai_response_metadata() {
        let metadata = AIResponseMetadata::new("model-v1.2".to_string())
            .with_confidence_score(0.95)
            .with_processing_stats(serde_json::json!({"tokens": 150, "time_ms": 200}))
            .with_context(serde_json::json!({"debug": "info"}))
            .with_oracle_reputation(0.98)
            .with_correlation_id("corr-456".to_string());
        
        assert_eq!(metadata.model_version, "model-v1.2");
        assert_eq!(metadata.confidence_score, Some(0.95));
        assert!(metadata.processing_stats.is_some());
        assert!(metadata.context.is_some());
        assert_eq!(metadata.oracle_reputation, Some(0.98));
        assert_eq!(metadata.correlation_id, Some("corr-456".to_string()));
    }

    #[test]
    fn test_ai_response_error() {
        let error = AIResponseError::new(
            "RATE_LIMIT".to_string(),
            "Rate limit exceeded".to_string(),
            ErrorCategory::RateLimitError,
        )
        .with_details("Try again in 60 seconds".to_string())
        .with_retryable(true);
        
        assert_eq!(error.code, "RATE_LIMIT");
        assert_eq!(error.message, "Rate limit exceeded");
        assert_eq!(error.category, ErrorCategory::RateLimitError);
        assert!(error.retryable);
        assert_eq!(error.details, Some("Try again in 60 seconds".to_string()));
        
        // Test retryable constructor
        let retryable_error = AIResponseError::retryable(
            "NETWORK_ERROR".to_string(),
            "Connection failed".to_string(),
            ErrorCategory::NetworkError,
        );
        assert!(retryable_error.retryable);
    }

    #[test]
    fn test_response_status_display() {
        assert_eq!(ResponseStatus::Success.to_string(), "success");
        assert_eq!(ResponseStatus::Failure.to_string(), "failure");
        assert_eq!(ResponseStatus::Timeout.to_string(), "timeout");
        assert_eq!(ResponseStatus::RateLimited.to_string(), "rate-limited");
        assert_eq!(ResponseStatus::ServiceUnavailable.to_string(), "service-unavailable");
        assert_eq!(ResponseStatus::InvalidRequest.to_string(), "invalid-request");
        assert_eq!(ResponseStatus::InternalError.to_string(), "internal-error");
    }

    #[test]
    fn test_error_category_display() {
        assert_eq!(ErrorCategory::ValidationError.to_string(), "validation-error");
        assert_eq!(ErrorCategory::ProcessingError.to_string(), "processing-error");
        assert_eq!(ErrorCategory::NetworkError.to_string(), "network-error");
        assert_eq!(ErrorCategory::AuthenticationError.to_string(), "authentication-error");
        assert_eq!(ErrorCategory::RateLimitError.to_string(), "rate-limit-error");
        assert_eq!(ErrorCategory::ServiceError.to_string(), "service-error");
        assert_eq!(ErrorCategory::UnknownError.to_string(), "unknown-error");
    }

    #[test]
    fn test_response_status_helpers() {
        let success_response = AIResponsePayload::success(
            "req-123".to_string(),
            AIServiceType::FraudDetection,
            serde_json::json!({"clean": true}),
        );
        assert!(success_response.is_successful());
        assert!(!success_response.is_failure());
        assert!(!success_response.is_retryable());
        
        let timeout_response = AIResponsePayload::timeout(
            "req-456".to_string(),
            AIServiceType::RiskScoring,
        );
        assert!(!timeout_response.is_successful());
        assert!(timeout_response.is_retryable());
        
        let error = AIResponseError::retryable(
            "TEMP_ERROR".to_string(),
            "Temporary error".to_string(),
            ErrorCategory::ProcessingError,
        );
        let failure_response = AIResponsePayload::failure(
            "req-789".to_string(),
            AIServiceType::ContractAnalysis,
            error,
        );
        assert!(!failure_response.is_successful());
        assert!(failure_response.is_failure());
        assert!(failure_response.is_retryable());
    }

    #[test]
    fn test_response_payload_age_and_helpers() {
        let response = AIResponsePayload::success(
            "req-123".to_string(),
            AIServiceType::FraudDetection,
            serde_json::json!({"score": 0.1}),
        );
        
        // Age should be very small initially
        assert!(response.age_seconds() < 2);
        
        // Test response without confidence score
        assert_eq!(response.confidence_score(), None);
        
        // Test confidence score helper with a new response
        let metadata = AIResponseMetadata::new("model-v1.0".to_string())
            .with_confidence_score(0.87);
        let response_with_metadata = response.with_metadata(metadata);
        assert_eq!(response_with_metadata.confidence_score(), Some(0.87));
    }

    #[test]
    fn test_response_payload_deserialization() {
        let json_data = r#"{
            "id": "resp-123",
            "request_id": "req-456",
            "service_type": "FraudDetection",
            "response_data": {"risk_score": 0.25, "clean": true},
            "timestamp": 1633072800,
            "processing_time_ms": 250,
            "status": "Success",
            "metadata": {
                "model_version": "v2.0",
                "confidence_score": 0.95,
                "oracle_reputation": 0.98,
                "correlation_id": "corr-789"
            },
            "error": null,
            "signature": "sig-def",
            "oracle_id": "oracle-456"
        }"#;
        
        let response: AIResponsePayload = serde_json::from_str(json_data).unwrap();
        assert_eq!(response.id, "resp-123");
        assert_eq!(response.request_id, "req-456");
        assert_eq!(response.service_type, AIServiceType::FraudDetection);
        assert_eq!(response.status, ResponseStatus::Success);
        assert_eq!(response.processing_time_ms, 250);
        assert!(response.metadata.is_some());
        assert_eq!(response.signature, Some("sig-def".to_string()));
        assert_eq!(response.oracle_id, Some("oracle-456".to_string()));
        
        let metadata = response.metadata.unwrap();
        assert_eq!(metadata.model_version, "v2.0");
        assert_eq!(metadata.confidence_score, Some(0.95));
        assert_eq!(metadata.oracle_reputation, Some(0.98));
        assert_eq!(metadata.correlation_id, Some("corr-789".to_string()));
    }

    #[test]
    fn test_response_payload_with_error_deserialization() {
        let json_data = r#"{
            "id": "resp-error-123",
            "request_id": "req-error-456",
            "service_type": "RiskScoring",
            "response_data": null,
            "timestamp": 1633072800,
            "processing_time_ms": 50,
            "status": "Failure",
            "metadata": null,
            "error": {
                "code": "INVALID_INPUT",
                "message": "Required field missing",
                "details": "The 'transaction_id' field is required",
                "category": "ValidationError",
                "retryable": false
            },
            "signature": null,
            "oracle_id": "oracle-789"
        }"#;
        
        let response: AIResponsePayload = serde_json::from_str(json_data).unwrap();
        assert_eq!(response.status, ResponseStatus::Failure);
        assert!(response.error.is_some());
        assert!(!response.is_retryable());
        
        let error = response.error.unwrap();
        assert_eq!(error.code, "INVALID_INPUT");
        assert_eq!(error.message, "Required field missing");
        assert_eq!(error.category, ErrorCategory::ValidationError);
        assert!(!error.retryable);
        assert_eq!(error.details, Some("The 'transaction_id' field is required".to_string()));
    }
}
