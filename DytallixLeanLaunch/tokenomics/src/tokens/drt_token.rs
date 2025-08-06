//! DRT (Dytallix Reward Token) implementation

use std::collections::HashMap;
use serde::{Deserialize, Serialize};

use rust_decimal::Decimal;
use crate::{Address, Balance, Result, TokenomicsError, Timestamp};
use crate::config::DrtConfig;
use super::{Token, TransferEvent, ApprovalEvent, MintEvent, BurnEvent};

/// DRT Token implementation with inflation and burning capabilities
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DrtToken {
    /// Token configuration
    pub config: DrtConfig,
    /// Account balances
    pub balances: HashMap<Address, Balance>,
    /// Token allowances (owner -> spender -> amount)
    pub allowances: HashMap<Address, HashMap<Address, Balance>>,
    /// Current total supply (changes with mint/burn)
    pub current_supply: Balance,
    /// Total minted amount (historical)
    pub total_minted: Balance,
    /// Total burned amount (historical)
    pub total_burned: Balance,
    /// Last emission timestamp
    pub last_emission_timestamp: Timestamp,
    /// Transfer events
    pub transfer_events: Vec<TransferEvent>,
    /// Approval events
    pub approval_events: Vec<ApprovalEvent>,
    /// Mint events
    pub mint_events: Vec<MintEvent>,
    /// Burn events
    pub burn_events: Vec<BurnEvent>,
}

impl DrtToken {
    /// Create new DRT token instance
    pub fn new(config: DrtConfig) -> Self {
        Self {
            config,
            balances: HashMap::new(),
            allowances: HashMap::new(),
            current_supply: 0,
            total_minted: 0,
            total_burned: 0,
            last_emission_timestamp: 0,
            transfer_events: Vec::new(),
            approval_events: Vec::new(),
            mint_events: Vec::new(),
            burn_events: Vec::new(),
        }
    }
    
    /// Initialize token with genesis block timestamp
    pub fn initialize(&mut self, genesis_timestamp: Timestamp) -> Result<()> {
        self.last_emission_timestamp = genesis_timestamp;
        Ok(())
    }
    
    /// Calculate emission amount for a given time period
    pub fn calculate_emission(&self, from_timestamp: Timestamp, to_timestamp: Timestamp, _blocks_per_year: u64) -> Result<Balance> {
        if to_timestamp <= from_timestamp {
            return Ok(0);
        }
        
        let time_diff = to_timestamp - from_timestamp;
        let seconds_per_year = 365 * 24 * 60 * 60;
        
        // Calculate annualized emission
        let annual_emission = self.current_supply
            .saturating_mul(self.config.annual_inflation_rate.to_string().parse::<u128>().unwrap_or(5))
            .saturating_div(100);
        
        // Calculate emission for the time period
        let emission = annual_emission
            .saturating_mul(time_diff as u128)
            .saturating_div(seconds_per_year);
        
        Ok(emission)
    }
    
    /// Mint new tokens (inflation)
    pub fn mint(&mut self, to: &Address, amount: Balance, block_number: u64, tx_hash: String) -> Result<()> {
        let current_balance = self.balance_of(to);
        let new_balance = current_balance.checked_add(amount)
            .ok_or(TokenomicsError::Overflow)?;
        
        self.balances.insert(to.clone(), new_balance);
        
        self.current_supply = self.current_supply.checked_add(amount)
            .ok_or(TokenomicsError::Overflow)?;
        
        self.total_minted = self.total_minted.checked_add(amount)
            .ok_or(TokenomicsError::Overflow)?;
        
        // Record mint event
        self.mint_events.push(MintEvent {
            to: to.clone(),
            amount,
            block_number,
            tx_hash,
        });
        
        Ok(())
    }
    
    /// Burn tokens from an account
    pub fn burn(&mut self, from: &Address, amount: Balance, block_number: u64, tx_hash: String, reason: String) -> Result<()> {
        let current_balance = self.balance_of(from);
        if current_balance < amount {
            return Err(TokenomicsError::InsufficientBalance {
                required: amount,
                available: current_balance,
            });
        }
        
        let new_balance = current_balance.checked_sub(amount)
            .ok_or(TokenomicsError::Overflow)?;
        
        self.balances.insert(from.clone(), new_balance);
        
        self.current_supply = self.current_supply.checked_sub(amount)
            .ok_or(TokenomicsError::Overflow)?;
        
        self.total_burned = self.total_burned.checked_add(amount)
            .ok_or(TokenomicsError::Overflow)?;
        
        // Record burn event
        self.burn_events.push(BurnEvent {
            from: from.clone(),
            amount,
            block_number,
            tx_hash,
            reason,
        });
        
        Ok(())
    }
    
    /// Process emission for a new block
    pub fn process_emission(&mut self, timestamp: Timestamp, _block_number: u64, blocks_per_year: u64) -> Result<EmissionResult> {
        if timestamp <= self.last_emission_timestamp {
            return Ok(EmissionResult::default());
        }
        
        let emission_amount = self.calculate_emission(self.last_emission_timestamp, timestamp, blocks_per_year)?;
        
        if emission_amount == 0 {
            self.last_emission_timestamp = timestamp;
            return Ok(EmissionResult::default());
        }
        
        // Distribute emission according to configuration
        let block_rewards = self.calculate_portion(emission_amount, &self.config.emission.block_rewards)?;
        let staking_rewards = self.calculate_portion(emission_amount, &self.config.emission.staking_rewards)?;
        let ai_incentives = self.calculate_portion(emission_amount, &self.config.emission.ai_module_incentives)?;
        let bridge_operations = self.calculate_portion(emission_amount, &self.config.emission.bridge_operations)?;
        
        self.last_emission_timestamp = timestamp;
        
        Ok(EmissionResult {
            block_rewards,
            staking_rewards,
            ai_incentives,
            bridge_operations,
            total_emitted: emission_amount,
        })
    }
    
    /// Calculate fee burn amounts
    pub fn calculate_burn_amounts(&self, transaction_fees: Balance, ai_service_fees: Balance, bridge_fees: Balance) -> Result<BurnAmounts> {
        let tx_fee_burn = self.calculate_portion(transaction_fees, &self.config.burn.transaction_fee_burn)?;
        let ai_fee_burn = self.calculate_portion(ai_service_fees, &self.config.burn.ai_service_fee_burn)?;
        let bridge_fee_burn = self.calculate_portion(bridge_fees, &self.config.burn.bridge_fee_burn)?;
        
        Ok(BurnAmounts {
            transaction_fee_burn: tx_fee_burn,
            ai_service_fee_burn: ai_fee_burn,
            bridge_fee_burn: bridge_fee_burn,
            total_burn: tx_fee_burn.saturating_add(ai_fee_burn).saturating_add(bridge_fee_burn),
        })
    }
    
    /// Calculate a portion of an amount based on percentage
    fn calculate_portion(&self, amount: Balance, percentage: &Decimal) -> Result<Balance> {
        let decimal_amount = Decimal::from(amount);
        let result = decimal_amount * percentage;
        
        result.to_string().parse::<Balance>()
            .map_err(|_| TokenomicsError::Overflow)
    }
    
    /// Get current supply
    pub fn current_supply(&self) -> Balance {
        self.current_supply
    }
    
    /// Get total minted (historical)
    pub fn total_minted(&self) -> Balance {
        self.total_minted
    }
    
    /// Get total burned (historical)
    pub fn total_burned(&self) -> Balance {
        self.total_burned
    }
    
    /// Get net supply change (minted - burned)
    pub fn net_supply_change(&self) -> i128 {
        self.total_minted as i128 - self.total_burned as i128
    }
    
    /// Get last emission timestamp
    pub fn last_emission_timestamp(&self) -> Timestamp {
        self.last_emission_timestamp
    }
}

impl Token for DrtToken {
    fn name(&self) -> &str {
        &self.config.name
    }
    
    fn symbol(&self) -> &str {
        &self.config.symbol
    }
    
    fn decimals(&self) -> u8 {
        self.config.decimals
    }
    
    fn total_supply(&self) -> Balance {
        self.current_supply
    }
    
    fn balance_of(&self, account: &Address) -> Balance {
        *self.balances.get(account).unwrap_or(&0)
    }
    
    fn transfer(&mut self, from: &Address, to: &Address, amount: Balance) -> Result<()> {
        let from_balance = self.balance_of(from);
        if from_balance < amount {
            return Err(TokenomicsError::InsufficientBalance {
                required: amount,
                available: from_balance,
            });
        }
        
        let new_from_balance = from_balance.checked_sub(amount)
            .ok_or(TokenomicsError::Overflow)?;
        let to_balance = self.balance_of(to);
        let new_to_balance = to_balance.checked_add(amount)
            .ok_or(TokenomicsError::Overflow)?;
        
        self.balances.insert(from.clone(), new_from_balance);
        self.balances.insert(to.clone(), new_to_balance);
        
        // Record transfer event
        self.transfer_events.push(TransferEvent {
            from: from.clone(),
            to: to.clone(),
            amount,
            block_number: 0, // To be set by runtime
            tx_hash: String::new(), // To be set by runtime
        });
        
        Ok(())
    }
    
    fn allowance(&self, owner: &Address, spender: &Address) -> Balance {
        self.allowances
            .get(owner)
            .and_then(|allowances| allowances.get(spender))
            .copied()
            .unwrap_or(0)
    }
    
    fn approve(&mut self, owner: &Address, spender: &Address, amount: Balance) -> Result<()> {
        self.allowances
            .entry(owner.clone())
            .or_insert_with(HashMap::new)
            .insert(spender.clone(), amount);
        
        // Record approval event
        self.approval_events.push(ApprovalEvent {
            owner: owner.clone(),
            spender: spender.clone(),
            amount,
            block_number: 0, // To be set by runtime
            tx_hash: String::new(), // To be set by runtime
        });
        
        Ok(())
    }
    
    fn transfer_from(&mut self, spender: &Address, from: &Address, to: &Address, amount: Balance) -> Result<()> {
        let allowed = self.allowance(from, spender);
        if allowed < amount {
            return Err(TokenomicsError::InsufficientBalance {
                required: amount,
                available: allowed,
            });
        }
        
        // Update allowance
        let new_allowance = allowed.checked_sub(amount)
            .ok_or(TokenomicsError::Overflow)?;
        self.allowances
            .entry(from.clone())
            .or_insert_with(HashMap::new)
            .insert(spender.clone(), new_allowance);
        
        // Perform transfer
        self.transfer(from, to, amount)?;
        
        Ok(())
    }
}

/// Result of emission processing
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmissionResult {
    /// Block rewards amount
    pub block_rewards: Balance,
    /// Staking rewards amount
    pub staking_rewards: Balance,
    /// AI module incentives amount
    pub ai_incentives: Balance,
    /// Bridge operations amount
    pub bridge_operations: Balance,
    /// Total amount emitted
    pub total_emitted: Balance,
}

impl Default for EmissionResult {
    fn default() -> Self {
        Self {
            block_rewards: 0,
            staking_rewards: 0,
            ai_incentives: 0,
            bridge_operations: 0,
            total_emitted: 0,
        }
    }
}

/// Burn amounts for different fee types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BurnAmounts {
    /// Transaction fee burn amount
    pub transaction_fee_burn: Balance,
    /// AI service fee burn amount
    pub ai_service_fee_burn: Balance,
    /// Bridge fee burn amount
    pub bridge_fee_burn: Balance,
    /// Total burn amount
    pub total_burn: Balance,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::{EmissionConfig, BurnConfig};
    use rust_decimal::Decimal;

    fn create_test_config() -> DrtConfig {
        DrtConfig {
            name: "Test DRT".to_string(),
            symbol: "TDRT".to_string(),
            decimals: 18,
            annual_inflation_rate: Decimal::from_str_exact("0.05").unwrap(),
            emission: EmissionConfig {
                block_rewards: Decimal::from_str_exact("0.60").unwrap(),
                staking_rewards: Decimal::from_str_exact("0.25").unwrap(),
                ai_module_incentives: Decimal::from_str_exact("0.10").unwrap(),
                bridge_operations: Decimal::from_str_exact("0.05").unwrap(),
            },
            burn: BurnConfig {
                transaction_fee_burn: Decimal::from_str_exact("1.00").unwrap(),
                ai_service_fee_burn: Decimal::from_str_exact("0.50").unwrap(),
                bridge_fee_burn: Decimal::from_str_exact("0.75").unwrap(),
            },
        }
    }

    #[test]
    fn test_token_creation() {
        let config = create_test_config();
        let token = DrtToken::new(config.clone());
        
        assert_eq!(token.name(), "Test DRT");
        assert_eq!(token.symbol(), "TDRT");
        assert_eq!(token.decimals(), 18);
        assert_eq!(token.total_supply(), 0);
    }

    #[test]
    fn test_minting() {
        let config = create_test_config();
        let mut token = DrtToken::new(config);
        
        let result = token.mint(&"alice".to_string(), 1000, 1, "0x123".to_string());
        assert!(result.is_ok());
        
        assert_eq!(token.balance_of(&"alice".to_string()), 1000);
        assert_eq!(token.current_supply(), 1000);
        assert_eq!(token.total_minted(), 1000);
    }

    #[test]
    fn test_burning() {
        let config = create_test_config();
        let mut token = DrtToken::new(config);
        
        token.mint(&"alice".to_string(), 1000, 1, "0x123".to_string()).unwrap();
        
        let result = token.burn(&"alice".to_string(), 300, 2, "0x456".to_string(), "Fee burn".to_string());
        assert!(result.is_ok());
        
        assert_eq!(token.balance_of(&"alice".to_string()), 700);
        assert_eq!(token.current_supply(), 700);
        assert_eq!(token.total_burned(), 300);
    }

    #[test]
    fn test_emission_calculation() {
        let config = create_test_config();
        let mut token = DrtToken::new(config);
        
        // Start with some supply
        token.mint(&"treasury".to_string(), 1000000, 1, "0x123".to_string()).unwrap();
        
        let from_timestamp = 0;
        let to_timestamp = 31536000; // 1 year
        let blocks_per_year = 5256000;
        
        let emission = token.calculate_emission(from_timestamp, to_timestamp, blocks_per_year).unwrap();
        
        // Should be approximately 5% of current supply
        let expected = 50000; // 5% of 1,000,000
        assert!((emission as i128 - expected as i128).abs() < 1000);
    }

    #[test]
    fn test_burn_calculation() {
        let config = create_test_config();
        let token = DrtToken::new(config);
        
        let burn_amounts = token.calculate_burn_amounts(1000, 500, 200).unwrap();
        
        assert_eq!(burn_amounts.transaction_fee_burn, 1000); // 100%
        assert_eq!(burn_amounts.ai_service_fee_burn, 250); // 50%
        assert_eq!(burn_amounts.bridge_fee_burn, 150); // 75%
        assert_eq!(burn_amounts.total_burn, 1400);
    }
}