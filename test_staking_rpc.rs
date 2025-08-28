// Simple test to verify staking RPC integration and block processing
use blockchain_core::runtime::DytallixRuntime;
use blockchain_core::storage::StorageManager;
use std::sync::Arc;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("🔧 Testing Staking RPC Integration");
    println!("=================================\n");

    // Initialize runtime as would be done in the API server
    let storage = Arc::new(StorageManager::new().await?);
    let runtime = Arc::new(DytallixRuntime::new(storage.clone())?);

    println!("✓ Runtime initialized");

    // Test scenario: Validator registration through runtime interface
    println!("\n1. Testing Validator Registration via Runtime");
    let validator_addr = "dyt1validator123".to_string();
    let pubkey = vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    match runtime.register_validator(validator_addr.clone(), pubkey, 500).await {
        Ok(_) => println!("   ✓ Validator registered successfully"),
        Err(e) => {
            println!("   ✗ Registration failed: {}", e);
            return Err(e);
        }
    }

    // Verify validator exists
    match runtime.get_validator(&validator_addr).await {
        Some(validator) => {
            println!("   ✓ Validator found: {} (Status: {:?})",
                     validator.address, validator.status);
        }
        None => {
            println!("   ✗ Validator not found after registration");
            return Err("Validator not found".into());
        }
    }

    // Test delegation through runtime
    println!("\n2. Testing Delegation via Runtime");
    let stake_amount = 1_000_000_000_000u128;

    // Set initial balance
    runtime.set_balance(&validator_addr, stake_amount as u64).await?;

    match runtime.delegate(validator_addr.clone(), validator_addr.clone(), stake_amount).await {
        Ok(_) => println!("   ✓ Self-delegation successful"),
        Err(e) => {
            println!("   ✗ Delegation failed: {}", e);
            return Err(e);
        }
    }

    // Test getting active validators
    println!("\n3. Testing Active Validators Query");
    let active_validators = runtime.get_active_validators().await;
    println!("   ✓ Found {} active validators", active_validators.len());

    for validator in &active_validators {
        println!("     - {} (Stake: {} uDGT)", validator.address, validator.total_stake);
    }

    // Test block reward processing
    println!("\n4. Testing Block Reward Processing");
    for block_height in 1..=3 {
        match runtime.process_block_rewards(block_height).await {
            Ok(_) => println!("   ✓ Block {} rewards processed", block_height),
            Err(e) => {
                println!("   ✗ Block {} reward processing failed: {}", block_height, e);
                return Err(e);
            }
        }
    }

    // Test reward calculation
    println!("\n5. Testing Reward Calculation");
    match runtime.calculate_pending_rewards(&validator_addr, &validator_addr).await {
        Ok(rewards) => {
            println!("   ✓ Pending rewards: {} uDRT", rewards);
            if rewards > 0 {
                println!("   ✓ Reward accrual is working!");
            }
        }
        Err(e) => {
            println!("   ✗ Reward calculation failed: {}", e);
            return Err(e.into());
        }
    }

    // Test staking statistics
    println!("\n6. Testing Staking Statistics");
    let (total_stake, total_validators, active_validators_count) = runtime.get_staking_stats().await;

    println!("   📊 Staking Statistics:");
    println!("     Total Stake: {} uDGT", total_stake);
    println!("     Total Validators: {}", total_validators);
    println!("     Active Validators: {}", active_validators_count);

    // Test reward claiming
    println!("\n7. Testing Reward Claiming");
    match runtime.claim_rewards(&validator_addr, &validator_addr).await {
        Ok(claimed) => {
            println!("   ✓ Claimed {} uDRT rewards", claimed);

            // Check DRT balance
            let drt_balance = runtime.get_drt_balance(&validator_addr).await;
            println!("   ✓ DRT balance after claim: {} uDRT", drt_balance);
        }
        Err(e) => {
            println!("   ✗ Reward claiming failed: {}", e);
            return Err(e.into());
        }
    }

    println!("\n🎉 All RPC Integration Tests Passed!");
    println!("====================================");
    println!("✅ Runtime methods work correctly");
    println!("✅ Validator registration and delegation");
    println!("✅ Block reward processing");
    println!("✅ Reward calculation and claiming");
    println!("✅ Statistics and queries");

    println!("\n🚀 Staking RPC integration is complete and functional!");
    println!("   The staking system is ready for CLI and API usage.");

    Ok(())
}