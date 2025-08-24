use log::{debug, info};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
// Enable smart contracts integration now that the crate compiles
use crate::storage::StorageManager;
use crate::staking::{StakingState, StakingError};
use crate::types::{Address, BlockNumber};
use dytallix_contracts::runtime::{
    ContractCall, ContractDeployment, ContractRuntime, ExecutionResult,
};

pub mod oracle;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RuntimeState {
    pub balances: HashMap<String, u64>,
    pub contracts: HashMap<String, Vec<u8>>, // Will be deprecated in favor of contract runtime
    pub nonces: HashMap<String, u64>,
    pub total_supply: u64,
    pub last_block_number: u64,
    pub last_block_timestamp: u64,
    /// DRT token balances (separate from DGT balances)
    pub drt_balances: HashMap<String, u128>,
    /// Staking state for validators and delegations
    pub staking: StakingState,
}

impl Default for RuntimeState {
    fn default() -> Self {
        let mut balances = HashMap::new();
        balances.insert("dyt1genesis".to_string(), 1_000_000_000_000); // 1 trillion tokens

        Self {
            balances,
            contracts: HashMap::new(),
            nonces: HashMap::new(),
            total_supply: 1_000_000_000_000,
            last_block_number: 0,
            last_block_timestamp: 0,
            drt_balances: HashMap::new(),
            staking: StakingState::new(),
        }
    }
}

impl RuntimeState {
    /// Initialize runtime state with genesis configuration
    pub fn from_genesis(genesis: &crate::genesis::GenesisConfig) -> Self {
        let mut state = Self::default();
        
        // Initialize staking with genesis parameters
        state.staking.params = genesis.staking.to_staking_params();
        
        // Initialize DGT balances from genesis allocations
        for allocation in &genesis.dgt_allocations {
            state.balances.insert(allocation.address.clone(), allocation.amount as u64);
        }
        
        // Initialize genesis validators
        for validator_info in &genesis.validators {
            let _ = state.staking.register_validator(
                validator_info.address.clone(),
                validator_info.public_key.clone(),
                validator_info.commission,
            );
            
            // Self-delegate the validator's initial stake
            if validator_info.stake > 0 {
                let _ = state.staking.delegate(
                    validator_info.address.clone(),
                    validator_info.address.clone(),
                    validator_info.stake as u128,
                );
            }
        }
        
        state
    }
}

#[derive(Debug)]
pub struct DytallixRuntime {
    state: Arc<RwLock<RuntimeState>>,
    storage: Arc<StorageManager>,
    contract_runtime: Arc<ContractRuntime>,
}

impl DytallixRuntime {
    pub fn new(storage: Arc<StorageManager>) -> Result<Self, Box<dyn std::error::Error>> {
        Self::new_with_genesis(storage, None)
    }

    pub fn new_with_genesis(
        storage: Arc<StorageManager>,
        genesis: Option<&crate::genesis::GenesisConfig>,
    ) -> Result<Self, Box<dyn std::error::Error>> {
        // Initialize contract runtime with reasonable limits
        let contract_runtime = Arc<ContractRuntime>::new(ContractRuntime::new(
            10_000_000, // 10M gas limit per call
            256,        // 256 pages (16MB) memory limit
        )?);

        let initial_state = match genesis {
            Some(genesis_config) => RuntimeState::from_genesis(genesis_config),
            None => RuntimeState::default(),
        };

        Ok(Self {
            state: Arc::new(RwLock::new(initial_state)),
            storage,
            contract_runtime,
        })
    }

    pub async fn get_balance(&self, address: &str) -> Result<u64, Box<dyn std::error::Error>> {
        let state = self.state.read().await;
        Ok(state.balances.get(address).copied().unwrap_or(0))
    }

    pub async fn set_balance(
        &self,
        address: &str,
        amount: u64,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let mut state = self.state.write().await;
        state.balances.insert(address.to_string(), amount);
        debug!("Set balance for {}: {}", address, amount);
        Ok(())
    }

    pub async fn transfer(
        &self,
        from: &str,
        to: &str,
        amount: u64,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let mut state = self.state.write().await;

        let from_balance = state.balances.get(from).copied().unwrap_or(0);
        if from_balance < amount {
            return Err("Insufficient balance".into());
        }

        let to_balance = state.balances.get(to).copied().unwrap_or(0);

        state
            .balances
            .insert(from.to_string(), from_balance - amount);
        state.balances.insert(to.to_string(), to_balance + amount);

        info!("Transfer: {} -> {} amount: {}", from, to, amount);
        Ok(())
    }

    pub async fn get_nonce(&self, address: &str) -> Result<u64, Box<dyn std::error::Error>> {
        let state = self.state.read().await;
        Ok(state.nonces.get(address).copied().unwrap_or(0))
    }

    pub async fn increment_nonce(&self, address: &str) -> Result<(), Box<dyn std::error::Error>> {
        let mut state = self.state.write().await;
        let current_nonce = state.nonces.get(address).copied().unwrap_or(0);
        state.nonces.insert(address.to_string(), current_nonce + 1);
        Ok(())
    }

    pub async fn deploy_contract(
        &self,
        address: &str,
        code: Vec<u8>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        info!("Deploying contract at address: {}", address);

        // Create deployment info
        let deployment = ContractDeployment {
            address: address.to_string(),
            code: code.clone(),
            initial_state: Vec::new(),
            gas_limit: 1_000_000,                // 1M gas for deployment
            deployer: "dyt1genesis".to_string(), // TODO: Get from transaction context
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs(),
            ai_audit_score: None,
        };

        // Deploy to contract runtime
        let deployed_address = self
            .contract_runtime
            .deploy_contract(deployment)
            .await
            .map_err(|e| format!("Contract deployment failed: {}", e))?;

        // Also store in legacy state for backward compatibility
        let mut state = self.state.write().await;
        state.contracts.insert(address.to_string(), code);

        info!(
            "Contract deployed successfully at address: {}",
            deployed_address
        );
        Ok(())
    }

    pub async fn get_contract(
        &self,
        address: &str,
    ) -> Result<Option<Vec<u8>>, Box<dyn std::error::Error>> {
        let state = self.state.read().await;
        Ok(state.contracts.get(address).cloned())
    }

    pub async fn execute_contract(
        &self,
        address: &str,
        input: &[u8],
    ) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
        debug!(
            "Executing contract at {} with {} bytes input",
            address,
            input.len()
        );

        // Create contract call
        let contract_call = ContractCall {
            contract_address: address.to_string(),
            caller: "dyt1genesis".to_string(), // TODO: Get from transaction context
            method: "execute".to_string(),     // TODO: Parse method from input
            input_data: input.to_vec(),
            gas_limit: 500_000, // 500K gas for execution
            value: 0,
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs(),
        };

        // Execute contract call
        let execution_result = self
            .contract_runtime
            .call_contract(contract_call)
            .await
            .map_err(|e| format!("Contract execution failed: {}", e))?;

        if execution_result.success {
            debug!(
                "Contract execution successful, gas used: {}",
                execution_result.gas_used
            );

            // Log events if any
            for event in &execution_result.events {
                info!("Contract event: {:?}", event);
            }

            Ok(execution_result.return_data)
        } else {
            Err(format!(
                "Contract execution failed, gas used: {}",
                execution_result.gas_used
            )
            .into())
        }
    }

    /// Execute a contract call with specific method and parameters
    pub async fn call_contract_method(
        &self,
        address: &str,
        caller: &str,
        method: &str,
        input_data: &[u8],
        gas_limit: u64,
        value: u64,
    ) -> Result<ExecutionResult, Box<dyn std::error::Error>> {
        debug!(
            "Calling contract method {} at {} from {}",
            method, address, caller
        );

        let contract_call = ContractCall {
            contract_address: address.to_string(),
            caller: caller.to_string(),
            method: method.to_string(),
            input_data: input_data.to_vec(),
            gas_limit,
            value: value.into(),
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs(),
        };

        let execution_result = self
            .contract_runtime
            .call_contract(contract_call)
            .await
            .map_err(|e| format!("Contract call failed: {}", e))?;

        Ok(execution_result)
    }

    /// Get contract runtime reference for advanced operations
    pub fn get_contract_runtime(&self) -> Arc<ContractRuntime> {
        self.contract_runtime.clone()
    }

    /// Deploy a contract with full deployment configuration
    pub async fn deploy_contract_full(
        &self,
        address: &str,
        code: Vec<u8>,
        deployer: &str,
        gas_limit: u64,
        initial_state: Vec<u8>,
    ) -> Result<String, Box<dyn std::error::Error>> {
        info!(
            "Deploying contract at address: {} from deployer: {}",
            address, deployer
        );

        let deployment = ContractDeployment {
            address: address.to_string(),
            code: code.clone(),
            initial_state,
            gas_limit,
            deployer: deployer.to_string(),
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs(),
            ai_audit_score: None,
        };

        let deployed_address = self
            .contract_runtime
            .deploy_contract(deployment)
            .await
            .map_err(|e| format!("Contract deployment failed: {}", e))?;

        // Update legacy state
        let mut state = self.state.write().await;
        state.contracts.insert(address.to_string(), code);

        info!(
            "Contract deployed successfully at address: {}",
            deployed_address
        );
        Ok(deployed_address)
    }

    // Staking-related methods

    /// Register a new validator
    pub async fn register_validator(
        &self,
        address: Address,
        consensus_pubkey: Vec<u8>,
        commission_rate: u16,
    ) -> Result<(), StakingError> {
        let mut state = self.state.write().await;
        state.staking.register_validator(address, consensus_pubkey, commission_rate)
    }

    /// Delegate DGT tokens to a validator
    pub async fn delegate(
        &self,
        delegator: Address,
        validator: Address,
        amount: u128,
    ) -> Result<(), Box<dyn std::error::Error>> {
        // Check if delegator has sufficient DGT balance
        let dgt_balance = self.get_balance(&delegator).await? as u128;
        let amount_u64 = amount as u64; // Convert for balance check (assuming u64 precision is sufficient)
        
        if dgt_balance < amount_u64 {
            return Err(Box::new(StakingError::InsufficientFunds));
        }

        let mut state = self.state.write().await;
        
        // Lock DGT tokens by reducing balance
        let current_balance = state.balances.get(&delegator).copied().unwrap_or(0);
        if current_balance < amount_u64 {
            return Err(Box::new(StakingError::InsufficientFunds));
        }
        state.balances.insert(delegator.clone(), current_balance - amount_u64);

        // Create delegation
        state.staking.delegate(delegator, validator, amount)?;
        
        debug!("Delegated {} uDGT", amount);
        Ok(())
    }

    /// Get active validators
    pub async fn get_active_validators(&self) -> Vec<crate::staking::Validator> {
        let state = self.state.read().await;
        state.staking.get_active_validators().into_iter().cloned().collect()
    }

    /// Get validator info
    pub async fn get_validator(&self, address: &Address) -> Option<crate::staking::Validator> {
        let state = self.state.read().await;
        state.staking.validators.get(address).cloned()
    }

    /// Get delegation info
    pub async fn get_delegation(&self, delegator: &Address, validator: &Address) -> Option<crate::staking::Delegation> {
        let state = self.state.read().await;
        let delegation_key = format!("{}:{}", delegator, validator);
        state.staking.delegations.get(&delegation_key).cloned()
    }

    /// Calculate pending rewards for a delegation
    pub async fn calculate_pending_rewards(
        &self,
        delegator: &Address,
        validator: &Address,
    ) -> Result<u128, StakingError> {
        let state = self.state.read().await;
        state.staking.calculate_pending_rewards(delegator, validator)
    }

    /// Sync delegation rewards and return current accrued amount
    pub async fn sync_and_get_accrued_rewards(
        &self,
        delegator: &Address,
        validator: &Address,
    ) -> Result<u128, StakingError> {
        let mut state = self.state.write().await;
        let (_, total_accrued) = state.staking.sync_delegation_rewards(delegator, validator)?;
        Ok(total_accrued)
    }

    /// Get current accrued rewards without recomputation
    pub async fn get_accrued_rewards(
        &self,
        delegator: &Address,
        validator: &Address,
    ) -> Result<u128, StakingError> {
        let state = self.state.read().await;
        let delegation_key = format!("{}:{}", delegator, validator);
        let delegation = state.staking.delegations.get(&delegation_key)
            .ok_or(StakingError::DelegationNotFound)?;
        Ok(delegation.accrued_rewards)
    }

    /// Claim rewards for a delegation
    pub async fn claim_rewards(
        &self,
        delegator: &Address,
        validator: &Address,
    ) -> Result<u128, StakingError> {
        let mut state = self.state.write().await;
        let rewards = state.staking.claim_rewards(delegator, validator)?;
        
        if rewards > 0 {
            // Credit DRT tokens to delegator
            let current_drt = state.drt_balances.get(delegator).copied().unwrap_or(0);
            state.drt_balances.insert(delegator.clone(), current_drt + rewards);
            debug!("Credited {} uDRT rewards to {}", rewards, delegator);
        }
        
        Ok(rewards)
    }

    /// Process block rewards (called during block processing)
    pub async fn process_block_rewards(&self, block_height: BlockNumber) -> Result<(), StakingError> {
        let mut state = self.state.write().await;
        state.staking.process_block_rewards(block_height)
    }

    /// Get DRT balance for an address
    pub async fn get_drt_balance(&self, address: &str) -> u128 {
        let state = self.state.read().await;
        state.drt_balances.get(address).copied().unwrap_or(0)
    }

    /// Get staking statistics
    pub async fn get_staking_stats(&self) -> (u128, u32, u32) {
        let state = self.state.read().await;
        let total_stake = state.staking.total_stake;
        let total_validators = state.staking.validators.len() as u32;
        let active_validators = state.staking.get_active_validators().len() as u32;
        (total_stake, total_validators, active_validators)
    }

    /// Apply external emission to staking system (called by emission engine)
    pub async fn apply_staking_emission(&self, amount: u128) -> Result<(), StakingError> {
        let mut state = self.state.write().await;
        state.staking.apply_external_emission(amount);
        Ok(())
    }

    /// Get reward statistics for emission validation
    pub async fn get_reward_stats(&self) -> (u128, u128) {
        let state = self.state.read().await;
        state.staking.get_reward_stats()
    }

    pub async fn save_state(&self) -> Result<(), Box<dyn std::error::Error>> {
        let state = self.state.read().await;

        // Serialize and save state to storage
        let state_json = serde_json::to_string(&*state)?;
        self.storage
            .put("runtime_state".as_bytes(), state_json.as_bytes())
            .await?;

        info!("Runtime state saved to storage");
        Ok(())
    }

    pub async fn load_state(&self) -> Result<(), Box<dyn std::error::Error>> {
        match self.storage.get("runtime_state".as_bytes()).await? {
            Some(state_data) => {
                let state_json = String::from_utf8(state_data)?;
                let loaded_state: RuntimeState = serde_json::from_str(&state_json)?;

                let mut state = self.state.write().await;
                *state = loaded_state;

                info!("Runtime state loaded from storage");
                Ok(())
            }
            None => {
                info!("No previous state found, starting with fresh state");
                Ok(())
            }
        }
    }
}
