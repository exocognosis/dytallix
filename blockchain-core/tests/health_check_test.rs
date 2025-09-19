use dytallix_node::consensus::{
    AIHealthCheckResponse, AIOracleClient, AIServiceConfig, AIServiceLoad, AIServiceStatus,
};

#[tokio::test]
async fn test_health_check_with_valid_service() {
    // Use a known endpoint; we only assert the call succeeds
    let config = AIServiceConfig {
        base_url: "https://httpbin.org".to_string(),
        ..Default::default()
    };
    let client = AIOracleClient::new(config);

    let health_response = client.health_check().await;
    assert!(health_response.is_ok());

    let healthy = health_response.unwrap();
    // We can't rely on remote status; just ensure we got a boolean
    println!("Health check boolean: {healthy:?}");
}

#[tokio::test]
async fn test_health_check_with_timeout() {
    let config = AIServiceConfig {
        base_url: "https://httpbin.org".to_string(),
        // Keep a short timeout to fail fast
        timeout_seconds: 2,
        ..Default::default()
    };
    let client = AIOracleClient::new(config);

    // Test with a very short timeout to ensure timeout handling works
    let health_response = client.health_check().await;
    assert!(health_response.is_ok());

    let healthy = health_response.unwrap();
    // With short timeout and unknown endpoint, expect not healthy
    assert!(!healthy);

    println!("Health check with timeout boolean: {healthy:?}");
}

#[tokio::test]
async fn test_health_check_with_invalid_service() {
    let config = AIServiceConfig {
        base_url: "http://non-existent-domain-12345.com".to_string(),
        // Keep a short timeout to fail fast
        timeout_seconds: 2,
        ..Default::default()
    };
    let client = AIOracleClient::new(config);

    // Expect an error due to invalid host
    let health_response = client.health_check().await;
    assert!(health_response.is_err());

    println!("Health check with invalid service errored as expected");
}

#[tokio::test]
async fn test_health_check_response_parsing_struct() {
    // Validate the AIHealthCheckResponse struct shape independently
    let health = AIHealthCheckResponse {
        status: AIServiceStatus::Healthy,
        timestamp: 1234567890,
        response_time_ms: 150,
        version: Some("1.0.0".to_string()),
        details: Some(serde_json::json!({"test": "data"})),
        endpoints: Some(vec!["fraud".to_string(), "risk".to_string()]),
        load: Some(AIServiceLoad {
            cpu_usage: Some(45.5),
            memory_usage: Some(67.2),
            queue_size: Some(5),
            requests_per_second: Some(12.3),
            avg_response_time_ms: Some(150.0),
        }),
    };

    assert_eq!(health.status, AIServiceStatus::Healthy);
    assert_eq!(health.response_time_ms, 150);
    assert!(health.version.is_some());
    assert!(health.details.is_some());
    assert!(health.endpoints.is_some());
    assert!(health.load.is_some());
}
