//! Allocation manager for distributing tokens to different stakeholder groups

use std::collections::HashMap;
use serde::{Deserialize, Serialize};

use rust_decimal::Decimal;
use crate::{Address, Balance, Timestamp, Result, TokenomicsError};
use crate::config::{AllocationConfig, DgtConfig};
use super::{VestingSchedule};
use super::vesting_schedule::VestingManager;

/// Stakeholder group types
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum StakeholderGroup {
    CommunityTreasury,
    StakingRewards,
    DevTeam,
    InitialValidators,
    EcosystemFund,
}

/// Allocation details for a stakeholder group
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AllocationDetails {
    /// Stakeholder group
    pub group: StakeholderGroup,
    /// Total allocated amount
    pub total_amount: Balance,
    /// Vesting configuration
    pub vesting_config: VestingConfig,
    /// Recipient accounts and their allocations
    pub recipients: HashMap<Address, Balance>,
}

/// Vesting configuration for different allocation types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VestingConfig {
    /// Cliff duration in seconds
    pub cliff_duration: u64,
    /// Total vesting duration in seconds
    pub total_duration: u64,
    /// Whether tokens are immediately unlocked
    pub immediate_unlock: bool,
}

/// Allocation manager handles token distribution to stakeholder groups
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AllocationManager {
    /// DGT token configuration
    pub config: DgtConfig,
    /// Allocation details by group
    pub allocations: HashMap<StakeholderGroup, AllocationDetails>,
    /// Vesting manager
    pub vesting_manager: VestingManager,
    /// Whether allocations have been initialized
    pub initialized: bool,
    /// Genesis timestamp
    pub genesis_timestamp: Timestamp,
}

impl AllocationManager {
    /// Create new allocation manager
    pub fn new(config: DgtConfig) -> Self {
        Self {
            config,
            allocations: HashMap::new(),
            vesting_manager: VestingManager::new(),
            initialized: false,
            genesis_timestamp: 0,
        }
    }
    
    /// Initialize allocations with genesis timestamp
    pub fn initialize(&mut self, genesis_timestamp: Timestamp) -> Result<()> {
        if self.initialized {
            return Err(TokenomicsError::InvalidConfig {
                details: "Allocations already initialized".to_string(),
            });
        }
        
        self.genesis_timestamp = genesis_timestamp;
        self.setup_default_allocations()?;
        self.initialized = true;
        
        Ok(())
    }
    
    /// Setup default allocation configurations
    fn setup_default_allocations(&mut self) -> Result<()> {
        let total_supply = self.config.total_supply;
        
        // Community Treasury: 40% (unlocked)
        let community_amount = self.calculate_allocation_amount(
            total_supply, 
            &self.config.allocation.community_treasury
        )?;
        
        self.allocations.insert(
            StakeholderGroup::CommunityTreasury,
            AllocationDetails {
                group: StakeholderGroup::CommunityTreasury,
                total_amount: community_amount,
                vesting_config: VestingConfig {
                    cliff_duration: 0,
                    total_duration: 0,
                    immediate_unlock: true,
                },
                recipients: HashMap::new(),
            }
        );
        
        // Staking Rewards: 25% (linear over 4 years)
        let staking_amount = self.calculate_allocation_amount(
            total_supply,
            &self.config.allocation.staking_rewards
        )?;
        
        self.allocations.insert(
            StakeholderGroup::StakingRewards,
            AllocationDetails {
                group: StakeholderGroup::StakingRewards,
                total_amount: staking_amount,
                vesting_config: VestingConfig {
                    cliff_duration: 0,
                    total_duration: 4 * 365 * 24 * 60 * 60, // 4 years
                    immediate_unlock: false,
                },
                recipients: HashMap::new(),
            }
        );
        
        // Dev Team: 15% (1-year cliff, 3-year linear vesting)
        let dev_amount = self.calculate_allocation_amount(
            total_supply,
            &self.config.allocation.dev_team
        )?;
        
        self.allocations.insert(
            StakeholderGroup::DevTeam,
            AllocationDetails {
                group: StakeholderGroup::DevTeam,
                total_amount: dev_amount,
                vesting_config: VestingConfig {
                    cliff_duration: 365 * 24 * 60 * 60, // 1 year
                    total_duration: 4 * 365 * 24 * 60 * 60, // 4 years total (1 year cliff + 3 years vesting)
                    immediate_unlock: false,
                },
                recipients: HashMap::new(),
            }
        );
        
        // Initial Validators: 10% (6-month cliff, 2-year linear)
        let validator_amount = self.calculate_allocation_amount(
            total_supply,
            &self.config.allocation.initial_validators
        )?;
        
        self.allocations.insert(
            StakeholderGroup::InitialValidators,
            AllocationDetails {
                group: StakeholderGroup::InitialValidators,
                total_amount: validator_amount,
                vesting_config: VestingConfig {
                    cliff_duration: 6 * 30 * 24 * 60 * 60, // 6 months
                    total_duration: 30 * 30 * 24 * 60 * 60, // 30 months total (6 months cliff + 24 months vesting)
                    immediate_unlock: false,
                },
                recipients: HashMap::new(),
            }
        );
        
        // Ecosystem Fund: 10% (linear over 5 years)
        let ecosystem_amount = self.calculate_allocation_amount(
            total_supply,
            &self.config.allocation.ecosystem_fund
        )?;
        
        self.allocations.insert(
            StakeholderGroup::EcosystemFund,
            AllocationDetails {
                group: StakeholderGroup::EcosystemFund,
                total_amount: ecosystem_amount,
                vesting_config: VestingConfig {
                    cliff_duration: 0,
                    total_duration: 5 * 365 * 24 * 60 * 60, // 5 years
                    immediate_unlock: false,
                },
                recipients: HashMap::new(),
            }
        );
        
        Ok(())
    }
    
    /// Add recipient to a stakeholder group
    pub fn add_recipient(
        &mut self,
        group: StakeholderGroup,
        account: Address,
        amount: Balance,
    ) -> Result<()> {
        if !self.initialized {
            return Err(TokenomicsError::InvalidConfig {
                details: "Allocations not initialized".to_string(),
            });
        }
        
        let allocation = self.allocations.get_mut(&group)
            .ok_or_else(|| TokenomicsError::InvalidConfig {
                details: format!("Stakeholder group {:?} not found", group),
            })?;
        
        // Check if adding this amount would exceed the group's total allocation
        let current_total: Balance = allocation.recipients.values().sum();
        let new_total = current_total.checked_add(amount)
            .ok_or(TokenomicsError::Overflow)?;
        
        if new_total > allocation.total_amount {
            return Err(TokenomicsError::InvalidConfig {
                details: format!(
                    "Adding {} would exceed group allocation. Available: {}, Requested: {}",
                    amount,
                    allocation.total_amount.saturating_sub(current_total),
                    amount
                ),
            });
        }
        
        allocation.recipients.insert(account.clone(), amount);
        
        // Create vesting schedule if not immediate unlock
        if !allocation.vesting_config.immediate_unlock {
            let schedule = VestingSchedule::new(
                account,
                amount,
                self.genesis_timestamp,
                allocation.vesting_config.cliff_duration,
                allocation.vesting_config.total_duration,
            )?;
            
            self.vesting_manager.add_schedule(schedule)?;
        }
        
        Ok(())
    }
    
    /// Get allocation details for a group
    pub fn get_allocation(&self, group: &StakeholderGroup) -> Option<&AllocationDetails> {
        self.allocations.get(group)
    }
    
    /// Get all recipients for a group
    pub fn get_recipients(&self, group: &StakeholderGroup) -> Option<&HashMap<Address, Balance>> {
        self.allocations.get(group).map(|allocation| &allocation.recipients)
    }
    
    /// Get total allocated amount for a group
    pub fn get_group_total(&self, group: &StakeholderGroup) -> Balance {
        self.allocations.get(group)
            .map(|allocation| allocation.total_amount)
            .unwrap_or(0)
    }
    
    /// Get remaining unallocated amount for a group
    pub fn get_group_remaining(&self, group: &StakeholderGroup) -> Balance {
        if let Some(allocation) = self.allocations.get(group) {
            let allocated: Balance = allocation.recipients.values().sum();
            allocation.total_amount.saturating_sub(allocated)
        } else {
            0
        }
    }
    
    /// Get initial token distribution (for genesis block)
    pub fn get_initial_distribution(&self) -> HashMap<Address, Balance> {
        let mut distribution = HashMap::new();
        
        for allocation in self.allocations.values() {
            if allocation.vesting_config.immediate_unlock {
                // Immediately unlocked tokens
                for (account, amount) in &allocation.recipients {
                    let current = distribution.get(account).unwrap_or(&0);
                    distribution.insert(account.clone(), current + amount);
                }
            }
            // Vested tokens start with 0 balance and vest over time
        }
        
        distribution
    }
    
    /// Calculate allocation amount from percentage
    fn calculate_allocation_amount(&self, total: Balance, percentage: &Decimal) -> Result<Balance> {
        let decimal_total = Decimal::from(total);
        let result = decimal_total * percentage;
        
        result.to_string().parse::<Balance>()
            .map_err(|_| TokenomicsError::Overflow)
    }
    
    /// Get vesting manager
    pub fn vesting_manager(&self) -> &VestingManager {
        &self.vesting_manager
    }
    
    /// Get mutable vesting manager
    pub fn vesting_manager_mut(&mut self) -> &mut VestingManager {
        &mut self.vesting_manager
    }
    
    /// Release vested tokens for an account
    pub fn release_vested_tokens(&mut self, account: &Address, timestamp: Timestamp) -> Result<Balance> {
        self.vesting_manager.release_all(account, timestamp)
    }
    
    /// Get total vested amount for an account
    pub fn get_vested_amount(&self, account: &Address, timestamp: Timestamp) -> Balance {
        self.vesting_manager.total_vested(account, timestamp)
    }
    
    /// Get total releasable amount for an account
    pub fn get_releasable_amount(&self, account: &Address, timestamp: Timestamp) -> Balance {
        self.vesting_manager.total_releasable(account, timestamp)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::AllocationConfig;
    use rust_decimal::Decimal;

    fn create_test_config() -> DgtConfig {
        DgtConfig {
            name: "Test DGT".to_string(),
            symbol: "TDGT".to_string(),
            decimals: 18,
            total_supply: 1000000,
            allocation: AllocationConfig {
                community_treasury: Decimal::from_str_exact("0.40").unwrap(),
                staking_rewards: Decimal::from_str_exact("0.25").unwrap(),
                dev_team: Decimal::from_str_exact("0.15").unwrap(),
                initial_validators: Decimal::from_str_exact("0.10").unwrap(),
                ecosystem_fund: Decimal::from_str_exact("0.10").unwrap(),
            },
        }
    }

    #[test]
    fn test_allocation_manager_creation() {
        let config = create_test_config();
        let manager = AllocationManager::new(config);
        
        assert!(!manager.initialized);
        assert_eq!(manager.allocations.len(), 0);
    }

    #[test]
    fn test_initialization() {
        let config = create_test_config();
        let mut manager = AllocationManager::new(config);
        
        let result = manager.initialize(0);
        assert!(result.is_ok());
        assert!(manager.initialized);
        assert_eq!(manager.allocations.len(), 5);
        
        // Check allocation amounts
        assert_eq!(manager.get_group_total(&StakeholderGroup::CommunityTreasury), 400000); // 40%
        assert_eq!(manager.get_group_total(&StakeholderGroup::StakingRewards), 250000); // 25%
        assert_eq!(manager.get_group_total(&StakeholderGroup::DevTeam), 150000); // 15%
        assert_eq!(manager.get_group_total(&StakeholderGroup::InitialValidators), 100000); // 10%
        assert_eq!(manager.get_group_total(&StakeholderGroup::EcosystemFund), 100000); // 10%
    }

    #[test]
    fn test_add_recipient() {
        let config = create_test_config();
        let mut manager = AllocationManager::new(config);
        manager.initialize(0).unwrap();
        
        let result = manager.add_recipient(
            StakeholderGroup::DevTeam,
            "alice".to_string(),
            50000,
        );
        
        assert!(result.is_ok());
        
        let recipients = manager.get_recipients(&StakeholderGroup::DevTeam).unwrap();
        assert_eq!(recipients.get("alice"), Some(&50000));
        assert_eq!(manager.get_group_remaining(&StakeholderGroup::DevTeam), 100000); // 150000 - 50000
    }

    #[test]
    fn test_vesting_schedules() {
        let config = create_test_config();
        let mut manager = AllocationManager::new(config);
        manager.initialize(0).unwrap();
        
        // Add dev team member (has vesting)
        manager.add_recipient(
            StakeholderGroup::DevTeam,
            "dev1".to_string(),
            50000,
        ).unwrap();
        
        // Add community treasury member (no vesting)
        manager.add_recipient(
            StakeholderGroup::CommunityTreasury,
            "treasury".to_string(),
            100000,
        ).unwrap();
        
        // Check initial distribution (only immediately unlocked tokens)
        let distribution = manager.get_initial_distribution();
        assert_eq!(distribution.get("treasury"), Some(&100000));
        assert_eq!(distribution.get("dev1"), None); // Should be None because it's vesting
        
        // Check vesting amount for dev team member
        let one_year = 365 * 24 * 60 * 60;
        let vested_at_cliff = manager.get_vested_amount(&"dev1".to_string(), one_year);
        assert_eq!(vested_at_cliff, 0); // Still in cliff period
        
        let two_years = 2 * 365 * 24 * 60 * 60;
        let vested_at_two_years = manager.get_vested_amount(&"dev1".to_string(), two_years);
        assert!(vested_at_two_years > 0); // Should have some vesting after cliff
    }
}