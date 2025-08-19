use anyhow::{Result, anyhow};
use serde::{Serialize, Deserialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;

/// Validator status in the registry
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ValidatorStatus {
    Active,
    Inactive,
}

/// Validator information for the minimal staking system
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Validator {
    pub address: String,
    pub consensus_pk: Vec<u8>,
    pub stake: u128,
    pub status: ValidatorStatus,
}

/// Delegation record
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Delegation {
    pub delegator: String,
    pub validator: String,
    pub amount: u128,
}

/// Staking configuration parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StakingParams {
    pub max_validators: u32,
    pub drt_block_reward: u128,
}

impl Default for StakingParams {
    fn default() -> Self {
        Self {
            max_validators: 100,
            drt_block_reward: 10_000, // 10,000 uDRT per block
        }
    }
}

/// Main staking state manager
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct StakingState {
    pub validators: HashMap<String, Validator>,
    pub delegations: HashMap<String, Delegation>, // key: delegator:validator
    pub params: StakingParams,
    pub total_stake: u128,
    pub total_drt_emitted: u128,
}

/// Error types for staking operations
#[derive(Debug, Clone)]
pub enum StakingError {
    ValidatorNotFound,
    ValidatorAlreadyExists,
    InsufficientFunds,
    InsufficientStake,
    DelegationNotFound,
    DelegationAlreadyExists,
    MaxValidatorsReached,
    ZeroAmount,
    ValidatorPubkeyConflict,
}

impl std::fmt::Display for StakingError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            StakingError::ValidatorNotFound => write!(f, "Validator not found"),
            StakingError::ValidatorAlreadyExists => write!(f, "Validator already exists"),
            StakingError::InsufficientFunds => write!(f, "Insufficient funds"),
            StakingError::InsufficientStake => write!(f, "Insufficient stake"),
            StakingError::DelegationNotFound => write!(f, "Delegation not found"),
            StakingError::DelegationAlreadyExists => write!(f, "Delegation already exists"),
            StakingError::MaxValidatorsReached => write!(f, "Maximum validators reached"),
            StakingError::ZeroAmount => write!(f, "Amount cannot be zero"),
            StakingError::ValidatorPubkeyConflict => write!(f, "Validator pubkey conflict"),
        }
    }
}

impl std::error::Error for StakingError {}

impl StakingState {
    pub fn new() -> Self {
        Self::default()
    }

    /// Stake DGT tokens to a validator (auto-creates validator if doesn't exist)
    pub fn stake(
        &mut self,
        delegator: String,
        validator: String,
        amount: u128,
    ) -> Result<(), StakingError> {
        if amount == 0 {
            return Err(StakingError::ZeroAmount);
        }

        let delegation_key = format!("{}:{}", delegator, validator);

        // Check if delegation already exists (reject for MVP)
        if self.delegations.contains_key(&delegation_key) {
            return Err(StakingError::DelegationAlreadyExists);
        }

        // Auto-create validator if it doesn't exist
        if !self.validators.contains_key(&validator) {
            // For MVP, auto-create with placeholder consensus pubkey
            let new_validator = Validator {
                address: validator.clone(),
                consensus_pk: Vec::new(), // Placeholder - in real impl would require registration
                stake: 0,
                status: ValidatorStatus::Inactive,
            };
            self.validators.insert(validator.clone(), new_validator);
        }

        // Get validator and update stake
        let validator_entry = self.validators.get_mut(&validator)
            .ok_or(StakingError::ValidatorNotFound)?;
        
        validator_entry.stake += amount;
        
        // Activate validator if we have room and stake > 0
        if validator_entry.status == ValidatorStatus::Inactive 
           && validator_entry.stake > 0 {
            let active_count = self.validators.values()
                .filter(|v| v.status == ValidatorStatus::Active)
                .count() as u32;
            
            if active_count < self.params.max_validators {
                validator_entry.status = ValidatorStatus::Active;
            }
        }

        // Create delegation
        let delegation = Delegation {
            delegator: delegator.clone(),
            validator: validator.clone(),
            amount,
        };

        self.delegations.insert(delegation_key, delegation);
        self.total_stake += amount;

        Ok(())
    }

    /// Unstake DGT tokens from a validator
    pub fn unstake(
        &mut self,
        delegator: String,
        validator: String,
        amount: u128,
    ) -> Result<(), StakingError> {
        if amount == 0 {
            return Err(StakingError::ZeroAmount);
        }

        let delegation_key = format!("{}:{}", delegator, validator);
        
        let delegation = self.delegations.get_mut(&delegation_key)
            .ok_or(StakingError::DelegationNotFound)?;

        if delegation.amount < amount {
            return Err(StakingError::InsufficientStake);
        }

        // Update delegation
        delegation.amount -= amount;
        
        // Remove delegation if amount becomes zero
        if delegation.amount == 0 {
            self.delegations.remove(&delegation_key);
        }

        // Update validator stake
        let validator_entry = self.validators.get_mut(&validator)
            .ok_or(StakingError::ValidatorNotFound)?;
        
        validator_entry.stake -= amount;
        
        // Deactivate validator if stake becomes zero
        if validator_entry.stake == 0 {
            validator_entry.status = ValidatorStatus::Inactive;
        }

        self.total_stake -= amount;

        Ok(())
    }

    /// Get ordered list of active validators (for validator set)
    pub fn get_active_validator_set(&self) -> Vec<&Validator> {
        let mut active_validators: Vec<&Validator> = self.validators.values()
            .filter(|v| v.status == ValidatorStatus::Active && v.stake > 0)
            .collect();

        // Sort by stake descending, then by address ascending for determinism
        active_validators.sort_by(|a, b| {
            let stake_cmp = b.stake.cmp(&a.stake);
            if stake_cmp == std::cmp::Ordering::Equal {
                a.address.cmp(&b.address)
            } else {
                stake_cmp
            }
        });

        // Truncate to max_validators
        active_validators.truncate(self.params.max_validators as usize);
        active_validators
    }

    /// Compute validator set hash for block header
    pub fn compute_validator_set_hash(&self) -> [u8; 32] {
        let active_validators = self.get_active_validator_set();
        
        if active_validators.is_empty() {
            return [0u8; 32];
        }

        let mut hasher = Sha256::new();
        for validator in active_validators {
            hasher.update(validator.address.as_bytes());
            hasher.update(&validator.consensus_pk);
            hasher.update(validator.stake.to_be_bytes());
        }
        
        let mut hash = [0u8; 32];
        hash.copy_from_slice(&hasher.finalize()[..]);
        hash
    }

    /// Apply proposer reward (mint DRT to proposer)
    pub fn apply_proposer_reward(&mut self, proposer: &str) -> u128 {
        self.total_drt_emitted += self.params.drt_block_reward;
        self.params.drt_block_reward
    }

    /// Get validator by address
    pub fn get_validator(&self, address: &str) -> Option<&Validator> {
        self.validators.get(address)
    }

    /// Get delegations for a delegator
    pub fn get_delegations(&self, delegator: &str) -> Vec<&Delegation> {
        self.delegations.values()
            .filter(|d| d.delegator == delegator)
            .collect()
    }

    /// Get delegation amount
    pub fn get_delegation(&self, delegator: &str, validator: &str) -> Option<u128> {
        let key = format!("{}:{}", delegator, validator);
        self.delegations.get(&key).map(|d| d.amount)
    }

    /// Get staking statistics
    pub fn get_stats(&self) -> StakingStats {
        let validator_count = self.validators.len();
        let active_validator_count = self.validators.values()
            .filter(|v| v.status == ValidatorStatus::Active)
            .count();

        StakingStats {
            total_stake: self.total_stake,
            validator_count,
            active_validator_count,
            drt_emitted: self.total_drt_emitted,
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StakingStats {
    pub total_stake: u128,
    pub validator_count: usize,
    pub active_validator_count: usize,
    pub drt_emitted: u128,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_stake_happy_path() {
        let mut staking = StakingState::new();
        
        let result = staking.stake(
            "delegator1".to_string(),
            "validator1".to_string(),
            1_000_000,
        );
        
        assert!(result.is_ok());
        assert_eq!(staking.total_stake, 1_000_000);
        assert!(staking.validators.contains_key("validator1"));
        assert_eq!(staking.validators["validator1"].stake, 1_000_000);
        assert_eq!(staking.validators["validator1"].status, ValidatorStatus::Active);
    }

    #[test]
    fn test_unstake_happy_path() {
        let mut staking = StakingState::new();
        
        // First stake
        staking.stake("delegator1".to_string(), "validator1".to_string(), 1_000_000).unwrap();
        
        // Then unstake partial
        let result = staking.unstake("delegator1".to_string(), "validator1".to_string(), 500_000);
        
        assert!(result.is_ok());
        assert_eq!(staking.total_stake, 500_000);
        assert_eq!(staking.validators["validator1"].stake, 500_000);
    }

    #[test]
    fn test_validator_set_determinism() {
        let mut staking = StakingState::new();
        
        // Add validators with different stakes
        staking.stake("val1".to_string(), "validator_a".to_string(), 3_000_000).unwrap();
        staking.stake("val2".to_string(), "validator_b".to_string(), 2_000_000).unwrap();
        staking.stake("val3".to_string(), "validator_c".to_string(), 2_000_000).unwrap(); // Tie with validator_b
        
        let validator_set = staking.get_active_validator_set();
        
        // Should be ordered by stake desc, then address asc
        assert_eq!(validator_set.len(), 3);
        assert_eq!(validator_set[0].address, "validator_a"); // Highest stake
        assert_eq!(validator_set[1].address, "validator_b"); // Same stake as c, but lexically first
        assert_eq!(validator_set[2].address, "validator_c");
    }

    #[test]
    fn test_duplicate_delegation_rejected() {
        let mut staking = StakingState::new();
        
        // First delegation
        staking.stake("delegator1".to_string(), "validator1".to_string(), 1_000_000).unwrap();
        
        // Second delegation should fail
        let result = staking.stake("delegator1".to_string(), "validator1".to_string(), 500_000);
        
        assert!(matches!(result, Err(StakingError::DelegationAlreadyExists)));
    }
}