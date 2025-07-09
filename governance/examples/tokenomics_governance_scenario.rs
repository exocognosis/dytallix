/*
Example governance scenario demonstrating emission rate adjustment through DAO voting.

This example shows:
1. Setting up the tokenomics system
2. Creating a governance proposal to adjust emission rates
3. Voting on the proposal
4. Executing the proposal to change emission parameters
*/

use dytallix_governance::{
    DaoGovernance, FileBasedGovernance, Ballot, ProposalType, TokenomicsProposal, EmissionRate
};
use dytallix_contracts::tokenomics::{
    DGTToken, DRTToken, EmissionController, EmissionParameters
};
use chrono::Utc;
use std::path::PathBuf;

pub struct TokenomicsGovernanceExample {
    governance: FileBasedGovernance,
    dgt_token: DGTToken,
    drt_token: DRTToken,
    emission_controller: EmissionController,
}

impl TokenomicsGovernanceExample {
    /// Set up the tokenomics governance example
    pub fn new(data_dir: PathBuf) -> Result<Self, Box<dyn std::error::Error>> {
        // Initialize governance system
        let governance = FileBasedGovernance::new(data_dir)?;
        
        // Initialize tokens and emission controller
        let owner = "dyt1owner".to_string();
        let mut dgt_token = DGTToken::new(owner.clone());
        let mut drt_token = DRTToken::new(owner.clone());
        let mut emission_controller = EmissionController::new(owner.clone());
        
        // Set up initial tokenomics
        // Mint 1M DGT tokens for governance voting
        dgt_token.mint_initial_supply("dyt1treasury".to_string(), 1_000_000)?;
        
        // Configure emission controller
        emission_controller.set_drt_token("dyt1drt_contract".to_string())?;
        emission_controller.set_governance_contract("dyt1governance".to_string())?;
        emission_controller.set_treasury("dyt1treasury".to_string())?;
        
        // Set DRT emission controller
        drt_token.set_emission_controller("dyt1emission_controller".to_string())?;
        
        Ok(Self {
            governance,
            dgt_token,
            drt_token,
            emission_controller,
        })
    }
    
    /// Example scenario: Community proposes to increase emission rate
    pub fn scenario_increase_emission_rate(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        println!("=== Dytallix Tokenomics Governance Scenario ===");
        println!("Scenario: Community proposal to increase DRT emission rate");
        println!();
        
        // Step 1: Check current emission parameters
        let current_params = self.emission_controller.get_emission_params();
        println!("Current emission rate: {} DRT per block", current_params.base_emission_rate);
        println!("Current max emission rate: {} DRT per block", current_params.max_emission_rate);
        println!();
        
        // Step 2: Create a proposal to increase emission rate
        let new_emission_rate = 1500; // Increase from 1000 to 1500
        let tokenomics_proposal = TokenomicsProposal::ChangeEmissionRate {
            new_rate: new_emission_rate,
        };
        
        let proposal_id = self.governance.propose_tokenomics(
            "Increase DRT Emission Rate".to_string(),
            format!(
                "Proposal to increase DRT emission rate from {} to {} tokens per block. \
                This will provide more rewards to validators and stakers, incentivizing \
                network participation during the growth phase.",
                current_params.base_emission_rate, new_emission_rate
            ),
            48, // 48 hours voting period
            tokenomics_proposal,
        )?;
        
        println!("Created governance proposal #{}", proposal_id);
        println!("Proposal: Increase DRT emission rate to {} per block", new_emission_rate);
        println!();
        
        // Step 3: Simulate community voting
        println!("Community voting phase:");
        
        // Vote 1: Alice votes YES
        let alice_ballot = Ballot {
            voter: "dyt1alice".to_string(),
            vote: true,
            timestamp: Utc::now(),
        };
        self.governance.vote(proposal_id, alice_ballot)?;
        println!("✓ Alice voted YES");
        
        // Vote 2: Bob votes YES
        let bob_ballot = Ballot {
            voter: "dyt1bob".to_string(),
            vote: true,
            timestamp: Utc::now(),
        };
        self.governance.vote(proposal_id, bob_ballot)?;
        println!("✓ Bob voted YES");
        
        // Vote 3: Charlie votes NO
        let charlie_ballot = Ballot {
            voter: "dyt1charlie".to_string(),
            vote: false,
            timestamp: Utc::now(),
        };
        self.governance.vote(proposal_id, charlie_ballot)?;
        println!("✓ Charlie voted NO");
        
        // Vote 4: Diana votes YES
        let diana_ballot = Ballot {
            voter: "dyt1diana".to_string(),
            vote: true,
            timestamp: Utc::now(),
        };
        self.governance.vote(proposal_id, diana_ballot)?;
        println!("✓ Diana voted YES");
        println!();
        
        // Step 4: Tally votes
        let vote_result = self.governance.tally(proposal_id)?;
        println!("Vote tally:");
        println!("  YES votes: {}", vote_result.yes_votes);
        println!("  NO votes: {}", vote_result.no_votes);
        println!("  Total votes: {}", vote_result.total_votes);
        println!("  Status: {:?}", vote_result.status);
        println!();
        
        // Step 5: Execute proposal if passed
        if vote_result.yes_votes > vote_result.no_votes {
            println!("Proposal PASSED! Executing emission rate change...");
            
            // In a real implementation, this would be called by the governance contract
            if let Some(tokenomics_proposal) = self.governance.execute_tokenomics_proposal(proposal_id)? {
                // Submit to emission controller
                self.emission_controller.submit_proposal(proposal_id, tokenomics_proposal)?;
                
                // Simulate governance contract approval
                self.emission_controller.approve_proposal(proposal_id, &"dyt1governance".to_string())?;
                
                // Execute the proposal
                self.emission_controller.execute_proposal(proposal_id)?;
                
                let updated_params = self.emission_controller.get_emission_params();
                println!("✓ Emission rate updated to: {} DRT per block", updated_params.base_emission_rate);
            }
        } else {
            println!("Proposal REJECTED. No changes made to emission parameters.");
        }
        
        println!();
        println!("=== Scenario Complete ===");
        
        Ok(())
    }
    
    /// Example scenario: Update emission parameters with complex changes
    pub fn scenario_update_emission_parameters(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        println!("=== Advanced Tokenomics Governance Scenario ===");
        println!("Scenario: Comprehensive emission parameter update");
        println!();
        
        // Create new emission parameters
        let new_params = EmissionParameters {
            base_emission_rate: 1200,
            max_emission_rate: 3000,
            min_emission_rate: 200,
            adjustment_factor: 750, // 7.5%
        };
        
        let tokenomics_proposal = TokenomicsProposal::UpdateEmissionParameters {
            new_params: new_params.clone(),
        };
        
        let proposal_id = self.governance.propose_tokenomics(
            "Comprehensive Emission Update".to_string(),
            "Update emission parameters to optimize network incentives based on 6 months of data analysis.".to_string(),
            72, // 72 hours voting period for complex changes
            tokenomics_proposal,
        )?;
        
        println!("Created complex governance proposal #{}", proposal_id);
        println!("New base emission rate: {}", new_params.base_emission_rate);
        println!("New max emission rate: {}", new_params.max_emission_rate);
        println!("New min emission rate: {}", new_params.min_emission_rate);
        println!("New adjustment factor: {}% (basis points: {})", new_params.adjustment_factor as f64 / 100.0, new_params.adjustment_factor);
        
        Ok(())
    }
    
    /// Demonstrate emission processing with adaptive rates
    pub fn scenario_adaptive_emission(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        println!("=== Adaptive Emission Demonstration ===");
        println!();
        
        // Simulate different network utilization scenarios
        let scenarios = vec![
            (2500, "Low network utilization (25%)"),
            (5000, "Medium network utilization (50%)"),
            (7500, "High network utilization (75%)"),
            (9000, "Very high network utilization (90%)"),
        ];
        
        for (utilization, description) in scenarios {
            let adaptive_rate = self.emission_controller.calculate_adaptive_rate(utilization);
            println!("{}: {} DRT per block", description, adaptive_rate);
        }
        
        println!();
        
        // Process emission for a block
        let total_emitted = self.emission_controller.process_emission(100, 6000)?;
        println!("Processed emission for block 100 with 60% utilization:");
        println!("  Total emitted: {} DRT", total_emitted);
        println!("  Validator pool: {} DRT", self.emission_controller.validator_pool_balance());
        println!("  Staker pool: {} DRT", self.emission_controller.staker_pool_balance());
        
        Ok(())
    }
    
    /// Get current tokenomics state for display
    pub fn get_tokenomics_summary(&self) -> TokenomicsSummary {
        TokenomicsSummary {
            dgt_total_supply: self.dgt_token.total_supply(),
            drt_total_supply: self.drt_token.total_supply(),
            drt_total_burned: self.drt_token.total_burned(),
            current_emission_rate: self.drt_token.emission_rate(),
            validator_pool: self.emission_controller.validator_pool_balance(),
            staker_pool: self.emission_controller.staker_pool_balance(),
            pending_proposals: self.emission_controller.get_pending_proposals().len(),
            approved_proposals: self.emission_controller.get_approved_proposals().len(),
        }
    }
}

#[derive(Debug)]
pub struct TokenomicsSummary {
    pub dgt_total_supply: u128,
    pub drt_total_supply: u128,
    pub drt_total_burned: u128,
    pub current_emission_rate: u64,
    pub validator_pool: u128,
    pub staker_pool: u128,
    pub pending_proposals: usize,
    pub approved_proposals: usize,
}

impl std::fmt::Display for TokenomicsSummary {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        writeln!(f, "=== Dytallix Tokenomics Summary ===")?;
        writeln!(f, "DGT (Governance Token):")?;
        writeln!(f, "  Total Supply: {} DGT", self.dgt_total_supply)?;
        writeln!(f, "DRT (Reward Token):")?;
        writeln!(f, "  Total Supply: {} DRT", self.drt_total_supply)?;
        writeln!(f, "  Total Burned: {} DRT", self.drt_total_burned)?;
        writeln!(f, "  Current Emission: {} DRT per block", self.current_emission_rate)?;
        writeln!(f, "Reward Pools:")?;
        writeln!(f, "  Validator Pool: {} DRT", self.validator_pool)?;
        writeln!(f, "  Staker Pool: {} DRT", self.staker_pool)?;
        writeln!(f, "Governance:")?;
        writeln!(f, "  Pending Proposals: {}", self.pending_proposals)?;
        writeln!(f, "  Approved Proposals: {}", self.approved_proposals)?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_governance_scenario_setup() {
        let temp_dir = TempDir::new().unwrap();
        let data_dir = temp_dir.path().to_path_buf();
        
        let example = TokenomicsGovernanceExample::new(data_dir);
        assert!(example.is_ok());
    }

    #[test]
    fn test_emission_rate_proposal() {
        let temp_dir = TempDir::new().unwrap();
        let data_dir = temp_dir.path().to_path_buf();
        
        let mut example = TokenomicsGovernanceExample::new(data_dir).unwrap();
        let result = example.scenario_increase_emission_rate();
        assert!(result.is_ok());
    }

    #[test]
    fn test_adaptive_emission() {
        let temp_dir = TempDir::new().unwrap();
        let data_dir = temp_dir.path().to_path_buf();
        
        let mut example = TokenomicsGovernanceExample::new(data_dir).unwrap();
        let result = example.scenario_adaptive_emission();
        assert!(result.is_ok());
    }

    #[test]
    fn test_tokenomics_summary() {
        let temp_dir = TempDir::new().unwrap();
        let data_dir = temp_dir.path().to_path_buf();
        
        let example = TokenomicsGovernanceExample::new(data_dir).unwrap();
        let summary = example.get_tokenomics_summary();
        
        assert_eq!(summary.dgt_total_supply, 1_000_000);
        assert_eq!(summary.drt_total_supply, 0);
    }
}