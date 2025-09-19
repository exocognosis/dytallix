use anyhow::Result;
use dytallix_node::consensus::{AIOracleClient, AIRequestPayload, AIServiceType, RequestPriority};
use std::time::Duration;
use tokio::time::sleep;

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    env_logger::init();

    println!("=== Circuit Breaker Pattern Demo (compat mode) ===\n");

    // Create a client (no built-in circuit breaker in current API)

    let config = dytallix_node::consensus::AIServiceConfig {
        base_url: "http://localhost:9999".to_string(),
        timeout_seconds: 2,
        ..Default::default()
    };
    let client = AIOracleClient::new(config);

    println!("✅ Created AIOracleClient (no built-in circuit breaker)");

    // Phase 1: Make requests that will fail
    println!("🔄 Phase 1: Making failing requests...\n");

    for i in 1..=5u32 {
        println!("Making request #{i}");
        let start = std::time::Instant::now();
        let result = client.health_check().await;
        let elapsed = start.elapsed();

        match result {
            Ok(ok) => println!("   Result: {ok:?}"),
            Err(e) => println!("   Error: {e}"),
        }

        println!("   ⏱️  Time taken: {elapsed:?}");
        sleep(Duration::from_millis(200)).await;
    }

    // Phase 2: Simple AI request attempt
    println!("\n🔄 Phase 2: Testing AI request...\n");

    let mut request_payload = AIRequestPayload::new(
        AIServiceType::FraudDetection,
        serde_json::json!({
            "transaction_id": "demo_tx_123",
            "amount": 1000.0,
            "sender": "demo_sender",
            "receiver": "demo_receiver"
        }),
    );
    request_payload.priority = RequestPriority::High;

    println!("Making AI request (may fail with placeholder backend)...");
    let start = std::time::Instant::now();

    // Convert request data to HashMap<String, Value>
    let mut data = std::collections::HashMap::new();
    if let serde_json::Value::Object(map) = request_payload.request_data.clone() {
        for (k, v) in map {
            data.insert(k, v);
        }
    }

    let response = client
        .request_ai_analysis(AIServiceType::FraudDetection, data)
        .await;
    let elapsed = start.elapsed();

    println!("   ⏱️  Time taken: {elapsed:?}");
    match response {
        Ok(resp) => {
            println!("   📊 Response ID: {}", resp.response.id);
            println!("   📊 Service Type: {:?}", resp.response.service_type);
            println!("   📊 Status: {:?}", resp.response.status);
        }
        Err(e) => {
            println!("   ❌ AI request error: {e}");
        }
    }

    println!("\n=== Circuit Breaker Demo Complete (compat) ===");
    Ok(())
}
