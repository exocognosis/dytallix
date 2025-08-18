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
    Leaving,    // Graceful exit in progress
    Slashed,
    Jailed,     // Temporarily banned due to downtime
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
    /// Number of missed blocks (for uptime tracking)
    pub missed_blocks: u64,
    /// Last block height where validator was seen active
    pub last_seen_height: BlockNumber,
    /// Number of times this validator has been slashed
    pub slash_count: u32,
    /// Total amount slashed from this validator
    pub total_slashed: u128,
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
    /// Downtime threshold - max consecutive missed blocks before jailing
    pub downtime_threshold: u64,
    /// Signed blocks window for tracking uptime (sliding window size)
    pub signed_blocks_window: u64,
    /// Minimum signed blocks in window to avoid downtime penalty
    pub min_signed_per_window: u64,
}

impl Default for StakingParams {
    fn default() -> Self {
        Self {
            max_validators: 100,
            min_self_stake: 1_000_000_000_000, // 1M DGT in uDGT (assuming 6 decimals)
            slash_double_sign: 500,             // 5%
            slash_downtime: 100,                // 1%
            emission_per_block: 1_000_000,      // 1 DRT per block in uDRT
            downtime_threshold: 100,            // 100 consecutive missed blocks
            signed_blocks_window: 10000,        // 10k blocks sliding window
            min_signed_per_window: 5000,        // Must sign at least 50% of blocks in window
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
    /// Pending events to be emitted
    pub pending_events: Vec<ValidatorEvent>,
}

impl Default for StakingState {
    fn default() -> Self {
        Self {
            validators: HashMap::new(),
            delegations: HashMap::new(),
            params: StakingParams::default(),
            total_stake: 0,
            current_height: 0,
            pending_events: Vec::new(),
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
    ValidatorNotActive,
    ValidatorJailed,
    AlreadyLeaving,
    InvalidEvidence,
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
            StakingError::ValidatorNotActive => write!(f, "Validator not active"),
            StakingError::ValidatorJailed => write!(f, "Validator is jailed"),
            StakingError::AlreadyLeaving => write!(f, "Validator already leaving"),
            StakingError::InvalidEvidence => write!(f, "Invalid evidence provided"),
        }
    }
}

impl std::error::Error for StakingError {}

/// Validator lifecycle events
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ValidatorEvent {
    ValidatorJoined {
        validator_address: Address,
        self_stake: u128,
        commission_rate: u16,
        block_height: BlockNumber,
    },
    ValidatorLeft {
        validator_address: Address,
        final_stake: u128,
        block_height: BlockNumber,
    },
    ValidatorSlashed {
        validator_address: Address,
        slash_type: SlashType,
        slash_amount: u128,
        block_height: BlockNumber,
    },
    ValidatorStatusChanged {
        validator_address: Address,
        old_status: ValidatorStatus,
        new_status: ValidatorStatus,
        block_height: BlockNumber,
    },
    ValidatorJailed {
        validator_address: Address,
        reason: String,
        block_height: BlockNumber,
    },
}

/// Evidence types for slashing
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Evidence {
    DoubleSign {
        validator_address: Address,
        height: BlockNumber,
        signature_1: Vec<u8>,
        signature_2: Vec<u8>,
        block_hash_1: Vec<u8>,
        block_hash_2: Vec<u8>,
    },
    Downtime {
        validator_address: Address,
        missed_blocks: u64,
        window_start: BlockNumber,
        window_end: BlockNumber,
    },
}

/// Types of slashing
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SlashType {
    DoubleSign,
    Downtime,
}

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
            missed_blocks: 0,
            last_seen_height: self.current_height,
            slash_count: 0,
            total_slashed: 0,
        };

        self.validators.insert(address.clone(), validator);
        
        // Emit validator joined event (will be promoted to active later if conditions met)
        self.emit_event(ValidatorEvent::ValidatorJoined {
            validator_address: address,
            self_stake: 0,
            commission_rate,
            block_height: self.current_height,
        });
        
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
                let old_status = validator.status.clone();
                validator.status = ValidatorStatus::Active;
                
                // Emit status change event
                self.emit_event(ValidatorEvent::ValidatorStatusChanged {
                    validator_address: validator_address.clone(),
                    old_status,
                    new_status: ValidatorStatus::Active,
                    block_height: self.current_height,
                });
            }
        }

        Ok(())
    }

    /// Initiate validator leave (graceful exit)
    pub fn validator_leave(&mut self, validator_address: &Address) -> Result<(), StakingError> {
        let validator = self.validators.get_mut(validator_address)
            .ok_or(StakingError::ValidatorNotFound)?;

        // Check if validator can leave
        match validator.status {
            ValidatorStatus::Active | ValidatorStatus::Inactive | ValidatorStatus::Jailed => {
                let old_status = validator.status.clone();
                validator.status = ValidatorStatus::Leaving;
                
                // Emit status change event
                self.emit_event(ValidatorEvent::ValidatorStatusChanged {
                    validator_address: validator_address.clone(),
                    old_status,
                    new_status: ValidatorStatus::Leaving,
                    block_height: self.current_height,
                });
                
                // For MVP, immediately process exit (no unbonding delay)
                self.process_validator_exit(validator_address)?;
                
                Ok(())
            },
            ValidatorStatus::Leaving => Err(StakingError::AlreadyLeaving),
            ValidatorStatus::Slashed => {
                // Allow slashed validators to leave
                let old_status = validator.status.clone();
                validator.status = ValidatorStatus::Leaving;
                
                self.emit_event(ValidatorEvent::ValidatorStatusChanged {
                    validator_address: validator_address.clone(),
                    old_status,
                    new_status: ValidatorStatus::Leaving,
                    block_height: self.current_height,
                });
                
                self.process_validator_exit(validator_address)?;
                Ok(())
            },
            ValidatorStatus::Pending => {
                // Pending validators can be removed immediately
                self.remove_validator(validator_address)?;
                Ok(())
            },
        }
    }

    /// Process immediate validator exit (MVP implementation)
    fn process_validator_exit(&mut self, validator_address: &Address) -> Result<(), StakingError> {
        let validator = self.validators.get(validator_address)
            .ok_or(StakingError::ValidatorNotFound)?;
            
        let final_stake = validator.total_stake;
        
        // Emit validator left event
        self.emit_event(ValidatorEvent::ValidatorLeft {
            validator_address: validator_address.clone(),
            final_stake,
            block_height: self.current_height,
        });
        
        // For MVP: simple removal (no unbonding period)
        // In full implementation, this would start unbonding process
        self.remove_validator(validator_address)?;
        
        Ok(())
    }

    /// Remove validator and clean up all associated state
    fn remove_validator(&mut self, validator_address: &Address) -> Result<(), StakingError> {
        let validator = self.validators.remove(validator_address)
            .ok_or(StakingError::ValidatorNotFound)?;
            
        // Update total stake
        self.total_stake = self.total_stake.saturating_sub(validator.total_stake);
        
        // Remove all delegations to this validator
        let delegations_to_remove: Vec<String> = self.delegations
            .keys()
            .filter(|key| key.ends_with(&format!(":{}", validator_address)))
            .cloned()
            .collect();
            
        for key in delegations_to_remove {
            self.delegations.remove(&key);
        }
        
        Ok(())
    }

    /// Record a missed block for a validator (uptime tracking)
    pub fn record_missed_block(&mut self, validator_address: &Address) -> Result<(), StakingError> {
        let validator = self.validators.get_mut(validator_address)
            .ok_or(StakingError::ValidatorNotFound)?;

        validator.missed_blocks += 1;

        // Check if validator should be jailed for downtime
        if validator.missed_blocks >= self.params.downtime_threshold && 
           validator.status == ValidatorStatus::Active {
            
            let old_status = validator.status.clone();
            validator.status = ValidatorStatus::Jailed;
            
            // Emit jail event
            self.emit_event(ValidatorEvent::ValidatorJailed {
                validator_address: validator_address.clone(),
                reason: format!("Downtime: {} consecutive missed blocks", validator.missed_blocks),
                block_height: self.current_height,
            });
            
            // Emit status change event
            self.emit_event(ValidatorEvent::ValidatorStatusChanged {
                validator_address: validator_address.clone(),
                old_status,
                new_status: ValidatorStatus::Jailed,
                block_height: self.current_height,
            });
            
            // Apply downtime slashing
            self.slash_validator_internal(validator_address, SlashType::Downtime, None)?;
        }

        Ok(())
    }

    /// Record validator as present (for uptime tracking)
    pub fn record_validator_present(&mut self, validator_address: &Address) -> Result<(), StakingError> {
        let validator = self.validators.get_mut(validator_address)
            .ok_or(StakingError::ValidatorNotFound)?;

        validator.last_seen_height = self.current_height;
        // Reset missed blocks counter on successful participation
        validator.missed_blocks = 0;

        Ok(())
    }

    /// Handle evidence and slash validator
    pub fn handle_evidence(&mut self, evidence: Evidence) -> Result<(), StakingError> {
        match evidence {
            Evidence::DoubleSign { 
                validator_address, 
                height: _, 
                signature_1, 
                signature_2, 
                block_hash_1, 
                block_hash_2 
            } => {
                // Basic validation of evidence (scaffold implementation)
                if signature_1 == signature_2 || block_hash_1 == block_hash_2 {
                    return Err(StakingError::InvalidEvidence);
                }
                
                // TODO: Add cryptographic signature verification
                // For MVP, just process the slashing
                self.slash_validator_internal(&validator_address, SlashType::DoubleSign, Some(evidence))?;
                
                Ok(())
            },
            Evidence::Downtime { 
                validator_address, 
                missed_blocks, 
                window_start: _, 
                window_end: _ 
            } => {
                // Validate downtime evidence
                if missed_blocks < self.params.downtime_threshold {
                    return Err(StakingError::InvalidEvidence);
                }
                
                self.slash_validator_internal(&validator_address, SlashType::Downtime, Some(evidence))?;
                
                Ok(())
            },
        }
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

    /// Slash a validator (public interface)
    pub fn slash_validator(
        &mut self,
        validator_address: &Address,
        slash_type: SlashType,
    ) -> Result<(), StakingError> {
        self.slash_validator_internal(validator_address, slash_type, None)
    }

    /// Internal slashing implementation
    fn slash_validator_internal(
        &mut self,
        validator_address: &Address,
        slash_type: SlashType,
        _evidence: Option<Evidence>,
    ) -> Result<(), StakingError> {
        let validator = self.validators.get_mut(validator_address)
            .ok_or(StakingError::ValidatorNotFound)?;

        // Calculate slash amount based on type
        let slash_rate = match slash_type {
            SlashType::DoubleSign => self.params.slash_double_sign,
            SlashType::Downtime => self.params.slash_downtime,
        };

        let slash_amount = (validator.total_stake * slash_rate as u128) / 10000; // basis points
        
        // Apply slashing
        validator.total_slashed += slash_amount;
        validator.slash_count += 1;
        validator.total_stake = validator.total_stake.saturating_sub(slash_amount);
        
        // Update global total stake
        self.total_stake = self.total_stake.saturating_sub(slash_amount);
        
        // Mark as slashed if it's a severe offense
        let old_status = validator.status.clone();
        if matches!(slash_type, SlashType::DoubleSign) {
            validator.status = ValidatorStatus::Slashed;
        }
        
        // Emit slashing event
        self.emit_event(ValidatorEvent::ValidatorSlashed {
            validator_address: validator_address.clone(),
            slash_type: slash_type.clone(),
            slash_amount,
            block_height: self.current_height,
        });
        
        // Emit status change if status changed
        if old_status != validator.status {
            self.emit_event(ValidatorEvent::ValidatorStatusChanged {
                validator_address: validator_address.clone(),
                old_status,
                new_status: validator.status.clone(),
                block_height: self.current_height,
            });
        }
        
        // TODO: Implement delegator slashing and token burning/redistribution
        // For MVP, just track the slash amount
        
        Ok(())
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

    /// Get validator statistics for queries
    pub fn get_validator_stats(&self, validator_address: &Address) -> Option<ValidatorStats> {
        self.validators.get(validator_address).map(|validator| ValidatorStats {
            address: validator.address.clone(),
            status: validator.status.clone(),
            total_stake: validator.total_stake,
            self_stake: validator.self_stake,
            commission_rate: validator.commission_rate,
            missed_blocks: validator.missed_blocks,
            last_seen_height: validator.last_seen_height,
            slash_count: validator.slash_count,
            total_slashed: validator.total_slashed,
        })
    }

    /// Get current validator set with status filtering
    pub fn get_validator_set(&self, status_filter: Option<ValidatorStatus>) -> Vec<ValidatorStats> {
        self.validators
            .values()
            .filter(|v| status_filter.is_none() || Some(&v.status) == status_filter.as_ref())
            .map(|validator| ValidatorStats {
                address: validator.address.clone(),
                status: validator.status.clone(),
                total_stake: validator.total_stake,
                self_stake: validator.self_stake,
                commission_rate: validator.commission_rate,
                missed_blocks: validator.missed_blocks,
                last_seen_height: validator.last_seen_height,
                slash_count: validator.slash_count,
                total_slashed: validator.total_slashed,
            })
            .collect()
    }

    /// Get pending events and optionally clear them
    pub fn get_events(&self) -> &[ValidatorEvent] {
        &self.pending_events
    }

    /// Clear pending events (should be called after processing)
    pub fn clear_events(&mut self) {
        self.pending_events.clear();
    }

    /// Emit a validator event
    fn emit_event(&mut self, event: ValidatorEvent) {
        self.pending_events.push(event);
    }

    /// Unjail a validator (administrative function)
    pub fn unjail_validator(&mut self, validator_address: &Address) -> Result<(), StakingError> {
        let validator = self.validators.get_mut(validator_address)
            .ok_or(StakingError::ValidatorNotFound)?;

        if validator.status == ValidatorStatus::Jailed {
            let old_status = validator.status.clone();
            validator.status = ValidatorStatus::Inactive;
            validator.missed_blocks = 0; // Reset missed blocks counter
            
            self.emit_event(ValidatorEvent::ValidatorStatusChanged {
                validator_address: validator_address.clone(),
                old_status,
                new_status: ValidatorStatus::Inactive,
                block_height: self.current_height,
            });
            
            Ok(())
        } else {
            Err(StakingError::InvalidStatus)
        }
    }
}

/// Validator statistics for queries
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidatorStats {
    pub address: Address,
    pub status: ValidatorStatus,
    pub total_stake: u128,
    pub self_stake: u128,
    pub commission_rate: u16,
    pub missed_blocks: u64,
    pub last_seen_height: BlockNumber,
    pub slash_count: u32,
    pub total_slashed: u128,
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

    #[test]
    fn test_validator_leave() {
        let mut state = StakingState::new();
        
        // Register and activate validator
        state.register_validator("validator1".to_string(), vec![1, 2, 3, 4], 500).unwrap();
        state.delegate("validator1".to_string(), "validator1".to_string(), 1_000_000_000_000).unwrap();
        
        assert_eq!(state.validators["validator1"].status, ValidatorStatus::Active);
        assert_eq!(state.validators.len(), 1);
        
        // Validator leave should succeed
        let result = state.validator_leave(&"validator1".to_string());
        assert!(result.is_ok());
        
        // Validator should be removed
        assert!(!state.validators.contains_key("validator1"));
        assert_eq!(state.total_stake, 0);
    }

    #[test]
    fn test_uptime_tracking() {
        let mut state = StakingState::new();
        state.params.downtime_threshold = 3; // Low threshold for testing
        
        // Register and activate validator
        state.register_validator("validator1".to_string(), vec![1, 2, 3, 4], 500).unwrap();
        state.delegate("validator1".to_string(), "validator1".to_string(), 1_000_000_000_000).unwrap();
        
        assert_eq!(state.validators["validator1"].status, ValidatorStatus::Active);
        
        // Record missed blocks
        state.record_missed_block(&"validator1".to_string()).unwrap();
        assert_eq!(state.validators["validator1"].missed_blocks, 1);
        assert_eq!(state.validators["validator1"].status, ValidatorStatus::Active);
        
        state.record_missed_block(&"validator1".to_string()).unwrap();
        assert_eq!(state.validators["validator1"].missed_blocks, 2);
        assert_eq!(state.validators["validator1"].status, ValidatorStatus::Active);
        
        // Third miss should jail the validator
        state.record_missed_block(&"validator1".to_string()).unwrap();
        assert_eq!(state.validators["validator1"].missed_blocks, 3);
        assert_eq!(state.validators["validator1"].status, ValidatorStatus::Jailed);
        
        // Record validator present should reset missed blocks
        state.record_validator_present(&"validator1".to_string()).unwrap();
        assert_eq!(state.validators["validator1"].missed_blocks, 0);
    }

    #[test]
    fn test_slashing() {
        let mut state = StakingState::new();
        
        // Register and activate validator
        state.register_validator("validator1".to_string(), vec![1, 2, 3, 4], 500).unwrap();
        state.delegate("validator1".to_string(), "validator1".to_string(), 1_000_000_000_000).unwrap();
        
        let initial_stake = state.validators["validator1"].total_stake;
        
        // Slash for downtime (1% = 100 basis points)
        let result = state.slash_validator(&"validator1".to_string(), SlashType::Downtime);
        assert!(result.is_ok());
        
        let validator = &state.validators["validator1"];
        let expected_slash = (initial_stake * state.params.slash_downtime as u128) / 10000;
        
        assert_eq!(validator.total_slashed, expected_slash);
        assert_eq!(validator.slash_count, 1);
        assert_eq!(validator.total_stake, initial_stake - expected_slash);
        
        // Double sign should mark as slashed
        let result = state.slash_validator(&"validator1".to_string(), SlashType::DoubleSign);
        assert!(result.is_ok());
        assert_eq!(state.validators["validator1"].status, ValidatorStatus::Slashed);
    }

    #[test]
    fn test_evidence_handling() {
        let mut state = StakingState::new();
        
        // Register and activate validator
        state.register_validator("validator1".to_string(), vec![1, 2, 3, 4], 500).unwrap();
        state.delegate("validator1".to_string(), "validator1".to_string(), 1_000_000_000_000).unwrap();
        
        // Create double sign evidence
        let evidence = Evidence::DoubleSign {
            validator_address: "validator1".to_string(),
            height: 100,
            signature_1: vec![1, 2, 3],
            signature_2: vec![4, 5, 6],
            block_hash_1: vec![7, 8, 9],
            block_hash_2: vec![10, 11, 12],
        };
        
        let result = state.handle_evidence(evidence);
        assert!(result.is_ok());
        assert_eq!(state.validators["validator1"].status, ValidatorStatus::Slashed);
        
        // Invalid evidence should fail
        let invalid_evidence = Evidence::DoubleSign {
            validator_address: "validator1".to_string(),
            height: 100,
            signature_1: vec![1, 2, 3],
            signature_2: vec![1, 2, 3], // Same signature
            block_hash_1: vec![7, 8, 9],
            block_hash_2: vec![10, 11, 12],
        };
        
        let result = state.handle_evidence(invalid_evidence);
        assert!(matches!(result, Err(StakingError::InvalidEvidence)));
    }

    #[test]
    fn test_events() {
        let mut state = StakingState::new();
        
        // Register validator (should emit event)
        state.register_validator("validator1".to_string(), vec![1, 2, 3, 4], 500).unwrap();
        assert_eq!(state.get_events().len(), 1);
        
        // Activate validator (should emit status change event)
        state.delegate("validator1".to_string(), "validator1".to_string(), 1_000_000_000_000).unwrap();
        assert_eq!(state.get_events().len(), 2);
        
        // Check event types
        let events = state.get_events();
        assert!(matches!(events[0], ValidatorEvent::ValidatorJoined { .. }));
        assert!(matches!(events[1], ValidatorEvent::ValidatorStatusChanged { .. }));
        
        // Clear events
        state.clear_events();
        assert_eq!(state.get_events().len(), 0);
    }

    #[test]
    fn test_query_functions() {
        let mut state = StakingState::new();
        
        // Register multiple validators
        state.register_validator("validator1".to_string(), vec![1], 500).unwrap();
        state.register_validator("validator2".to_string(), vec![2], 600).unwrap();
        
        // Activate one validator
        state.delegate("validator1".to_string(), "validator1".to_string(), 1_000_000_000_000).unwrap();
        
        // Test get_validator_stats
        let stats = state.get_validator_stats(&"validator1".to_string()).unwrap();
        assert_eq!(stats.status, ValidatorStatus::Active);
        assert_eq!(stats.commission_rate, 500);
        
        // Test get_validator_set
        let all_validators = state.get_validator_set(None);
        assert_eq!(all_validators.len(), 2);
        
        let active_validators = state.get_validator_set(Some(ValidatorStatus::Active));
        assert_eq!(active_validators.len(), 1);
        
        let pending_validators = state.get_validator_set(Some(ValidatorStatus::Pending));
        assert_eq!(pending_validators.len(), 1);
    }

    #[test]
    fn test_unjail_validator() {
        let mut state = StakingState::new();
        state.params.downtime_threshold = 1; // Jail after 1 missed block
        
        // Register and activate validator
        state.register_validator("validator1".to_string(), vec![1, 2, 3, 4], 500).unwrap();
        state.delegate("validator1".to_string(), "validator1".to_string(), 1_000_000_000_000).unwrap();
        
        // Jail the validator
        state.record_missed_block(&"validator1".to_string()).unwrap();
        assert_eq!(state.validators["validator1"].status, ValidatorStatus::Jailed);
        
        // Unjail should work
        let result = state.unjail_validator(&"validator1".to_string());
        assert!(result.is_ok());
        assert_eq!(state.validators["validator1"].status, ValidatorStatus::Inactive);
        assert_eq!(state.validators["validator1"].missed_blocks, 0);
        
        // Unjailing non-jailed validator should fail
        let result = state.unjail_validator(&"validator1".to_string());
        assert!(matches!(result, Err(StakingError::InvalidStatus)));
    }
}