/// Invariant tests for WASM contracts
/// These tests verify that contract state transitions maintain expected invariants

use anyhow::Result;
use std::collections::HashMap;

// Mock contract state for testing
#[derive(Debug, Clone)]
struct MockContractState {
    pub storage: HashMap<String, Vec<u8>>,
}

impl MockContractState {
    pub fn new() -> Self {
        Self {
            storage: HashMap::new(),
        }
    }
    
    pub fn get(&self, key: &str) -> Option<&Vec<u8>> {
        self.storage.get(key)
    }
    
    pub fn set(&mut self, key: &str, value: Vec<u8>) {
        self.storage.insert(key.to_string(), value);
    }
}

// Token contract invariants
#[cfg(test)]
mod token_invariants {
    use super::*;
    use serde_json::Value;

    #[test]
    fn test_total_supply_invariant() {
        // Invariant: Total supply should never change after initialization
        let mut state = MockContractState::new();
        let initial_supply = 1000u64;
        
        // Initialize token
        state.set("total_supply", initial_supply.to_le_bytes().to_vec());
        state.set("balance_alice", 600u64.to_le_bytes().to_vec());
        state.set("balance_bob", 400u64.to_le_bytes().to_vec());
        
        // Verify initial invariant
        let total_supply = u64::from_le_bytes(
            state.get("total_supply").unwrap().try_into().unwrap()
        );
        let balance_sum = get_balance(&state, "alice") + get_balance(&state, "bob");
        assert_eq!(total_supply, balance_sum);
        
        // Simulate transfer
        simulate_transfer(&mut state, "alice", "bob", 100).unwrap();
        
        // Verify invariant holds after transfer
        let total_supply_after = u64::from_le_bytes(
            state.get("total_supply").unwrap().try_into().unwrap()
        );
        let balance_sum_after = get_balance(&state, "alice") + get_balance(&state, "bob");
        
        assert_eq!(total_supply, total_supply_after); // Total supply unchanged
        assert_eq!(total_supply, balance_sum_after);  // Sum still equals total supply
    }

    #[test]
    fn test_balance_non_negative_invariant() {
        // Invariant: All balances must be non-negative
        let mut state = MockContractState::new();
        state.set("balance_alice", 100u64.to_le_bytes().to_vec());
        state.set("balance_bob", 0u64.to_le_bytes().to_vec());
        
        // Valid transfer
        let result = simulate_transfer(&mut state, "alice", "bob", 50);
        assert!(result.is_ok());
        assert_eq!(get_balance(&state, "alice"), 50);
        assert_eq!(get_balance(&state, "bob"), 50);
        
        // Invalid transfer (would make balance negative)
        let result = simulate_transfer(&mut state, "alice", "bob", 100);
        assert!(result.is_err());
        
        // Balances should remain unchanged after failed transfer
        assert_eq!(get_balance(&state, "alice"), 50);
        assert_eq!(get_balance(&state, "bob"), 50);
    }

    #[test]
    fn test_allowance_invariant() {
        // Invariant: Allowances should decrease when transfer_from is called
        let mut state = MockContractState::new();
        state.set("balance_alice", 1000u64.to_le_bytes().to_vec());
        state.set("balance_bob", 0u64.to_le_bytes().to_vec());
        state.set("allowance_alice_charlie", 200u64.to_le_bytes().to_vec());
        
        let initial_allowance = get_allowance(&state, "alice", "charlie");
        assert_eq!(initial_allowance, 200);
        
        // Simulate transfer_from
        simulate_transfer_from(&mut state, "charlie", "alice", "bob", 50).unwrap();
        
        let final_allowance = get_allowance(&state, "alice", "charlie");
        assert_eq!(final_allowance, 150); // Should decrease by transfer amount
        assert_eq!(get_balance(&state, "alice"), 950);
        assert_eq!(get_balance(&state, "bob"), 50);
    }

    // Helper functions
    fn get_balance(state: &MockContractState, account: &str) -> u64 {
        let key = format!("balance_{}", account);
        state.get(&key)
            .map(|bytes| u64::from_le_bytes(bytes.try_into().unwrap_or([0; 8])))
            .unwrap_or(0)
    }
    
    fn get_allowance(state: &MockContractState, owner: &str, spender: &str) -> u64 {
        let key = format!("allowance_{}_{}", owner, spender);
        state.get(&key)
            .map(|bytes| u64::from_le_bytes(bytes.try_into().unwrap_or([0; 8])))
            .unwrap_or(0)
    }
    
    fn simulate_transfer(state: &mut MockContractState, from: &str, to: &str, amount: u64) -> Result<()> {
        let from_balance = get_balance(state, from);
        if from_balance < amount {
            return Err(anyhow::anyhow!("Insufficient balance"));
        }
        
        let to_balance = get_balance(state, to);
        state.set(&format!("balance_{}", from), (from_balance - amount).to_le_bytes().to_vec());
        state.set(&format!("balance_{}", to), (to_balance + amount).to_le_bytes().to_vec());
        Ok(())
    }
    
    fn simulate_transfer_from(state: &mut MockContractState, spender: &str, from: &str, to: &str, amount: u64) -> Result<()> {
        let allowance = get_allowance(state, from, spender);
        if allowance < amount {
            return Err(anyhow::anyhow!("Insufficient allowance"));
        }
        
        let from_balance = get_balance(state, from);
        if from_balance < amount {
            return Err(anyhow::anyhow!("Insufficient balance"));
        }
        
        let to_balance = get_balance(state, to);
        state.set(&format!("balance_{}", from), (from_balance - amount).to_le_bytes().to_vec());
        state.set(&format!("balance_{}", to), (to_balance + amount).to_le_bytes().to_vec());
        state.set(&format!("allowance_{}_{}", from, spender), (allowance - amount).to_le_bytes().to_vec());
        Ok(())
    }
}

// Governance contract invariants
#[cfg(test)]
mod governance_invariants {
    use super::*;

    #[test]
    fn test_voting_period_invariant() {
        // Invariant: Votes can only be cast during the voting period
        let mut state = MockContractState::new();
        
        // Set up proposal
        let proposal_id = 1u64;
        let current_height = 100u64;
        let voting_period = 50u64;
        
        state.set("current_height", current_height.to_le_bytes().to_vec());
        state.set(&format!("proposal_{}_start", proposal_id), current_height.to_le_bytes().to_vec());
        state.set(&format!("proposal_{}_end", proposal_id), (current_height + voting_period).to_le_bytes().to_vec());
        state.set(&format!("proposal_{}_status", proposal_id), b"active".to_vec());
        
        // Valid vote (within period)
        let result = simulate_vote(&mut state, proposal_id, "alice", "yes", current_height + 10);
        assert!(result.is_ok());
        
        // Invalid vote (after period ends)
        let result = simulate_vote(&mut state, proposal_id, "bob", "yes", current_height + voting_period + 1);
        assert!(result.is_err());
    }

    #[test]
    fn test_quorum_and_approval_invariant() {
        // Invariant: Proposals only pass if they meet quorum and approval thresholds
        let mut state = MockContractState::new();
        
        let proposal_id = 1u64;
        let quorum_threshold = 10u64; // Need at least 10 votes
        let approval_threshold = 60u64; // Need 60% yes votes
        
        state.set("quorum_threshold", quorum_threshold.to_le_bytes().to_vec());
        state.set("approval_threshold", approval_threshold.to_le_bytes().to_vec());
        
        // Test case 1: Meets quorum and approval
        state.set(&format!("proposal_{}_yes", proposal_id), 7u64.to_le_bytes().to_vec());
        state.set(&format!("proposal_{}_no", proposal_id), 3u64.to_le_bytes().to_vec());
        
        let should_pass = check_proposal_passes(&state, proposal_id);
        assert!(should_pass); // 7/10 = 70% yes, meets quorum (10) and approval (60%)
        
        // Test case 2: Meets quorum but not approval
        state.set(&format!("proposal_{}_yes", proposal_id), 5u64.to_le_bytes().to_vec());
        state.set(&format!("proposal_{}_no", proposal_id), 5u64.to_le_bytes().to_vec());
        
        let should_pass = check_proposal_passes(&state, proposal_id);
        assert!(!should_pass); // 5/10 = 50% yes, meets quorum but not approval (60%)
        
        // Test case 3: Meets approval but not quorum
        state.set(&format!("proposal_{}_yes", proposal_id), 6u64.to_le_bytes().to_vec()); 
        state.set(&format!("proposal_{}_no", proposal_id), 2u64.to_le_bytes().to_vec());
        
        let should_pass = check_proposal_passes(&state, proposal_id);
        assert!(!should_pass); // 6/8 = 75% yes, meets approval but not quorum (need 10 total)
    }

    #[test]
    fn test_parameter_update_invariant() {
        // Invariant: Parameters should only change through successful governance proposals
        let mut state = MockContractState::new();
        
        let initial_value = "1000000";
        state.set("param_gas_limit", initial_value.as_bytes().to_vec());
        
        let proposal_id = 1u64;
        let new_value = "2000000";
        
        // Set up a passing proposal
        state.set(&format!("proposal_{}_param", proposal_id), b"gas_limit".to_vec());
        state.set(&format!("proposal_{}_new_value", proposal_id), new_value.as_bytes().to_vec());
        state.set(&format!("proposal_{}_status", proposal_id), b"passed".to_vec());
        
        // Execute proposal
        execute_proposal(&mut state, proposal_id).unwrap();
        
        // Verify parameter changed
        let updated_value = String::from_utf8(
            state.get("param_gas_limit").unwrap().clone()
        ).unwrap();
        assert_eq!(updated_value, new_value);
        
        // Verify proposal status updated
        let status = String::from_utf8(
            state.get(&format!("proposal_{}_status", proposal_id)).unwrap().clone()
        ).unwrap();
        assert_eq!(status, "executed");
    }

    // Helper functions
    fn simulate_vote(state: &mut MockContractState, proposal_id: u64, voter: &str, vote: &str, current_height: u64) -> Result<()> {
        let start_height = u64::from_le_bytes(
            state.get(&format!("proposal_{}_start", proposal_id))
                .ok_or_else(|| anyhow::anyhow!("Proposal not found"))?
                .try_into().unwrap()
        );
        let end_height = u64::from_le_bytes(
            state.get(&format!("proposal_{}_end", proposal_id))
                .ok_or_else(|| anyhow::anyhow!("Proposal not found"))?
                .try_into().unwrap()
        );
        
        if current_height < start_height || current_height > end_height {
            return Err(anyhow::anyhow!("Voting period ended"));
        }
        
        // Record vote
        state.set(&format!("vote_{}_{}", proposal_id, voter), vote.as_bytes().to_vec());
        
        // Update vote counts
        if vote == "yes" {
            let current = u64::from_le_bytes(
                state.get(&format!("proposal_{}_yes", proposal_id))
                    .unwrap_or(&0u64.to_le_bytes().to_vec())
                    .try_into().unwrap()
            );
            state.set(&format!("proposal_{}_yes", proposal_id), (current + 1).to_le_bytes().to_vec());
        } else if vote == "no" {
            let current = u64::from_le_bytes(
                state.get(&format!("proposal_{}_no", proposal_id))
                    .unwrap_or(&0u64.to_le_bytes().to_vec())
                    .try_into().unwrap()
            );
            state.set(&format!("proposal_{}_no", proposal_id), (current + 1).to_le_bytes().to_vec());
        }
        
        Ok(())
    }
    
    fn check_proposal_passes(state: &MockContractState, proposal_id: u64) -> bool {
        let yes_votes = u64::from_le_bytes(
            state.get(&format!("proposal_{}_yes", proposal_id))
                .unwrap_or(&0u64.to_le_bytes().to_vec())
                .try_into().unwrap()
        );
        let no_votes = u64::from_le_bytes(
            state.get(&format!("proposal_{}_no", proposal_id))
                .unwrap_or(&0u64.to_le_bytes().to_vec())
                .try_into().unwrap()
        );
        let total_votes = yes_votes + no_votes;
        
        let quorum_threshold = u64::from_le_bytes(
            state.get("quorum_threshold").unwrap().try_into().unwrap()
        );
        let approval_threshold = u64::from_le_bytes(
            state.get("approval_threshold").unwrap().try_into().unwrap()
        );
        
        let quorum_met = total_votes >= quorum_threshold;
        let approval_met = if total_votes > 0 {
            (yes_votes * 100) / total_votes >= approval_threshold
        } else {
            false
        };
        
        quorum_met && approval_met
    }
    
    fn execute_proposal(state: &mut MockContractState, proposal_id: u64) -> Result<()> {
        let status = String::from_utf8(
            state.get(&format!("proposal_{}_status", proposal_id))
                .ok_or_else(|| anyhow::anyhow!("Proposal not found"))?
                .clone()
        )?;
        
        if status != "passed" {
            return Err(anyhow::anyhow!("Proposal has not passed"));
        }
        
        let param_name = String::from_utf8(
            state.get(&format!("proposal_{}_param", proposal_id))
                .ok_or_else(|| anyhow::anyhow!("Parameter name not found"))?
                .clone()
        )?;
        
        let new_value = state.get(&format!("proposal_{}_new_value", proposal_id))
            .ok_or_else(|| anyhow::anyhow!("New value not found"))?
            .clone();
        
        // Update parameter
        state.set(&format!("param_{}", param_name), new_value);
        
        // Update proposal status
        state.set(&format!("proposal_{}_status", proposal_id), b"executed".to_vec());
        
        Ok(())
    }
}