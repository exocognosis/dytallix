// Example demonstrating health check functionality

use dytallix_node::consensus::{AIOracleClient, AIServiceConfig};
use std::time::Duration;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    env_logger::init();

    println!("=== Dytallix AI Service Health Check Demo ===\n");

    // Create client with base URL
    let mut client = AIOracleClient::new(AIServiceConfig {
        base_url: "https://httpbin.org".to_string(),
        ..AIServiceConfig::default()
    });

    println!("1. Testing basic connectivity...");
    let connectivity = client.health_check().await?;
    println!("   Basic connectivity OK: {connectivity}\n");

    println!("2. Performing health check...");
    let ok = client.health_check().await?;
    println!("   Health OK: {ok}");

    println!("\n3. Testing health check with custom timeout...");
    // Use a shorter timeout for the next check
    client.set_timeout(1);
    let ok_timeout = client.health_check().await?;
    println!("   Health OK with 1s timeout: {ok_timeout}");

    println!("\n4. Periodic health checks for ~3 seconds...");
    for _ in 0..3 {
        let ok = client.health_check().await?;
        println!("   Periodic health OK: {ok}");
        tokio::time::sleep(Duration::from_secs(1)).await;
    }

    println!("\n=== Health Check Demo Complete ===");

    Ok(())
}
