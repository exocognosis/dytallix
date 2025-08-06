//! Proposal management system

use std::collections::HashMap;
use serde::{Deserialize, Serialize};

use crate::{Address, Balance, Timestamp, Result, TokenomicsError};
use crate::config::GovernanceConfig;
use super::voting_system::{VotingSystem, VotingResult};

/// Proposal status
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum ProposalStatus {
    /// Proposal is active and accepting votes
    Active,
    /// Proposal passed and is in time-lock period
    Passed,
    /// Proposal failed to meet requirements
    Failed,
    /// Proposal was executed successfully
    Executed,
    /// Proposal was cancelled
    Cancelled,
    /// Proposal expired without meeting requirements
    Expired,
}

/// Proposal type
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ProposalType {
    /// Parameter change proposal
    ParameterChange {
        /// Parameter name
        parameter: String,
        /// New value
        new_value: String,
    },
    /// Treasury spending proposal
    TreasurySpend {
        /// Recipient address
        recipient: Address,
        /// Amount to spend
        amount: Balance,
        /// Purpose description
        purpose: String,
    },
    /// Upgrade proposal
    Upgrade {
        /// Upgrade description
        description: String,
        /// Code hash or version
        code_hash: String,
    },
    /// Text proposal (no execution)
    Text {
        /// Proposal text content
        content: String,
    },
}

/// Governance proposal
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Proposal {
    /// Unique proposal ID
    pub id: u64,
    /// Proposal title
    pub title: String,
    /// Proposal description
    pub description: String,
    /// Proposal type and data
    pub proposal_type: ProposalType,
    /// Proposer address
    pub proposer: Address,
    /// Proposal deposit
    pub deposit: Balance,
    /// Current status
    pub status: ProposalStatus,
    /// Block number when proposal was created
    pub created_at_block: u64,
    /// Timestamp when proposal was created
    pub created_at: Timestamp,
    /// Voting period end timestamp
    pub voting_end: Timestamp,
    /// Execution deadline (for passed proposals)
    pub execution_deadline: Option<Timestamp>,
    /// Execution result (if executed)
    pub execution_result: Option<String>,
}

/// Proposal manager handles proposal lifecycle
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProposalManager {
    /// Governance configuration
    pub config: GovernanceConfig,
    /// All proposals by ID
    pub proposals: HashMap<u64, Proposal>,
    /// Next proposal ID
    pub next_proposal_id: u64,
    /// Voting system
    pub voting_system: VotingSystem,
    /// Total voting power in system
    pub total_voting_power: Balance,
}

impl ProposalManager {
    /// Create new proposal manager
    pub fn new(config: GovernanceConfig) -> Self {
        Self {
            config,
            proposals: HashMap::new(),
            next_proposal_id: 1,
            voting_system: VotingSystem::new(),
            total_voting_power: 0,
        }
    }
    
    /// Update total voting power
    pub fn update_total_voting_power(&mut self, total_power: Balance) {
        self.total_voting_power = total_power;
        self.voting_system.update_total_power(total_power);
    }
    
    /// Create a new proposal
    pub fn create_proposal(
        &mut self,
        title: String,
        description: String,
        proposal_type: ProposalType,
        proposer: Address,
        proposer_power: Balance,
        block_number: u64,
        timestamp: Timestamp,
    ) -> Result<u64> {
        // Check if proposer has minimum deposit
        if proposer_power < self.config.minimum_proposal_deposit {
            return Err(TokenomicsError::InsufficientBalance {
                required: self.config.minimum_proposal_deposit,
                available: proposer_power,
            });
        }
        
        let proposal_id = self.next_proposal_id;
        self.next_proposal_id += 1;
        
        let proposal = Proposal {
            id: proposal_id,
            title,
            description,
            proposal_type,
            proposer,
            deposit: self.config.minimum_proposal_deposit,
            status: ProposalStatus::Active,
            created_at_block: block_number,
            created_at: timestamp,
            voting_end: timestamp + self.config.voting_period,
            execution_deadline: None,
            execution_result: None,
        };
        
        self.proposals.insert(proposal_id, proposal);
        
        Ok(proposal_id)
    }
    
    /// Cast a vote on a proposal
    pub fn vote(
        &mut self,
        proposal_id: u64,
        voter: Address,
        choice: super::voting_system::VoteChoice,
        voting_power: Balance,
        block_number: u64,
        timestamp: Timestamp,
    ) -> Result<()> {
        let proposal = self.proposals.get(&proposal_id)
            .ok_or_else(|| TokenomicsError::ProposalNotFound { proposal_id })?;
        
        // Check if proposal is still active
        if proposal.status != ProposalStatus::Active {
            return Err(TokenomicsError::InvalidConfig {
                details: "Proposal is not active".to_string(),
            });
        }
        
        // Check if voting period has ended
        if timestamp > proposal.voting_end {
            return Err(TokenomicsError::InvalidConfig {
                details: "Voting period has ended".to_string(),
            });
        }
        
        self.voting_system.cast_vote(
            proposal_id,
            voter,
            choice,
            voting_power,
            block_number,
            timestamp,
        )
    }
    
    /// Finalize a proposal after voting period ends
    pub fn finalize_proposal(
        &mut self,
        proposal_id: u64,
        current_timestamp: Timestamp,
    ) -> Result<ProposalStatus> {
        let proposal = self.proposals.get_mut(&proposal_id)
            .ok_or_else(|| TokenomicsError::ProposalNotFound { proposal_id })?;
        
        // Check if proposal is finalizeable
        if proposal.status != ProposalStatus::Active {
            return Ok(proposal.status.clone());
        }
        
        // Check if voting period has ended
        if current_timestamp <= proposal.voting_end {
            return Err(TokenomicsError::InvalidConfig {
                details: "Voting period has not ended yet".to_string(),
            });
        }
        
        // Check if proposal passes
        let passes = self.voting_system.check_proposal_passes(
            proposal_id,
            self.config.minimum_quorum,
            self.config.proposal_threshold,
        )?;
        
        if passes {
            proposal.status = ProposalStatus::Passed;
            proposal.execution_deadline = Some(current_timestamp + self.config.time_lock_period);
        } else {
            proposal.status = ProposalStatus::Failed;
        }
        
        Ok(proposal.status.clone())
    }
    
    /// Execute a passed proposal
    pub fn execute_proposal(
        &mut self,
        proposal_id: u64,
        current_timestamp: Timestamp,
    ) -> Result<String> {
        let proposal = self.proposals.get_mut(&proposal_id)
            .ok_or_else(|| TokenomicsError::ProposalNotFound { proposal_id })?;
        
        // Check if proposal can be executed
        if proposal.status != ProposalStatus::Passed {
            return Err(TokenomicsError::InvalidConfig {
                details: "Proposal has not passed".to_string(),
            });
        }
        
        // Check if time lock period has passed
        if let Some(deadline) = proposal.execution_deadline {
            if current_timestamp < deadline {
                return Err(TokenomicsError::InvalidConfig {
                    details: "Time lock period has not passed".to_string(),
                });
            }
        }
        
        // Execute based on proposal type
        let result = match &proposal.proposal_type {
            ProposalType::ParameterChange { parameter, new_value } => {
                format!("Parameter '{}' changed to '{}'", parameter, new_value)
            }
            ProposalType::TreasurySpend { recipient, amount, purpose } => {
                format!("Treasury spend of {} to {} for: {}", amount, recipient, purpose)
            }
            ProposalType::Upgrade { description, code_hash } => {
                format!("Upgrade executed: {} (hash: {})", description, code_hash)
            }
            ProposalType::Text { content: _ } => {
                "Text proposal completed (no execution required)".to_string()
            }
        };
        
        proposal.status = ProposalStatus::Executed;
        proposal.execution_result = Some(result.clone());
        
        Ok(result)
    }
    
    /// Cancel a proposal (only by proposer before voting ends)
    pub fn cancel_proposal(
        &mut self,
        proposal_id: u64,
        canceller: &Address,
        current_timestamp: Timestamp,
    ) -> Result<()> {
        let proposal = self.proposals.get_mut(&proposal_id)
            .ok_or_else(|| TokenomicsError::ProposalNotFound { proposal_id })?;
        
        // Check if canceller is the proposer
        if proposal.proposer != *canceller {
            return Err(TokenomicsError::Unauthorized {
                account: canceller.clone(),
            });
        }
        
        // Check if proposal is still active
        if proposal.status != ProposalStatus::Active {
            return Err(TokenomicsError::InvalidConfig {
                details: "Proposal is not active".to_string(),
            });
        }
        
        // Check if voting period is still active
        if current_timestamp > proposal.voting_end {
            return Err(TokenomicsError::InvalidConfig {
                details: "Cannot cancel after voting period".to_string(),
            });
        }
        
        proposal.status = ProposalStatus::Cancelled;
        
        // Remove votes for cancelled proposal
        self.voting_system.remove_proposal_votes(proposal_id);
        
        Ok(())
    }
    
    /// Get proposal by ID
    pub fn get_proposal(&self, proposal_id: u64) -> Option<&Proposal> {
        self.proposals.get(&proposal_id)
    }
    
    /// Get voting results for a proposal
    pub fn get_voting_results(&mut self, proposal_id: u64) -> Result<VotingResult> {
        self.voting_system.calculate_results(proposal_id)
    }
    
    /// Get all active proposals
    pub fn get_active_proposals(&self) -> Vec<&Proposal> {
        self.proposals
            .values()
            .filter(|p| p.status == ProposalStatus::Active)
            .collect()
    }
    
    /// Get proposals by status
    pub fn get_proposals_by_status(&self, status: ProposalStatus) -> Vec<&Proposal> {
        self.proposals
            .values()
            .filter(|p| p.status == status)
            .collect()
    }
    
    /// Get proposals by proposer
    pub fn get_proposals_by_proposer(&self, proposer: &Address) -> Vec<&Proposal> {
        self.proposals
            .values()
            .filter(|p| p.proposer == *proposer)
            .collect()
    }
    
    /// Clean up old expired proposals
    pub fn cleanup_expired_proposals(&mut self, current_timestamp: Timestamp) {
        let expired_ids: Vec<u64> = self.proposals
            .iter()
            .filter_map(|(id, proposal)| {
                if proposal.status == ProposalStatus::Active && current_timestamp > proposal.voting_end {
                    Some(*id)
                } else {
                    None
                }
            })
            .collect();
        
        for id in expired_ids {
            if let Some(proposal) = self.proposals.get_mut(&id) {
                proposal.status = ProposalStatus::Expired;
            }
            self.voting_system.remove_proposal_votes(id);
        }
    }
    
    /// Get total number of proposals
    pub fn get_proposal_count(&self) -> usize {
        self.proposals.len()
    }
    
    /// Get proposal statistics
    pub fn get_statistics(&self) -> ProposalStatistics {
        let mut stats = ProposalStatistics::default();
        
        for proposal in self.proposals.values() {
            match proposal.status {
                ProposalStatus::Active => stats.active_count += 1,
                ProposalStatus::Passed => stats.passed_count += 1,
                ProposalStatus::Failed => stats.failed_count += 1,
                ProposalStatus::Executed => stats.executed_count += 1,
                ProposalStatus::Cancelled => stats.cancelled_count += 1,
                ProposalStatus::Expired => stats.expired_count += 1,
            }
        }
        
        stats.total_count = self.proposals.len() as u32;
        stats
    }
}

/// Proposal statistics
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ProposalStatistics {
    pub total_count: u32,
    pub active_count: u32,
    pub passed_count: u32,
    pub failed_count: u32,
    pub executed_count: u32,
    pub cancelled_count: u32,
    pub expired_count: u32,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::governance::voting_system::VoteChoice;
    use rust_decimal::Decimal;

    fn create_test_config() -> GovernanceConfig {
        GovernanceConfig {
            minimum_proposal_deposit: 1000,
            voting_period: 7 * 24 * 60 * 60, // 7 days
            minimum_quorum: Decimal::from_str_exact("0.15").unwrap(),
            proposal_threshold: Decimal::from_str_exact("0.51").unwrap(),
            time_lock_period: 2 * 24 * 60 * 60, // 2 days
        }
    }

    #[test]
    fn test_create_proposal() {
        let config = create_test_config();
        let mut manager = ProposalManager::new(config);
        
        let proposal_id = manager.create_proposal(
            "Test Proposal".to_string(),
            "This is a test proposal".to_string(),
            ProposalType::Text {
                content: "Test content".to_string(),
            },
            "alice".to_string(),
            2000, // Has enough for deposit
            1,
            1000,
        ).unwrap();
        
        assert_eq!(proposal_id, 1);
        assert_eq!(manager.proposals.len(), 1);
        
        let proposal = manager.get_proposal(proposal_id).unwrap();
        assert_eq!(proposal.title, "Test Proposal");
        assert_eq!(proposal.status, ProposalStatus::Active);
    }

    #[test]
    fn test_insufficient_deposit() {
        let config = create_test_config();
        let mut manager = ProposalManager::new(config);
        
        let result = manager.create_proposal(
            "Test Proposal".to_string(),
            "This is a test proposal".to_string(),
            ProposalType::Text {
                content: "Test content".to_string(),
            },
            "alice".to_string(),
            500, // Not enough for deposit
            1,
            1000,
        );
        
        assert!(result.is_err());
    }

    #[test]
    fn test_voting_and_finalization() {
        let config = create_test_config();
        let mut manager = ProposalManager::new(config);
        manager.update_total_voting_power(10000);
        
        // Create proposal
        let proposal_id = manager.create_proposal(
            "Test Proposal".to_string(),
            "This is a test proposal".to_string(),
            ProposalType::Text {
                content: "Test content".to_string(),
            },
            "alice".to_string(),
            2000,
            1,
            1000,
        ).unwrap();
        
        // Vote on proposal
        manager.vote(
            proposal_id,
            "voter1".to_string(),
            VoteChoice::Yes,
            4000, // 40% of total power
            2,
            1500,
        ).unwrap();
        
        manager.vote(
            proposal_id,
            "voter2".to_string(),
            VoteChoice::Yes,
            1000, // 10% of total power
            3,
            1600,
        ).unwrap();
        
        // Finalize after voting period
        let voting_end = 1000 + 7 * 24 * 60 * 60;
        let status = manager.finalize_proposal(proposal_id, voting_end + 1).unwrap();
        
        assert_eq!(status, ProposalStatus::Passed);
    }

    #[test]
    fn test_proposal_execution() {
        let config = create_test_config();
        let mut manager = ProposalManager::new(config);
        manager.update_total_voting_power(10000);
        
        // Create and pass proposal
        let proposal_id = manager.create_proposal(
            "Parameter Change".to_string(),
            "Change a parameter".to_string(),
            ProposalType::ParameterChange {
                parameter: "max_validators".to_string(),
                new_value: "150".to_string(),
            },
            "alice".to_string(),
            2000,
            1,
            1000,
        ).unwrap();
        
        // Vote to pass
        manager.vote(proposal_id, "voter1".to_string(), VoteChoice::Yes, 6000, 2, 1500).unwrap();
        
        // Finalize
        let voting_end = 1000 + 7 * 24 * 60 * 60;
        manager.finalize_proposal(proposal_id, voting_end + 1).unwrap();
        
        // Execute after time lock
        let time_lock_end = voting_end + 1 + 2 * 24 * 60 * 60;
        let result = manager.execute_proposal(proposal_id, time_lock_end + 1).unwrap();
        
        assert!(result.contains("max_validators"));
        assert!(result.contains("150"));
        
        let proposal = manager.get_proposal(proposal_id).unwrap();
        assert_eq!(proposal.status, ProposalStatus::Executed);
    }

    #[test]
    fn test_proposal_cancellation() {
        let config = create_test_config();
        let mut manager = ProposalManager::new(config);
        
        let proposal_id = manager.create_proposal(
            "Test Proposal".to_string(),
            "This is a test proposal".to_string(),
            ProposalType::Text {
                content: "Test content".to_string(),
            },
            "alice".to_string(),
            2000,
            1,
            1000,
        ).unwrap();
        
        // Cancel proposal
        manager.cancel_proposal(proposal_id, &"alice".to_string(), 1500).unwrap();
        
        let proposal = manager.get_proposal(proposal_id).unwrap();
        assert_eq!(proposal.status, ProposalStatus::Cancelled);
    }
}