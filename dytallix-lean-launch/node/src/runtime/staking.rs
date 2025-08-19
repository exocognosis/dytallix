// Validator set staking and reward distribution for Dytallix Lean Launch
// Implements Prompt 14 specifications with explicit constants, policies, and error codes

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::env;

/// Token unit conversion constants
pub const DRT_TO_UDRT: u128 = 1_000_000_000; // 1 DRT = 1e9 uDRT
pub const DGT_TO_UDGT: u128 = 1_000_000; // 1 DGT = 1e6 uDGT

/// Configuration constants with environment variable overrides
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StakingConfig {
    /// Maximum number of active validators
    pub max_validators: u32,
    /// Per-block reward emission in uDRT
    pub r_block_drt: u128,
    /// Minimum self-bond required for validator activation in uDGT
    pub min_self_bond_dgt: u128,
}

impl Default for StakingConfig {
    fn default() -> Self {
        Self {
            max_validators: env::var("DLX_MAX_VALIDATORS")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(50),
            r_block_drt: env::var("DLX_R_BLOCK_DRT")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(10_000),
            min_self_bond_dgt: env::var("DLX_MIN_SELF_BOND_DGT")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(1_000_000),
        }
    }
}

/// Validator status in the staking system
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum ValidatorStatus {
    Unregistered,
    Registered,
    Active,
}

/// Validator information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Validator {
    /// Validator operator address
    pub operator_address: String,
    /// Consensus public key
    pub consensus_pubkey: Vec<u8>,
    /// Commission rate in basis points (0-10_000)
    pub commission_bps: u16,
    /// Amount of self-bonded DGT in uDGT
    pub self_bonded_udgt: u128,
    /// Total delegated amount excluding self-bond in uDGT
    pub total_delegated_udgt: u128,
    /// Current validator status
    pub status: ValidatorStatus,
    /// Accumulated rewards in uDRT
    pub accumulated_rewards_udrt: u128,
    /// Optional metadata/details
    pub metadata: Option<String>,
    /// Block height when validator was created
    pub created_height: u64,
}

impl Validator {
    /// Get total stake (self-bonded + delegated)
    pub fn total_stake(&self) -> u128 {
        self.self_bonded_udgt + self.total_delegated_udgt
    }
}

/// Delegation record
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Delegation {
    /// Delegator address
    pub delegator_address: String,
    /// Validator operator address
    pub validator_operator_address: String,
    /// Delegation amount in uDGT
    pub amount_udgt: u128,
    /// Nonce for anti-replay protection
    pub nonce: u64,
}

/// Staking error codes with HTTP mapping
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum StakingError {
    /// STK_001: Insufficient balance
    InsufficientBalance,
    /// STK_002: Invalid amount
    InvalidAmount,
    /// STK_003: Nonce mismatch
    NonceMismatch,
    /// STK_004: Invalid denomination
    InvalidDenom,
    /// STK_005: Already delegated
    AlreadyDelegated,
    /// VLD_001: Validator not registered
    NotRegistered,
    /// VLD_002: Validator already registered
    AlreadyRegistered,
    /// VLD_003: Below minimum self bond
    BelowMinSelfBond,
    /// VLD_004: Maximum validators reached
    MaxValidatorsReached,
}

impl StakingError {
    /// Get the error code string
    pub fn code(&self) -> &'static str {
        match self {
            StakingError::InsufficientBalance => "STK_001",
            StakingError::InvalidAmount => "STK_002",
            StakingError::NonceMismatch => "STK_003",
            StakingError::InvalidDenom => "STK_004",
            StakingError::AlreadyDelegated => "STK_005",
            StakingError::NotRegistered => "VLD_001",
            StakingError::AlreadyRegistered => "VLD_002",
            StakingError::BelowMinSelfBond => "VLD_003",
            StakingError::MaxValidatorsReached => "VLD_004",
        }
    }

    /// Get HTTP status code for error
    pub fn http_status(&self) -> u16 {
        match self {
            StakingError::AlreadyDelegated => 409,
            StakingError::AlreadyRegistered => 409,
            StakingError::MaxValidatorsReached => 409,
            _ => 422, // Unprocessable Entity for validation errors
        }
    }
}

impl std::fmt::Display for StakingError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let msg = match self {
            StakingError::InsufficientBalance => "Insufficient balance",
            StakingError::InvalidAmount => "Invalid amount",
            StakingError::NonceMismatch => "Nonce mismatch",
            StakingError::InvalidDenom => "Invalid denomination",
            StakingError::AlreadyDelegated => "Already delegated",
            StakingError::NotRegistered => "Validator not registered",
            StakingError::AlreadyRegistered => "Validator already registered",
            StakingError::BelowMinSelfBond => "Below minimum self bond",
            StakingError::MaxValidatorsReached => "Maximum validators reached",
        };
        write!(f, "{}: {}", self.code(), msg)
    }
}

impl std::error::Error for StakingError {}

/// Message for registering a validator
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MsgRegisterValidator {
    pub operator: String,
    pub consensus_pk: Vec<u8>,
    pub commission_bps: u16,
    pub details: Option<String>,
}

/// Message for delegating tokens
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MsgDelegate {
    pub delegator: String,
    pub validator: String,
    pub amount: u128,
    pub denom: String,
    pub nonce: u64,
}

/// Message for undelegating tokens (placeholder)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MsgUndelegate {
    pub delegator: String,
    pub validator: String,
    pub amount: u128,
    pub nonce: u64,
}

/// Message for withdrawing validator rewards
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MsgWithdrawValidatorRewards {
    pub validator: String,
}

/// Main staking state manager
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StakingState {
    /// Configuration parameters
    pub config: StakingConfig,
    /// All validators by operator address
    pub validators: HashMap<String, Validator>,
    /// All delegations by key "delegator:validator"
    pub delegations: HashMap<String, Delegation>,
    /// Current block height
    pub current_height: u64,
    /// Total stake across all validators
    pub total_stake: u128,
}

impl Default for StakingState {
    fn default() -> Self {
        Self {
            config: StakingConfig::default(),
            validators: HashMap::new(),
            delegations: HashMap::new(),
            current_height: 0,
            total_stake: 0,
        }
    }
}

impl StakingState {
    /// Create new staking state with configuration
    pub fn new() -> Self {
        Self::default()
    }

    /// Create staking state with custom config
    pub fn with_config(config: StakingConfig) -> Self {
        Self {
            config,
            validators: HashMap::new(),
            delegations: HashMap::new(),
            current_height: 0,
            total_stake: 0,
        }
    }

    /// Register a new validator
    pub fn register_validator(&mut self, msg: MsgRegisterValidator) -> Result<(), StakingError> {
        // Check if validator already exists
        if self.validators.contains_key(&msg.operator) {
            return Err(StakingError::AlreadyRegistered);
        }

        // Validate commission rate bounds
        if msg.commission_bps > 10_000 {
            return Err(StakingError::InvalidAmount);
        }

        // Create validator in Registered state
        let validator = Validator {
            operator_address: msg.operator.clone(),
            consensus_pubkey: msg.consensus_pk,
            commission_bps: msg.commission_bps,
            self_bonded_udgt: 0,
            total_delegated_udgt: 0,
            status: ValidatorStatus::Registered,
            accumulated_rewards_udrt: 0,
            metadata: msg.details,
            created_height: self.current_height,
        };

        self.validators.insert(msg.operator, validator);
        Ok(())
    }

    /// Delegate tokens to a validator
    pub fn delegate(&mut self, msg: MsgDelegate) -> Result<(), StakingError> {
        // Validate denomination
        if msg.denom != "uDGT" {
            return Err(StakingError::InvalidDenom);
        }

        // Validate amount
        if msg.amount == 0 {
            return Err(StakingError::InvalidAmount);
        }

        // Check if validator exists
        let validator = self.validators.get_mut(&msg.validator)
            .ok_or(StakingError::NotRegistered)?;

        // Check for existing delegation
        let delegation_key = format!("{}:{}", msg.delegator, msg.validator);
        if self.delegations.contains_key(&delegation_key) {
            return Err(StakingError::AlreadyDelegated);
        }

        // TODO: Check delegator has sufficient balance (requires balance system integration)

        // Create delegation
        let delegation = Delegation {
            delegator_address: msg.delegator.clone(),
            validator_operator_address: msg.validator.clone(),
            amount_udgt: msg.amount,
            nonce: msg.nonce,
        };

        // Update validator stake
        if msg.delegator == msg.validator {
            // Self-delegation
            validator.self_bonded_udgt += msg.amount;
        } else {
            // External delegation
            validator.total_delegated_udgt += msg.amount;
        }

        // Update total stake
        self.total_stake += msg.amount;

        // Store delegation
        self.delegations.insert(delegation_key, delegation);

        // Check if validator should be activated
        self.try_activate_validator(&msg.validator)?;

        Ok(())
    }

    /// Try to activate a validator if conditions are met
    fn try_activate_validator(&mut self, operator: &str) -> Result<(), StakingError> {
        // Check conditions before borrowing mutably
        let should_activate = {
            let validator = self.validators.get(operator)
                .ok_or(StakingError::NotRegistered)?;
            
            validator.status == ValidatorStatus::Registered 
                && validator.self_bonded_udgt >= self.config.min_self_bond_dgt
        };

        if should_activate {
            // Check active validator count
            let active_count = self.get_active_validators().len() as u32;
            
            if active_count < self.config.max_validators {
                let validator = self.validators.get_mut(operator).unwrap();
                validator.status = ValidatorStatus::Active;
            } else {
                // Check if this validator should displace an existing active validator
                self.enforce_active_set_limit()?;
            }
        }

        Ok(())
    }

    /// Enforce active validator set limit by weight
    fn enforce_active_set_limit(&mut self) -> Result<(), StakingError> {
        let validators_by_stake: Vec<(String, u128, ValidatorStatus)> = self.validators
            .iter()
            .filter(|(_, v)| v.status == ValidatorStatus::Active || 
                           (v.status == ValidatorStatus::Registered && 
                            v.self_bonded_udgt >= self.config.min_self_bond_dgt))
            .map(|(addr, val)| (addr.clone(), val.total_stake(), val.status.clone()))
            .collect();

        let mut sorted_validators = validators_by_stake;
        // Sort by total stake descending, then by operator address ascending (lexicographic tie-breaker)
        sorted_validators.sort_by(|(addr_a, stake_a, _), (addr_b, stake_b, _)| {
            if stake_a != stake_b {
                stake_b.cmp(stake_a) // Descending by stake
            } else {
                addr_a.cmp(addr_b) // Ascending by address for tie-breaker
            }
        });

        // Update validator statuses
        for (i, (operator, _, _current_status)) in sorted_validators.iter().enumerate() {
            let validator = self.validators.get_mut(operator).unwrap();
            
            if i < self.config.max_validators as usize {
                // Should be active
                if validator.status != ValidatorStatus::Active 
                    && validator.self_bonded_udgt >= self.config.min_self_bond_dgt {
                    validator.status = ValidatorStatus::Active;
                }
            } else {
                // Should not be active
                if validator.status == ValidatorStatus::Active {
                    validator.status = ValidatorStatus::Registered;
                }
            }
        }

        Ok(())
    }

    /// Get current active validators
    pub fn get_active_validators(&self) -> Vec<&Validator> {
        self.validators.values()
            .filter(|v| v.status == ValidatorStatus::Active)
            .collect()
    }

    /// Get active validators ordered by stake (for consensus)
    pub fn get_active_validators_ordered(&self) -> Vec<&Validator> {
        let mut active: Vec<&Validator> = self.get_active_validators();
        
        // Sort by total stake descending, then by operator address ascending
        active.sort_by(|a, b| {
            let stake_a = a.total_stake();
            let stake_b = b.total_stake();
            
            if stake_a != stake_b {
                stake_b.cmp(&stake_a) // Descending by stake
            } else {
                a.operator_address.cmp(&b.operator_address) // Ascending by address
            }
        });
        
        active
    }

    /// Distribute per-block rewards to active validators
    pub fn distribute_block_rewards(&mut self, block_height: u64) -> Result<(), StakingError> {
        self.current_height = block_height;
        
        let active_validators = self.get_active_validators();
        if active_validators.is_empty() {
            return Ok(()); // No active validators, no rewards to distribute
        }

        // Calculate total active stake
        let total_active_stake: u128 = active_validators.iter()
            .map(|v| v.total_stake())
            .sum();

        if total_active_stake == 0 {
            return Ok(()); // No stake, no rewards
        }

        // Calculate proportional rewards using integer math
        let weights: Vec<u128> = active_validators.iter()
            .map(|v| v.total_stake())
            .collect();

        let rewards = proportional_split(self.config.r_block_drt, &weights);

        // Create a list of (operator_address, reward) pairs to avoid borrowing issues
        let validator_rewards: Vec<(String, u128)> = active_validators.iter()
            .zip(rewards.iter())
            .map(|(validator, reward)| (validator.operator_address.clone(), *reward))
            .collect();

        // Distribute rewards
        for (operator_address, reward) in validator_rewards {
            if let Some(val) = self.validators.get_mut(&operator_address) {
                val.accumulated_rewards_udrt += reward;
            }
        }

        Ok(())
    }

    /// Withdraw validator rewards
    pub fn withdraw_validator_rewards(&mut self, msg: MsgWithdrawValidatorRewards) -> Result<u128, StakingError> {
        let validator = self.validators.get_mut(&msg.validator)
            .ok_or(StakingError::NotRegistered)?;

        let rewards = validator.accumulated_rewards_udrt;
        validator.accumulated_rewards_udrt = 0;

        // TODO: Actually credit DRT tokens to validator account
        // This requires integration with the token/balance system

        Ok(rewards)
    }

    /// Placeholder for undelegation (future implementation)
    pub fn undelegate(&mut self, _msg: MsgUndelegate) -> Result<(), StakingError> {
        // TODO: Implement undelegation with unbonding period
        // For now, return error to indicate not implemented
        Err(StakingError::InvalidAmount) // Using InvalidAmount as placeholder
    }
}

/// Utility function for proportional distribution with integer math
pub fn proportional_split(total: u128, weights: &[u128]) -> Vec<u128> {
    if weights.is_empty() {
        return vec![];
    }

    let total_weight: u128 = weights.iter().sum();
    if total_weight == 0 {
        return vec![0; weights.len()];
    }

    let mut rewards = Vec::with_capacity(weights.len());
    let mut distributed = 0u128;

    // Calculate proportional rewards
    for weight in weights {
        let reward = (total * weight) / total_weight;
        rewards.push(reward);
        distributed += reward;
    }

    // Distribute remainder deterministically
    let remainder = total.saturating_sub(distributed);
    if remainder > 0 {
        // For deterministic remainder distribution, we need operator addresses
        // For now, distribute to validators in order until remainder is exhausted
        for i in 0..remainder.min(rewards.len() as u128) as usize {
            rewards[i] += 1;
        }
    }

    rewards
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_staking_config_defaults() {
        let config = StakingConfig::default();
        assert_eq!(config.max_validators, 50);
        assert_eq!(config.r_block_drt, 10_000);
        assert_eq!(config.min_self_bond_dgt, 1_000_000);
    }

    #[test]
    fn test_validator_registration() {
        let mut state = StakingState::new();
        
        let msg = MsgRegisterValidator {
            operator: "validator1".to_string(),
            consensus_pk: vec![1, 2, 3, 4],
            commission_bps: 500,
            details: Some("Test validator".to_string()),
        };

        let result = state.register_validator(msg);
        assert!(result.is_ok());
        
        let validator = state.validators.get("validator1").unwrap();
        assert_eq!(validator.status, ValidatorStatus::Registered);
        assert_eq!(validator.commission_bps, 500);
        assert_eq!(validator.metadata, Some("Test validator".to_string()));
    }

    #[test]
    fn test_duplicate_registration_fails() {
        let mut state = StakingState::new();
        
        let msg = MsgRegisterValidator {
            operator: "validator1".to_string(),
            consensus_pk: vec![1, 2, 3, 4],
            commission_bps: 500,
            details: None,
        };

        state.register_validator(msg.clone()).unwrap();
        let result = state.register_validator(msg);
        
        assert_eq!(result, Err(StakingError::AlreadyRegistered));
    }

    #[test]
    fn test_commission_validation() {
        let mut state = StakingState::new();
        
        let msg = MsgRegisterValidator {
            operator: "validator1".to_string(),
            consensus_pk: vec![1, 2, 3, 4],
            commission_bps: 10_001, // Invalid: > 10_000
            details: None,
        };

        let result = state.register_validator(msg);
        assert_eq!(result, Err(StakingError::InvalidAmount));
    }

    #[test]
    fn test_delegation_and_activation() {
        let mut state = StakingState::new();
        
        // Register validator
        let reg_msg = MsgRegisterValidator {
            operator: "validator1".to_string(),
            consensus_pk: vec![1, 2, 3, 4],
            commission_bps: 500,
            details: None,
        };
        state.register_validator(reg_msg).unwrap();

        // Self-delegate enough to activate
        let del_msg = MsgDelegate {
            delegator: "validator1".to_string(),
            validator: "validator1".to_string(),
            amount: 1_000_000, // Meets minimum self-bond
            denom: "uDGT".to_string(),
            nonce: 1,
        };
        state.delegate(del_msg).unwrap();

        let validator = state.validators.get("validator1").unwrap();
        assert_eq!(validator.status, ValidatorStatus::Active);
        assert_eq!(validator.self_bonded_udgt, 1_000_000);
        assert_eq!(validator.total_delegated_udgt, 0);
    }

    #[test]
    fn test_delegation_validation() {
        let mut state = StakingState::new();
        
        // Try to delegate to non-existent validator
        let del_msg = MsgDelegate {
            delegator: "delegator1".to_string(),
            validator: "nonexistent".to_string(),
            amount: 1_000_000,
            denom: "uDGT".to_string(),
            nonce: 1,
        };
        let result = state.delegate(del_msg);
        assert_eq!(result, Err(StakingError::NotRegistered));

        // Test invalid denomination
        state.register_validator(MsgRegisterValidator {
            operator: "validator1".to_string(),
            consensus_pk: vec![1, 2, 3, 4],
            commission_bps: 500,
            details: None,
        }).unwrap();

        let del_msg = MsgDelegate {
            delegator: "delegator1".to_string(),
            validator: "validator1".to_string(),
            amount: 1_000_000,
            denom: "BTC".to_string(), // Invalid denom
            nonce: 1,
        };
        let result = state.delegate(del_msg);
        assert_eq!(result, Err(StakingError::InvalidDenom));

        // Test zero amount
        let del_msg = MsgDelegate {
            delegator: "delegator1".to_string(),
            validator: "validator1".to_string(),
            amount: 0,
            denom: "uDGT".to_string(),
            nonce: 1,
        };
        let result = state.delegate(del_msg);
        assert_eq!(result, Err(StakingError::InvalidAmount));
    }

    #[test]
    fn test_duplicate_delegation_fails() {
        let mut state = StakingState::new();
        
        // Register validator
        state.register_validator(MsgRegisterValidator {
            operator: "validator1".to_string(),
            consensus_pk: vec![1, 2, 3, 4],
            commission_bps: 500,
            details: None,
        }).unwrap();

        // First delegation
        let del_msg = MsgDelegate {
            delegator: "delegator1".to_string(),
            validator: "validator1".to_string(),
            amount: 1_000_000,
            denom: "uDGT".to_string(),
            nonce: 1,
        };
        state.delegate(del_msg.clone()).unwrap();

        // Second delegation should fail
        let result = state.delegate(del_msg);
        assert_eq!(result, Err(StakingError::AlreadyDelegated));
    }

    #[test]
    fn test_proportional_split() {
        let weights = vec![100, 200, 300];
        let rewards = proportional_split(1000, &weights);
        
        // Should distribute proportionally: 100/600, 200/600, 300/600 of 1000
        assert_eq!(rewards, vec![166, 333, 500]); // 166 + 333 + 500 = 999, remainder of 1 goes to first
        
        // Test with perfect division
        let weights = vec![25, 25, 25, 25];
        let rewards = proportional_split(100, &weights);
        assert_eq!(rewards, vec![25, 25, 25, 25]);
    }

    #[test]
    fn test_reward_distribution() {
        let mut state = StakingState::new();
        
        // Register and activate two validators
        for i in 1..=2 {
            let operator = format!("validator{}", i);
            state.register_validator(MsgRegisterValidator {
                operator: operator.clone(),
                consensus_pk: vec![i as u8],
                commission_bps: 500,
                details: None,
            }).unwrap();
            
            // Self-delegate to activate
            state.delegate(MsgDelegate {
                delegator: operator.clone(),
                validator: operator,
                amount: 1_000_000,
                denom: "uDGT".to_string(),
                nonce: 1,
            }).unwrap();
        }

        // Distribute rewards
        state.distribute_block_rewards(1).unwrap();

        // Both validators should have equal rewards (equal stake)
        let val1 = state.validators.get("validator1").unwrap();
        let val2 = state.validators.get("validator2").unwrap();
        
        assert!(val1.accumulated_rewards_udrt > 0);
        assert!(val2.accumulated_rewards_udrt > 0);
        assert_eq!(val1.accumulated_rewards_udrt, val2.accumulated_rewards_udrt);
    }

    #[test]
    fn test_error_codes() {
        assert_eq!(StakingError::InsufficientBalance.code(), "STK_001");
        assert_eq!(StakingError::InvalidAmount.code(), "STK_002");
        assert_eq!(StakingError::NonceMismatch.code(), "STK_003");
        assert_eq!(StakingError::InvalidDenom.code(), "STK_004");
        assert_eq!(StakingError::AlreadyDelegated.code(), "STK_005");
        assert_eq!(StakingError::NotRegistered.code(), "VLD_001");
        assert_eq!(StakingError::AlreadyRegistered.code(), "VLD_002");
        assert_eq!(StakingError::BelowMinSelfBond.code(), "VLD_003");
        assert_eq!(StakingError::MaxValidatorsReached.code(), "VLD_004");
    }

    #[test]
    fn test_http_status_mapping() {
        assert_eq!(StakingError::InsufficientBalance.http_status(), 422);
        assert_eq!(StakingError::AlreadyDelegated.http_status(), 409);
        assert_eq!(StakingError::AlreadyRegistered.http_status(), 409);
        assert_eq!(StakingError::MaxValidatorsReached.http_status(), 409);
    }
}