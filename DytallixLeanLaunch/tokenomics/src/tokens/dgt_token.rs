//! DGT (Dytallix Governance Token) implementation

use std::collections::HashMap;
use serde::{Deserialize, Serialize};

use crate::{Address, Balance, Result, TokenomicsError};
use crate::config::DgtConfig;
use super::{Token, TransferEvent, ApprovalEvent};

/// DGT Token implementation with governance and staking capabilities
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DgtToken {
    /// Token configuration
    pub config: DgtConfig,
    /// Account balances
    pub balances: HashMap<Address, Balance>,
    /// Token allowances (owner -> spender -> amount)
    pub allowances: HashMap<Address, HashMap<Address, Balance>>,
    /// Staked balances (account -> staked_amount)
    pub staked_balances: HashMap<Address, Balance>,
    /// Delegation mapping (delegator -> validator)
    pub delegations: HashMap<Address, Address>,
    /// Total staked amount
    pub total_staked: Balance,
    /// Transfer events
    pub transfer_events: Vec<TransferEvent>,
    /// Approval events
    pub approval_events: Vec<ApprovalEvent>,
}

impl DgtToken {
    /// Create new DGT token instance
    pub fn new(config: DgtConfig) -> Self {
        Self {
            config,
            balances: HashMap::new(),
            allowances: HashMap::new(),
            staked_balances: HashMap::new(),
            delegations: HashMap::new(),
            total_staked: 0,
            transfer_events: Vec::new(),
            approval_events: Vec::new(),
        }
    }
    
    /// Initialize token with allocation
    pub fn initialize(&mut self, allocations: HashMap<Address, Balance>) -> Result<()> {
        let mut total_allocated = 0u128;
        
        for (account, amount) in allocations {
            total_allocated = total_allocated.checked_add(amount)
                .ok_or(TokenomicsError::Overflow)?;
            
            self.balances.insert(account, amount);
        }
        
        if total_allocated != self.config.total_supply {
            return Err(TokenomicsError::InvalidConfig {
                details: format!(
                    "Total allocation {} does not match total supply {}",
                    total_allocated, self.config.total_supply
                )
            });
        }
        
        Ok(())
    }
    
    /// Stake tokens for governance and validation
    pub fn stake(&mut self, account: &Address, amount: Balance) -> Result<()> {
        let balance = self.balance_of(account);
        if balance < amount {
            return Err(TokenomicsError::InsufficientBalance {
                required: amount,
                available: balance,
            });
        }
        
        // Move tokens from balance to staked
        let new_balance = balance.checked_sub(amount)
            .ok_or(TokenomicsError::Overflow)?;
        self.balances.insert(account.clone(), new_balance);
        
        let current_staked = self.staked_balances.get(account).unwrap_or(&0);
        let new_staked = current_staked.checked_add(amount)
            .ok_or(TokenomicsError::Overflow)?;
        self.staked_balances.insert(account.clone(), new_staked);
        
        self.total_staked = self.total_staked.checked_add(amount)
            .ok_or(TokenomicsError::Overflow)?;
        
        Ok(())
    }
    
    /// Unstake tokens (begins unbonding period)
    pub fn unstake(&mut self, account: &Address, amount: Balance) -> Result<()> {
        let staked = self.staked_balance(account);
        if staked < amount {
            return Err(TokenomicsError::InsufficientBalance {
                required: amount,
                available: staked,
            });
        }
        
        // Move tokens from staked back to balance
        let new_staked = staked.checked_sub(amount)
            .ok_or(TokenomicsError::Overflow)?;
        self.staked_balances.insert(account.clone(), new_staked);
        
        let current_balance = self.balance_of(account);
        let new_balance = current_balance.checked_add(amount)
            .ok_or(TokenomicsError::Overflow)?;
        self.balances.insert(account.clone(), new_balance);
        
        self.total_staked = self.total_staked.checked_sub(amount)
            .ok_or(TokenomicsError::Overflow)?;
        
        Ok(())
    }
    
    /// Delegate staked tokens to a validator
    pub fn delegate(&mut self, delegator: &Address, validator: &Address) -> Result<()> {
        if self.staked_balance(delegator) == 0 {
            return Err(TokenomicsError::InsufficientBalance {
                required: 1,
                available: 0,
            });
        }
        
        self.delegations.insert(delegator.clone(), validator.clone());
        Ok(())
    }
    
    /// Get staked balance for an account
    pub fn staked_balance(&self, account: &Address) -> Balance {
        *self.staked_balances.get(account).unwrap_or(&0)
    }
    
    /// Get voting power for an account (staked + delegated)
    pub fn voting_power(&self, account: &Address) -> Balance {
        let mut power = self.staked_balance(account);
        
        // Add delegated voting power
        for (delegator, validator) in &self.delegations {
            if validator == account {
                power = power.saturating_add(self.staked_balance(delegator));
            }
        }
        
        power
    }
    
    /// Get total voting power in the system
    pub fn total_voting_power(&self) -> Balance {
        self.total_staked
    }
    
    /// Get delegation target for an account
    pub fn delegation_target(&self, delegator: &Address) -> Option<&Address> {
        self.delegations.get(delegator)
    }
    
    /// Slash tokens from an account (for penalties)
    pub fn slash(&mut self, account: &Address, amount: Balance) -> Result<()> {
        let staked = self.staked_balance(account);
        let to_slash = amount.min(staked);
        
        if to_slash > 0 {
            let new_staked = staked - to_slash;
            self.staked_balances.insert(account.clone(), new_staked);
            
            self.total_staked = self.total_staked.saturating_sub(to_slash);
            
            // Slashed tokens are burned (removed from total supply)
            // This is handled at the protocol level
        }
        
        Ok(())
    }
}

impl Token for DgtToken {
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
        self.config.total_supply
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
            total_supply: 1000,
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
    fn test_token_creation() {
        let config = create_test_config();
        let token = DgtToken::new(config.clone());
        
        assert_eq!(token.name(), "Test DGT");
        assert_eq!(token.symbol(), "TDGT");
        assert_eq!(token.decimals(), 18);
        assert_eq!(token.total_supply(), 1000);
    }

    #[test]
    fn test_initialization() {
        let config = create_test_config();
        let mut token = DgtToken::new(config);
        
        let mut allocations = HashMap::new();
        allocations.insert("alice".to_string(), 500);
        allocations.insert("bob".to_string(), 500);
        
        assert!(token.initialize(allocations).is_ok());
        assert_eq!(token.balance_of(&"alice".to_string()), 500);
        assert_eq!(token.balance_of(&"bob".to_string()), 500);
    }

    #[test]
    fn test_transfer() {
        let config = create_test_config();
        let mut token = DgtToken::new(config);
        
        let mut allocations = HashMap::new();
        allocations.insert("alice".to_string(), 1000);
        token.initialize(allocations).unwrap();
        
        let result = token.transfer(&"alice".to_string(), &"bob".to_string(), 300);
        assert!(result.is_ok());
        
        assert_eq!(token.balance_of(&"alice".to_string()), 700);
        assert_eq!(token.balance_of(&"bob".to_string()), 300);
    }

    #[test]
    fn test_staking() {
        let config = create_test_config();
        let mut token = DgtToken::new(config);
        
        let mut allocations = HashMap::new();
        allocations.insert("alice".to_string(), 1000);
        token.initialize(allocations).unwrap();
        
        let result = token.stake(&"alice".to_string(), 400);
        assert!(result.is_ok());
        
        assert_eq!(token.balance_of(&"alice".to_string()), 600);
        assert_eq!(token.staked_balance(&"alice".to_string()), 400);
        assert_eq!(token.total_staked, 400);
    }

    #[test]
    fn test_voting_power() {
        let config = create_test_config();
        let mut token = DgtToken::new(config);
        
        let mut allocations = HashMap::new();
        allocations.insert("alice".to_string(), 500);
        allocations.insert("bob".to_string(), 500);
        token.initialize(allocations).unwrap();
        
        token.stake(&"alice".to_string(), 200).unwrap();
        token.stake(&"bob".to_string(), 300).unwrap();
        
        // Before delegation
        assert_eq!(token.voting_power(&"alice".to_string()), 200);
        
        // After bob delegates to alice
        token.delegate(&"bob".to_string(), &"alice".to_string()).unwrap();
        assert_eq!(token.voting_power(&"alice".to_string()), 500); // 200 + 300
    }
}