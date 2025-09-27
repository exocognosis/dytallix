/*
WASM Runtime Integration

Provides a minimal WASM runtime with gas metering and deterministic execution.
This module integrates the blockchain-core WASM engine with the node's runtime
to provide contract deployment and execution capabilities.
*/

use crate::gas::GasMeter;
use anyhow::{anyhow, Result};
use dytallix_node::wasm::{host_env::HostEnv, WasmEngine};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

// Type aliases to match existing codebase
pub type Address = String;
pub type Hash = String;
pub type TxHash = String;

// Factor complex types to reduce clippy type_complexity
pub type ContractStateKey = (Address, String);
pub type ContractStateMap = HashMap<ContractStateKey, Vec<u8>>;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContractDeployment {
    pub address: Address,
    pub code_hash: Hash,
    pub code: Vec<u8>,
    pub tx_hash: TxHash,
    pub gas_used: u64,
    pub deployed_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContractExecution {
    pub contract_address: Address,
    pub method: String,
    pub args: Vec<u8>,
    pub result: Vec<u8>,
    pub gas_used: u64,
    pub tx_hash: TxHash,
    pub executed_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContractState {
    pub contract_address: Address,
    pub key: String,
    pub value: Vec<u8>,
}

/// Gas and storage limits for WASM execution
#[derive(Debug, Clone)]
pub struct WasmLimits {
    pub max_gas_per_tx: u64,
    pub max_memory_pages: u32, // 64KB per page
    pub max_storage_per_contract: u64, // bytes
    pub max_call_depth: u32,
    pub max_contract_size: u64, // bytes
}

impl Default for WasmLimits {
    fn default() -> Self {
        Self {
            max_gas_per_tx: 10_000_000,    // 10M gas
            max_memory_pages: 256,          // 16MB max memory
            max_storage_per_contract: 1024 * 1024, // 1MB storage per contract
            max_call_depth: 64,             // Max call stack depth
            max_contract_size: 512 * 1024,  // 512KB max contract size
        }
    }
}

/// Minimal WASM runtime for contract deployment and execution
#[derive(Debug)]
pub struct WasmRuntime {
    engine: WasmEngine,
    deployed_contracts: Arc<Mutex<HashMap<Address, ContractDeployment>>>,
    contract_state: Arc<Mutex<ContractStateMap>>,
    execution_history: Arc<Mutex<Vec<ContractExecution>>>,
    limits: WasmLimits,
}

impl Default for WasmRuntime {
    fn default() -> Self {
        Self::new()
    }
}

impl WasmRuntime {
    pub fn new() -> Self {
        Self::with_limits(WasmLimits::default())
    }

    pub fn with_limits(limits: WasmLimits) -> Self {
        // Updated HostEnv construction requires PQCManager from core
        let pqc = dytallix_node::crypto::PQCManager::new().expect("PQCManager");
        let host_env = HostEnv::with_pqc(Arc::new(pqc));
        let engine = WasmEngine::new_with_env(host_env);

        Self {
            engine,
            deployed_contracts: Arc::new(Mutex::new(HashMap::new())),
            contract_state: Arc::new(Mutex::new(HashMap::new())),
            execution_history: Arc::new(Mutex::new(Vec::new())),
            limits,
        }
    }

    /// Deploy a WASM contract
    pub fn deploy_contract(
        &self,
        wasm_bytes: &[u8],
        from: &str,
        gas_limit: u64,
        initial_state: Option<&[u8]>,
    ) -> Result<ContractDeployment> {
        // Enforce contract size limits
        if wasm_bytes.len() as u64 > self.limits.max_contract_size {
            return Err(anyhow!("Contract size {} exceeds limit {}", 
                wasm_bytes.len(), self.limits.max_contract_size));
        }

        // Enforce gas limits
        if gas_limit > self.limits.max_gas_per_tx {
            return Err(anyhow!("Gas limit {} exceeds maximum {}", 
                gas_limit, self.limits.max_gas_per_tx));
        }

        let mut gas_meter = GasMeter::new(gas_limit);

        // Charge gas for deployment
        gas_meter.consume(50000, "contract_deploy_base")?;
        gas_meter.consume(wasm_bytes.len() as u64, "contract_deploy_per_byte")?;

        // Validate WASM module by attempting to instantiate
        let (_store, _instance) = self
            .engine
            .instantiate_with_fuel(wasm_bytes, gas_limit)
            .map_err(|e| anyhow!("Failed to validate WASM module: {}", e))?;

        // Calculate code hash
        let mut hasher = Sha256::new();
        hasher.update(wasm_bytes);
        let code_hash = hex::encode(hasher.finalize());

        // Generate contract address from code hash and deployer
        let address = self.generate_contract_address(&code_hash, from);

        // Check if contract already exists (prevent deployment collision)
        let contracts = self.deployed_contracts.lock().unwrap();
        if contracts.contains_key(&address) {
            return Err(anyhow!("Contract already deployed at address: {}", address));
        }
        drop(contracts);

        // Generate transaction hash
        let tx_hash = self.generate_tx_hash(&address, "deploy");

        let deployment = ContractDeployment {
            address: address.clone(),
            code_hash,
            code: wasm_bytes.to_vec(),
            tx_hash,
            gas_used: gas_meter.gas_used(),
            deployed_at: SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs(),
        };

        // Store contract
        let mut contracts = self.deployed_contracts.lock().unwrap();
        contracts.insert(address.clone(), deployment.clone());

        // Initialize contract state if provided (with storage limits)
        if let Some(state_data) = initial_state {
            if state_data.len() as u64 > self.limits.max_storage_per_contract {
                return Err(anyhow!("Initial state size {} exceeds storage limit {}", 
                    state_data.len(), self.limits.max_storage_per_contract));
            }
            let mut state = self.contract_state.lock().unwrap();
            state.insert((address, "init".to_string()), state_data.to_vec());
        }

        Ok(deployment)
    }

    /// Execute a contract method
    pub fn execute_contract(
        &self,
        contract_address: &Address,
        method: &str,
        args: &[u8],
        gas_limit: u64,
    ) -> Result<ContractExecution> {
        let mut gas_meter = GasMeter::new(gas_limit);

        // Charge base execution gas
        gas_meter.consume(25000, "contract_execute_base")?;

        // Get deployed contract
        let contracts = self.deployed_contracts.lock().unwrap();
        let contract = contracts
            .get(contract_address)
            .ok_or_else(|| anyhow!("Contract not found: {}", contract_address))?;

        // Instantiate contract with fuel
        let (_store, _instance) = self
            .engine
            .instantiate_with_fuel(&contract.code, gas_limit)
            .map_err(|e| anyhow!("Failed to instantiate contract: {}", e))?;

        // Execute the method (note: current demo uses host-controlled state)
        let result = match method {
            "increment" => self.execute_increment(contract_address)?,
            "get" => self.execute_get(contract_address)?,
            _ => return Err(anyhow!("Unknown method: {}", method)),
        };

        let gas_used = gas_meter.gas_used();
        let tx_hash = self.generate_tx_hash(contract_address, method);

        let execution = ContractExecution {
            contract_address: contract_address.clone(),
            method: method.to_string(),
            args: args.to_vec(),
            result,
            gas_used,
            tx_hash,
            executed_at: SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs(),
        };

        // Store execution history
        let mut history = self.execution_history.lock().unwrap();
        history.push(execution.clone());

        Ok(execution)
    }

    /// Get contract state by key
    pub fn get_contract_state(&self, contract_address: &Address, key: &str) -> Option<Vec<u8>> {
        let state = self.contract_state.lock().unwrap();
        state
            .get(&(contract_address.clone(), key.to_string()))
            .cloned()
    }

    /// Set contract state (internal method for contract execution)
    fn set_contract_state(&self, contract_address: &Address, key: &str, value: Vec<u8>) -> Result<()> {
        // Check storage limits per contract
        let state_guard = self.contract_state.lock().unwrap();
        let current_size: u64 = state_guard
            .iter()
            .filter(|((addr, _), _)| addr == contract_address)
            .map(|(_, v)| v.len() as u64)
            .sum();
        drop(state_guard);

        if current_size + value.len() as u64 > self.limits.max_storage_per_contract {
            return Err(anyhow!("Storage limit exceeded for contract {}: current {} + new {} > limit {}", 
                contract_address, current_size, value.len(), self.limits.max_storage_per_contract));
        }

        let mut state = self.contract_state.lock().unwrap();
        state.insert((contract_address.clone(), key.to_string()), value);
        Ok(())
    }

    /// Execute increment method on counter contract
    fn execute_increment(&self, contract_address: &Address) -> Result<Vec<u8>> {
        // Get current counter value
        let current = self
            .get_contract_state(contract_address, "counter")
            .map(|v| u32::from_le_bytes(v.try_into().unwrap_or([0; 4])))
            .unwrap_or(0);

        let new_value = current + 1; // increment by 1 per call

        // Store new value (with storage limit checks)
        self.set_contract_state(
            contract_address,
            "counter",
            new_value.to_le_bytes().to_vec(),
        )?;

        // Return the new value
        Ok(new_value.to_le_bytes().to_vec())
    }

    /// Execute get method on counter contract
    fn execute_get(&self, contract_address: &Address) -> Result<Vec<u8>> {
        // Get current counter value, default to 0 if not set
        let value = self
            .get_contract_state(contract_address, "counter")
            .map(|v| u32::from_le_bytes(v.try_into().unwrap_or([0; 4])))
            .unwrap_or(0);

        Ok(value.to_le_bytes().to_vec())
    }

    /// Generate contract address from code hash and deployer
    fn generate_contract_address(&self, code_hash: &str, from: &str) -> Address {
        let mut hasher = Sha256::new();
        hasher.update(code_hash.as_bytes());
        hasher.update(from.as_bytes());
        hasher.update(b"contract");
        format!("0x{}", hex::encode(&hasher.finalize()[..20]))
    }

    /// Generate transaction hash
    fn generate_tx_hash(&self, address: &str, operation: &str) -> TxHash {
        let mut hasher = Sha256::new();
        hasher.update(address.as_bytes());
        hasher.update(operation.as_bytes());
        hasher.update(
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos()
                .to_le_bytes(),
        );
        format!("0x{}", hex::encode(&hasher.finalize()[..32]))
    }

    /// List all deployed contracts
    pub fn list_contracts(&self) -> Vec<ContractDeployment> {
        let contracts = self.deployed_contracts.lock().unwrap();
        contracts.values().cloned().collect()
    }

    /// Get contract deployment info
    pub fn get_contract(&self, address: &Address) -> Option<ContractDeployment> {
        let contracts = self.deployed_contracts.lock().unwrap();
        contracts.get(address).cloned()
    }

    /// Get execution history for a contract
    pub fn get_execution_history(
        &self,
        contract_address: Option<&Address>,
    ) -> Vec<ContractExecution> {
        let history = self.execution_history.lock().unwrap();
        match contract_address {
            Some(addr) => history
                .iter()
                .filter(|exec| &exec.contract_address == addr)
                .cloned()
                .collect(),
            None => history.clone(),
        }
    }

    /// Get current runtime limits
    pub fn get_limits(&self) -> &WasmLimits {
        &self.limits
    }

    /// Check storage usage for a contract
    pub fn get_contract_storage_usage(&self, contract_address: &Address) -> u64 {
        let state = self.contract_state.lock().unwrap();
        state
            .iter()
            .filter(|((addr, _), _)| addr == contract_address)
            .map(|(_, v)| v.len() as u64)
            .sum()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_wasm_runtime_creation() {
        let runtime = WasmRuntime::new();
        assert!(runtime.list_contracts().is_empty());
    }

    #[test]
    fn test_contract_address_generation() {
        let runtime = WasmRuntime::new();
        let addr1 = runtime.generate_contract_address("hash1", "deployer1");
        let addr2 = runtime.generate_contract_address("hash1", "deployer2");
        let addr3 = runtime.generate_contract_address("hash2", "deployer1");

        assert_ne!(addr1, addr2);
        assert_ne!(addr1, addr3);
        assert_ne!(addr2, addr3);
    }

    #[test]
    fn test_gas_limit_enforcement() {
        let limits = WasmLimits {
            max_gas_per_tx: 1000,
            ..Default::default()
        };
        let runtime = WasmRuntime::with_limits(limits);
        
        // Valid WASM bytecode (minimal)
        let wasm_bytes = vec![0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]; // WASM magic + version
        
        let result = runtime.deploy_contract(&wasm_bytes, "deployer", 2000, None);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Gas limit"));
    }

    #[test]
    fn test_contract_size_limit() {
        let limits = WasmLimits {
            max_contract_size: 100,
            ..Default::default()
        };
        let runtime = WasmRuntime::with_limits(limits);
        
        // Large contract (exceeds limit)
        let large_wasm = vec![0u8; 200];
        
        let result = runtime.deploy_contract(&large_wasm, "deployer", 1000000, None);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Contract size"));
    }

    #[test]
    fn test_storage_limit_enforcement() {
        let limits = WasmLimits {
            max_storage_per_contract: 100,
            ..Default::default()
        };
        let runtime = WasmRuntime::with_limits(limits);
        
        // Try to set storage that exceeds limit
        let result = runtime.set_contract_state("test_addr", "key", vec![0u8; 150]);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Storage limit exceeded"));
    }

    #[test]
    fn test_limits_getter() {
        let custom_limits = WasmLimits {
            max_gas_per_tx: 5000000,
            max_memory_pages: 128,
            max_storage_per_contract: 2048,
            max_call_depth: 32,
            max_contract_size: 256 * 1024,
        };
        let runtime = WasmRuntime::with_limits(custom_limits.clone());
        
        let limits = runtime.get_limits();
        assert_eq!(limits.max_gas_per_tx, 5000000);
        assert_eq!(limits.max_memory_pages, 128);
        assert_eq!(limits.max_storage_per_contract, 2048);
    }

    #[test] 
    fn test_storage_usage_tracking() {
        let runtime = WasmRuntime::new();
        let addr = "test_contract";
        
        // Initially no storage
        assert_eq!(runtime.get_contract_storage_usage(addr), 0);
        
        // Add some storage
        runtime.set_contract_state(addr, "key1", vec![1, 2, 3]).unwrap();
        runtime.set_contract_state(addr, "key2", vec![4, 5]).unwrap();
        
        // Should track total usage
        assert_eq!(runtime.get_contract_storage_usage(addr), 5); // 3 + 2 bytes
    }
}
