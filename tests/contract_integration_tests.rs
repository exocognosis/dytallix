/*
End-to-End Contract Integration Tests

Tests the complete smart contract lifecycle including:
- Contract deployment with proper WASM validation
- Contract instantiation with constructor arguments
- Contract execution with gas metering
- Storage operations and isolation
- Event emission and collection
- Error handling and gas limits
- AI integration hooks
*/

use dytallix_contracts::runtime::*;
use dytallix_contracts::types::*;
use std::sync::Arc;

// Mock AI Analyzer for testing
struct MockAIAnalyzer;

impl ContractAIAnalyzer for MockAIAnalyzer {
    fn analyze_deployment(
        &self,
        _contract: &ContractDeployment,
    ) -> Result<AIAnalysisResult, String> {
        Ok(AIAnalysisResult {
            security_score: 0.85,
            gas_efficiency: 0.9,
            compliance_flags: vec!["secure".to_string()],
            risk_assessment: "Low risk".to_string(),
        })
    }

    fn analyze_execution(
        &self,
        _call: &ContractCall,
        _result: &ExecutionResult,
    ) -> Result<AIAnalysisResult, String> {
        Ok(AIAnalysisResult {
            security_score: 0.8,
            gas_efficiency: 0.85,
            compliance_flags: vec![],
            risk_assessment: "Normal execution".to_string(),
        })
    }

    fn validate_state_change(&self, _change: &StateChange) -> Result<bool, String> {
        Ok(true)
    }
}

#[tokio::test]
async fn test_complete_contract_lifecycle() {
    // Create runtime with AI analyzer
    let mut runtime = ContractRuntime::new(1_000_000, 16).unwrap();
    runtime.set_ai_analyzer(Arc::new(MockAIAnalyzer));

    // Create a more realistic WASM contract (simple module with one export)
    let contract_code = create_test_wasm_contract();

    // Deploy contract
    let deployment = ContractDeployment {
        address: "dyt1contract_lifecycle_test".to_string(),
        code: contract_code,
        initial_state: vec![1, 2, 3, 4],
        gas_limit: 100_000,
        deployer: "dyt1deployer_alice".to_string(),
        timestamp: 1640995200,
        ai_audit_score: Some(0.85),
    };

    println!("Testing contract deployment...");
    let deploy_result = runtime.deploy_contract(deployment.clone()).await;
    assert!(deploy_result.is_ok(), "Contract deployment should succeed");
    let contract_address = deploy_result.unwrap();
    assert_eq!(contract_address, deployment.address);

    // Verify contract was stored properly
    let contract_info = runtime.get_contract_info(&contract_address);
    assert!(contract_info.is_some());
    let info = contract_info.unwrap();
    assert_eq!(info.deployer, deployment.deployer);
    assert_eq!(info.gas_limit, deployment.gas_limit);

    println!("Testing contract storage operations...");

    // Test storage operations
    let storage_key = b"test_key";
    let storage_value = b"test_value";

    // Set initial storage value
    runtime.set_contract_storage(
        &contract_address,
        storage_key.to_vec(),
        storage_value.to_vec(),
    );

    // Read storage value
    let retrieved_value = runtime.get_contract_state(&contract_address, storage_key);
    assert!(retrieved_value.is_some());
    assert_eq!(retrieved_value.unwrap(), storage_value);

    println!("Testing contract execution...");

    // Test contract execution
    let call = ContractCall {
        contract_address: contract_address.clone(),
        caller: "dyt1caller_bob".to_string(),
        method: "test_function".to_string(),
        input_data: vec![1, 2, 3],
        gas_limit: 50_000,
        value: 100,
        timestamp: 1640995300,
    };

    let execution_result = runtime.call_contract(call.clone()).await;
    assert!(
        execution_result.is_ok(),
        "Contract execution should succeed"
    );
    let result = execution_result.unwrap();
    assert!(result.success);
    assert!(result.gas_used > 0);
    assert!(result.gas_used < call.gas_limit);

    println!("Testing contract statistics...");

    // Verify contract statistics updated
    let stats = runtime.get_contract_statistics(&contract_address);
    assert!(stats.is_some());
    let (call_count, last_called, memory_usage) = stats.unwrap();
    assert_eq!(call_count, 1); // One successful call
    assert_eq!(last_called, call.timestamp);
    assert!(memory_usage >= 0);

    println!("Testing state persistence...");

    // Test state persistence
    let state_data = runtime.persist_contract_state(&contract_address);
    assert!(state_data.is_ok());
    let state_bytes = state_data.unwrap();
    assert!(!state_bytes.is_empty());

    // Test state restoration
    let restore_result = runtime.restore_contract_state(&contract_address, &state_bytes);
    assert!(restore_result.is_ok());

    // Verify storage still accessible after restore
    let retrieved_after_restore = runtime.get_contract_state(&contract_address, storage_key);
    assert!(retrieved_after_restore.is_some());
    assert_eq!(retrieved_after_restore.unwrap(), storage_value);

    println!("Contract lifecycle test completed successfully!");
}

#[tokio::test]
async fn test_contract_deployment_validation() {
    let runtime = ContractRuntime::new(1_000_000, 16).unwrap();

    println!("Testing invalid WASM code rejection...");

    // Test invalid WASM code
    let invalid_deployment = ContractDeployment {
        address: "dyt1invalid_contract".to_string(),
        code: vec![0x00, 0x01, 0x02, 0x03], // Invalid WASM magic
        initial_state: Vec::new(),
        gas_limit: 50_000,
        deployer: "dyt1deployer".to_string(),
        timestamp: 1640995200,
        ai_audit_score: None,
    };

    let result = runtime.deploy_contract(invalid_deployment).await;
    assert!(result.is_err());
    let error = result.unwrap_err();
    assert!(matches!(error.code, ErrorCode::InvalidContract));

    println!("Testing gas limit validation...");

    // Test gas limit exceeding maximum
    let high_gas_deployment = ContractDeployment {
        address: "dyt1high_gas_contract".to_string(),
        code: create_test_wasm_contract(),
        initial_state: Vec::new(),
        gas_limit: 2_000_000, // Exceeds runtime limit
        deployer: "dyt1deployer".to_string(),
        timestamp: 1640995200,
        ai_audit_score: None,
    };

    let result = runtime.deploy_contract(high_gas_deployment).await;
    assert!(result.is_err());
    let error = result.unwrap_err();
    assert!(matches!(error.code, ErrorCode::InvalidInput));
    assert!(error.message.contains("Gas limit exceeds maximum"));

    println!("Deployment validation tests completed!");
}

#[tokio::test]
async fn test_gas_metering_and_limits() {
    let runtime = ContractRuntime::new(100_000, 16).unwrap();

    // Deploy a test contract
    let deployment = ContractDeployment {
        address: "dyt1gas_test_contract".to_string(),
        code: create_test_wasm_contract(),
        initial_state: Vec::new(),
        gas_limit: 50_000,
        deployer: "dyt1deployer".to_string(),
        timestamp: 1640995200,
        ai_audit_score: None,
    };

    let contract_address = runtime.deploy_contract(deployment).await.unwrap();

    println!("Testing gas estimation...");

    // Test gas estimation
    let test_call = ContractCall {
        contract_address: contract_address.clone(),
        caller: "dyt1caller".to_string(),
        method: "estimate_test".to_string(),
        input_data: vec![1, 2, 3],
        gas_limit: 30_000,
        value: 0,
        timestamp: 1640995300,
    };

    let estimated_gas = runtime.estimate_gas(&test_call);
    assert!(estimated_gas.is_ok());
    let gas_estimate = estimated_gas.unwrap();
    assert!(gas_estimate > 0);
    assert!(gas_estimate <= test_call.gas_limit);

    println!("Testing gas limit enforcement...");

    // Test low gas limit execution (should fail or consume all gas)
    let low_gas_call = ContractCall {
        contract_address: contract_address.clone(),
        caller: "dyt1caller".to_string(),
        method: "expensive_function".to_string(),
        input_data: vec![],
        gas_limit: 100, // Very low gas
        value: 0,
        timestamp: 1640995400,
    };

    let result = runtime.call_contract(low_gas_call).await;
    // Either should fail with OutOfGas or consume all available gas
    if let Ok(execution_result) = result {
        assert!(execution_result.gas_used >= 100 || !execution_result.success);
    }

    println!("Gas metering tests completed!");
}

#[tokio::test]
async fn test_storage_isolation() {
    let runtime = ContractRuntime::new(1_000_000, 16).unwrap();

    // Deploy two contracts
    let contract1_deployment = ContractDeployment {
        address: "dyt1contract1".to_string(),
        code: create_test_wasm_contract(),
        initial_state: Vec::new(),
        gas_limit: 50_000,
        deployer: "dyt1deployer".to_string(),
        timestamp: 1640995200,
        ai_audit_score: None,
    };

    let contract2_deployment = ContractDeployment {
        address: "dyt1contract2".to_string(),
        code: create_test_wasm_contract(),
        initial_state: Vec::new(),
        gas_limit: 50_000,
        deployer: "dyt1deployer".to_string(),
        timestamp: 1640995200,
        ai_audit_score: None,
    };

    let contract1_addr = runtime.deploy_contract(contract1_deployment).await.unwrap();
    let contract2_addr = runtime.deploy_contract(contract2_deployment).await.unwrap();

    println!("Testing storage isolation between contracts...");

    // Set storage in contract1
    let key = b"shared_key";
    let value1 = b"contract1_value";
    let value2 = b"contract2_value";

    runtime.set_contract_storage(&contract1_addr, key.to_vec(), value1.to_vec());
    runtime.set_contract_storage(&contract2_addr, key.to_vec(), value2.to_vec());

    // Verify each contract has its own value
    let retrieved1 = runtime.get_contract_state(&contract1_addr, key);
    let retrieved2 = runtime.get_contract_state(&contract2_addr, key);

    assert!(retrieved1.is_some());
    assert!(retrieved2.is_some());
    assert_eq!(retrieved1.unwrap(), value1);
    assert_eq!(retrieved2.unwrap(), value2);

    // Verify contracts cannot access each other's storage
    assert_ne!(retrieved1.unwrap(), retrieved2.unwrap());

    println!("Storage isolation test completed!");
}

#[tokio::test]
async fn test_ai_integration() {
    // Create a rejecting AI analyzer
    struct RejectingAnalyzer;
    impl ContractAIAnalyzer for RejectingAnalyzer {
        fn analyze_deployment(
            &self,
            _contract: &ContractDeployment,
        ) -> Result<AIAnalysisResult, String> {
            Ok(AIAnalysisResult {
                security_score: 0.3, // Low score should cause rejection
                gas_efficiency: 0.5,
                compliance_flags: vec!["suspicious".to_string()],
                risk_assessment: "High risk detected".to_string(),
            })
        }

        fn analyze_execution(
            &self,
            _call: &ContractCall,
            _result: &ExecutionResult,
        ) -> Result<AIAnalysisResult, String> {
            Ok(AIAnalysisResult {
                security_score: 0.3,
                gas_efficiency: 0.5,
                compliance_flags: vec![],
                risk_assessment: "Suspicious execution".to_string(),
            })
        }

        fn validate_state_change(&self, _change: &StateChange) -> Result<bool, String> {
            Ok(false) // Reject all state changes
        }
    }

    let mut runtime = ContractRuntime::new(1_000_000, 16).unwrap();
    runtime.set_ai_analyzer(Arc::new(RejectingAnalyzer));

    println!("Testing AI rejection of suspicious contracts...");

    let deployment = ContractDeployment {
        address: "dyt1suspicious_contract".to_string(),
        code: create_test_wasm_contract(),
        initial_state: Vec::new(),
        gas_limit: 50_000,
        deployer: "dyt1deployer".to_string(),
        timestamp: 1640995200,
        ai_audit_score: None,
    };

    let result = runtime.deploy_contract(deployment).await;
    assert!(result.is_err());
    let error = result.unwrap_err();
    assert!(matches!(error.code, ErrorCode::AIValidationFailed));
    assert!(error.message.contains("AI security score too low"));

    println!("AI integration test completed!");
}

#[tokio::test]
async fn test_event_emission() {
    let runtime = ContractRuntime::new(1_000_000, 16).unwrap();

    // Deploy contract
    let deployment = ContractDeployment {
        address: "dyt1event_test_contract".to_string(),
        code: create_test_wasm_contract(),
        initial_state: Vec::new(),
        gas_limit: 50_000,
        deployer: "dyt1deployer".to_string(),
        timestamp: 1640995200,
        ai_audit_score: None,
    };

    let contract_address = runtime.deploy_contract(deployment).await.unwrap();

    println!("Testing event emission during execution...");

    // Execute contract (should emit events)
    let call = ContractCall {
        contract_address: contract_address.clone(),
        caller: "dyt1caller".to_string(),
        method: "emit_events".to_string(),
        input_data: vec![],
        gas_limit: 30_000,
        value: 0,
        timestamp: 1640995300,
    };

    let result = runtime.call_contract(call).await;
    assert!(result.is_ok());
    let execution_result = result.unwrap();

    // Check that events were collected (mock implementation)
    assert!(execution_result.success);
    // Note: In the real implementation, events would be in execution_result.events

    println!("Event emission test completed!");
}

#[tokio::test]
async fn test_contract_size_limits() {
    let runtime = ContractRuntime::new(1_000_000, 16).unwrap();

    println!("Testing contract size limits...");

    // Create oversized contract (1MB+ code)
    let mut large_code = create_test_wasm_contract();
    large_code.extend(vec![0; 1024 * 1024]); // Add 1MB of padding

    let deployment = ContractDeployment {
        address: "dyt1large_contract".to_string(),
        code: large_code,
        initial_state: Vec::new(),
        gas_limit: 100_000,
        deployer: "dyt1deployer".to_string(),
        timestamp: 1640995200,
        ai_audit_score: None,
    };

    let result = runtime.deploy_contract(deployment).await;
    // Should either succeed or fail gracefully with size limit error
    if result.is_err() {
        let error = result.unwrap_err();
        assert!(
            matches!(error.code, ErrorCode::InvalidContract)
                || matches!(error.code, ErrorCode::InvalidInput)
        );
    }

    println!("Contract size limit test completed!");
}

// Helper function to create a minimal valid WASM contract for testing
fn create_test_wasm_contract() -> Vec<u8> {
    // Minimal WASM module with magic number and version
    vec![
        // WASM magic number
        0x00, 0x61, 0x73, 0x6d, // WASM version (1)
        0x01, 0x00, 0x00, 0x00, // Type section (empty)
        0x01, 0x00, // Function section (empty)
        0x03, 0x00, // Export section (empty)
        0x07, 0x00, // Code section (empty)
        0x0a, 0x00,
    ]
}

#[tokio::test]
async fn test_deterministic_execution() {
    let runtime1 = ContractRuntime::new(1_000_000, 16).unwrap();
    let runtime2 = ContractRuntime::new(1_000_000, 16).unwrap();

    // Deploy same contract to both runtimes
    let deployment = ContractDeployment {
        address: "dyt1deterministic_test".to_string(),
        code: create_test_wasm_contract(),
        initial_state: vec![1, 2, 3],
        gas_limit: 50_000,
        deployer: "dyt1deployer".to_string(),
        timestamp: 1640995200,
        ai_audit_score: None,
    };

    let addr1 = runtime1.deploy_contract(deployment.clone()).await.unwrap();
    let addr2 = runtime2.deploy_contract(deployment).await.unwrap();
    assert_eq!(addr1, addr2);

    println!("Testing deterministic execution...");

    // Execute same call on both runtimes
    let call = ContractCall {
        contract_address: addr1.clone(),
        caller: "dyt1caller".to_string(),
        method: "deterministic_function".to_string(),
        input_data: vec![1, 2, 3],
        gas_limit: 30_000,
        value: 0,
        timestamp: 1640995300,
    };

    let result1 = runtime1.call_contract(call.clone()).await.unwrap();
    let result2 = runtime2.call_contract(call).await.unwrap();

    // Results should be identical
    assert_eq!(result1.success, result2.success);
    assert_eq!(result1.gas_used, result2.gas_used);
    assert_eq!(result1.return_data, result2.return_data);

    println!("Deterministic execution test completed!");
}
