// Example usage of the Dytallix staking system
// This demonstrates the complete workflow for validators and delegators

use blockchain_core::staking::{StakingState, ValidatorStatus};
use blockchain_core::genesis::GenesisConfig;
use blockchain_core::runtime::{RuntimeState, DytallixRuntime};

fn main() {
    println!("🚀 Dytallix Staking System Example");
    println!("=====================================\n");

    // Example 1: Basic staking workflow
    example_basic_staking();
    
    // Example 2: Multiple validators and delegators
    example_multiple_participants();
    
    // Example 3: Reward distribution over time
    example_reward_distribution();
    
    println!("\n✅ All examples completed successfully!");
}

fn example_basic_staking() {
    println!("📋 Example 1: Basic Staking Workflow");
    println!("-------------------------------------");
    
    let mut staking = StakingState::new();
    
    // Step 1: Register a validator
    println!("1. Registering validator...");
    let validator_addr = "alice_validator".to_string();
    let consensus_pubkey = vec![0x01, 0x02, 0x03, 0x04]; // Mock pubkey
    let commission_rate = 500; // 5%
    
    staking.register_validator(validator_addr.clone(), consensus_pubkey, commission_rate)
        .expect("Failed to register validator");
    
    println!("   ✓ Validator {} registered with 5% commission", validator_addr);
    
    // Step 2: Self-delegate to become active
    println!("2. Self-delegating to activate validator...");
    let self_stake = 1_000_000_000_000u128; // 1M DGT
    
    staking.delegate(validator_addr.clone(), validator_addr.clone(), self_stake)
        .expect("Failed to self-delegate");
    
    let validator = &staking.validators[&validator_addr];
    println!("   ✓ Self-delegated {} uDGT, status: {:?}", self_stake, validator.status);
    
    // Step 3: External delegation
    println!("3. External delegation...");
    let delegator_addr = "bob_delegator".to_string();
    let delegation_amount = 500_000_000_000u128; // 500K DGT
    
    staking.delegate(delegator_addr.clone(), validator_addr.clone(), delegation_amount)
        .expect("Failed to delegate");
    
    println!("   ✓ {} delegated {} uDGT to {}", delegator_addr, delegation_amount, validator_addr);
    
    // Step 4: Process block rewards
    println!("4. Processing block rewards...");
    staking.process_block_rewards(1).expect("Failed to process rewards");
    
    let pending_rewards = staking.calculate_pending_rewards(&delegator_addr, &validator_addr)
        .expect("Failed to calculate rewards");
    
    println!("   ✓ Block 1 processed, {} has {} uDRT pending", delegator_addr, pending_rewards);
    
    // Step 5: Claim rewards
    println!("5. Claiming rewards...");
    let claimed = staking.claim_rewards(&delegator_addr, &validator_addr)
        .expect("Failed to claim rewards");
    
    println!("   ✓ {} claimed {} uDRT rewards", delegator_addr, claimed);
    println!();
}

fn example_multiple_participants() {
    println!("👥 Example 2: Multiple Validators and Delegators");
    println!("-----------------------------------------------");
    
    let mut staking = StakingState::new();
    
    // Set up multiple validators
    let validators = vec![
        ("alice_val", 1_000_000_000_000u128, 500),  // 1M DGT, 5%
        ("bob_val", 2_000_000_000_000u128, 300),    // 2M DGT, 3%
        ("charlie_val", 1_500_000_000_000u128, 700), // 1.5M DGT, 7%
    ];
    
    for (val_addr, self_stake, commission) in validators {
        staking.register_validator(val_addr.to_string(), vec![0x01, 0x02], commission)
            .expect("Failed to register validator");
        
        staking.delegate(val_addr.to_string(), val_addr.to_string(), self_stake)
            .expect("Failed to self-delegate");
        
        println!("   ✓ {} active with {} uDGT self-stake, {}% commission", 
                val_addr, self_stake, commission as f32 / 100.0);
    }
    
    // Add external delegations
    let delegations = vec![
        ("user1", "alice_val", 800_000_000_000u128),   // 800K to Alice
        ("user2", "bob_val", 1_200_000_000_000u128),   // 1.2M to Bob  
        ("user3", "charlie_val", 600_000_000_000u128), // 600K to Charlie
        ("user1", "bob_val", 400_000_000_000u128),     // Additional: User1 -> Bob
    ];
    
    for (delegator, validator, amount) in delegations {
        match staking.delegate(delegator.to_string(), validator.to_string(), amount) {
            Ok(_) => println!("   ✓ {} delegated {} uDGT to {}", delegator, amount, validator),
            Err(e) => println!("   ✗ Delegation failed: {}", e),
        }
    }
    
    // Show final state
    let active_validators = staking.get_active_validators();
    println!("\n   📊 Final State:");
    println!("      Active validators: {}", active_validators.len());
    println!("      Total stake: {} uDGT", staking.total_stake);
    
    for validator in active_validators {
        println!("      {} - {} uDGT total stake", validator.address, validator.total_stake);
    }
    println!();
}

fn example_reward_distribution() {
    println!("💰 Example 3: Reward Distribution Over Time");
    println!("-------------------------------------------");
    
    let mut staking = StakingState::new();
    
    // Set up a simple scenario: 1 validator, 2 delegators
    staking.register_validator("validator".to_string(), vec![0x01], 0)
        .expect("Failed to register");
    
    // Validator self-stakes 1M DGT
    staking.delegate("validator".to_string(), "validator".to_string(), 1_000_000_000_000u128)
        .expect("Failed to self-delegate");
    
    // Delegator A stakes 2M DGT (66.67% of total)
    staking.delegate("delegator_a".to_string(), "validator".to_string(), 2_000_000_000_000u128)
        .expect("Failed to delegate A");
    
    // Delegator B stakes 1M DGT (33.33% of total)
    staking.delegate("delegator_b".to_string(), "validator".to_string(), 1_000_000_000_000u128)
        .expect("Failed to delegate B");
    
    println!("   Setup: Validator (25%), Delegator A (50%), Delegator B (25%)");
    println!("   Emission: {} uDRT per block\n", staking.params.emission_per_block);
    
    // Process several blocks and show reward accumulation
    for block in 1..=5 {
        staking.process_block_rewards(block).expect("Failed to process block");
        
        let rewards_a = staking.calculate_pending_rewards(&"delegator_a".to_string(), &"validator".to_string())
            .expect("Failed to calculate A rewards");
        let rewards_b = staking.calculate_pending_rewards(&"delegator_b".to_string(), &"validator".to_string())
            .expect("Failed to calculate B rewards");
        let rewards_val = staking.calculate_pending_rewards(&"validator".to_string(), &"validator".to_string())
            .expect("Failed to calculate validator rewards");
        
        println!("   Block {}: Validator={} uDRT, Delegator A={} uDRT, Delegator B={} uDRT", 
                block, rewards_val, rewards_a, rewards_b);
    }
    
    // Delegator A claims after block 3
    println!("\n   Delegator A claims rewards after block 3...");
    let claimed_a = staking.claim_rewards(&"delegator_a".to_string(), &"validator".to_string())
        .expect("Failed to claim A");
    println!("   ✓ Delegator A claimed {} uDRT", claimed_a);
    
    // Process 2 more blocks
    for block in 6..=7 {
        staking.process_block_rewards(block).expect("Failed to process block");
    }
    
    // Show final pending rewards
    let final_a = staking.calculate_pending_rewards(&"delegator_a".to_string(), &"validator".to_string())
        .expect("Failed to calculate final A");
    let final_b = staking.calculate_pending_rewards(&"delegator_b".to_string(), &"validator".to_string())
        .expect("Failed to calculate final B");
    
    println!("\n   Final pending rewards:");
    println!("   Delegator A: {} uDRT (only blocks 6-7)", final_a);
    println!("   Delegator B: {} uDRT (all 7 blocks)", final_b);
    
    // Verify math: Delegator B should have 7 blocks * 25% = 1.75M uDRT
    let expected_b = (staking.params.emission_per_block * 7) / 4; // 25% of 7 blocks
    assert_eq!(final_b, expected_b);
    println!("   ✓ Reward calculations verified!");
    println!();
}

// Helper function to format large numbers
fn format_amount(amount: u128, decimals: u8, symbol: &str) -> String {
    let divisor = 10u128.pow(decimals as u32);
    let whole = amount / divisor;
    let fractional = amount % divisor;
    
    if fractional == 0 {
        format!("{} {}", whole, symbol)
    } else {
        format!("{}.{:0width$} {}", whole, fractional, symbol, width = decimals as usize)
    }
}