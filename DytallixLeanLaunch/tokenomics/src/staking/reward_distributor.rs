//! Reward distribution system for stakers

use std::collections::HashMap;
use serde::{Deserialize, Serialize};

use rust_decimal::Decimal;
use crate::{Address, Balance, Result, TokenomicsError};
use super::StakingManager;
use super::staking_manager::{ValidatorInfo, Delegation};

/// Reward distribution record
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RewardDistribution {
    /// Block number when rewards were distributed
    pub block_number: u64,
    /// Total rewards distributed
    pub total_rewards: Balance,
    /// Rewards by validator
    pub validator_rewards: HashMap<Address, ValidatorReward>,
    /// Timestamp of distribution
    pub timestamp: u64,
}

/// Validator reward breakdown
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidatorReward {
    /// Validator address
    pub validator: Address,
    /// Total rewards for this validator
    pub total_reward: Balance,
    /// Commission earned by validator
    pub commission: Balance,
    /// Rewards distributed to delegators
    pub delegator_rewards: Balance,
    /// Delegator rewards breakdown
    pub delegator_breakdown: HashMap<Address, Balance>,
}

/// Reward distributor manages DRT rewards for stakers
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RewardDistributor {
    /// Historical reward distributions
    pub distributions: Vec<RewardDistribution>,
    /// Accumulated rewards by account
    pub accumulated_rewards: HashMap<Address, Balance>,
    /// Last distribution block
    pub last_distribution_block: u64,
}

impl RewardDistributor {
    /// Create new reward distributor
    pub fn new() -> Self {
        Self {
            distributions: Vec::new(),
            accumulated_rewards: HashMap::new(),
            last_distribution_block: 0,
        }
    }
    
    /// Distribute rewards to stakers
    pub fn distribute_rewards(
        &mut self,
        staking_manager: &StakingManager,
        total_reward_amount: Balance,
        block_number: u64,
        timestamp: u64,
    ) -> Result<RewardDistribution> {
        if total_reward_amount == 0 {
            return Ok(RewardDistribution {
                block_number,
                total_rewards: 0,
                validator_rewards: HashMap::new(),
                timestamp,
            });
        }
        
        let active_validators = staking_manager.get_active_validators();
        let total_staked = staking_manager.get_total_staked();
        
        if total_staked == 0 || active_validators.is_empty() {
            return Ok(RewardDistribution {
                block_number,
                total_rewards: 0,
                validator_rewards: HashMap::new(),
                timestamp,
            });
        }
        
        let mut validator_rewards = HashMap::new();
        let mut total_distributed = 0u128;
        
        for validator_addr in active_validators {
            if let Some(validator_info) = staking_manager.get_validator(validator_addr) {
                if validator_info.total_stake == 0 {
                    continue;
                }
                
                // Calculate validator's share of rewards based on stake
                let validator_reward = self.calculate_validator_reward(
                    total_reward_amount,
                    validator_info.total_stake,
                    total_staked,
                )?;
                
                if validator_reward > 0 {
                    let reward_breakdown = self.distribute_validator_rewards(
                        staking_manager,
                        validator_addr,
                        validator_info,
                        validator_reward,
                    )?;
                    
                    validator_rewards.insert(validator_addr.clone(), reward_breakdown);
                    total_distributed = total_distributed.checked_add(validator_reward)
                        .ok_or(TokenomicsError::Overflow)?;
                }
            }
        }
        
        let distribution = RewardDistribution {
            block_number,
            total_rewards: total_distributed,
            validator_rewards,
            timestamp,
        };
        
        self.distributions.push(distribution.clone());
        self.last_distribution_block = block_number;
        
        Ok(distribution)
    }
    
    /// Calculate reward for a specific validator
    fn calculate_validator_reward(
        &self,
        total_rewards: Balance,
        validator_stake: Balance,
        total_stake: Balance,
    ) -> Result<Balance> {
        if total_stake == 0 {
            return Ok(0);
        }
        
        let reward = (Decimal::from(total_rewards) * Decimal::from(validator_stake) / Decimal::from(total_stake))
            .to_string().parse::<Balance>()
            .map_err(|_| TokenomicsError::Overflow)?;
        
        Ok(reward)
    }
    
    /// Distribute rewards for a specific validator
    fn distribute_validator_rewards(
        &mut self,
        staking_manager: &StakingManager,
        validator_addr: &Address,
        validator_info: &ValidatorInfo,
        total_reward: Balance,
    ) -> Result<ValidatorReward> {
        // Calculate commission
        let commission = (Decimal::from(total_reward) * validator_info.commission_rate)
            .to_string().parse::<Balance>()
            .map_err(|_| TokenomicsError::Overflow)?;
        
        let delegator_pool_reward = total_reward.checked_sub(commission)
            .ok_or(TokenomicsError::Overflow)?;
        
        // Distribute remaining rewards to delegators (including validator's self-delegation)
        let mut delegator_breakdown = HashMap::new();
        
        if let Some(delegations) = staking_manager.get_delegations(validator_addr) {
            for delegation in delegations {
                if delegation.amount > 0 {
                    let delegator_reward = self.calculate_delegator_reward(
                        delegator_pool_reward,
                        delegation.amount,
                        validator_info.total_stake,
                    )?;
                    
                    if delegator_reward > 0 {
                        delegator_breakdown.insert(delegation.delegator.clone(), delegator_reward);
                        
                        // Accumulate rewards for the delegator
                        let current_accumulated = self.accumulated_rewards
                            .get(&delegation.delegator)
                            .unwrap_or(&0);
                        
                        let new_accumulated = current_accumulated.checked_add(delegator_reward)
                            .ok_or(TokenomicsError::Overflow)?;
                        
                        self.accumulated_rewards.insert(delegation.delegator.clone(), new_accumulated);
                    }
                }
            }
        }
        
        // Add commission to validator's accumulated rewards
        if commission > 0 {
            let current_accumulated = self.accumulated_rewards
                .get(validator_addr)
                .unwrap_or(&0);
            
            let new_accumulated = current_accumulated.checked_add(commission)
                .ok_or(TokenomicsError::Overflow)?;
            
            self.accumulated_rewards.insert(validator_addr.clone(), new_accumulated);
        }
        
        Ok(ValidatorReward {
            validator: validator_addr.clone(),
            total_reward,
            commission,
            delegator_rewards: delegator_pool_reward,
            delegator_breakdown,
        })
    }
    
    /// Calculate delegator's share of rewards
    fn calculate_delegator_reward(
        &self,
        pool_reward: Balance,
        delegation_amount: Balance,
        total_validator_stake: Balance,
    ) -> Result<Balance> {
        if total_validator_stake == 0 {
            return Ok(0);
        }
        
        let reward = (Decimal::from(pool_reward) * Decimal::from(delegation_amount) / Decimal::from(total_validator_stake))
            .to_string().parse::<Balance>()
            .map_err(|_| TokenomicsError::Overflow)?;
        
        Ok(reward)
    }
    
    /// Claim accumulated rewards for an account
    pub fn claim_rewards(&mut self, account: &Address) -> Result<Balance> {
        let accumulated = self.accumulated_rewards.get(account).copied().unwrap_or(0);
        
        if accumulated > 0 {
            self.accumulated_rewards.insert(account.clone(), 0);
        }
        
        Ok(accumulated)
    }
    
    /// Get accumulated rewards for an account
    pub fn get_accumulated_rewards(&self, account: &Address) -> Balance {
        *self.accumulated_rewards.get(account).unwrap_or(&0)
    }
    
    /// Get total accumulated rewards across all accounts
    pub fn get_total_accumulated_rewards(&self) -> Balance {
        self.accumulated_rewards.values().sum()
    }
    
    /// Get reward distribution history
    pub fn get_distribution_history(&self) -> &Vec<RewardDistribution> {
        &self.distributions
    }
    
    /// Get recent distributions (last N)
    pub fn get_recent_distributions(&self, count: usize) -> Vec<&RewardDistribution> {
        self.distributions
            .iter()
            .rev()
            .take(count)
            .collect()
    }
    
    /// Get total rewards distributed
    pub fn get_total_rewards_distributed(&self) -> Balance {
        self.distributions
            .iter()
            .map(|d| d.total_rewards)
            .sum()
    }
    
    /// Calculate APY for a validator
    pub fn calculate_validator_apy(
        &self,
        validator: &Address,
        blocks_per_year: u64,
        current_stake: Balance,
    ) -> Result<Decimal> {
        if current_stake == 0 {
            return Ok(Decimal::ZERO);
        }
        
        // Get recent distributions (last 1000 blocks)
        let recent_count = 1000;
        let recent_distributions: Vec<_> = self.distributions
            .iter()
            .rev()
            .take(recent_count)
            .collect();
        
        if recent_distributions.is_empty() {
            return Ok(Decimal::ZERO);
        }
        
        // Sum rewards for this validator
        let total_recent_rewards: Balance = recent_distributions
            .iter()
            .filter_map(|dist| dist.validator_rewards.get(validator))
            .map(|reward| reward.total_reward)
            .sum();
        
        if total_recent_rewards == 0 {
            return Ok(Decimal::ZERO);
        }
        
        // Calculate average reward per block
        let avg_reward_per_block = Decimal::from(total_recent_rewards) / Decimal::from(recent_distributions.len());
        
        // Annualize
        let annual_rewards = avg_reward_per_block * Decimal::from(blocks_per_year);
        
        // Calculate APY
        let apy = annual_rewards / Decimal::from(current_stake);
        
        Ok(apy)
    }
}

impl Default for RewardDistributor {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::staking::staking_manager::{StakingManager, ValidatorStatus};
    use crate::config::{StakingConfig, SlashingConfig};
    use rust_decimal::Decimal;

    fn create_test_staking_config() -> StakingConfig {
        StakingConfig {
            minimum_stake: 1000,
            unbonding_period: 21 * 24 * 60 * 60,
            max_validators: 100,
            slashing: SlashingConfig {
                double_signing_penalty: Decimal::from_str_exact("0.05").unwrap(),
                downtime_penalty: Decimal::from_str_exact("0.01").unwrap(),
                governance_violation_penalty: Decimal::from_str_exact("0.10").unwrap(),
            },
        }
    }

    #[test]
    fn test_reward_distribution() {
        let config = create_test_staking_config();
        let mut staking_manager = StakingManager::new(config);
        let mut reward_distributor = RewardDistributor::new();
        
        // Create validator
        staking_manager.create_validator(
            "validator1".to_string(),
            10000,
            Decimal::from_str_exact("0.1").unwrap(), // 10% commission
            1,
        ).unwrap();
        
        // Add delegation
        staking_manager.delegate(
            "delegator1".to_string(),
            "validator1".to_string(),
            5000,
            2,
        ).unwrap();
        
        // Distribute rewards
        let distribution = reward_distributor.distribute_rewards(
            &staking_manager,
            1000, // 1000 DRT rewards
            10,
            1000,
        ).unwrap();
        
        assert_eq!(distribution.total_rewards, 1000);
        assert_eq!(distribution.validator_rewards.len(), 1);
        
        let validator_reward = distribution.validator_rewards.get("validator1").unwrap();
        assert_eq!(validator_reward.total_reward, 1000);
        assert_eq!(validator_reward.commission, 100); // 10% of 1000
        assert_eq!(validator_reward.delegator_rewards, 900); // 90% of 1000
        
        // Check accumulated rewards
        assert_eq!(reward_distributor.get_accumulated_rewards(&"validator1".to_string()), 700); // 100 commission + 600 from self-delegation
        assert_eq!(reward_distributor.get_accumulated_rewards(&"delegator1".to_string()), 300); // 300 from delegation
    }

    #[test]
    fn test_claim_rewards() {
        let config = create_test_staking_config();
        let mut staking_manager = StakingManager::new(config);
        let mut reward_distributor = RewardDistributor::new();
        
        // Setup validator and delegation
        staking_manager.create_validator(
            "validator1".to_string(),
            10000,
            Decimal::from_str_exact("0.1").unwrap(),
            1,
        ).unwrap();
        
        // Distribute rewards
        reward_distributor.distribute_rewards(
            &staking_manager,
            1000,
            10,
            1000,
        ).unwrap();
        
        // Claim rewards
        let claimed = reward_distributor.claim_rewards(&"validator1".to_string()).unwrap();
        assert!(claimed > 0);
        
        // Check that rewards are reset
        assert_eq!(reward_distributor.get_accumulated_rewards(&"validator1".to_string()), 0);
    }

    #[test]
    fn test_multiple_distributions() {
        let config = create_test_staking_config();
        let mut staking_manager = StakingManager::new(config);
        let mut reward_distributor = RewardDistributor::new();
        
        // Setup validator
        staking_manager.create_validator(
            "validator1".to_string(),
            10000,
            Decimal::from_str_exact("0.1").unwrap(),
            1,
        ).unwrap();
        
        // Multiple reward distributions
        for i in 1..=5 {
            reward_distributor.distribute_rewards(
                &staking_manager,
                1000,
                i * 10,
                i * 1000,
            ).unwrap();
        }
        
        assert_eq!(reward_distributor.get_distribution_history().len(), 5);
        assert_eq!(reward_distributor.get_total_rewards_distributed(), 5000);
        
        // Check accumulated rewards
        assert_eq!(reward_distributor.get_accumulated_rewards(&"validator1".to_string()), 5000); // All self-delegated
    }
}