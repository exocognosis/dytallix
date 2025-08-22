use std::time::Duration;
use tokio::time::sleep;
use tempfile::NamedTempFile;

use dytallix_explorer_indexer::{store::Store, rpc::RpcClient, models::Block};

#[tokio::test]
#[ignore] // Run with --ignored to test against live node
async fn test_integration_with_live_node() {
    let rpc_base = std::env::var("DYT_RPC_BASE")
        .unwrap_or_else(|_| "http://localhost:3030".to_string());
    
    let client = RpcClient::new(rpc_base);
    
    // Test we can get latest height
    let height = client.get_latest_height().await;
    assert!(height.is_ok(), "Failed to get latest height: {:?}", height);
    
    let height = height.unwrap();
    assert!(height > 0, "Height should be greater than 0");
    
    // Test we can get blocks
    let blocks = client.get_blocks(height).await;
    assert!(blocks.is_ok(), "Failed to get blocks: {:?}", blocks);
    
    let blocks = blocks.unwrap();
    assert!(!blocks.blocks.is_empty(), "Should have at least one block");
}

#[tokio::test] 
async fn test_indexer_with_mock_data() {
    let temp_db = NamedTempFile::new().unwrap();
    let store = Store::new(temp_db.path().to_str().unwrap()).unwrap();
    
    // Simulate indexing multiple blocks
    for height in 1..=5 {
        let block = Block {
            height,
            hash: format!("hash_{}", height),
            time: format!("2024-01-0{}T00:00:00Z", height),
            tx_count: height as u32 % 3, // 0, 1, 2, 0, 1
        };
        
        store.insert_block(&block).unwrap();
    }
    
    // Test pagination
    let blocks = store.get_blocks(3, 0).unwrap();
    assert_eq!(blocks.len(), 3);
    assert_eq!(blocks[0].height, 5); // Descending order
    assert_eq!(blocks[1].height, 4);
    assert_eq!(blocks[2].height, 3);
    
    // Test offset
    let blocks = store.get_blocks(3, 2).unwrap();
    assert_eq!(blocks.len(), 3);
    assert_eq!(blocks[0].height, 3);
    assert_eq!(blocks[1].height, 2);
    assert_eq!(blocks[2].height, 1);
}

#[tokio::test]
async fn test_api_endpoints() {
    // This test would require setting up a test server
    // For now, it's a placeholder showing the structure
    
    // In a real implementation, we would:
    // 1. Set up a test database with known data
    // 2. Start the API server on a test port
    // 3. Make HTTP requests to verify responses
    // 4. Check pagination, error handling, etc.
    
    println!("API integration test placeholder");
}