// Staking module for Dytallix blockchain
// Implements validator registry, delegation, and reward accrual

use crate::types::{Address, Amount, BlockNumber, ValidatorInfo};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Fixed-point scale for reward calculations (1e12 for precision)
pub const REWARD_SCALE: u128 = 1_000_000_000_000;

/// Validator status in the registry
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ValidatorStatus {
    Pending,
    Active,
    Inactive,
    Slashed,
}

/// Extended validator information for staking system
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Validator {
    /// Validator address/identifier
    pub address: Address,
    /// Public key for consensus
    pub consensus_pubkey: Vec<u8>,
    /// Total stake delegated to this validator (in uDGT)
    pub total_stake: u128,
    /// Validator status
    pub status: ValidatorStatus,
    /// Reward index for proportional rewards (scaled by REWARD_SCALE)
    pub reward_index: u128,
    /// Accumulated unpaid rewards (in uDRT)
    pub accumulated_unpaid: u128,
    /// Commission rate in basis points (e.g., 500 = 5%)
    pub commission_rate: u16,
    /// Self-delegation amount (minimum required)
    pub self_stake: u128,
}

/// Delegation record for a specific delegator-validator pair
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Delegation {
    /// Delegator address
    pub delegator_address: Address,
    /// Validator address
    pub validator_address: Address,
    /// Amount of DGT staked (in uDGT)
    pub stake_amount: u128,
    /// Reward cursor - captures validator reward_index at last interaction
    pub reward_cursor_index: u128,
}

/// Staking configuration parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StakingParams {
    /// Maximum number of active validators
    pub max_validators: u32,
    /// Minimum self-stake required to become a validator (in uDGT)
    pub min_self_stake: u128,
    /// Double-sign slash rate in basis points
    pub slash_double_sign: u16,
    /// Downtime slash rate in basis points
    pub slash_downtime: u16,
    /// Emission rate per block (in uDRT)
    pub emission_per_block: u128,
}

impl Default for StakingParams {
    fn default() -> Self {
        Self {
            max_validators: 100,
            min_self_stake: 1_000_000_000_000, // 1M DGT in uDGT (assuming 6 decimals)
            slash_double_sign: 500,             // 5%
            slash_downtime: 100,                // 1%
            emission_per_block: 1_000_000,      // 1 DRT per block in uDRT
        }
    }
}

/// Main staking state manager
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StakingState {
    /// All registered validators
    pub validators: HashMap<Address, Validator>,
    /// All delegations (key: delegator_address:validator_address)
    pub delegations: HashMap<String, Delegation>,
    /// Staking parameters
    pub params: StakingParams,
    /// Total stake across all validators
    pub total_stake: u128,
    /// Current block height
    pub current_height: BlockNumber,
}

impl Default for StakingState {
    fn default() -> Self {
        Self {
            validators: HashMap::new(),
            delegations: HashMap::new(),
            params: StakingParams::default(),
            total_stake: 0,
            current_height: 0,
        }
    }
}

/// Errors that can occur in the staking system
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum StakingError {
    ValidatorNotFound,
    ValidatorAlreadyExists,
    InsufficientStake,
    InvalidStatus,
    DelegationAlreadyExists,
    DelegationNotFound,
    InsufficientFunds,
    MaxValidatorsReached,
    NotImplemented,
}

impl std::fmt::Display for StakingError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            StakingError::ValidatorNotFound => write!(f, "Validator not found"),
            StakingError::ValidatorAlreadyExists => write!(f, "Validator already exists"),
            StakingError::InsufficientStake => write!(f, "Insufficient stake"),
            StakingError::InvalidStatus => write!(f, "Invalid validator status"),
            StakingError::DelegationAlreadyExists => write!(f, "Delegation already exists"),
            StakingError::DelegationNotFound => write!(f, "Delegation not found"),
            StakingError::InsufficientFunds => write!(f, "Insufficient funds"),
            StakingError::MaxValidatorsReached => write!(f, "Maximum validators reached"),
            StakingError::NotImplemented => write!(f, "Feature not implemented"),
        }
    }
}

impl std::error::Error for StakingError {}

impl StakingState {
    /// Create a new staking state with default parameters
    pub fn new() -> Self {
        Self::default()
    }

    /// Register a new validator
    pub fn register_validator(
        &mut self,
        address: Address,
        consensus_pubkey: Vec<u8>,
        commission_rate: u16,
    ) -> Result<(), StakingError> {
        // Check if validator already exists
        if self.validators.contains_key(&address) {
            return Err(StakingError::ValidatorAlreadyExists);
        }

        // Create new validator with Pending status
        let validator = Validator {
            address: address.clone(),
            consensus_pubkey,
            total_stake: 0,
            status: ValidatorStatus::Pending,
            reward_index: 0,
            accumulated_unpaid: 0,
            commission_rate,
            self_stake: 0,
        };

        self.validators.insert(address, validator);
        Ok(())
    }

    /// Delegate DGT tokens to a validator
    pub fn delegate(
        &mut self,
        delegator: Address,
        validator: Address,
        amount: u128,
    ) -> Result<(), StakingError> {
        // Check if validator exists
        let validator_entry = self.validators.get_mut(&validator)
            .ok_or(StakingError::ValidatorNotFound)?;

        // Create delegation key
        let delegation_key = format!("{}:{}", delegator, validator);

        // Check if delegation already exists (reject for MVP)
        if self.delegations.contains_key(&delegation_key) {
            return Err(StakingError::DelegationAlreadyExists);
        }

        // Create new delegation
        let delegation = Delegation {
            delegator_address: delegator.clone(),
            validator_address: validator.clone(),
            stake_amount: amount,
            reward_cursor_index: validator_entry.reward_index,
        };

        // Update validator total stake
        validator_entry.total_stake += amount;
        
        // Update self-stake if delegator is the validator
        if delegator == validator {
            validator_entry.self_stake += amount;
        }

        // Add delegation
        self.delegations.insert(delegation_key, delegation);

        // Update total stake
        self.total_stake += amount;

        // Try to activate validator if requirements are met
        self.try_activate_validator(&validator)?;

        Ok(())
    }

    /// Try to activate a validator if requirements are met
    fn try_activate_validator(&mut self, validator_address: &Address) -> Result<(), StakingError> {
        let validator = self.validators.get_mut(validator_address)
            .ok_or(StakingError::ValidatorNotFound)?;

        // Check if validator can be activated
        if validator.status == ValidatorStatus::Pending 
            && validator.self_stake >= self.params.min_self_stake {
            
            // Check if we haven't reached max validators
            let active_count = self.validators.values()
                .filter(|v| v.status == ValidatorStatus::Active)
                .count() as u32;

            if active_count < self.params.max_validators {
                validator.status = ValidatorStatus::Active;
            }
        }

        Ok(())
    }

    /// Get list of active validators
    pub fn get_active_validators(&self) -> Vec<&Validator> {
        self.validators.values()
            .filter(|v| v.status == ValidatorStatus::Active)
            .collect()
    }

    /// Update validator power based on stake
    pub fn update_validator_power(&mut self, validator_address: &Address) -> Result<(), StakingError> {
        let _validator = self.validators.get(validator_address)
            .ok_or(StakingError::ValidatorNotFound)?;
        
        // For MVP, validator power equals total stake
        // In future, this could implement more complex power calculations
        Ok(())
    }

    /// Slash a validator (placeholder implementation)
    pub fn slash_validator(
        &mut self,
        validator_address: &Address,
        _slash_type: SlashType,
    ) -> Result<(), StakingError> {
        let validator = self.validators.get_mut(validator_address)
            .ok_or(StakingError::ValidatorNotFound)?;

        // For MVP, just mark as slashed
        validator.status = ValidatorStatus::Slashed;
        
        // TODO: Implement actual slashing logic
        // - Calculate slash amount based on type
        // - Slash delegators proportionally
        // - Burn or redistribute slashed tokens
        
        Err(StakingError::NotImplemented)
    }

    /// Process rewards for all active validators (called per block)
    pub fn process_block_rewards(&mut self, block_height: BlockNumber) -> Result<(), StakingError> {
        self.current_height = block_height;

        // Get total active stake
        let total_active_stake: u128 = self.validators.values()
            .filter(|v| v.status == ValidatorStatus::Active)
            .map(|v| v.total_stake)
            .sum();

        if total_active_stake == 0 {
            return Ok(()); // No active stake, no rewards to distribute
        }

        // Calculate rewards per unit of stake
        let reward_per_stake = (self.params.emission_per_block * REWARD_SCALE) / total_active_stake;

        // Update reward index for all active validators
        for validator in self.validators.values_mut() {
            if validator.status == ValidatorStatus::Active && validator.total_stake > 0 {
                validator.reward_index += reward_per_stake;
            }
        }

        Ok(())
    }

    /// Calculate pending rewards for a delegation
    pub fn calculate_pending_rewards(
        &self,
        delegator: &Address,
        validator_address: &Address,
    ) -> Result<u128, StakingError> {
        let delegation_key = format!("{}:{}", delegator, validator_address);
        let delegation = self.delegations.get(&delegation_key)
            .ok_or(StakingError::DelegationNotFound)?;

        let validator = self.validators.get(validator_address)
            .ok_or(StakingError::ValidatorNotFound)?;

        // Calculate rewards: (current_index - cursor_index) * stake_amount / SCALE
        let reward_diff = validator.reward_index.saturating_sub(delegation.reward_cursor_index);
        let pending_rewards = (reward_diff * delegation.stake_amount) / REWARD_SCALE;

        Ok(pending_rewards)
    }

    /// Claim rewards for a delegation
    pub fn claim_rewards(
        &mut self,
        delegator: &Address,
        validator_address: &Address,
    ) -> Result<u128, StakingError> {
        let pending_rewards = self.calculate_pending_rewards(delegator, validator_address)?;

        if pending_rewards > 0 {
            let delegation_key = format!("{}:{}", delegator, validator_address);
            let delegation = self.delegations.get_mut(&delegation_key)
                .ok_or(StakingError::DelegationNotFound)?;

            let validator = self.validators.get(validator_address)
                .ok_or(StakingError::ValidatorNotFound)?;

            // Update delegation reward cursor
            delegation.reward_cursor_index = validator.reward_index;

            // TODO: Actually credit DRT tokens to delegator account
            // This requires integration with the token/balance system
        }

        Ok(pending_rewards)
    }

    /// Undelegate tokens (placeholder for future implementation)
    pub fn undelegate(
        &mut self,
        _delegator: Address,
        _validator: Address,
        _amount: u128,
    ) -> Result<(), StakingError> {
        // TODO: Implement undelegation with unbonding period
        Err(StakingError::NotImplemented)
    }
}

/// Types of slashing
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SlashType {
    DoubleSign,
    Downtime,
}

/// Emissions provider trait for reward distribution
pub trait EmissionsProvider {
    /// Get emission amount per block
    fn emission_per_block(&self) -> u128;
}

/// Simple emissions provider implementation
#[derive(Debug, Clone)]
pub struct SimpleEmissionsProvider {
    pub emission_rate: u128,
}

impl EmissionsProvider for SimpleEmissionsProvider {
    fn emission_per_block(&self) -> u128 {
        self.emission_rate
    }
}

impl Default for SimpleEmissionsProvider {
    fn default() -> Self {
        Self {
            emission_rate: 1_000_000, // 1 DRT per block in uDRT
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validator_registration() {
        let mut state = StakingState::new();
        
        let result = state.register_validator(
            "validator1".to_string(),
            vec![1, 2, 3, 4],
            500, // 5% commission
        );
        
        assert!(result.is_ok());
        assert!(state.validators.contains_key("validator1"));
        
        let validator = &state.validators["validator1"];
        assert_eq!(validator.status, ValidatorStatus::Pending);
        assert_eq!(validator.commission_rate, 500);
    }

    #[test]
    fn test_delegation() {
        let mut state = StakingState::new();
        
        // Register validator
        state.register_validator(
            "validator1".to_string(),
            vec![1, 2, 3, 4],
            500,
        ).unwrap();

        // Delegate tokens
        let result = state.delegate(
            "delegator1".to_string(),
            "validator1".to_string(),
            1_000_000_000_000, // 1M DGT
        );

        assert!(result.is_ok());
        assert_eq!(state.total_stake, 1_000_000_000_000);
        
        let delegation_key = "delegator1:validator1";
        assert!(state.delegations.contains_key(delegation_key));
    }

    #[test]
    fn test_validator_activation() {
        let mut state = StakingState::new();
        
        // Register validator
        state.register_validator(
            "validator1".to_string(),
            vec![1, 2, 3, 4],
            500,
        ).unwrap();

        // Self-delegate enough to meet minimum
        state.delegate(
            "validator1".to_string(), // Self-delegation
            "validator1".to_string(),
            1_000_000_000_000, // 1M DGT
        ).unwrap();

        let validator = &state.validators["validator1"];
        assert_eq!(validator.status, ValidatorStatus::Active);
    }

    #[test]
    fn test_duplicate_delegation_rejected() {
        let mut state = StakingState::new();
        
        // Register validator
        state.register_validator(
            "validator1".to_string(),
            vec![1, 2, 3, 4],
            500,
        ).unwrap();

        // First delegation
        state.delegate(
            "delegator1".to_string(),
            "validator1".to_string(),
            1_000_000,
        ).unwrap();

        // Second delegation should fail
        let result = state.delegate(
            "delegator1".to_string(),
            "validator1".to_string(),
            500_000,
        );

        assert!(matches!(result, Err(StakingError::DelegationAlreadyExists)));
    }

    #[test]
    fn test_reward_calculation() {
        let mut state = StakingState::new();
        
        // Register and activate validator
        state.register_validator("validator1".to_string(), vec![1, 2, 3, 4], 500).unwrap();
        state.delegate("validator1".to_string(), "validator1".to_string(), 1_000_000_000_000).unwrap();

        // Add another delegation
        state.delegate("delegator1".to_string(), "validator1".to_string(), 500_000_000_000).unwrap();

        // Process block rewards
        state.process_block_rewards(1).unwrap();

        // Check that reward index was updated
        let validator = &state.validators["validator1"];
        assert!(validator.reward_index > 0);

        // Calculate pending rewards for delegator
        let pending = state.calculate_pending_rewards(
            &"delegator1".to_string(),
            &"validator1".to_string(),
        ).unwrap();

        assert!(pending > 0);
    }
}