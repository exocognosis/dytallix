// Temporary stub implementations for contract types
// This allows the blockchain-core to compile without the smart-contracts dependency

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContractRuntime {
    // Stub implementation
}

impl ContractRuntime {
    pub fn new(_gas_limit: u64, _memory_pages: u64) -> Result<Self, String> {
        Ok(Self {})
    }

    pub async fn deploy_contract(&self, _deployment: ContractDeployment) -> Result<String, String> {
        // Stub implementation - just return a mock contract ID
        Ok("mock_contract_id_".to_string() + &uuid::Uuid::new_v4().to_string())
    }

    pub async fn call_contract(&self, _call: ContractCall) -> Result<ExecutionResult, String> {
        // Stub implementation - return empty result
        Ok(ExecutionResult {
            success: true,
            return_value: vec![],
            return_data: vec![],
            gas_used: 0,
            logs: vec![],
            events: vec![],
            state_changes: HashMap::new(),
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContractDeployment {
    pub code: Vec<u8>,
    pub metadata: serde_json::Value,
    pub deployer: String,
    pub gas_limit: u64,
    pub address: String,
    pub initial_state: Vec<u8>,
    pub timestamp: u64,
    pub ai_audit_score: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContractCall {
    pub contract_id: String,
    pub function: String,
    pub args: serde_json::Value,
    pub caller: String,
    pub gas_limit: u64,
    pub contract_address: String,
    pub method: String,
    pub input_data: Vec<u8>,
    pub value: u64,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionResult {
    pub success: bool,
    pub return_value: Vec<u8>,
    pub return_data: Vec<u8>,
    pub gas_used: u64,
    pub logs: Vec<String>,
    pub events: Vec<serde_json::Value>,
    pub state_changes: HashMap<String, serde_json::Value>,
}
