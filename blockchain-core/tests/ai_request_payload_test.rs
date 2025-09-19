use dytallix_node::consensus::{
    AIOracleClient, AIRequestMetadata, AIRequestPayload, AIServiceType, RequestPriority,
};
use serde_json::json;

#[tokio::test]
async fn test_ai_request_payload_demo() {
    // Create an AI Oracle client
    let client = AIOracleClient::from_base_url("https://httpbin.org".to_string()).unwrap();

    // Create a fraud detection request payload
    let transaction_data = json!({
        "transaction_id": "tx_12345",
        "from_address": "0x1234567890abcdef",
        "to_address": "0xfedcba0987654321",
        "amount": 1000.50,
        "timestamp": 1672531200,
        "gas_price": 20,
        "network": "ethereum"
    });

    let mut metadata = AIRequestMetadata::new();
    metadata.client_version = Some("1.0.0".to_string());
    metadata.request_source = Some("blockchain_consensus".to_string());
    metadata.context = Some(json!({"block_height": 1234567}));

    let mut payload = AIRequestPayload::new(AIServiceType::FraudDetection, transaction_data);
    payload.priority = RequestPriority::High;
    payload.timeout_ms = 30_000; // 30s
    payload.metadata = Some(metadata);
    payload.requester_id = "validator_node_01".to_string();
    payload.correlation_id = Some("batch_001".to_string());

    // Test serialization
    let json_str = payload.to_json().unwrap();
    println!("Request Payload JSON:\n{json_str}");

    // Verify structure
    assert!(!payload.id.is_empty());
    assert_eq!(payload.service_type, AIServiceType::FraudDetection);
    assert_eq!(payload.priority, RequestPriority::High);
    assert_eq!(payload.timeout_ms, 30_000);
    assert!(payload.metadata.is_some());

    // Prepare data map for request_ai_analysis
    let mut data = std::collections::HashMap::new();
    if let serde_json::Value::Object(map) = payload.request_data {
        for (k, v) in map {
            data.insert(k, v);
        }
    }

    // This uses placeholder backend behavior
    let result = client
        .request_ai_analysis(AIServiceType::FraudDetection, data)
        .await;
    let ok = result.is_ok();
    println!("Request attempt completed: {ok}");
}

#[test]
fn test_ai_request_payload_builder_patterns() {
    // Test different service types via constructor
    let fraud_payload = AIRequestPayload::new(AIServiceType::FraudDetection, json!({"tx": "123"}));
    assert_eq!(fraud_payload.service_type, AIServiceType::FraudDetection);

    let risk_payload = AIRequestPayload::new(AIServiceType::RiskScoring, json!({"score": 0.75}));
    assert_eq!(risk_payload.service_type, AIServiceType::RiskScoring);

    let contract_payload =
        AIRequestPayload::new(AIServiceType::ContractAnalysis, json!({"code": "0x1234"}));
    assert_eq!(
        contract_payload.service_type,
        AIServiceType::ContractAnalysis
    );

    let validation_payload =
        AIRequestPayload::new(AIServiceType::TransactionValidation, json!({"tx": "456"}));
    assert_eq!(
        validation_payload.service_type,
        AIServiceType::TransactionValidation
    );

    // Test setting options directly
    let mut full_payload = AIRequestPayload::new(
        AIServiceType::AML,
        json!({"address": "0x123", "amount": 50000}),
    );
    full_payload.priority = RequestPriority::Critical;
    full_payload.timeout_ms = 45_000; // 45 seconds
    full_payload.callback_url = Some("https://callback.example.com/webhook".to_string());

    let mut meta = AIRequestMetadata::new();
    meta.request_source = Some("compliance".to_string());
    meta.client_version = Some("2.0".to_string());
    full_payload.metadata = Some(meta);
    full_payload.requester_id = "compliance_officer".to_string();

    assert_eq!(full_payload.service_type, AIServiceType::AML);
    assert_eq!(full_payload.priority, RequestPriority::Critical);
    assert_eq!(full_payload.timeout_ms, 45_000);
    assert!(full_payload.callback_url.is_some());
    assert!(full_payload.metadata.is_some());

    println!("Full payload created successfully with current API");
}
