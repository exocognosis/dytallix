
## fmt_check FAILED (exit 1)

Last 80 lines of /Users/rickglenn/dytallix/dytallix-lean-launch/launch-evidence/build-logs/fmt_check.log:
```
(B[m     let (new_total_stake, new_reward_index, new_pending) = staking.get_stats();
     assert_eq!(new_total_stake, 500_000_000_000);
     assert!(new_reward_index > 0); // Should have applied pending rewards
Diff in /Users/rickglenn/dytallix/dytallix-lean-launch/node/tests/staking_reward_accrual_integration.rs:155:
     assert_eq!(new_pending, 0); // Pending should be cleared
[31m-    
(B[m[32m+
(B[m     // Delegator should have accrued the full pending amount
     let accrued = staking.get_accrued_rewards("delegator1");
     assert_eq!(accrued, 750_000); // All the pending emission
Diff in /Users/rickglenn/dytallix/dytallix-lean-launch/node/tests/staking_reward_accrual_integration.rs:165:
     let dir = tempdir().unwrap();
     let storage = Arc::new(Storage::open(dir.path().join("node.db")).unwrap());
     let mut staking = StakingModule::new(storage);
[31m-    
(B[m[32m+
(B[m     // Add delegator but no emissions
     staking.update_delegator_stake("delegator1", 100_000_000_000);
[31m-    
(B[m[32m+
(B[m     // Claim should return 0
     let claimed = staking.claim_rewards("delegator1");
     assert_eq!(claimed, 0);
Diff in /Users/rickglenn/dytallix/dytallix-lean-launch/node/tests/staking_reward_accrual_integration.rs:175:
[31m-    
(B[m[32m+
(B[m     // Still 0 after claim
     let accrued = staking.get_accrued_rewards("delegator1");
     assert_eq!(accrued, 0);
Diff in /Users/rickglenn/dytallix/dytallix-lean-launch/node/tests/staking_reward_accrual_integration.rs:184:
     let dir = tempdir().unwrap();
     let storage = Arc::new(Storage::open(dir.path().join("node.db")).unwrap());
     let state = Arc::new(Mutex::new(State::new(storage.clone())));
[31m-    
(B[m[32m+
(B[m     let config = EmissionConfig {
[31m-        schedule: EmissionSchedule::Static { per_block: 1_000_000 },
(B[m[32m+        schedule: EmissionSchedule::Static {
(B[m[32m+            per_block: 1_000_000,
(B[m[32m+        },
(B[m         initial_supply: 0,
         emission_breakdown: EmissionBreakdown {
             block_rewards: 60,
Diff in /Users/rickglenn/dytallix/dytallix-lean-launch/node/tests/staking_reward_accrual_integration.rs:195:
             bridge_operations: 5,
         },
     };
[31m-    
(B[m[32m+
(B[m     let mut emission = EmissionEngine::new_with_config(storage.clone(), state, config);
     let mut staking = StakingModule::new(storage);
[31m-    
(B[m[32m+
(B[m     // Setup delegator and apply emission
     staking.update_delegator_stake("delegator1", 1_000_000_000_000);
     emission.apply_until(1);
Diff in /Users/rickglenn/dytallix/dytallix-lean-launch/node/tests/staking_reward_accrual_integration.rs:205:
     let staking_rewards = emission.get_latest_staking_rewards();
     staking.apply_external_emission(staking_rewards);
[31m-    
(B[m[32m+
(B[m     // First claim should work
     let first_claim = staking.claim_rewards("delegator1");
     assert_eq!(first_claim, 250_000);
Diff in /Users/rickglenn/dytallix/dytallix-lean-launch/node/tests/staking_reward_accrual_integration.rs:211:
[31m-    
(B[m[32m+
(B[m     // Immediate second claim should return 0
     let second_claim = staking.claim_rewards("delegator1");
     assert_eq!(second_claim, 0);
Diff in /Users/rickglenn/dytallix/dytallix-lean-launch/node/tests/staking_reward_accrual_integration.rs:215:
[31m-    
(B[m[32m+
(B[m     // Accrued should be 0
     let accrued = staking.get_accrued_rewards("delegator1");
     assert_eq!(accrued, 0);
Diff in /Users/rickglenn/dytallix/dytallix-lean-launch/node/tests/staking_reward_accrual_integration.rs:219:
 }
[32m+
(B[m```

