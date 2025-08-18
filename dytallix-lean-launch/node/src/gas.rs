/*
Gas Accounting System for Dytallix

Deterministic, versioned gas accounting across all transaction types with
enforced limits at mempool admission and execution time.
*/

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use thiserror::Error;

// Version constants
pub const GAS_TABLE_VERSION: u32 = 1;
pub const RECEIPT_FORMAT_VERSION: u32 = 1;

// Placeholder for future WASM integration
pub const PER_VM_INSTRUCTION: u64 = 0; // Deferred until WASM instrumentation arrives

// Gas type alias
pub type Gas = u64;

// Transaction types for gas calculation
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum TxKind {
    Transfer,
    GovernanceProposalCreate,
    GovernanceVote,
    StakingDelegate,
    StakingUndelegate,
    OraclePublish,
    ContractInstantiate,
    ContractCall,
    ContractMigrate,
}

// Gas error types
#[derive(Debug, Error)]
pub enum GasError {
    #[error("Out of gas: required {required}, available {available}")]
    OutOfGas { required: Gas, available: Gas },
    
    #[error("Gas limit too low: minimum {minimum}, provided {provided}")]
    GasLimitTooLow { minimum: Gas, provided: Gas },
    
    #[error("Invalid gas price: {0}")]
    InvalidGasPrice(String),
    
    #[error("Gas overflow in calculation")]
    Overflow,
}

// Gas schedule containing all cost constants
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GasSchedule {
    // Intrinsic base costs per transaction type
    pub transfer_base: Gas,
    pub governance_proposal_create_base: Gas,
    pub governance_vote_base: Gas,
    pub staking_delegate_base: Gas,
    pub staking_undelegate_base: Gas,
    pub oracle_publish_base: Gas,
    pub contract_instantiate_base: Gas,
    pub contract_call_base: Gas,
    pub contract_migrate_base: Gas,
    
    // Variable component costs
    pub per_byte: Gas,
    pub per_additional_signature: Gas,
    pub per_kv_read: Gas,
    pub per_kv_write: Gas,
    pub per_event: Gas,
    pub per_vm_instruction: Gas,
}

impl Default for GasSchedule {
    fn default() -> Self {
        Self {
            // Intrinsic base costs (from specification)
            transfer_base: 500,
            governance_proposal_create_base: 5_000,
            governance_vote_base: 1_200,
            staking_delegate_base: 3_000,
            staking_undelegate_base: 3_200,
            oracle_publish_base: 2_500,
            contract_instantiate_base: 15_000,
            contract_call_base: 8_000,
            contract_migrate_base: 12_000,
            
            // Variable components (from specification)
            per_byte: 2,
            per_additional_signature: 700,
            per_kv_read: 40,
            per_kv_write: 120,
            per_event: 80,
            per_vm_instruction: PER_VM_INSTRUCTION,
        }
    }
}

impl GasSchedule {
    pub fn base_cost(&self, tx_kind: &TxKind) -> Gas {
        match tx_kind {
            TxKind::Transfer => self.transfer_base,
            TxKind::GovernanceProposalCreate => self.governance_proposal_create_base,
            TxKind::GovernanceVote => self.governance_vote_base,
            TxKind::StakingDelegate => self.staking_delegate_base,
            TxKind::StakingUndelegate => self.staking_undelegate_base,
            TxKind::OraclePublish => self.oracle_publish_base,
            TxKind::ContractInstantiate => self.contract_instantiate_base,
            TxKind::ContractCall => self.contract_call_base,
            TxKind::ContractMigrate => self.contract_migrate_base,
        }
    }
}

// Gas meter for tracking consumption during execution
#[derive(Debug, Clone)]
pub struct GasMeter {
    gas_limit: Gas,
    gas_used: Gas,
    gas_operations: HashMap<String, Gas>, // For debugging/analytics
}

impl GasMeter {
    pub fn new(gas_limit: Gas) -> Self {
        Self {
            gas_limit,
            gas_used: 0,
            gas_operations: HashMap::new(),
        }
    }
    
    pub fn consume(&mut self, amount: Gas, operation: &str) -> Result<(), GasError> {
        if self.gas_used.saturating_add(amount) > self.gas_limit {
            return Err(GasError::OutOfGas {
                required: amount,
                available: self.remaining_gas(),
            });
        }
        
        self.gas_used += amount;
        *self.gas_operations.entry(operation.to_string()).or_insert(0) += amount;
        Ok(())
    }
    
    pub fn remaining_gas(&self) -> Gas {
        self.gas_limit.saturating_sub(self.gas_used)
    }
    
    pub fn gas_used(&self) -> Gas {
        self.gas_used
    }
    
    pub fn gas_limit(&self) -> Gas {
        self.gas_limit
    }
    
    pub fn operations(&self) -> &HashMap<String, Gas> {
        &self.gas_operations
    }
}

// Intrinsic gas calculation
pub fn intrinsic_gas(
    tx_kind: &TxKind,
    tx_size_bytes: usize,
    additional_signatures: usize,
    schedule: &GasSchedule,
) -> Result<Gas, GasError> {
    let base_cost = schedule.base_cost(tx_kind);
    let size_cost = schedule.per_byte.saturating_mul(tx_size_bytes as Gas);
    let sig_cost = schedule.per_additional_signature.saturating_mul(additional_signatures as Gas);
    
    base_cost
        .saturating_add(size_cost)
        .saturating_add(sig_cost)
        .try_into()
        .map_err(|_| GasError::Overflow)
}

// Gas validation for mempool admission
pub fn validate_gas_limit(
    tx_kind: &TxKind,
    tx_size_bytes: usize,
    additional_signatures: usize,
    gas_limit: Gas,
    schedule: &GasSchedule,
) -> Result<(), GasError> {
    let intrinsic = intrinsic_gas(tx_kind, tx_size_bytes, additional_signatures, schedule)?;
    
    if gas_limit < intrinsic {
        return Err(GasError::GasLimitTooLow {
            minimum: intrinsic,
            provided: gas_limit,
        });
    }
    
    Ok(())
}

// Helper to estimate gas limit with safety factor
pub fn estimate_gas_limit(
    tx_kind: &TxKind,
    tx_size_bytes: usize,
    additional_signatures: usize,
    schedule: &GasSchedule,
    safety_factor: f64,
) -> Result<Gas, GasError> {
    let intrinsic = intrinsic_gas(tx_kind, tx_size_bytes, additional_signatures, schedule)?;
    let estimated = (intrinsic as f64 * safety_factor) as Gas;
    Ok(estimated.max(intrinsic))
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_gas_schedule_defaults() {
        let schedule = GasSchedule::default();
        assert_eq!(schedule.transfer_base, 500);
        assert_eq!(schedule.per_byte, 2);
        assert_eq!(schedule.per_vm_instruction, 0); // Deferred
    }
    
    #[test]
    fn test_intrinsic_gas_calculation() {
        let schedule = GasSchedule::default();
        
        // Transfer with 100 bytes, no additional signatures
        let gas = intrinsic_gas(&TxKind::Transfer, 100, 0, &schedule).unwrap();
        assert_eq!(gas, 500 + 100 * 2); // base + per_byte
        
        // Transfer with additional signature
        let gas = intrinsic_gas(&TxKind::Transfer, 100, 1, &schedule).unwrap();
        assert_eq!(gas, 500 + 100 * 2 + 700); // base + per_byte + per_sig
    }
    
    #[test]
    fn test_gas_meter() {
        let mut meter = GasMeter::new(1000);
        
        assert_eq!(meter.remaining_gas(), 1000);
        assert_eq!(meter.gas_used(), 0);
        
        meter.consume(300, "storage_read").unwrap();
        assert_eq!(meter.remaining_gas(), 700);
        assert_eq!(meter.gas_used(), 300);
        
        // Should fail when trying to consume more than remaining
        let result = meter.consume(800, "storage_write");
        assert!(matches!(result, Err(GasError::OutOfGas { .. })));
    }
    
    #[test]
    fn test_gas_validation() {
        let schedule = GasSchedule::default();
        
        // Valid gas limit
        let result = validate_gas_limit(&TxKind::Transfer, 100, 0, 1000, &schedule);
        assert!(result.is_ok());
        
        // Invalid gas limit (too low)
        let result = validate_gas_limit(&TxKind::Transfer, 100, 0, 500, &schedule);
        assert!(matches!(result, Err(GasError::GasLimitTooLow { .. })));
    }
    
    #[test]
    fn test_gas_estimation() {
        let schedule = GasSchedule::default();
        
        let estimated = estimate_gas_limit(&TxKind::Transfer, 100, 0, &schedule, 2.0).unwrap();
        let intrinsic = intrinsic_gas(&TxKind::Transfer, 100, 0, &schedule).unwrap();
        
        assert_eq!(estimated, intrinsic * 2);
    }

    #[test]
    fn test_all_transaction_types() {
        let schedule = GasSchedule::default();
        
        // Test each transaction type has a valid base cost
        assert_eq!(schedule.base_cost(&TxKind::Transfer), 500);
        assert_eq!(schedule.base_cost(&TxKind::GovernanceProposalCreate), 5_000);
        assert_eq!(schedule.base_cost(&TxKind::GovernanceVote), 1_200);
        assert_eq!(schedule.base_cost(&TxKind::StakingDelegate), 3_000);
        assert_eq!(schedule.base_cost(&TxKind::StakingUndelegate), 3_200);
        assert_eq!(schedule.base_cost(&TxKind::OraclePublish), 2_500);
        assert_eq!(schedule.base_cost(&TxKind::ContractInstantiate), 15_000);
        assert_eq!(schedule.base_cost(&TxKind::ContractCall), 8_000);
        assert_eq!(schedule.base_cost(&TxKind::ContractMigrate), 12_000);
    }

    #[test]
    fn test_deterministic_gas() {
        let schedule = GasSchedule::default();
        
        // Same inputs should always produce same outputs
        let gas1 = intrinsic_gas(&TxKind::Transfer, 150, 0, &schedule).unwrap();
        let gas2 = intrinsic_gas(&TxKind::Transfer, 150, 0, &schedule).unwrap();
        assert_eq!(gas1, gas2);
        
        // Different inputs should produce different outputs
        let gas_small = intrinsic_gas(&TxKind::Transfer, 100, 0, &schedule).unwrap();
        let gas_large = intrinsic_gas(&TxKind::Transfer, 200, 0, &schedule).unwrap();
        assert!(gas_large > gas_small);
    }

    #[test]
    fn test_gas_meter_operation_tracking() {
        let mut meter = GasMeter::new(1000);
        
        meter.consume(100, "kv_read").unwrap();
        meter.consume(200, "kv_write").unwrap();
        meter.consume(50, "kv_read").unwrap(); // Another read
        
        // Should track cumulative gas per operation
        assert_eq!(meter.operations().get("kv_read"), Some(&150));
        assert_eq!(meter.operations().get("kv_write"), Some(&200));
        assert_eq!(meter.gas_used(), 350);
    }

    #[test]
    fn test_version_constants() {
        assert_eq!(GAS_TABLE_VERSION, 1);
        assert_eq!(RECEIPT_FORMAT_VERSION, 1);
        assert_eq!(PER_VM_INSTRUCTION, 0); // Deferred
    }

    #[test]
    fn test_out_of_gas_behavior() {
        let mut meter = GasMeter::new(100);
        
        // Consume exactly the limit
        assert!(meter.consume(100, "max_operation").is_ok());
        assert_eq!(meter.remaining_gas(), 0);
        
        // Try to consume one more unit should fail
        let result = meter.consume(1, "over_limit");
        assert!(matches!(result, Err(GasError::OutOfGas { required: 1, available: 0 })));
    }
}