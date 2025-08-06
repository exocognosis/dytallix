//! Burn manager for automated DRT burning

use std::collections::HashMap;
use serde::{Deserialize, Serialize};

use rust_decimal::Decimal;
use crate::{Address, Balance, Timestamp, Result, TokenomicsError};
use crate::config::BurnConfig;
use crate::tokens::drt_token::{DrtToken, BurnAmounts};

/// Burn reason categories
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum BurnReason {
    /// Transaction fees
    TransactionFees,
    /// AI service fees
    AiServiceFees,
    /// Bridge operation fees
    BridgeFees,
    /// Governance violation penalty
    GovernanceViolation,
    /// Manual burn
    Manual,
}

/// Burn event record
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BurnRecord {
    /// Amount burned
    pub amount: Balance,
    /// Reason for burn
    pub reason: BurnReason,
    /// Account from which tokens were burned (usually fee collector)
    pub from_account: Address,
    /// Block number when burn occurred
    pub block_number: u64,
    /// Timestamp when burn occurred
    pub timestamp: Timestamp,
    /// Transaction hash
    pub tx_hash: String,
    /// Additional details
    pub details: String,
}

/// Burn statistics
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct BurnStatistics {
    /// Total burned by reason
    pub total_burned_by_reason: HashMap<BurnReason, Balance>,
    /// Total burned overall
    pub total_burned: Balance,
    /// Number of burn events
    pub burn_count: u32,
    /// Average burn per event
    pub average_burn: Balance,
    /// Burn rate (per time period)
    pub burn_rate: Decimal,
}

/// Burn manager handles automated burning of DRT tokens
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BurnManager {
    /// Burn configuration
    pub config: BurnConfig,
    /// Historical burn records
    pub burn_records: Vec<BurnRecord>,
    /// Burn statistics
    pub statistics: BurnStatistics,
    /// Fee collector accounts
    pub fee_collectors: HashMap<BurnReason, Address>,
    /// Last burn timestamp for rate calculation
    pub last_burn_timestamp: Timestamp,
}

impl BurnManager {
    /// Create new burn manager
    pub fn new(config: BurnConfig) -> Self {
        Self {
            config,
            burn_records: Vec::new(),
            statistics: BurnStatistics::default(),
            fee_collectors: HashMap::new(),
            last_burn_timestamp: 0,
        }
    }
    
    /// Set fee collector for a burn reason
    pub fn set_fee_collector(&mut self, reason: BurnReason, collector: Address) {
        self.fee_collectors.insert(reason, collector);
    }
    
    /// Process automated burn for transaction fees
    pub fn burn_transaction_fees(
        &mut self,
        drt_token: &mut DrtToken,
        fee_amount: Balance,
        block_number: u64,
        timestamp: Timestamp,
        tx_hash: String,
    ) -> Result<Balance> {
        let burn_amount = self.calculate_burn_amount(fee_amount, &self.config.transaction_fee_burn)?;
        
        if burn_amount > 0 {
            let collector = self.get_fee_collector(&BurnReason::TransactionFees)?;
            
            drt_token.burn(
                &collector,
                burn_amount,
                block_number,
                tx_hash.clone(),
                "Transaction fee burn".to_string(),
            )?;
            
            self.record_burn(
                burn_amount,
                BurnReason::TransactionFees,
                collector,
                block_number,
                timestamp,
                tx_hash,
                format!("Burned {} DRT from {} transaction fees", burn_amount, fee_amount),
            );
        }
        
        Ok(burn_amount)
    }
    
    /// Process automated burn for AI service fees
    pub fn burn_ai_service_fees(
        &mut self,
        drt_token: &mut DrtToken,
        fee_amount: Balance,
        block_number: u64,
        timestamp: Timestamp,
        tx_hash: String,
    ) -> Result<Balance> {
        let burn_amount = self.calculate_burn_amount(fee_amount, &self.config.ai_service_fee_burn)?;
        
        if burn_amount > 0 {
            let collector = self.get_fee_collector(&BurnReason::AiServiceFees)?;
            
            drt_token.burn(
                &collector,
                burn_amount,
                block_number,
                tx_hash.clone(),
                "AI service fee burn".to_string(),
            )?;
            
            self.record_burn(
                burn_amount,
                BurnReason::AiServiceFees,
                collector,
                block_number,
                timestamp,
                tx_hash,
                format!("Burned {} DRT from {} AI service fees", burn_amount, fee_amount),
            );
        }
        
        Ok(burn_amount)
    }
    
    /// Process automated burn for bridge fees
    pub fn burn_bridge_fees(
        &mut self,
        drt_token: &mut DrtToken,
        fee_amount: Balance,
        block_number: u64,
        timestamp: Timestamp,
        tx_hash: String,
    ) -> Result<Balance> {
        let burn_amount = self.calculate_burn_amount(fee_amount, &self.config.bridge_fee_burn)?;
        
        if burn_amount > 0 {
            let collector = self.get_fee_collector(&BurnReason::BridgeFees)?;
            
            drt_token.burn(
                &collector,
                burn_amount,
                block_number,
                tx_hash.clone(),
                "Bridge fee burn".to_string(),
            )?;
            
            self.record_burn(
                burn_amount,
                BurnReason::BridgeFees,
                collector,
                block_number,
                timestamp,
                tx_hash,
                format!("Burned {} DRT from {} bridge fees", burn_amount, fee_amount),
            );
        }
        
        Ok(burn_amount)
    }
    
    /// Process burn for governance violations
    pub fn burn_governance_violation(
        &mut self,
        drt_token: &mut DrtToken,
        violator: &Address,
        penalty_amount: Balance,
        block_number: u64,
        timestamp: Timestamp,
        tx_hash: String,
        violation_details: String,
    ) -> Result<Balance> {
        if penalty_amount > 0 {
            drt_token.burn(
                violator,
                penalty_amount,
                block_number,
                tx_hash.clone(),
                "Governance violation penalty".to_string(),
            )?;
            
            self.record_burn(
                penalty_amount,
                BurnReason::GovernanceViolation,
                violator.clone(),
                block_number,
                timestamp,
                tx_hash,
                format!("Governance violation burn: {}", violation_details),
            );
        }
        
        Ok(penalty_amount)
    }
    
    /// Manual burn (for administrative purposes)
    pub fn manual_burn(
        &mut self,
        drt_token: &mut DrtToken,
        from_account: &Address,
        amount: Balance,
        block_number: u64,
        timestamp: Timestamp,
        tx_hash: String,
        reason: String,
    ) -> Result<()> {
        drt_token.burn(
            from_account,
            amount,
            block_number,
            tx_hash.clone(),
            "Manual burn".to_string(),
        )?;
        
        self.record_burn(
            amount,
            BurnReason::Manual,
            from_account.clone(),
            block_number,
            timestamp,
            tx_hash,
            format!("Manual burn: {}", reason),
        );
        
        Ok(())
    }
    
    /// Process multiple fee types in batch
    pub fn batch_burn_fees(
        &mut self,
        drt_token: &mut DrtToken,
        transaction_fees: Balance,
        ai_service_fees: Balance,
        bridge_fees: Balance,
        block_number: u64,
        timestamp: Timestamp,
        tx_hash: String,
    ) -> Result<BurnAmounts> {
        let burn_amounts = drt_token.calculate_burn_amounts(
            transaction_fees,
            ai_service_fees,
            bridge_fees,
        )?;
        
        // Execute burns
        if burn_amounts.transaction_fee_burn > 0 {
            self.burn_transaction_fees(
                drt_token,
                transaction_fees,
                block_number,
                timestamp,
                tx_hash.clone(),
            )?;
        }
        
        if burn_amounts.ai_service_fee_burn > 0 {
            self.burn_ai_service_fees(
                drt_token,
                ai_service_fees,
                block_number,
                timestamp,
                tx_hash.clone(),
            )?;
        }
        
        if burn_amounts.bridge_fee_burn > 0 {
            self.burn_bridge_fees(
                drt_token,
                bridge_fees,
                block_number,
                timestamp,
                tx_hash,
            )?;
        }
        
        Ok(burn_amounts)
    }
    
    /// Calculate burn amount from fee amount and percentage
    fn calculate_burn_amount(&self, fee_amount: Balance, burn_percentage: &Decimal) -> Result<Balance> {
        let decimal_amount = Decimal::from(fee_amount);
        let result = decimal_amount * burn_percentage;
        
        result.to_string().parse::<Balance>()
            .map_err(|_| TokenomicsError::Overflow)
    }
    
    /// Get fee collector for a burn reason
    fn get_fee_collector(&self, reason: &BurnReason) -> Result<Address> {
        self.fee_collectors.get(reason)
            .ok_or_else(|| TokenomicsError::InvalidConfig {
                details: format!("No fee collector set for {:?}", reason),
            })
            .map(|addr| addr.clone())
    }
    
    /// Record a burn event
    fn record_burn(
        &mut self,
        amount: Balance,
        reason: BurnReason,
        from_account: Address,
        block_number: u64,
        timestamp: Timestamp,
        tx_hash: String,
        details: String,
    ) {
        let record = BurnRecord {
            amount,
            reason: reason.clone(),
            from_account,
            block_number,
            timestamp,
            tx_hash,
            details,
        };
        
        self.burn_records.push(record);
        self.update_statistics(amount, reason, timestamp);
    }
    
    /// Update burn statistics
    fn update_statistics(&mut self, amount: Balance, reason: BurnReason, timestamp: Timestamp) {
        // Update total by reason
        let current = self.statistics.total_burned_by_reason.get(&reason).unwrap_or(&0);
        self.statistics.total_burned_by_reason.insert(reason, current + amount);
        
        // Update overall totals
        self.statistics.total_burned = self.statistics.total_burned.saturating_add(amount);
        self.statistics.burn_count += 1;
        
        // Calculate average
        if self.statistics.burn_count > 0 {
            self.statistics.average_burn = self.statistics.total_burned / self.statistics.burn_count as u128;
        }
        
        // Update burn rate (simple approximation)
        if self.last_burn_timestamp > 0 && timestamp > self.last_burn_timestamp {
            let time_diff = timestamp - self.last_burn_timestamp;
            if time_diff > 0 {
                self.statistics.burn_rate = Decimal::from(amount) / Decimal::from(time_diff);
            }
        }
        
        self.last_burn_timestamp = timestamp;
    }
    
    /// Get burn records
    pub fn get_burn_records(&self) -> &Vec<BurnRecord> {
        &self.burn_records
    }
    
    /// Get recent burn records
    pub fn get_recent_burns(&self, count: usize) -> Vec<&BurnRecord> {
        self.burn_records
            .iter()
            .rev()
            .take(count)
            .collect()
    }
    
    /// Get burns by reason
    pub fn get_burns_by_reason(&self, reason: &BurnReason) -> Vec<&BurnRecord> {
        self.burn_records
            .iter()
            .filter(|record| record.reason == *reason)
            .collect()
    }
    
    /// Get burn statistics
    pub fn get_statistics(&self) -> &BurnStatistics {
        &self.statistics
    }
    
    /// Get total burned for a specific reason
    pub fn get_total_burned_by_reason(&self, reason: &BurnReason) -> Balance {
        *self.statistics.total_burned_by_reason.get(reason).unwrap_or(&0)
    }
    
    /// Get burn rate over period
    pub fn calculate_burn_rate(&self, period_seconds: u64) -> Decimal {
        if period_seconds == 0 || self.burn_records.is_empty() {
            return Decimal::ZERO;
        }
        
        let now = self.burn_records.last().unwrap().timestamp;
        let period_start = now.saturating_sub(period_seconds);
        
        let period_burns: Balance = self.burn_records
            .iter()
            .filter(|record| record.timestamp >= period_start)
            .map(|record| record.amount)
            .sum();
        
        Decimal::from(period_burns) / Decimal::from(period_seconds)
    }
    
    /// Clean up old burn records (keep only recent ones)
    pub fn cleanup_old_records(&mut self, keep_count: usize) {
        if self.burn_records.len() > keep_count {
            let remove_count = self.burn_records.len() - keep_count;
            self.burn_records.drain(0..remove_count);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::tokens::drt_token::DrtToken;
    use crate::config::{DrtConfig, EmissionConfig};
    use rust_decimal::Decimal;

    fn create_test_burn_config() -> BurnConfig {
        BurnConfig {
            transaction_fee_burn: Decimal::from_str_exact("1.00").unwrap(), // 100%
            ai_service_fee_burn: Decimal::from_str_exact("0.50").unwrap(), // 50%
            bridge_fee_burn: Decimal::from_str_exact("0.75").unwrap(), // 75%
        }
    }

    fn create_test_drt_config() -> DrtConfig {
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
            burn: create_test_burn_config(),
        }
    }

    #[test]
    fn test_transaction_fee_burn() {
        let burn_config = create_test_burn_config();
        let mut burn_manager = BurnManager::new(burn_config);
        
        let drt_config = create_test_drt_config();
        let mut drt_token = DrtToken::new(drt_config);
        
        // Setup fee collector
        burn_manager.set_fee_collector(BurnReason::TransactionFees, "fee_collector".to_string());
        
        // Mint some tokens to the fee collector
        drt_token.mint(&"fee_collector".to_string(), 10000, 1, "0x123".to_string()).unwrap();
        
        // Burn transaction fees
        let burned = burn_manager.burn_transaction_fees(
            &mut drt_token,
            1000, // fee amount
            2,
            1000,
            "0x456".to_string(),
        ).unwrap();
        
        assert_eq!(burned, 1000); // 100% of fees burned
        assert_eq!(drt_token.balance_of(&"fee_collector".to_string()), 9000);
        assert_eq!(burn_manager.get_total_burned_by_reason(&BurnReason::TransactionFees), 1000);
    }

    #[test]
    fn test_ai_service_fee_burn() {
        let burn_config = create_test_burn_config();
        let mut burn_manager = BurnManager::new(burn_config);
        
        let drt_config = create_test_drt_config();
        let mut drt_token = DrtToken::new(drt_config);
        
        // Setup fee collector
        burn_manager.set_fee_collector(BurnReason::AiServiceFees, "ai_fee_collector".to_string());
        
        // Mint some tokens to the fee collector
        drt_token.mint(&"ai_fee_collector".to_string(), 10000, 1, "0x123".to_string()).unwrap();
        
        // Burn AI service fees
        let burned = burn_manager.burn_ai_service_fees(
            &mut drt_token,
            1000, // fee amount
            2,
            1000,
            "0x456".to_string(),
        ).unwrap();
        
        assert_eq!(burned, 500); // 50% of fees burned
        assert_eq!(drt_token.balance_of(&"ai_fee_collector".to_string()), 9500);
        assert_eq!(burn_manager.get_total_burned_by_reason(&BurnReason::AiServiceFees), 500);
    }

    #[test]
    fn test_batch_burn_fees() {
        let burn_config = create_test_burn_config();
        let mut burn_manager = BurnManager::new(burn_config);
        
        let drt_config = create_test_drt_config();
        let mut drt_token = DrtToken::new(drt_config);
        
        // Setup fee collectors
        burn_manager.set_fee_collector(BurnReason::TransactionFees, "tx_collector".to_string());
        burn_manager.set_fee_collector(BurnReason::AiServiceFees, "ai_collector".to_string());
        burn_manager.set_fee_collector(BurnReason::BridgeFees, "bridge_collector".to_string());
        
        // Mint tokens to collectors
        drt_token.mint(&"tx_collector".to_string(), 10000, 1, "0x123".to_string()).unwrap();
        drt_token.mint(&"ai_collector".to_string(), 10000, 1, "0x124".to_string()).unwrap();
        drt_token.mint(&"bridge_collector".to_string(), 10000, 1, "0x125".to_string()).unwrap();
        
        // Batch burn
        let burn_amounts = burn_manager.batch_burn_fees(
            &mut drt_token,
            1000, // transaction fees
            800,  // AI service fees
            400,  // bridge fees
            2,
            1000,
            "0x456".to_string(),
        ).unwrap();
        
        assert_eq!(burn_amounts.transaction_fee_burn, 1000); // 100%
        assert_eq!(burn_amounts.ai_service_fee_burn, 400);   // 50%
        assert_eq!(burn_amounts.bridge_fee_burn, 300);       // 75%
        assert_eq!(burn_amounts.total_burn, 1700);
        
        // Check statistics
        let stats = burn_manager.get_statistics();
        assert_eq!(stats.total_burned, 1700);
        assert_eq!(stats.burn_count, 3);
    }

    #[test]
    fn test_governance_violation_burn() {
        let burn_config = create_test_burn_config();
        let mut burn_manager = BurnManager::new(burn_config);
        
        let drt_config = create_test_drt_config();
        let mut drt_token = DrtToken::new(drt_config);
        
        // Mint tokens to violator
        drt_token.mint(&"violator".to_string(), 10000, 1, "0x123".to_string()).unwrap();
        
        // Burn for governance violation
        let burned = burn_manager.burn_governance_violation(
            &mut drt_token,
            &"violator".to_string(),
            1000,
            2,
            1000,
            "0x456".to_string(),
            "Double voting detected".to_string(),
        ).unwrap();
        
        assert_eq!(burned, 1000);
        assert_eq!(drt_token.balance_of(&"violator".to_string()), 9000);
        assert_eq!(burn_manager.get_total_burned_by_reason(&BurnReason::GovernanceViolation), 1000);
    }

    #[test]
    fn test_burn_statistics() {
        let burn_config = create_test_burn_config();
        let mut burn_manager = BurnManager::new(burn_config);
        
        let drt_config = create_test_drt_config();
        let mut drt_token = DrtToken::new(drt_config);
        
        // Setup and mint
        burn_manager.set_fee_collector(BurnReason::TransactionFees, "collector".to_string());
        drt_token.mint(&"collector".to_string(), 10000, 1, "0x123".to_string()).unwrap();
        
        // Multiple burns
        burn_manager.burn_transaction_fees(&mut drt_token, 1000, 2, 1000, "0x456".to_string()).unwrap();
        burn_manager.burn_transaction_fees(&mut drt_token, 500, 3, 1100, "0x789".to_string()).unwrap();
        
        let stats = burn_manager.get_statistics();
        assert_eq!(stats.total_burned, 1500);
        assert_eq!(stats.burn_count, 2);
        assert_eq!(stats.average_burn, 750);
        
        // Test burn rate calculation
        let rate = burn_manager.calculate_burn_rate(200); // 200 second period
        assert!(rate > Decimal::ZERO);
    }
}