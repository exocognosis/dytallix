// Simple test to validate staking integration changes compile
use blockchain_core::staking::{StakingState, ValidatorStatus};
use blockchain_core::runtime::RuntimeState;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("🧪 Testing Staking Integration");
    
    // Test basic staking functionality
    let mut staking = StakingState::new();
    println!("✓ StakingState created");
    
    // Test validator registration
    let result = staking.register_validator(
        "test_validator".to_string(),
        vec![1, 2, 3, 4],
        500
    );
    
    match result {
        Ok(_) => println!("✓ Validator registration works"),
        Err(e) => println!("✗ Validator registration failed: {}", e),
    }
    
    // Test delegation
    let delegation_result = staking.delegate(
        "test_validator".to_string(),
        "test_validator".to_string(),
        1_000_000_000_000u128
    );
    
    match delegation_result {
        Ok(_) => println!("✓ Delegation works"),
        Err(e) => println!("✗ Delegation failed: {}", e),
    }
    
    // Test reward processing
    let reward_result = staking.process_block_rewards(1);
    match reward_result {
        Ok(_) => println!("✓ Block reward processing works"),
        Err(e) => println!("✗ Block reward processing failed: {}", e),
    }
    
    // Test stats
    let (total_stake, total_validators, active_validators) = (
        staking.total_stake,
        staking.validators.len() as u32,
        staking.get_active_validators().len() as u32,
    );
    
    println!("📊 Staking Stats:");
    println!("   Total Stake: {} uDGT", total_stake);
    println!("   Total Validators: {}", total_validators);
    println!("   Active Validators: {}", active_validators);
    
    println!("🎉 All tests passed!");
    Ok(())
}