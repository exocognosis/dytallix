//! Staking manager for DGT tokens

use std::collections::HashMap;
use serde::{Deserialize, Serialize};

use crate::{Address, Balance, Timestamp, Result, TokenomicsError};
use crate::config::StakingConfig;

/// Validator status
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum ValidatorStatus {
    Active,
    Inactive,
    Jailed,
    Slashed,
}

/// Validator information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidatorInfo {
    /// Validator address
    pub address: Address,
    /// Self-staked amount
    pub self_stake: Balance,
    /// Total delegated amount (including self-stake)
    pub total_stake: Balance,
    /// Commission rate (as decimal)
    pub commission_rate: rust_decimal::Decimal,
    /// Validator status
    pub status: ValidatorStatus,
    /// Block number when validator was created
    pub created_at_block: u64,
    /// Last active block
    pub last_active_block: u64,
    /// Number of blocks produced
    pub blocks_produced: u64,
    /// Number of blocks missed
    pub blocks_missed: u64,
    /// Accumulated penalties
    pub penalty_count: u32,
}

/// Delegation information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Delegation {
    /// Delegator address
    pub delegator: Address,
    /// Validator address
    pub validator: Address,
    /// Delegated amount
    pub amount: Balance,
    /// Block number when delegation was created
    pub created_at_block: u64,
    /// Pending rewards
    pub pending_rewards: Balance,
}

/// Unbonding delegation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnbondingDelegation {
    /// Delegator address
    pub delegator: Address,
    /// Validator address
    pub validator: Address,
    /// Amount being unbonded
    pub amount: Balance,
    /// Timestamp when unbonding completes
    pub completion_timestamp: Timestamp,
    /// Block number when unbonding started
    pub created_at_block: u64,
}

/// Slashing event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SlashingEvent {
    /// Validator that was slashed
    pub validator: Address,
    /// Reason for slashing
    pub reason: SlashingReason,
    /// Amount slashed
    pub amount: Balance,
    /// Block number when slashing occurred
    pub block_number: u64,
    /// Timestamp when slashing occurred
    pub timestamp: Timestamp,
}

/// Reasons for slashing
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SlashingReason {
    DoubleSigning,
    Downtime,
    GovernanceViolation,
}

/// Staking manager handles all staking operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StakingManager {
    /// Staking configuration
    pub config: StakingConfig,
    /// All validators
    pub validators: HashMap<Address, ValidatorInfo>,
    /// All delegations
    pub delegations: HashMap<Address, Vec<Delegation>>,
    /// Unbonding delegations
    pub unbonding_delegations: HashMap<Address, Vec<UnbondingDelegation>>,
    /// Slashing events
    pub slashing_events: Vec<SlashingEvent>,
    /// Total staked amount
    pub total_staked: Balance,
    /// Active validator set (sorted by stake)
    pub active_validators: Vec<Address>,
}

impl StakingManager {
    /// Create new staking manager
    pub fn new(config: StakingConfig) -> Self {
        Self {
            config,
            validators: HashMap::new(),
            delegations: HashMap::new(),
            unbonding_delegations: HashMap::new(),
            slashing_events: Vec::new(),
            total_staked: 0,
            active_validators: Vec::new(),
        }
    }
    
    /// Create a new validator
    pub fn create_validator(
        &mut self,
        validator_address: Address,
        self_stake: Balance,
        commission_rate: rust_decimal::Decimal,
        block_number: u64,
    ) -> Result<()> {
        if self.validators.contains_key(&validator_address) {
            return Err(TokenomicsError::InvalidConfig {
                details: "Validator already exists".to_string(),
            });
        }
        
        if self_stake < self.config.minimum_stake {
            return Err(TokenomicsError::InsufficientBalance {
                required: self.config.minimum_stake,
                available: self_stake,
            });
        }
        
        if commission_rate > rust_decimal::Decimal::from(1) {
            return Err(TokenomicsError::InvalidConfig {
                details: "Commission rate cannot exceed 100%".to_string(),
            });
        }
        
        let validator = ValidatorInfo {
            address: validator_address.clone(),
            self_stake,
            total_stake: self_stake,
            commission_rate,
            status: ValidatorStatus::Active,
            created_at_block: block_number,
            last_active_block: block_number,
            blocks_produced: 0,
            blocks_missed: 0,
            penalty_count: 0,
        };
        
        self.validators.insert(validator_address.clone(), validator);
        self.total_staked = self.total_staked.checked_add(self_stake)
            .ok_or(TokenomicsError::Overflow)?;
        
        // Add self-delegation
        let self_delegation = Delegation {
            delegator: validator_address.clone(),
            validator: validator_address.clone(),
            amount: self_stake,
            created_at_block: block_number,
            pending_rewards: 0,
        };
        
        self.delegations
            .entry(validator_address.clone())
            .or_insert_with(Vec::new)
            .push(self_delegation);
        
        self.update_active_validators();
        
        Ok(())
    }
    
    /// Delegate tokens to a validator
    pub fn delegate(
        &mut self,
        delegator: Address,
        validator: Address,
        amount: Balance,
        block_number: u64,
    ) -> Result<()> {
        if amount < self.config.minimum_stake {
            return Err(TokenomicsError::InsufficientBalance {
                required: self.config.minimum_stake,
                available: amount,
            });
        }
        
        let validator_info = self.validators.get_mut(&validator)
            .ok_or_else(|| TokenomicsError::TokenNotFound {
                token_id: format!("Validator {}", validator),
            })?;
        
        if validator_info.status != ValidatorStatus::Active {
            return Err(TokenomicsError::InvalidConfig {
                details: "Cannot delegate to inactive validator".to_string(),
            });
        }
        
        // Update validator total stake
        validator_info.total_stake = validator_info.total_stake.checked_add(amount)
            .ok_or(TokenomicsError::Overflow)?;
        
        // Create delegation
        let delegation = Delegation {
            delegator: delegator.clone(),
            validator: validator.clone(),
            amount,
            created_at_block: block_number,
            pending_rewards: 0,
        };
        
        self.delegations
            .entry(delegator)
            .or_insert_with(Vec::new)
            .push(delegation);
        
        self.total_staked = self.total_staked.checked_add(amount)
            .ok_or(TokenomicsError::Overflow)?;
        
        self.update_active_validators();
        
        Ok(())
    }
    
    /// Begin unbonding delegation
    pub fn begin_unbonding(
        &mut self,
        delegator: Address,
        validator: Address,
        amount: Balance,
        current_timestamp: Timestamp,
        block_number: u64,
    ) -> Result<()> {
        let delegations = self.delegations.get_mut(&delegator)
            .ok_or_else(|| TokenomicsError::TokenNotFound {
                token_id: format!("Delegations for {}", delegator),
            })?;
        
        // Find the delegation to the validator
        let delegation_index = delegations.iter()
            .position(|d| d.validator == validator)
            .ok_or_else(|| TokenomicsError::TokenNotFound {
                token_id: format!("Delegation from {} to {}", delegator, validator),
            })?;
        
        let delegation = &mut delegations[delegation_index];
        
        if delegation.amount < amount {
            return Err(TokenomicsError::InsufficientBalance {
                required: amount,
                available: delegation.amount,
            });
        }
        
        // Update delegation amount
        delegation.amount = delegation.amount.checked_sub(amount)
            .ok_or(TokenomicsError::Overflow)?;
        
        // Remove delegation if amount becomes 0
        if delegation.amount == 0 {
            delegations.remove(delegation_index);
        }
        
        // Update validator total stake
        if let Some(validator_info) = self.validators.get_mut(&validator) {
            validator_info.total_stake = validator_info.total_stake.checked_sub(amount)
                .ok_or(TokenomicsError::Overflow)?;
        }
        
        // Create unbonding delegation
        let unbonding = UnbondingDelegation {
            delegator: delegator.clone(),
            validator,
            amount,
            completion_timestamp: current_timestamp + self.config.unbonding_period,
            created_at_block: block_number,
        };
        
        self.unbonding_delegations
            .entry(delegator)
            .or_insert_with(Vec::new)
            .push(unbonding);
        
        self.update_active_validators();
        
        Ok(())
    }
    
    /// Complete unbonding delegations that have finished their unbonding period
    pub fn complete_unbonding(&mut self, current_timestamp: Timestamp) -> Result<Vec<(Address, Balance)>> {
        let mut completed = Vec::new();
        
        for (delegator, unbondings) in self.unbonding_delegations.iter_mut() {
            let mut i = 0;
            while i < unbondings.len() {
                if unbondings[i].completion_timestamp <= current_timestamp {
                    let unbonding = unbondings.remove(i);
                    completed.push((delegator.clone(), unbonding.amount));
                } else {
                    i += 1;
                }
            }
        }
        
        // Remove empty entries
        self.unbonding_delegations.retain(|_, unbondings| !unbondings.is_empty());
        
        Ok(completed)
    }
    
    /// Slash a validator for misbehavior
    pub fn slash_validator(
        &mut self,
        validator: Address,
        reason: SlashingReason,
        block_number: u64,
        timestamp: Timestamp,
    ) -> Result<Balance> {
        let validator_info = self.validators.get_mut(&validator)
            .ok_or_else(|| TokenomicsError::TokenNotFound {
                token_id: format!("Validator {}", validator),
            })?;
        
        let penalty_rate = match reason {
            SlashingReason::DoubleSigning => &self.config.slashing.double_signing_penalty,
            SlashingReason::Downtime => &self.config.slashing.downtime_penalty,
            SlashingReason::GovernanceViolation => &self.config.slashing.governance_violation_penalty,
        };
        
        let slash_amount = (rust_decimal::Decimal::from(validator_info.total_stake) * penalty_rate)
            .to_string().parse::<Balance>()
            .map_err(|_| TokenomicsError::Overflow)?;
        
        let actual_slash = slash_amount.min(validator_info.total_stake);
        
        // Update validator
        validator_info.total_stake = validator_info.total_stake.saturating_sub(actual_slash);
        validator_info.penalty_count += 1;
        
        // Jail validator for serious offenses
        if matches!(reason, SlashingReason::DoubleSigning | SlashingReason::GovernanceViolation) {
            validator_info.status = ValidatorStatus::Jailed;
        }
        
        // Update total staked
        self.total_staked = self.total_staked.saturating_sub(actual_slash);
        
        // Record slashing event
        self.slashing_events.push(SlashingEvent {
            validator,
            reason,
            amount: actual_slash,
            block_number,
            timestamp,
        });
        
        self.update_active_validators();
        
        Ok(actual_slash)
    }
    
    /// Update active validator set based on stake
    fn update_active_validators(&mut self) {
        let mut validator_stakes: Vec<(Address, Balance)> = self.validators
            .iter()
            .filter(|(_, info)| info.status == ValidatorStatus::Active)
            .map(|(addr, info)| (addr.clone(), info.total_stake))
            .collect();
        
        // Sort by stake descending
        validator_stakes.sort_by(|a, b| b.1.cmp(&a.1));
        
        // Take top validators up to max_validators
        self.active_validators = validator_stakes
            .into_iter()
            .take(self.config.max_validators as usize)
            .map(|(addr, _)| addr)
            .collect();
    }
    
    /// Get validator information
    pub fn get_validator(&self, validator: &Address) -> Option<&ValidatorInfo> {
        self.validators.get(validator)
    }
    
    /// Get delegations for a delegator
    pub fn get_delegations(&self, delegator: &Address) -> Option<&Vec<Delegation>> {
        self.delegations.get(delegator)
    }
    
    /// Get unbonding delegations for a delegator
    pub fn get_unbonding_delegations(&self, delegator: &Address) -> Option<&Vec<UnbondingDelegation>> {
        self.unbonding_delegations.get(delegator)
    }
    
    /// Get total delegated amount for a delegator
    pub fn get_total_delegated(&self, delegator: &Address) -> Balance {
        self.delegations.get(delegator)
            .map(|delegations| delegations.iter().map(|d| d.amount).sum())
            .unwrap_or(0)
    }
    
    /// Get active validators
    pub fn get_active_validators(&self) -> &Vec<Address> {
        &self.active_validators
    }
    
    /// Get total staked amount
    pub fn get_total_staked(&self) -> Balance {
        self.total_staked
    }
    
    /// Check if validator is active
    pub fn is_validator_active(&self, validator: &Address) -> bool {
        self.active_validators.contains(validator)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::SlashingConfig;
    use rust_decimal::Decimal;

    fn create_test_config() -> StakingConfig {
        StakingConfig {
            minimum_stake: 1000,
            unbonding_period: 21 * 24 * 60 * 60, // 21 days
            max_validators: 100,
            slashing: SlashingConfig {
                double_signing_penalty: Decimal::from_str_exact("0.05").unwrap(),
                downtime_penalty: Decimal::from_str_exact("0.01").unwrap(),
                governance_violation_penalty: Decimal::from_str_exact("0.10").unwrap(),
            },
        }
    }

    #[test]
    fn test_create_validator() {
        let config = create_test_config();
        let mut manager = StakingManager::new(config);
        
        let result = manager.create_validator(
            "validator1".to_string(),
            5000,
            Decimal::from_str_exact("0.1").unwrap(), // 10% commission
            1,
        );
        
        assert!(result.is_ok());
        assert_eq!(manager.validators.len(), 1);
        assert_eq!(manager.total_staked, 5000);
        assert_eq!(manager.active_validators.len(), 1);
    }

    #[test]
    fn test_delegation() {
        let config = create_test_config();
        let mut manager = StakingManager::new(config);
        
        // Create validator
        manager.create_validator(
            "validator1".to_string(),
            5000,
            Decimal::from_str_exact("0.1").unwrap(),
            1,
        ).unwrap();
        
        // Delegate to validator
        let result = manager.delegate(
            "delegator1".to_string(),
            "validator1".to_string(),
            2000,
            2,
        );
        
        assert!(result.is_ok());
        assert_eq!(manager.total_staked, 7000); // 5000 + 2000
        
        let validator = manager.get_validator(&"validator1".to_string()).unwrap();
        assert_eq!(validator.total_stake, 7000);
    }

    #[test]
    fn test_unbonding() {
        let config = create_test_config();
        let mut manager = StakingManager::new(config);
        
        // Create validator and delegate
        manager.create_validator(
            "validator1".to_string(),
            5000,
            Decimal::from_str_exact("0.1").unwrap(),
            1,
        ).unwrap();
        
        manager.delegate(
            "delegator1".to_string(),
            "validator1".to_string(),
            2000,
            2,
        ).unwrap();
        
        // Begin unbonding
        let result = manager.begin_unbonding(
            "delegator1".to_string(),
            "validator1".to_string(),
            1000,
            1000, // current timestamp
            3,
        );
        
        assert!(result.is_ok());
        
        let validator = manager.get_validator(&"validator1".to_string()).unwrap();
        assert_eq!(validator.total_stake, 6000); // 7000 - 1000
        
        let unbondings = manager.get_unbonding_delegations(&"delegator1".to_string()).unwrap();
        assert_eq!(unbondings.len(), 1);
        assert_eq!(unbondings[0].amount, 1000);
    }

    #[test]
    fn test_slashing() {
        let config = create_test_config();
        let mut manager = StakingManager::new(config);
        
        // Create validator
        manager.create_validator(
            "validator1".to_string(),
            10000,
            Decimal::from_str_exact("0.1").unwrap(),
            1,
        ).unwrap();
        
        // Slash validator for double signing (5% penalty)
        let slashed = manager.slash_validator(
            "validator1".to_string(),
            SlashingReason::DoubleSigning,
            2,
            1000,
        ).unwrap();
        
        assert_eq!(slashed, 500); // 5% of 10000
        
        let validator = manager.get_validator(&"validator1".to_string()).unwrap();
        assert_eq!(validator.total_stake, 9500);
        assert_eq!(validator.status, ValidatorStatus::Jailed);
        assert_eq!(manager.total_staked, 9500);
    }
}