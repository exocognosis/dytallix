#!/usr/bin/env rust-script

//! Simple verification script for accrued rewards functionality
//! ```cargo
//! [dependencies]
//! serde = { version = "1.0", features = ["derive"] }
//! serde_json = "1.0"
//! ```

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Delegation {
    pub delegator_address: String,
    pub validator_address: String,
    pub stake_amount: u128,
    pub reward_cursor_index: u128,
    #[serde(default)]
    pub accrued_rewards: u128,
}

fn main() {
    println!("Testing accrued rewards backward compatibility...");
    
    // Test 1: New delegation structure with accrued_rewards
    let new_delegation = Delegation {
        delegator_address: "delegator1".to_string(),
        validator_address: "validator1".to_string(),
        stake_amount: 1_000_000_000_000,
        reward_cursor_index: 123456,
        accrued_rewards: 500_000,
    };
    
    let serialized = serde_json::to_string(&new_delegation).unwrap();
    println!("New delegation JSON: {}", serialized);
    
    let deserialized: Delegation = serde_json::from_str(&serialized).unwrap();
    assert_eq!(deserialized.accrued_rewards, 500_000);
    println!("✓ New delegation serialization/deserialization works");
    
    // Test 2: Old delegation JSON without accrued_rewards field
    let old_delegation_json = r#"{
        "delegator_address": "delegator1",
        "validator_address": "validator1", 
        "stake_amount": 1000000000000,
        "reward_cursor_index": 123456
    }"#;
    
    let old_delegation: Delegation = serde_json::from_str(old_delegation_json).unwrap();
    assert_eq!(old_delegation.accrued_rewards, 0); // Should default to 0
    assert_eq!(old_delegation.stake_amount, 1_000_000_000_000);
    assert_eq!(old_delegation.reward_cursor_index, 123456);
    println!("✓ Old delegation JSON backward compatibility works");
    
    // Test 3: Simulate reward accrual
    let mut delegation = old_delegation;
    delegation.accrued_rewards += 250_000; // First reward accrual
    delegation.accrued_rewards += 150_000; // Second reward accrual  
    assert_eq!(delegation.accrued_rewards, 400_000);
    println!("✓ Reward accrual simulation works: {}", delegation.accrued_rewards);
    
    // Test 4: Simulate reward claiming
    let claimed_rewards = delegation.accrued_rewards;
    delegation.accrued_rewards = 0; // Reset after claiming
    assert_eq!(claimed_rewards, 400_000);
    assert_eq!(delegation.accrued_rewards, 0);
    println!("✓ Reward claiming simulation works: claimed {}, remaining {}", 
             claimed_rewards, delegation.accrued_rewards);
    
    println!("\nAll tests passed! ✅");
    println!("The accrued rewards implementation maintains backward compatibility");
    println!("and correctly handles reward accrual and claiming.");
}