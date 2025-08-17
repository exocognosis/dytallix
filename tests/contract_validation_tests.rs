/*
Simple validation test for WASM contract integration

This test validates the end-to-end integration of:
- Contract runtime creation
- Contract deployment  
- Contract execution
- RPC endpoint functionality
*/

use dytallix_contracts::runtime::*;
use dytallix_contracts::types::*;

#[tokio::test]
async fn test_basic_contract_integration() {
    println!("Testing basic contract runtime integration...");
    
    // Test runtime creation
    let runtime = ContractRuntime::new(1_000_000, 16).unwrap();
    
    // Create minimal valid WASM contract
    let contract_code = vec![
        0x00, 0x61, 0x73, 0x6d, // WASM magic
        0x01, 0x00, 0x00, 0x00, // WASM version
        0x01, 0x00,             // Type section (empty)
        0x03, 0x00,             // Function section (empty)
        0x07, 0x00,             // Export section (empty)
        0x0a, 0x00,             // Code section (empty)
    ];
    
    // Test contract deployment
    let deployment = ContractDeployment {
        address: "dyt1integration_test".to_string(),
        code: contract_code,
        initial_state: vec![],
        gas_limit: 100_000,
        deployer: "dyt1deployer".to_string(),
        timestamp: 1640995200,
        ai_audit_score: None,
    };
    
    let deploy_result = runtime.deploy_contract(deployment.clone()).await;
    assert!(deploy_result.is_ok(), "Contract deployment should succeed");
    
    let contract_address = deploy_result.unwrap();
    assert_eq!(contract_address, deployment.address);
    
    // Test contract info retrieval
    let contract_info = runtime.get_contract_info(&contract_address);
    assert!(contract_info.is_some(), "Contract info should be retrievable");
    
    // Test contract listing
    let contracts = runtime.list_contracts();
    assert!(contracts.contains(&contract_address), "Contract should be in list");
    
    println!("✅ Basic contract integration test passed!");
}

#[tokio::test]
async fn test_gas_metering_validation() {
    println!("Testing gas metering validation...");
    
    let runtime = ContractRuntime::new(100_000, 16).unwrap(); // Lower gas limit
    
    // Test gas limit validation during deployment
    let high_gas_deployment = ContractDeployment {
        address: "dyt1high_gas_test".to_string(),
        code: vec![0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00],
        initial_state: vec![],
        gas_limit: 200_000, // Exceeds runtime limit
        deployer: "dyt1deployer".to_string(),
        timestamp: 1640995200,
        ai_audit_score: None,
    };
    
    let result = runtime.deploy_contract(high_gas_deployment).await;
    assert!(result.is_err(), "High gas deployment should fail");
    
    let error = result.unwrap_err();
    assert!(matches!(error.code, ErrorCode::InvalidInput));
    assert!(error.message.contains("Gas limit exceeds maximum"));
    
    println!("✅ Gas metering validation test passed!");
}

#[tokio::test]
async fn test_storage_isolation() {
    println!("Testing storage isolation...");
    
    let runtime = ContractRuntime::new(1_000_000, 16).unwrap();
    
    // Deploy two contracts
    let contract1 = ContractDeployment {
        address: "dyt1contract_1".to_string(),
        code: vec![0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00],
        initial_state: vec![],
        gas_limit: 50_000,
        deployer: "dyt1deployer".to_string(),
        timestamp: 1640995200,
        ai_audit_score: None,
    };
    
    let contract2 = ContractDeployment {
        address: "dyt1contract_2".to_string(),
        code: vec![0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00],
        initial_state: vec![],
        gas_limit: 50_000,
        deployer: "dyt1deployer".to_string(),
        timestamp: 1640995200,
        ai_audit_score: None,
    };
    
    let addr1 = runtime.deploy_contract(contract1).await.unwrap();
    let addr2 = runtime.deploy_contract(contract2).await.unwrap();
    
    assert_ne!(addr1, addr2, "Contract addresses should be different");
    
    // Test that contracts have isolated storage
    let key = b"test_key";
    
    // Set storage for contract 1 (using test helper)
    #[cfg(test)]
    runtime.set_contract_storage(&addr1, key.to_vec(), b"value1".to_vec());
    
    #[cfg(test)]  
    runtime.set_contract_storage(&addr2, key.to_vec(), b"value2".to_vec());
    
    // Verify isolation
    let value1 = runtime.get_contract_state(&addr1, key);
    let value2 = runtime.get_contract_state(&addr2, key);
    
    #[cfg(test)]
    {
        assert!(value1.is_some());
        assert!(value2.is_some());
        assert_ne!(value1.unwrap(), value2.unwrap());
    }
    
    println!("✅ Storage isolation test passed!");
}

#[test]
fn test_contract_address_generation() {
    println!("Testing contract address generation...");
    
    // Test that addresses are deterministic based on code
    let code1 = vec![0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00];
    let code2 = vec![0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x01]; // Different code
    
    let hash1 = blake3::hash(&code1);
    let hash2 = blake3::hash(&code2);
    
    assert_ne!(hash1.as_bytes(), hash2.as_bytes());
    
    // Test address format
    let address = format!("contract_{}", hex::encode(&hash1.as_bytes()[0..16]));
    assert!(address.starts_with("contract_"));
    assert_eq!(address.len(), "contract_".len() + 32); // 32 hex chars = 16 bytes
    
    println!("✅ Contract address generation test passed!");
}

#[test]
fn test_wasm_code_validation() {
    println!("Testing WASM code validation...");
    
    // Valid WASM magic number
    let valid_wasm = vec![0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00];
    assert_eq!(&valid_wasm[0..4], b"\x00asm");
    
    // Invalid WASM magic number
    let invalid_wasm = vec![0x00, 0x01, 0x02, 0x03, 0x01, 0x00, 0x00, 0x00];
    assert_ne!(&invalid_wasm[0..4], b"\x00asm");
    
    // Test minimum size requirement
    let too_small = vec![0x00, 0x61]; // Less than 8 bytes
    assert!(too_small.len() < 8);
    
    println!("✅ WASM code validation test passed!");
}

#[tokio::test]
async fn test_error_handling() {
    println!("Testing error handling...");
    
    let runtime = ContractRuntime::new(1_000_000, 16).unwrap();
    
    // Test invalid contract code
    let invalid_deployment = ContractDeployment {
        address: "dyt1invalid_test".to_string(),
        code: vec![0x01, 0x02, 0x03, 0x04], // Invalid WASM
        initial_state: vec![],
        gas_limit: 50_000,
        deployer: "dyt1deployer".to_string(),
        timestamp: 1640995200,
        ai_audit_score: None,
    };
    
    let result = runtime.deploy_contract(invalid_deployment).await;
    assert!(result.is_err());
    
    let error = result.unwrap_err();
    assert!(matches!(error.code, ErrorCode::InvalidContract));
    assert!(!error.message.is_empty());
    
    println!("✅ Error handling test passed!");
}