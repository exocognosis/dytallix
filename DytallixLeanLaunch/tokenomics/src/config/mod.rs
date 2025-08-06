//! Configuration management for the tokenomics system

use serde::{Deserialize, Serialize};
use rust_decimal::Decimal;
use crate::{Balance, Timestamp};

/// Main tokenomics configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenomicsConfig {
    /// DGT token configuration
    pub dgt: DgtConfig,
    /// DRT token configuration  
    pub drt: DrtConfig,
    /// Staking configuration
    pub staking: StakingConfig,
    /// Governance configuration
    pub governance: GovernanceConfig,
    /// Network parameters
    pub network: NetworkConfig,
}

/// DGT (Governance Token) configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DgtConfig {
    /// Token name
    pub name: String,
    /// Token symbol
    pub symbol: String,
    /// Number of decimals
    pub decimals: u8,
    /// Total supply (fixed)
    pub total_supply: Balance,
    /// Allocation configuration
    pub allocation: AllocationConfig,
}

/// DRT (Reward Token) configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DrtConfig {
    /// Token name
    pub name: String,
    /// Token symbol  
    pub symbol: String,
    /// Number of decimals
    pub decimals: u8,
    /// Annual inflation rate (as decimal, e.g., 0.05 = 5%)
    pub annual_inflation_rate: Decimal,
    /// Emission schedule configuration
    pub emission: EmissionConfig,
    /// Burn configuration
    pub burn: BurnConfig,
}

/// Token allocation configuration for DGT
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AllocationConfig {
    /// Community treasury allocation (percentage)
    pub community_treasury: Decimal,
    /// Staking rewards allocation (percentage)
    pub staking_rewards: Decimal,
    /// Development team allocation (percentage)
    pub dev_team: Decimal,
    /// Initial validators allocation (percentage)
    pub initial_validators: Decimal,
    /// Ecosystem fund allocation (percentage)
    pub ecosystem_fund: Decimal,
}

/// DRT emission schedule configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmissionConfig {
    /// Block rewards percentage
    pub block_rewards: Decimal,
    /// Staking rewards percentage
    pub staking_rewards: Decimal,
    /// AI module incentives percentage
    pub ai_module_incentives: Decimal,
    /// Bridge operations percentage
    pub bridge_operations: Decimal,
}

/// Burn configuration for DRT
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BurnConfig {
    /// Transaction fee burn percentage (should be 1.0 for 100%)
    pub transaction_fee_burn: Decimal,
    /// AI service fee burn percentage
    pub ai_service_fee_burn: Decimal,
    /// Bridge fee burn percentage
    pub bridge_fee_burn: Decimal,
}

/// Staking system configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StakingConfig {
    /// Minimum stake amount
    pub minimum_stake: Balance,
    /// Unbonding period in seconds
    pub unbonding_period: u64,
    /// Maximum validators
    pub max_validators: u32,
    /// Slashing configuration
    pub slashing: SlashingConfig,
}

/// Slashing configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SlashingConfig {
    /// Double signing penalty (as decimal)
    pub double_signing_penalty: Decimal,
    /// Downtime penalty (as decimal)
    pub downtime_penalty: Decimal,
    /// Governance violation penalty (as decimal)
    pub governance_violation_penalty: Decimal,
}

/// Governance system configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GovernanceConfig {
    /// Minimum proposal deposit
    pub minimum_proposal_deposit: Balance,
    /// Voting period in seconds
    pub voting_period: u64,
    /// Minimum quorum (as decimal)
    pub minimum_quorum: Decimal,
    /// Proposal threshold (as decimal)
    pub proposal_threshold: Decimal,
    /// Time lock period for executed proposals
    pub time_lock_period: u64,
}

/// Network parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkConfig {
    /// Block time in seconds
    pub block_time: u64,
    /// Blocks per year (for emission calculations)
    pub blocks_per_year: u64,
    /// Genesis timestamp
    pub genesis_timestamp: Timestamp,
    /// Whether this is a testnet
    pub is_testnet: bool,
}

impl Default for TokenomicsConfig {
    fn default() -> Self {
        Self {
            dgt: DgtConfig {
                name: "Dytallix Governance Token".to_string(),
                symbol: "DGT".to_string(),
                decimals: 18,
                total_supply: 1_000_000_000_000_000_000_000_000_000, // 1B tokens with 18 decimals
                allocation: AllocationConfig {
                    community_treasury: Decimal::from_str_exact("0.40").unwrap(),
                    staking_rewards: Decimal::from_str_exact("0.25").unwrap(),
                    dev_team: Decimal::from_str_exact("0.15").unwrap(),
                    initial_validators: Decimal::from_str_exact("0.10").unwrap(),
                    ecosystem_fund: Decimal::from_str_exact("0.10").unwrap(),
                },
            },
            drt: DrtConfig {
                name: "Dytallix Reward Token".to_string(),
                symbol: "DRT".to_string(),
                decimals: 18,
                annual_inflation_rate: Decimal::from_str_exact("0.05").unwrap(), // 5%
                emission: EmissionConfig {
                    block_rewards: Decimal::from_str_exact("0.60").unwrap(),
                    staking_rewards: Decimal::from_str_exact("0.25").unwrap(),
                    ai_module_incentives: Decimal::from_str_exact("0.10").unwrap(),
                    bridge_operations: Decimal::from_str_exact("0.05").unwrap(),
                },
                burn: BurnConfig {
                    transaction_fee_burn: Decimal::from_str_exact("1.00").unwrap(), // 100%
                    ai_service_fee_burn: Decimal::from_str_exact("0.50").unwrap(), // 50%
                    bridge_fee_burn: Decimal::from_str_exact("0.75").unwrap(), // 75%
                },
            },
            staking: StakingConfig {
                minimum_stake: 1_000_000_000_000_000_000, // 1 DGT minimum
                unbonding_period: 21 * 24 * 60 * 60, // 21 days
                max_validators: 100,
                slashing: SlashingConfig {
                    double_signing_penalty: Decimal::from_str_exact("0.05").unwrap(), // 5%
                    downtime_penalty: Decimal::from_str_exact("0.01").unwrap(), // 1%
                    governance_violation_penalty: Decimal::from_str_exact("0.10").unwrap(), // 10%
                },
            },
            governance: GovernanceConfig {
                minimum_proposal_deposit: 10_000_000_000_000_000_000, // 10 DGT
                voting_period: 7 * 24 * 60 * 60, // 7 days
                minimum_quorum: Decimal::from_str_exact("0.15").unwrap(), // 15%
                proposal_threshold: Decimal::from_str_exact("0.51").unwrap(), // 51%
                time_lock_period: 2 * 24 * 60 * 60, // 2 days
            },
            network: NetworkConfig {
                block_time: 6, // 6 seconds
                blocks_per_year: 525600 * 10, // Approximately (60/6) * 60 * 24 * 365
                genesis_timestamp: 0, // To be set during deployment
                is_testnet: true,
            },
        }
    }
}

impl TokenomicsConfig {
    /// Load configuration from JSON file
    pub fn from_file(path: &str) -> crate::Result<Self> {
        let content = std::fs::read_to_string(path)
            .map_err(|_| crate::TokenomicsError::InvalidConfig { 
                details: format!("Cannot read config file: {}", path) 
            })?;
        
        let config: Self = serde_json::from_str(&content)?;
        config.validate()?;
        Ok(config)
    }
    
    /// Save configuration to JSON file
    pub fn to_file(&self, path: &str) -> crate::Result<()> {
        let content = serde_json::to_string_pretty(self)?;
        std::fs::write(path, content)
            .map_err(|_| crate::TokenomicsError::InvalidConfig { 
                details: format!("Cannot write config file: {}", path) 
            })?;
        Ok(())
    }
    
    /// Validate configuration consistency
    pub fn validate(&self) -> crate::Result<()> {
        // Validate DGT allocation percentages sum to 1.0
        let total_allocation = self.dgt.allocation.community_treasury 
            + self.dgt.allocation.staking_rewards
            + self.dgt.allocation.dev_team
            + self.dgt.allocation.initial_validators
            + self.dgt.allocation.ecosystem_fund;
            
        if total_allocation != Decimal::from_str_exact("1.0").unwrap() {
            return Err(crate::TokenomicsError::InvalidConfig {
                details: format!("DGT allocation percentages must sum to 1.0, got {}", total_allocation)
            });
        }
        
        // Validate DRT emission percentages sum to 1.0
        let total_emission = self.drt.emission.block_rewards
            + self.drt.emission.staking_rewards
            + self.drt.emission.ai_module_incentives
            + self.drt.emission.bridge_operations;
            
        if total_emission != Decimal::from_str_exact("1.0").unwrap() {
            return Err(crate::TokenomicsError::InvalidConfig {
                details: format!("DRT emission percentages must sum to 1.0, got {}", total_emission)
            });
        }
        
        // Validate minimum stake is positive
        if self.staking.minimum_stake == 0 {
            return Err(crate::TokenomicsError::InvalidConfig {
                details: "Minimum stake must be greater than 0".to_string()
            });
        }
        
        Ok(())
    }
}