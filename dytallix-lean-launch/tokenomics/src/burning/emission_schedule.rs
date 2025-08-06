//! Emission schedule for DRT token inflation

use serde::{Deserialize, Serialize};

use rust_decimal::Decimal;
use crate::{Address, Balance, Timestamp, Result, TokenomicsError};
use crate::config::{EmissionConfig, NetworkConfig};
use crate::tokens::drt_token::{DrtToken, EmissionResult};

/// Emission distribution targets
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmissionTargets {
    /// Block reward recipient (usually validator/mining pool)
    pub block_reward_recipient: Option<Address>,
    /// Staking reward pool
    pub staking_reward_pool: Address,
    /// AI module incentive pool
    pub ai_incentive_pool: Address,
    /// Bridge operations pool
    pub bridge_operations_pool: Address,
}

/// Emission schedule manager
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmissionSchedule {
    /// Emission configuration
    pub config: EmissionConfig,
    /// Network configuration
    pub network_config: NetworkConfig,
    /// Emission targets
    pub targets: EmissionTargets,
    /// Last emission block
    pub last_emission_block: u64,
    /// Total emissions by category
    pub total_emissions: EmissionTotals,
    /// Emission history
    pub emission_history: Vec<EmissionRecord>,
}

/// Total emissions tracking
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct EmissionTotals {
    /// Total block rewards emitted
    pub total_block_rewards: Balance,
    /// Total staking rewards emitted
    pub total_staking_rewards: Balance,
    /// Total AI incentives emitted
    pub total_ai_incentives: Balance,
    /// Total bridge operations emitted
    pub total_bridge_operations: Balance,
    /// Total emissions overall
    pub total_emitted: Balance,
}

/// Historical emission record
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmissionRecord {
    /// Block number
    pub block_number: u64,
    /// Timestamp
    pub timestamp: Timestamp,
    /// Emission result
    pub emission: EmissionResult,
    /// Recipients
    pub recipients: EmissionRecipients,
}

/// Emission recipients for a specific emission
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmissionRecipients {
    /// Block reward recipient
    pub block_reward_recipient: Option<Address>,
    /// Staking reward pool
    pub staking_pool: Address,
    /// AI incentive pool
    pub ai_pool: Address,
    /// Bridge operations pool
    pub bridge_pool: Address,
}

impl EmissionSchedule {
    /// Create new emission schedule
    pub fn new(
        config: EmissionConfig,
        network_config: NetworkConfig,
        targets: EmissionTargets,
    ) -> Self {
        Self {
            config,
            network_config,
            targets,
            last_emission_block: 0,
            total_emissions: EmissionTotals::default(),
            emission_history: Vec::new(),
        }
    }
    
    /// Process emission for a new block
    pub fn process_block_emission(
        &mut self,
        drt_token: &mut DrtToken,
        block_number: u64,
        timestamp: Timestamp,
        block_reward_recipient: Option<Address>,
    ) -> Result<EmissionResult> {
        // Skip if this block was already processed
        if block_number <= self.last_emission_block {
            return Ok(EmissionResult::default());
        }
        
        // Calculate emission for this time period
        let emission_result = drt_token.process_emission(
            timestamp,
            block_number,
            self.network_config.blocks_per_year,
        )?;
        
        if emission_result.total_emitted > 0 {
            // Distribute emissions to pools
            self.distribute_emissions(drt_token, &emission_result, block_number, timestamp)?;
            
            // Record emission
            let recipients = EmissionRecipients {
                block_reward_recipient: block_reward_recipient.clone(),
                staking_pool: self.targets.staking_reward_pool.clone(),
                ai_pool: self.targets.ai_incentive_pool.clone(),
                bridge_pool: self.targets.bridge_operations_pool.clone(),
            };
            
            self.emission_history.push(EmissionRecord {
                block_number,
                timestamp,
                emission: emission_result.clone(),
                recipients,
            });
            
            // Update totals
            self.update_totals(&emission_result);
        }
        
        self.last_emission_block = block_number;
        
        Ok(emission_result)
    }
    
    /// Distribute emissions to target accounts
    fn distribute_emissions(
        &mut self,
        drt_token: &mut DrtToken,
        emission: &EmissionResult,
        block_number: u64,
        _timestamp: Timestamp,
    ) -> Result<()> {
        let tx_hash = format!("emission_{}", block_number);
        
        // Mint block rewards (usually to current block proposer)
        if emission.block_rewards > 0 {
            let recipient = self.targets.block_reward_recipient.as_ref()
                .ok_or_else(|| TokenomicsError::InvalidConfig {
                    details: "No block reward recipient configured".to_string(),
                })?;
            
            drt_token.mint(recipient, emission.block_rewards, block_number, tx_hash.clone())?;
        }
        
        // Mint staking rewards to staking pool
        if emission.staking_rewards > 0 {
            drt_token.mint(
                &self.targets.staking_reward_pool,
                emission.staking_rewards,
                block_number,
                tx_hash.clone(),
            )?;
        }
        
        // Mint AI incentives to AI pool
        if emission.ai_incentives > 0 {
            drt_token.mint(
                &self.targets.ai_incentive_pool,
                emission.ai_incentives,
                block_number,
                tx_hash.clone(),
            )?;
        }
        
        // Mint bridge operations to bridge pool
        if emission.bridge_operations > 0 {
            drt_token.mint(
                &self.targets.bridge_operations_pool,
                emission.bridge_operations,
                block_number,
                tx_hash,
            )?;
        }
        
        Ok(())
    }
    
    /// Update emission totals
    fn update_totals(&mut self, emission: &EmissionResult) {
        self.total_emissions.total_block_rewards = self.total_emissions.total_block_rewards
            .saturating_add(emission.block_rewards);
        self.total_emissions.total_staking_rewards = self.total_emissions.total_staking_rewards
            .saturating_add(emission.staking_rewards);
        self.total_emissions.total_ai_incentives = self.total_emissions.total_ai_incentives
            .saturating_add(emission.ai_incentives);
        self.total_emissions.total_bridge_operations = self.total_emissions.total_bridge_operations
            .saturating_add(emission.bridge_operations);
        self.total_emissions.total_emitted = self.total_emissions.total_emitted
            .saturating_add(emission.total_emitted);
    }
    
    /// Set block reward recipient
    pub fn set_block_reward_recipient(&mut self, recipient: Address) {
        self.targets.block_reward_recipient = Some(recipient);
    }
    
    /// Update emission targets
    pub fn update_targets(&mut self, targets: EmissionTargets) {
        self.targets = targets;
    }
    
    /// Get emission targets
    pub fn get_targets(&self) -> &EmissionTargets {
        &self.targets
    }
    
    /// Get total emissions
    pub fn get_total_emissions(&self) -> &EmissionTotals {
        &self.total_emissions
    }
    
    /// Get emission history
    pub fn get_emission_history(&self) -> &Vec<EmissionRecord> {
        &self.emission_history
    }
    
    /// Get recent emissions
    pub fn get_recent_emissions(&self, count: usize) -> Vec<&EmissionRecord> {
        self.emission_history
            .iter()
            .rev()
            .take(count)
            .collect()
    }
    
    /// Calculate current inflation rate
    pub fn calculate_current_inflation_rate(&self, current_supply: Balance) -> Decimal {
        if current_supply == 0 || self.emission_history.is_empty() {
            return Decimal::ZERO;
        }
        
        // Use recent emissions to calculate current rate
        let recent_count = 1000.min(self.emission_history.len());
        let recent_emissions: Vec<_> = self.emission_history
            .iter()
            .rev()
            .take(recent_count)
            .collect();
        
        if recent_emissions.is_empty() {
            return Decimal::ZERO;
        }
        
        let total_recent_emissions: Balance = recent_emissions
            .iter()
            .map(|record| record.emission.total_emitted)
            .sum();
        
        // Calculate annualized rate
        let avg_emission_per_block = Decimal::from(total_recent_emissions) / Decimal::from(recent_count);
        let annual_emissions = avg_emission_per_block * Decimal::from(self.network_config.blocks_per_year);
        
        annual_emissions / Decimal::from(current_supply)
    }
    
    /// Get emissions for a time range
    pub fn get_emissions_in_range(
        &self,
        start_timestamp: Timestamp,
        end_timestamp: Timestamp,
    ) -> Vec<&EmissionRecord> {
        self.emission_history
            .iter()
            .filter(|record| record.timestamp >= start_timestamp && record.timestamp <= end_timestamp)
            .collect()
    }
    
    /// Calculate total emissions in a time range
    pub fn calculate_emissions_in_range(
        &self,
        start_timestamp: Timestamp,
        end_timestamp: Timestamp,
    ) -> Balance {
        self.get_emissions_in_range(start_timestamp, end_timestamp)
            .iter()
            .map(|record| record.emission.total_emitted)
            .sum()
    }
    
    /// Get average emission per block
    pub fn get_average_emission_per_block(&self) -> Balance {
        if self.emission_history.is_empty() {
            return 0;
        }
        
        self.total_emissions.total_emitted / self.emission_history.len() as u128
    }
    
    /// Clean up old emission records
    pub fn cleanup_old_records(&mut self, keep_count: usize) {
        if self.emission_history.len() > keep_count {
            let remove_count = self.emission_history.len() - keep_count;
            self.emission_history.drain(0..remove_count);
        }
    }
    
    /// Validate emission configuration
    pub fn validate_config(&self) -> Result<()> {
        // Check that emission percentages sum to 1.0
        let total = self.config.block_rewards
            + self.config.staking_rewards
            + self.config.ai_module_incentives
            + self.config.bridge_operations;
        
        if total != Decimal::from(1) {
            return Err(TokenomicsError::InvalidConfig {
                details: format!("Emission percentages must sum to 1.0, got {}", total),
            });
        }
        
        // Validate network configuration
        if self.network_config.blocks_per_year == 0 {
            return Err(TokenomicsError::InvalidConfig {
                details: "Blocks per year must be greater than 0".to_string(),
            });
        }
        
        if self.network_config.block_time == 0 {
            return Err(TokenomicsError::InvalidConfig {
                details: "Block time must be greater than 0".to_string(),
            });
        }
        
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::tokens::drt_token::DrtToken;
    use crate::config::{DrtConfig, BurnConfig};
    use rust_decimal::Decimal;

    fn create_test_emission_config() -> EmissionConfig {
        EmissionConfig {
            block_rewards: Decimal::from_str_exact("0.60").unwrap(),
            staking_rewards: Decimal::from_str_exact("0.25").unwrap(),
            ai_module_incentives: Decimal::from_str_exact("0.10").unwrap(),
            bridge_operations: Decimal::from_str_exact("0.05").unwrap(),
        }
    }

    fn create_test_network_config() -> NetworkConfig {
        NetworkConfig {
            block_time: 6,
            blocks_per_year: 5256000,
            genesis_timestamp: 0,
            is_testnet: true,
        }
    }

    fn create_test_targets() -> EmissionTargets {
        EmissionTargets {
            block_reward_recipient: Some("validator1".to_string()),
            staking_reward_pool: "staking_pool".to_string(),
            ai_incentive_pool: "ai_pool".to_string(),
            bridge_operations_pool: "bridge_pool".to_string(),
        }
    }

    fn create_test_drt_token() -> DrtToken {
        let config = DrtConfig {
            name: "Test DRT".to_string(),
            symbol: "TDRT".to_string(),
            decimals: 18,
            annual_inflation_rate: Decimal::from_str_exact("0.05").unwrap(),
            emission: create_test_emission_config(),
            burn: BurnConfig {
                transaction_fee_burn: Decimal::from_str_exact("1.00").unwrap(),
                ai_service_fee_burn: Decimal::from_str_exact("0.50").unwrap(),
                bridge_fee_burn: Decimal::from_str_exact("0.75").unwrap(),
            },
        };
        
        let mut token = DrtToken::new(config);
        token.initialize(0).unwrap();
        // Start with some initial supply for emission calculations
        token.mint(&"initial_holder".to_string(), 1000000, 0, "genesis".to_string()).unwrap();
        token
    }

    #[test]
    fn test_emission_schedule_creation() {
        let emission_config = create_test_emission_config();
        let network_config = create_test_network_config();
        let targets = create_test_targets();
        
        let schedule = EmissionSchedule::new(emission_config, network_config, targets);
        
        assert_eq!(schedule.last_emission_block, 0);
        assert_eq!(schedule.total_emissions.total_emitted, 0);
        assert!(schedule.validate_config().is_ok());
    }

    #[test]
    fn test_block_emission() {
        let emission_config = create_test_emission_config();
        let network_config = create_test_network_config();
        let targets = create_test_targets();
        
        let mut schedule = EmissionSchedule::new(emission_config, network_config, targets);
        let mut drt_token = create_test_drt_token();
        
        // Process emission for first block
        let result = schedule.process_block_emission(
            &mut drt_token,
            1,
            3600, // 1 hour after genesis
            Some("validator1".to_string()),
        ).unwrap();
        
        assert!(result.total_emitted > 0);
        assert_eq!(schedule.last_emission_block, 1);
        assert_eq!(schedule.emission_history.len(), 1);
        
        // Check that tokens were minted to pools
        assert!(drt_token.balance_of(&"validator1".to_string()) > 0);
        assert!(drt_token.balance_of(&"staking_pool".to_string()) > 0);
        assert!(drt_token.balance_of(&"ai_pool".to_string()) > 0);
        assert!(drt_token.balance_of(&"bridge_pool".to_string()) > 0);
    }

    #[test]
    fn test_emission_distribution() {
        let emission_config = create_test_emission_config();
        let network_config = create_test_network_config();
        let targets = create_test_targets();
        
        let mut schedule = EmissionSchedule::new(emission_config, network_config, targets);
        let mut drt_token = create_test_drt_token();
        
        // Process emission
        let result = schedule.process_block_emission(
            &mut drt_token,
            1,
            3600,
            Some("validator1".to_string()),
        ).unwrap();
        
        // Check distribution ratios
        let validator_balance = drt_token.balance_of(&"validator1".to_string());
        let staking_balance = drt_token.balance_of(&"staking_pool".to_string());
        let ai_balance = drt_token.balance_of(&"ai_pool".to_string());
        let bridge_balance = drt_token.balance_of(&"bridge_pool".to_string());
        
        let total_distributed = validator_balance + staking_balance + ai_balance + bridge_balance;
        
        // Check ratios are approximately correct (allowing for rounding)
        let validator_ratio = Decimal::from(validator_balance) / Decimal::from(total_distributed);
        let staking_ratio = Decimal::from(staking_balance) / Decimal::from(total_distributed);
        
        assert!((validator_ratio - Decimal::from_str_exact("0.60").unwrap()).abs() < Decimal::from_str_exact("0.01").unwrap());
        assert!((staking_ratio - Decimal::from_str_exact("0.25").unwrap()).abs() < Decimal::from_str_exact("0.01").unwrap());
    }

    #[test]
    fn test_multiple_emissions() {
        let emission_config = create_test_emission_config();
        let network_config = create_test_network_config();
        let targets = create_test_targets();
        
        let mut schedule = EmissionSchedule::new(emission_config, network_config, targets);
        let mut drt_token = create_test_drt_token();
        
        // Process multiple emissions
        for i in 1..=5 {
            schedule.process_block_emission(
                &mut drt_token,
                i,
                i * 3600, // Each block 1 hour apart
                Some("validator1".to_string()),
            ).unwrap();
        }
        
        assert_eq!(schedule.emission_history.len(), 5);
        assert!(schedule.total_emissions.total_emitted > 0);
        
        // Check inflation rate calculation
        let inflation_rate = schedule.calculate_current_inflation_rate(drt_token.current_supply());
        assert!(inflation_rate > Decimal::ZERO);
    }

    #[test]
    fn test_emission_statistics() {
        let emission_config = create_test_emission_config();
        let network_config = create_test_network_config();
        let targets = create_test_targets();
        
        let mut schedule = EmissionSchedule::new(emission_config, network_config, targets);
        let mut drt_token = create_test_drt_token();
        
        // Process some emissions
        for i in 1..=10 {
            schedule.process_block_emission(
                &mut drt_token,
                i,
                i * 3600,
                Some("validator1".to_string()),
            ).unwrap();
        }
        
        let totals = schedule.get_total_emissions();
        assert!(totals.total_block_rewards > 0);
        assert!(totals.total_staking_rewards > 0);
        assert!(totals.total_ai_incentives > 0);
        assert!(totals.total_bridge_operations > 0);
        
        let avg_emission = schedule.get_average_emission_per_block();
        assert!(avg_emission > 0);
        
        // Test recent emissions
        let recent = schedule.get_recent_emissions(5);
        assert_eq!(recent.len(), 5);
        
        // Test emissions in range
        let range_emissions = schedule.get_emissions_in_range(3600, 5 * 3600);
        assert_eq!(range_emissions.len(), 4); // Blocks 1-4
    }

    #[test]
    fn test_config_validation() {
        let mut emission_config = create_test_emission_config();
        let network_config = create_test_network_config();
        let targets = create_test_targets();
        
        // Invalid emission config (doesn't sum to 1.0)
        emission_config.block_rewards = Decimal::from_str_exact("0.70").unwrap();
        
        let schedule = EmissionSchedule::new(emission_config, network_config, targets);
        assert!(schedule.validate_config().is_err());
    }
}