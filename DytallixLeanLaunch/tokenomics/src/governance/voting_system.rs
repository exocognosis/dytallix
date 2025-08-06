//! Voting system with quadratic voting support

use std::collections::HashMap;
use serde::{Deserialize, Serialize};

use rust_decimal::Decimal;
use crate::{Address, Balance, Timestamp, Result, TokenomicsError};

/// Vote choice
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum VoteChoice {
    Yes,
    No,
    Abstain,
}

/// Individual vote record
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Vote {
    /// Voter address
    pub voter: Address,
    /// Vote choice
    pub choice: VoteChoice,
    /// Voting power used
    pub power: Balance,
    /// Raw voting power (before quadratic calculation)
    pub raw_power: Balance,
    /// Block number when vote was cast
    pub block_number: u64,
    /// Timestamp when vote was cast
    pub timestamp: Timestamp,
}

/// Voting results for a proposal
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VotingResult {
    /// Total yes votes (quadratic weighted)
    pub yes_votes: Balance,
    /// Total no votes (quadratic weighted)
    pub no_votes: Balance,
    /// Total abstain votes (quadratic weighted)
    pub abstain_votes: Balance,
    /// Total raw voting power participated
    pub total_raw_power: Balance,
    /// Total quadratic voting power participated
    pub total_voting_power: Balance,
    /// Number of unique voters
    pub voter_count: u32,
    /// Participation rate (as decimal)
    pub participation_rate: Decimal,
}

/// Voting system with quadratic voting
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VotingSystem {
    /// Votes by proposal ID
    pub votes: HashMap<u64, Vec<Vote>>,
    /// Cached voting results by proposal ID
    pub results: HashMap<u64, VotingResult>,
    /// Total voting power in the system
    pub total_system_power: Balance,
}

impl VotingSystem {
    /// Create new voting system
    pub fn new() -> Self {
        Self {
            votes: HashMap::new(),
            results: HashMap::new(),
            total_system_power: 0,
        }
    }
    
    /// Update total system voting power
    pub fn update_total_power(&mut self, total_power: Balance) {
        self.total_system_power = total_power;
    }
    
    /// Cast a vote on a proposal
    pub fn cast_vote(
        &mut self,
        proposal_id: u64,
        voter: Address,
        choice: VoteChoice,
        raw_voting_power: Balance,
        block_number: u64,
        timestamp: Timestamp,
    ) -> Result<()> {
        // Check if voter has already voted
        if let Some(existing_votes) = self.votes.get(&proposal_id) {
            if existing_votes.iter().any(|v| v.voter == voter) {
                return Err(TokenomicsError::InvalidConfig {
                    details: "Voter has already voted on this proposal".to_string(),
                });
            }
        }
        
        if raw_voting_power == 0 {
            return Err(TokenomicsError::InvalidConfig {
                details: "Cannot vote with zero voting power".to_string(),
            });
        }
        
        // Calculate quadratic voting power
        let quadratic_power = self.calculate_quadratic_power(raw_voting_power)?;
        
        let vote = Vote {
            voter,
            choice,
            power: quadratic_power,
            raw_power: raw_voting_power,
            block_number,
            timestamp,
        };
        
        self.votes.entry(proposal_id).or_insert_with(Vec::new).push(vote);
        
        // Invalidate cached results
        self.results.remove(&proposal_id);
        
        Ok(())
    }
    
    /// Calculate quadratic voting power from raw power
    fn calculate_quadratic_power(&self, raw_power: Balance) -> Result<Balance> {
        // Quadratic voting: voting power = sqrt(tokens)
        // To avoid floating point, we use integer approximation
        let sqrt_power = self.integer_sqrt(raw_power);
        Ok(sqrt_power)
    }
    
    /// Integer square root approximation
    fn integer_sqrt(&self, n: Balance) -> Balance {
        if n == 0 {
            return 0;
        }
        
        let mut x = n;
        let mut y = (x + 1) / 2;
        
        while y < x {
            x = y;
            y = (x + n / x) / 2;
        }
        
        x
    }
    
    /// Get votes for a proposal
    pub fn get_votes(&self, proposal_id: u64) -> Option<&Vec<Vote>> {
        self.votes.get(&proposal_id)
    }
    
    /// Calculate voting results for a proposal
    pub fn calculate_results(&mut self, proposal_id: u64) -> Result<VotingResult> {
        // Return cached results if available
        if let Some(cached) = self.results.get(&proposal_id) {
            return Ok(cached.clone());
        }
        
        let empty_votes = Vec::new();
        let votes = self.votes.get(&proposal_id).unwrap_or(&empty_votes);
        
        let mut yes_votes = 0u128;
        let mut no_votes = 0u128;
        let mut abstain_votes = 0u128;
        let mut total_raw_power = 0u128;
        let mut total_voting_power = 0u128;
        
        for vote in votes {
            total_raw_power = total_raw_power.checked_add(vote.raw_power)
                .ok_or(TokenomicsError::Overflow)?;
            total_voting_power = total_voting_power.checked_add(vote.power)
                .ok_or(TokenomicsError::Overflow)?;
            
            match vote.choice {
                VoteChoice::Yes => {
                    yes_votes = yes_votes.checked_add(vote.power)
                        .ok_or(TokenomicsError::Overflow)?;
                }
                VoteChoice::No => {
                    no_votes = no_votes.checked_add(vote.power)
                        .ok_or(TokenomicsError::Overflow)?;
                }
                VoteChoice::Abstain => {
                    abstain_votes = abstain_votes.checked_add(vote.power)
                        .ok_or(TokenomicsError::Overflow)?;
                }
            }
        }
        
        let participation_rate = if self.total_system_power > 0 {
            Decimal::from(total_raw_power) / Decimal::from(self.total_system_power)
        } else {
            Decimal::ZERO
        };
        
        let result = VotingResult {
            yes_votes,
            no_votes,
            abstain_votes,
            total_raw_power,
            total_voting_power,
            voter_count: votes.len() as u32,
            participation_rate,
        };
        
        // Cache the results
        self.results.insert(proposal_id, result.clone());
        
        Ok(result)
    }
    
    /// Check if proposal passes based on voting results
    pub fn check_proposal_passes(
        &mut self,
        proposal_id: u64,
        quorum_threshold: Decimal,
        approval_threshold: Decimal,
    ) -> Result<bool> {
        let results = self.calculate_results(proposal_id)?;
        
        // Check quorum
        if results.participation_rate < quorum_threshold {
            return Ok(false);
        }
        
        // Check approval threshold
        let total_decisive_votes = results.yes_votes + results.no_votes;
        if total_decisive_votes == 0 {
            return Ok(false);
        }
        
        let approval_rate = Decimal::from(results.yes_votes) / Decimal::from(total_decisive_votes);
        
        Ok(approval_rate >= approval_threshold)
    }
    
    /// Get voter's vote on a proposal
    pub fn get_voter_vote(&self, proposal_id: u64, voter: &Address) -> Option<&Vote> {
        self.votes.get(&proposal_id)?
            .iter()
            .find(|vote| vote.voter == *voter)
    }
    
    /// Check if voter has voted on a proposal
    pub fn has_voted(&self, proposal_id: u64, voter: &Address) -> bool {
        self.get_voter_vote(proposal_id, voter).is_some()
    }
    
    /// Get total number of proposals voted on
    pub fn get_proposal_count(&self) -> usize {
        self.votes.len()
    }
    
    /// Get all proposal IDs with votes
    pub fn get_proposal_ids(&self) -> Vec<u64> {
        self.votes.keys().copied().collect()
    }
    
    /// Remove votes for a proposal (for cleanup)
    pub fn remove_proposal_votes(&mut self, proposal_id: u64) {
        self.votes.remove(&proposal_id);
        self.results.remove(&proposal_id);
    }
}

impl Default for VotingSystem {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_quadratic_power_calculation() {
        let voting_system = VotingSystem::new();
        
        // Test known values
        assert_eq!(voting_system.calculate_quadratic_power(0).unwrap(), 0);
        assert_eq!(voting_system.calculate_quadratic_power(1).unwrap(), 1);
        assert_eq!(voting_system.calculate_quadratic_power(4).unwrap(), 2);
        assert_eq!(voting_system.calculate_quadratic_power(9).unwrap(), 3);
        assert_eq!(voting_system.calculate_quadratic_power(16).unwrap(), 4);
        assert_eq!(voting_system.calculate_quadratic_power(100).unwrap(), 10);
    }

    #[test]
    fn test_voting() {
        let mut voting_system = VotingSystem::new();
        voting_system.update_total_power(10000);
        
        // Cast votes
        voting_system.cast_vote(
            1, // proposal_id
            "alice".to_string(),
            VoteChoice::Yes,
            100, // raw power
            1,
            1000,
        ).unwrap();
        
        voting_system.cast_vote(
            1,
            "bob".to_string(),
            VoteChoice::No,
            400, // raw power
            2,
            1001,
        ).unwrap();
        
        // Check voting results
        let results = voting_system.calculate_results(1).unwrap();
        
        assert_eq!(results.yes_votes, 10); // sqrt(100) = 10
        assert_eq!(results.no_votes, 20); // sqrt(400) = 20
        assert_eq!(results.voter_count, 2);
        assert_eq!(results.total_raw_power, 500);
        
        // Check participation rate
        let expected_participation = Decimal::from(500) / Decimal::from(10000);
        assert_eq!(results.participation_rate, expected_participation);
    }

    #[test]
    fn test_proposal_passing() {
        let mut voting_system = VotingSystem::new();
        voting_system.update_total_power(1000);
        
        // Add votes that meet quorum and approval thresholds
        voting_system.cast_vote(1, "alice".to_string(), VoteChoice::Yes, 400, 1, 1000).unwrap();
        voting_system.cast_vote(1, "bob".to_string(), VoteChoice::Yes, 100, 2, 1001).unwrap();
        voting_system.cast_vote(1, "charlie".to_string(), VoteChoice::No, 100, 3, 1002).unwrap();
        
        // Total raw power: 600, participation: 60%
        // Yes votes: sqrt(400) + sqrt(100) = 20 + 10 = 30
        // No votes: sqrt(100) = 10
        // Approval rate: 30 / (30 + 10) = 75%
        
        let passes = voting_system.check_proposal_passes(
            1,
            Decimal::from_str_exact("0.15").unwrap(), // 15% quorum
            Decimal::from_str_exact("0.51").unwrap(), // 51% approval
        ).unwrap();
        
        assert!(passes);
    }

    #[test]
    fn test_double_voting_prevention() {
        let mut voting_system = VotingSystem::new();
        
        // Cast first vote
        voting_system.cast_vote(
            1,
            "alice".to_string(),
            VoteChoice::Yes,
            100,
            1,
            1000,
        ).unwrap();
        
        // Try to vote again
        let result = voting_system.cast_vote(
            1,
            "alice".to_string(),
            VoteChoice::No,
            100,
            2,
            1001,
        );
        
        assert!(result.is_err());
    }

    #[test]
    fn test_vote_retrieval() {
        let mut voting_system = VotingSystem::new();
        
        voting_system.cast_vote(
            1,
            "alice".to_string(),
            VoteChoice::Yes,
            100,
            1,
            1000,
        ).unwrap();
        
        // Check vote exists
        assert!(voting_system.has_voted(1, &"alice".to_string()));
        assert!(!voting_system.has_voted(1, &"bob".to_string()));
        
        // Get specific vote
        let vote = voting_system.get_voter_vote(1, &"alice".to_string()).unwrap();
        assert_eq!(vote.choice, VoteChoice::Yes);
        assert_eq!(vote.raw_power, 100);
        assert_eq!(vote.power, 10); // sqrt(100) = 10
    }
}