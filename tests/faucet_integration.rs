use serde_json::{json, Value};
use std::collections::HashMap;
use std::time::Duration;

/// Faucet integration test for API contract validation
/// 
/// This test validates the faucet API endpoint contract by making HTTP requests
/// and verifying response structure and field types.

#[tokio::test]
async fn test_faucet_api_contract() {
    let base_url = std::env::var("FAUCET_URL").unwrap_or_else(|_| "http://localhost:8787".to_string());
    let faucet_endpoint = format!("{}/api/faucet", base_url);
    
    // Wait for server to be ready
    wait_for_server(&base_url).await;
    
    // Test successful single token request
    test_successful_single_token_request(&faucet_endpoint).await;
    
    // Test successful dual token request  
    test_successful_dual_token_request(&faucet_endpoint).await;
    
    // Test error cases
    test_invalid_address_error(&faucet_endpoint).await;
    test_invalid_token_error(&faucet_endpoint).await;
    
    // Test rate limiting (if configured with short cooldown)
    test_rate_limiting(&faucet_endpoint).await;
}

/// Wait for the faucet server to be ready
async fn wait_for_server(base_url: &str) {
    let client = reqwest::Client::new();
    let status_endpoint = format!("{}/api/status", base_url);
    
    for attempt in 1..=30 {
        match client.get(&status_endpoint).send().await {
            Ok(response) if response.status().is_success() => {
                println!("✅ Server is ready after {} attempts", attempt);
                return;
            }
            _ => {
                if attempt == 30 {
                    panic!("❌ Server not ready after 30 attempts");
                }
                tokio::time::sleep(Duration::from_millis(1000)).await;
            }
        }
    }
}

/// Test successful single token request and validate response contract
async fn test_successful_single_token_request(endpoint: &str) {
    let client = reqwest::Client::new();
    
    let request_body = json!({
        "address": "dytallix1test123456789012345678901234567890",
        "token": "DGT"
    });
    
    let response = client
        .post(endpoint)
        .json(&request_body)
        .send()
        .await
        .expect("Failed to send faucet request");
    
    // Verify HTTP status
    assert_eq!(response.status(), 200, "Expected HTTP 200 for valid request");
    
    // Parse response body
    let body: Value = response.json().await.expect("Failed to parse JSON response");
    
    // Validate response structure
    validate_success_response_structure(&body);
    
    // Validate specific fields for single token request
    assert_eq!(body["success"], true);
    
    let dispensed = body["dispensed"].as_array().expect("dispensed should be array");
    assert_eq!(dispensed.len(), 1, "Should dispense exactly one token");
    
    let token = &dispensed[0];
    assert_eq!(token["symbol"], "DGT");
    validate_token_fields(token);
    
    // Legacy compatibility fields should be present for single token
    assert_eq!(body["ok"], true);
    assert_eq!(body["token"], "DGT");
    assert!(body["amount"].is_string());
    assert!(body["txHash"].is_string());
    
    println!("✅ Single token request contract validation passed");
}

/// Test successful dual token request and validate response contract
async fn test_successful_dual_token_request(endpoint: &str) {
    let client = reqwest::Client::new();
    
    let request_body = json!({
        "address": "dytallix1test123456789012345678901234567890",
        "tokens": ["DGT", "DRT"]
    });
    
    let response = client
        .post(endpoint)
        .json(&request_body)
        .send()
        .await
        .expect("Failed to send dual token request");
    
    assert_eq!(response.status(), 200, "Expected HTTP 200 for valid dual token request");
    
    let body: Value = response.json().await.expect("Failed to parse JSON response");
    
    // Validate response structure
    validate_success_response_structure(&body);
    
    let dispensed = body["dispensed"].as_array().expect("dispensed should be array");
    assert_eq!(dispensed.len(), 2, "Should dispense exactly two tokens");
    
    // Verify both tokens are present
    let symbols: Vec<&str> = dispensed.iter()
        .map(|token| token["symbol"].as_str().unwrap())
        .collect();
    assert!(symbols.contains(&"DGT"), "Should include DGT token");
    assert!(symbols.contains(&"DRT"), "Should include DRT token");
    
    // Validate each token
    for token in dispensed {
        validate_token_fields(token);
    }
    
    println!("✅ Dual token request contract validation passed");
}

/// Test invalid address error response
async fn test_invalid_address_error(endpoint: &str) {
    let client = reqwest::Client::new();
    
    let request_body = json!({
        "address": "invalid-address",
        "token": "DGT"
    });
    
    let response = client
        .post(endpoint)
        .json(&request_body)
        .send()
        .await
        .expect("Failed to send invalid address request");
    
    assert_eq!(response.status(), 400, "Expected HTTP 400 for invalid address");
    
    let body: Value = response.json().await.expect("Failed to parse JSON response");
    
    // Validate error response structure
    validate_error_response_structure(&body);
    assert_eq!(body["error"], "INVALID_ADDRESS");
    
    println!("✅ Invalid address error contract validation passed");
}

/// Test invalid token error response
async fn test_invalid_token_error(endpoint: &str) {
    let client = reqwest::Client::new();
    
    let request_body = json!({
        "address": "dytallix1test123456789012345678901234567890",
        "token": "INVALID"
    });
    
    let response = client
        .post(endpoint)
        .json(&request_body)
        .send()
        .await
        .expect("Failed to send invalid token request");
    
    assert_eq!(response.status(), 400, "Expected HTTP 400 for invalid token");
    
    let body: Value = response.json().await.expect("Failed to parse JSON response");
    
    validate_error_response_structure(&body);
    assert_eq!(body["error"], "INVALID_TOKEN");
    
    println!("✅ Invalid token error contract validation passed");
}

/// Test rate limiting functionality
async fn test_rate_limiting(endpoint: &str) {
    let client = reqwest::Client::new();
    
    let request_body = json!({
        "address": "dytallix1test123456789012345678901234567890",
        "token": "DGT"
    });
    
    // Make first request (should succeed or be rate limited from previous tests)
    let first_response = client
        .post(endpoint)
        .json(&request_body)
        .send()
        .await
        .expect("Failed to send first rate limit test request");
    
    // Make immediate second request (likely to be rate limited)
    let second_response = client
        .post(endpoint)
        .json(&request_body)
        .send()
        .await
        .expect("Failed to send second rate limit test request");
    
    // If second request is rate limited, validate the error response
    if second_response.status() == 429 {
        let body: Value = second_response.json().await.expect("Failed to parse rate limit response");
        validate_error_response_structure(&body);
        
        // Rate limit error should be either RATE_LIMIT_EXCEEDED or similar
        assert!(body["error"].is_string(), "Rate limit error should have error field");
        assert!(body["message"].as_str().unwrap().to_lowercase().contains("rate"), 
                "Rate limit message should mention rate limiting");
        
        println!("✅ Rate limiting contract validation passed");
    } else {
        println!("⚠️ Rate limiting not triggered (may have longer cooldown period)");
    }
}

/// Validate the structure of a successful response
fn validate_success_response_structure(body: &Value) {
    // Required fields
    assert_eq!(body["success"], true, "success field should be true");
    assert!(body["dispensed"].is_array(), "dispensed field should be array");
    assert!(body["message"].is_string(), "message field should be string");
    
    // Optional fields (should be correct type if present)
    if body.get("timestamp").is_some() {
        assert!(body["timestamp"].is_string(), "timestamp should be string if present");
    }
}

/// Validate the structure of an error response
fn validate_error_response_structure(body: &Value) {
    // Required fields for error response
    assert_eq!(body["success"], false, "success field should be false for errors");
    assert!(body["error"].is_string(), "error field should be string");
    assert!(body["message"].is_string(), "message field should be string");
    
    // Valid error codes
    let valid_errors = ["INVALID_ADDRESS", "INVALID_TOKEN", "RATE_LIMIT_EXCEEDED", "SERVER_ERROR"];
    let error_code = body["error"].as_str().unwrap();
    assert!(valid_errors.contains(&error_code), 
            "Error code '{}' should be one of: {:?}", error_code, valid_errors);
}

/// Validate individual token fields in dispensed array
fn validate_token_fields(token: &Value) {
    // Required fields
    assert!(token["symbol"].is_string(), "token symbol should be string");
    assert!(token["amount"].is_string(), "token amount should be string");
    assert!(token["txHash"].is_string(), "token txHash should be string");
    
    // Validate symbol value
    let symbol = token["symbol"].as_str().unwrap();
    assert!(["DGT", "DRT"].contains(&symbol), "Symbol should be DGT or DRT, got: {}", symbol);
    
    // Validate amount format (should be numeric string)
    let amount = token["amount"].as_str().unwrap();
    assert!(amount.parse::<f64>().is_ok(), "Amount should be numeric string, got: {}", amount);
    
    // Validate transaction hash format (should be hex string starting with 0x)
    let tx_hash = token["txHash"].as_str().unwrap();
    assert!(tx_hash.starts_with("0x"), "txHash should start with '0x', got: {}", tx_hash);
    assert_eq!(tx_hash.len(), 66, "txHash should be 66 characters (0x + 64 hex chars), got: {}", tx_hash.len());
    assert!(tx_hash[2..].chars().all(|c| c.is_ascii_hexdigit()), 
            "txHash should contain only hex digits after '0x', got: {}", tx_hash);
}

/// Additional integration tests for edge cases
#[tokio::test]
async fn test_faucet_edge_cases() {
    let base_url = std::env::var("FAUCET_URL").unwrap_or_else(|_| "http://localhost:8787".to_string());
    let faucet_endpoint = format!("{}/api/faucet", base_url);
    
    wait_for_server(&base_url).await;
    
    // Test empty request body
    test_empty_request_body(&faucet_endpoint).await;
    
    // Test malformed JSON
    test_malformed_json(&faucet_endpoint).await;
    
    // Test missing fields
    test_missing_required_fields(&faucet_endpoint).await;
}

async fn test_empty_request_body(endpoint: &str) {
    let client = reqwest::Client::new();
    
    let response = client
        .post(endpoint)
        .json(&json!({}))
        .send()
        .await
        .expect("Failed to send empty request");
    
    // Should return 400 for missing required fields
    assert_eq!(response.status(), 400);
    
    let body: Value = response.json().await.expect("Failed to parse JSON response");
    validate_error_response_structure(&body);
    
    println!("✅ Empty request body validation passed");
}

async fn test_malformed_json(endpoint: &str) {
    let client = reqwest::Client::new();
    
    let response = client
        .post(endpoint)
        .header("Content-Type", "application/json")
        .body("{ invalid json")
        .send()
        .await
        .expect("Failed to send malformed JSON");
    
    // Should return 400 for malformed JSON
    assert_eq!(response.status(), 400);
    
    println!("✅ Malformed JSON validation passed");
}

async fn test_missing_required_fields(endpoint: &str) {
    let client = reqwest::Client::new();
    
    // Test missing address
    let response = client
        .post(endpoint)
        .json(&json!({"token": "DGT"}))
        .send()
        .await
        .expect("Failed to send request with missing address");
    
    assert_eq!(response.status(), 400);
    
    // Test missing token specification
    let response = client
        .post(endpoint)
        .json(&json!({"address": "dytallix1test123456789012345678901234567890"}))
        .send()
        .await
        .expect("Failed to send request with missing token");
    
    assert_eq!(response.status(), 400);
    
    println!("✅ Missing required fields validation passed");
}