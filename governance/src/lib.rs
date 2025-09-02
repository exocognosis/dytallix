//! Dytallix Governance & Compliance Module
//!
//! Provides DAO voting, proposal system, and compliance hooks.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

// Re-export tokenomics types for governance integration
pub use dytallix_contracts::tokenomics::{
    Balance as TokenBalance, EmissionParameters, EmissionRate, TokenomicsProposal,
};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Proposal {
    pub id: u64,
    pub title: String,
    pub description: String,
    pub created_at: DateTime<Utc>,
    pub voting_deadline: DateTime<Utc>,
    pub status: ProposalStatus,
    pub proposal_type: ProposalType,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub enum ProposalType {
    /// Standard governance proposal (text-based)
    #[default]
    Standard,
    /// Tokenomics proposal for emission control
    Tokenomics(TokenomicsProposal),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ProposalStatus {
    Active,
    Passed,
    Rejected,
    Expired,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Ballot {
    pub voter: String,
    pub vote: bool,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug)]
pub enum GovernanceError {
    InvalidProposal,
    VotingClosed,
    AlreadyVoted,
    ProposalNotFound,
    StorageError(String),
}

impl std::fmt::Display for GovernanceError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            GovernanceError::InvalidProposal => write!(f, "Invalid proposal"),
            GovernanceError::VotingClosed => write!(f, "Voting period is closed"),
            GovernanceError::AlreadyVoted => write!(f, "User has already voted on this proposal"),
            GovernanceError::ProposalNotFound => write!(f, "Proposal not found"),
            GovernanceError::StorageError(msg) => write!(f, "Storage error: {msg}"),
        }
    }
}

impl std::error::Error for GovernanceError {}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoteResult {
    pub proposal_id: u64,
    pub yes_votes: u64,
    pub no_votes: u64,
    pub total_votes: u64,
    pub status: ProposalStatus,
}

pub trait DaoGovernance {
    fn propose(
        &mut self,
        title: String,
        description: String,
        voting_duration_hours: u64,
    ) -> Result<u64, GovernanceError>;
    fn propose_tokenomics(
        &mut self,
        title: String,
        description: String,
        voting_duration_hours: u64,
        tokenomics_proposal: TokenomicsProposal,
    ) -> Result<u64, GovernanceError>;
    fn vote(&mut self, proposal_id: u64, ballot: Ballot) -> Result<(), GovernanceError>;
    fn tally(&self, proposal_id: u64) -> Result<VoteResult, GovernanceError>;
    fn get_proposal(&self, proposal_id: u64) -> Result<Option<Proposal>, GovernanceError>;
    fn list_proposals(&self) -> Result<Vec<Proposal>, GovernanceError>;
    fn get_votes(&self, proposal_id: u64) -> Result<Vec<Ballot>, GovernanceError>;
    fn execute_tokenomics_proposal(
        &mut self,
        proposal_id: u64,
    ) -> Result<Option<TokenomicsProposal>, GovernanceError>;
}

/// File-based governance implementation with persistence
pub struct FileBasedGovernance {
    data_dir: PathBuf,
    proposals: HashMap<u64, Proposal>,
    votes: HashMap<u64, Vec<Ballot>>, // proposal_id -> votes
    next_proposal_id: u64,
}

impl FileBasedGovernance {
    pub fn new(data_dir: PathBuf) -> Result<Self, GovernanceError> {
        // Ensure data directory exists
        if let Err(e) = fs::create_dir_all(&data_dir) {
            return Err(GovernanceError::StorageError(format!(
                "Failed to create data directory: {e}"
            )));
        }

        let mut governance = Self {
            data_dir,
            proposals: HashMap::new(),
            votes: HashMap::new(),
            next_proposal_id: 1,
        };

        // Load existing data
        governance.load_data()?;
        Ok(governance)
    }

    fn proposals_file(&self) -> PathBuf {
        self.data_dir.join("proposals.json")
    }

    fn votes_file(&self) -> PathBuf {
        self.data_dir.join("votes.json")
    }

    fn load_data(&mut self) -> Result<(), GovernanceError> {
        // Load proposals
        if self.proposals_file().exists() {
            let content = fs::read_to_string(self.proposals_file()).map_err(|e| {
                GovernanceError::StorageError(format!("Failed to read proposals: {e}"))
            })?;

            let proposals: HashMap<u64, Proposal> =
                serde_json::from_str(&content).map_err(|e| {
                    GovernanceError::StorageError(format!("Failed to parse proposals: {e}"))
                })?;

            // Find the next proposal ID
            self.next_proposal_id = proposals.keys().max().unwrap_or(&0) + 1;
            self.proposals = proposals;
        }

        // Load votes
        if self.votes_file().exists() {
            let content = fs::read_to_string(self.votes_file())
                .map_err(|e| GovernanceError::StorageError(format!("Failed to read votes: {e}")))?;

            self.votes = serde_json::from_str(&content).map_err(|e| {
                GovernanceError::StorageError(format!("Failed to parse votes: {e}"))
            })?;
        }

        Ok(())
    }

    fn save_data(&self) -> Result<(), GovernanceError> {
        // Save proposals
        let proposals_json = serde_json::to_string_pretty(&self.proposals).map_err(|e| {
            GovernanceError::StorageError(format!("Failed to serialize proposals: {e}"))
        })?;

        fs::write(self.proposals_file(), proposals_json).map_err(|e| {
            GovernanceError::StorageError(format!("Failed to write proposals: {e}"))
        })?;

        // Save votes
        let votes_json = serde_json::to_string_pretty(&self.votes).map_err(|e| {
            GovernanceError::StorageError(format!("Failed to serialize votes: {e}"))
        })?;

        fs::write(self.votes_file(), votes_json)
            .map_err(|e| GovernanceError::StorageError(format!("Failed to write votes: {e}")))?;

        Ok(())
    }

    fn update_proposal_status(&mut self, proposal_id: u64) -> Result<(), GovernanceError> {
        // Check if voting period has expired
        let now = Utc::now();
        let expired = if let Some(proposal) = self.proposals.get(&proposal_id) {
            now > proposal.voting_deadline
        } else {
            false
        };

        if expired {
            let vote_result = self.calculate_votes(proposal_id)?;
            if let Some(proposal) = self.proposals.get_mut(&proposal_id) {
                proposal.status = if vote_result.yes_votes > vote_result.no_votes {
                    ProposalStatus::Passed
                } else {
                    ProposalStatus::Rejected
                };
            }
        }
        Ok(())
    }

    fn calculate_votes(&self, proposal_id: u64) -> Result<VoteResult, GovernanceError> {
        let empty_votes = vec![];
        let votes = self.votes.get(&proposal_id).unwrap_or(&empty_votes);
        let yes_votes = votes.iter().filter(|b| b.vote).count() as u64;
        let no_votes = votes.iter().filter(|b| !b.vote).count() as u64;
        let total_votes = yes_votes + no_votes;

        let proposal = self
            .proposals
            .get(&proposal_id)
            .ok_or(GovernanceError::ProposalNotFound)?;

        let status = if Utc::now() > proposal.voting_deadline {
            if yes_votes > no_votes {
                ProposalStatus::Passed
            } else {
                ProposalStatus::Rejected
            }
        } else {
            ProposalStatus::Active
        };

        Ok(VoteResult {
            proposal_id,
            yes_votes,
            no_votes,
            total_votes,
            status,
        })
    }
}

impl DaoGovernance for FileBasedGovernance {
    fn propose(
        &mut self,
        title: String,
        description: String,
        voting_duration_hours: u64,
    ) -> Result<u64, GovernanceError> {
        let proposal_id = self.next_proposal_id;
        self.next_proposal_id += 1;

        let proposal = Proposal {
            id: proposal_id,
            title,
            description,
            created_at: Utc::now(),
            voting_deadline: Utc::now() + chrono::Duration::hours(voting_duration_hours as i64),
            status: ProposalStatus::Active,
            proposal_type: ProposalType::Standard,
        };

        self.proposals.insert(proposal_id, proposal);
        self.votes.insert(proposal_id, Vec::new());
        self.save_data()?;

        Ok(proposal_id)
    }

    fn propose_tokenomics(
        &mut self,
        title: String,
        description: String,
        voting_duration_hours: u64,
        tokenomics_proposal: TokenomicsProposal,
    ) -> Result<u64, GovernanceError> {
        let proposal_id = self.next_proposal_id;
        self.next_proposal_id += 1;

        let proposal = Proposal {
            id: proposal_id,
            title,
            description,
            created_at: Utc::now(),
            voting_deadline: Utc::now() + chrono::Duration::hours(voting_duration_hours as i64),
            status: ProposalStatus::Active,
            proposal_type: ProposalType::Tokenomics(tokenomics_proposal),
        };

        self.proposals.insert(proposal_id, proposal);
        self.votes.insert(proposal_id, Vec::new());
        self.save_data()?;

        Ok(proposal_id)
    }

    fn vote(&mut self, proposal_id: u64, ballot: Ballot) -> Result<(), GovernanceError> {
        let proposal = self
            .proposals
            .get(&proposal_id)
            .ok_or(GovernanceError::ProposalNotFound)?;

        // Check if voting is still open
        if Utc::now() > proposal.voting_deadline {
            return Err(GovernanceError::VotingClosed);
        }

        // Check if proposal is active
        if !matches!(proposal.status, ProposalStatus::Active) {
            return Err(GovernanceError::VotingClosed);
        }

        // Check if user has already voted
        let empty_votes = vec![];
        let votes = self.votes.get(&proposal_id).unwrap_or(&empty_votes);
        if votes.iter().any(|v| v.voter == ballot.voter) {
            return Err(GovernanceError::AlreadyVoted);
        }

        // Record the vote
        self.votes.entry(proposal_id).or_default().push(ballot);
        self.save_data()?;

        Ok(())
    }

    fn tally(&self, proposal_id: u64) -> Result<VoteResult, GovernanceError> {
        if !self.proposals.contains_key(&proposal_id) {
            return Err(GovernanceError::ProposalNotFound);
        }

        self.calculate_votes(proposal_id)
    }

    fn get_proposal(&self, proposal_id: u64) -> Result<Option<Proposal>, GovernanceError> {
        Ok(self.proposals.get(&proposal_id).cloned())
    }

    fn list_proposals(&self) -> Result<Vec<Proposal>, GovernanceError> {
        let mut proposals: Vec<Proposal> = self.proposals.values().cloned().collect();
        proposals.sort_by(|a, b| b.created_at.cmp(&a.created_at));
        Ok(proposals)
    }

    fn get_votes(&self, proposal_id: u64) -> Result<Vec<Ballot>, GovernanceError> {
        Ok(self.votes.get(&proposal_id).cloned().unwrap_or_default())
    }

    fn execute_tokenomics_proposal(
        &mut self,
        proposal_id: u64,
    ) -> Result<Option<TokenomicsProposal>, GovernanceError> {
        // Check if proposal exists and is passed
        let proposal = self
            .proposals
            .get(&proposal_id)
            .ok_or(GovernanceError::ProposalNotFound)?;

        if !matches!(proposal.status, ProposalStatus::Passed) {
            return Ok(None);
        }

        // Extract tokenomics proposal if it exists
        match &proposal.proposal_type {
            ProposalType::Tokenomics(tokenomics_proposal) => Ok(Some(tokenomics_proposal.clone())),
            ProposalType::Standard => Ok(None),
        }
    }
}

/// In-memory governance implementation for testing
pub struct InMemoryGovernance {
    proposals: HashMap<u64, Proposal>,
    votes: HashMap<u64, Vec<Ballot>>,
    next_proposal_id: u64,
}

impl Default for InMemoryGovernance {
    fn default() -> Self {
        Self::new()
    }
}

impl InMemoryGovernance {
    pub fn new() -> Self {
        Self {
            proposals: HashMap::new(),
            votes: HashMap::new(),
            next_proposal_id: 1,
        }
    }

    fn calculate_votes(&self, proposal_id: u64) -> Result<VoteResult, GovernanceError> {
        let empty_votes = vec![];
        let votes = self.votes.get(&proposal_id).unwrap_or(&empty_votes);
        let yes_votes = votes.iter().filter(|b| b.vote).count() as u64;
        let no_votes = votes.iter().filter(|b| !b.vote).count() as u64;
        let total_votes = yes_votes + no_votes;

        let proposal = self
            .proposals
            .get(&proposal_id)
            .ok_or(GovernanceError::ProposalNotFound)?;

        let status = if Utc::now() > proposal.voting_deadline {
            if yes_votes > no_votes {
                ProposalStatus::Passed
            } else {
                ProposalStatus::Rejected
            }
        } else {
            ProposalStatus::Active
        };

        Ok(VoteResult {
            proposal_id,
            yes_votes,
            no_votes,
            total_votes,
            status,
        })
    }
}

impl DaoGovernance for InMemoryGovernance {
    fn propose(
        &mut self,
        title: String,
        description: String,
        voting_duration_hours: u64,
    ) -> Result<u64, GovernanceError> {
        let proposal_id = self.next_proposal_id;
        self.next_proposal_id += 1;

        let proposal = Proposal {
            id: proposal_id,
            title,
            description,
            created_at: Utc::now(),
            voting_deadline: Utc::now() + chrono::Duration::hours(voting_duration_hours as i64),
            status: ProposalStatus::Active,
            proposal_type: ProposalType::Standard,
        };

        self.proposals.insert(proposal_id, proposal);
        self.votes.insert(proposal_id, Vec::new());

        Ok(proposal_id)
    }

    fn propose_tokenomics(
        &mut self,
        title: String,
        description: String,
        voting_duration_hours: u64,
        tokenomics_proposal: TokenomicsProposal,
    ) -> Result<u64, GovernanceError> {
        let proposal_id = self.next_proposal_id;
        self.next_proposal_id += 1;

        let proposal = Proposal {
            id: proposal_id,
            title,
            description,
            created_at: Utc::now(),
            voting_deadline: Utc::now() + chrono::Duration::hours(voting_duration_hours as i64),
            status: ProposalStatus::Active,
            proposal_type: ProposalType::Tokenomics(tokenomics_proposal),
        };

        self.proposals.insert(proposal_id, proposal);
        self.votes.insert(proposal_id, Vec::new());

        Ok(proposal_id)
    }

    fn vote(&mut self, proposal_id: u64, ballot: Ballot) -> Result<(), GovernanceError> {
        let proposal = self
            .proposals
            .get(&proposal_id)
            .ok_or(GovernanceError::ProposalNotFound)?;

        // Check if voting is still open
        if Utc::now() > proposal.voting_deadline {
            return Err(GovernanceError::VotingClosed);
        }

        // Check if proposal is active
        if !matches!(proposal.status, ProposalStatus::Active) {
            return Err(GovernanceError::VotingClosed);
        }

        // Check if user has already voted
        let empty_votes = vec![];
        let votes = self.votes.get(&proposal_id).unwrap_or(&empty_votes);
        if votes.iter().any(|v| v.voter == ballot.voter) {
            return Err(GovernanceError::AlreadyVoted);
        }

        // Record the vote
        self.votes.entry(proposal_id).or_default().push(ballot);

        Ok(())
    }

    fn tally(&self, proposal_id: u64) -> Result<VoteResult, GovernanceError> {
        if !self.proposals.contains_key(&proposal_id) {
            return Err(GovernanceError::ProposalNotFound);
        }

        self.calculate_votes(proposal_id)
    }

    fn get_proposal(&self, proposal_id: u64) -> Result<Option<Proposal>, GovernanceError> {
        Ok(self.proposals.get(&proposal_id).cloned())
    }

    fn list_proposals(&self) -> Result<Vec<Proposal>, GovernanceError> {
        let mut proposals: Vec<Proposal> = self.proposals.values().cloned().collect();
        proposals.sort_by(|a, b| b.created_at.cmp(&a.created_at));
        Ok(proposals)
    }

    fn get_votes(&self, proposal_id: u64) -> Result<Vec<Ballot>, GovernanceError> {
        Ok(self.votes.get(&proposal_id).cloned().unwrap_or_default())
    }

    fn execute_tokenomics_proposal(
        &mut self,
        proposal_id: u64,
    ) -> Result<Option<TokenomicsProposal>, GovernanceError> {
        // Check if proposal exists and is passed
        let proposal = self
            .proposals
            .get(&proposal_id)
            .ok_or(GovernanceError::ProposalNotFound)?;

        if !matches!(proposal.status, ProposalStatus::Passed) {
            return Ok(None);
        }

        // Extract tokenomics proposal if it exists
        match &proposal.proposal_type {
            ProposalType::Tokenomics(tokenomics_proposal) => Ok(Some(tokenomics_proposal.clone())),
            ProposalType::Standard => Ok(None),
        }
    }
}

// Legacy implementation for backward compatibility
pub struct DummyGovernance;

impl DaoGovernance for DummyGovernance {
    fn propose(
        &mut self,
        title: String,
        description: String,
        _voting_duration_hours: u64,
    ) -> Result<u64, GovernanceError> {
        // Generate a mock proposal ID
        let proposal_id = title.len() as u64 + description.len() as u64;
        Ok(proposal_id)
    }

    fn propose_tokenomics(
        &mut self,
        title: String,
        description: String,
        _voting_duration_hours: u64,
        _tokenomics_proposal: TokenomicsProposal,
    ) -> Result<u64, GovernanceError> {
        // Generate a mock proposal ID
        let proposal_id = title.len() as u64 + description.len() as u64;
        Ok(proposal_id)
    }

    fn vote(&mut self, _proposal_id: u64, _ballot: Ballot) -> Result<(), GovernanceError> {
        Ok(())
    }

    fn tally(&self, _proposal_id: u64) -> Result<VoteResult, GovernanceError> {
        Ok(VoteResult {
            proposal_id: _proposal_id,
            yes_votes: 0,
            no_votes: 0,
            total_votes: 0,
            status: ProposalStatus::Active,
        })
    }

    fn get_proposal(&self, _proposal_id: u64) -> Result<Option<Proposal>, GovernanceError> {
        Ok(None)
    }

    fn list_proposals(&self) -> Result<Vec<Proposal>, GovernanceError> {
        Ok(vec![])
    }

    fn get_votes(&self, _proposal_id: u64) -> Result<Vec<Ballot>, GovernanceError> {
        Ok(vec![])
    }

    fn execute_tokenomics_proposal(
        &mut self,
        _proposal_id: u64,
    ) -> Result<Option<TokenomicsProposal>, GovernanceError> {
        Ok(None)
    }
}

pub trait ComplianceModule {
    fn check_kyc(&self, address: &str) -> bool;
    fn log_audit_event(&self, event: &str);
}

pub struct DummyCompliance;

impl ComplianceModule for DummyCompliance {
    fn check_kyc(&self, _address: &str) -> bool {
        // TODO: Integrate KYC check
        true
    }
    fn log_audit_event(&self, _event: &str) {
        // TODO: Log event
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::thread;
    use std::time::Duration;
    use tempfile::TempDir;

    #[test]
    fn test_in_memory_governance_basic_flow() {
        let mut governance = InMemoryGovernance::new();

        // Create a proposal
        let proposal_id = governance
            .propose(
                "Test Proposal".to_string(),
                "This is a test proposal".to_string(),
                24,
            )
            .unwrap();

        assert_eq!(proposal_id, 1);

        // Get the proposal
        let proposal = governance.get_proposal(proposal_id).unwrap().unwrap();
        assert_eq!(proposal.title, "Test Proposal");
        assert_eq!(proposal.description, "This is a test proposal");
        assert!(matches!(proposal.status, ProposalStatus::Active));

        // Vote on the proposal
        let ballot1 = Ballot {
            voter: "voter1".to_string(),
            vote: true,
            timestamp: Utc::now(),
        };

        let ballot2 = Ballot {
            voter: "voter2".to_string(),
            vote: false,
            timestamp: Utc::now(),
        };

        governance.vote(proposal_id, ballot1).unwrap();
        governance.vote(proposal_id, ballot2).unwrap();

        // Tally votes
        let result = governance.tally(proposal_id).unwrap();
        assert_eq!(result.yes_votes, 1);
        assert_eq!(result.no_votes, 1);
        assert_eq!(result.total_votes, 2);

        // List proposals
        let proposals = governance.list_proposals().unwrap();
        assert_eq!(proposals.len(), 1);

        // Get votes
        let votes = governance.get_votes(proposal_id).unwrap();
        assert_eq!(votes.len(), 2);
    }

    #[test]
    fn test_file_based_governance_persistence() {
        let temp_dir = TempDir::new().unwrap();
        let data_dir = temp_dir.path().to_path_buf();

        let proposal_id = {
            let mut governance = FileBasedGovernance::new(data_dir.clone()).unwrap();

            // Create a proposal
            let proposal_id = governance
                .propose(
                    "Persistent Proposal".to_string(),
                    "This proposal should persist".to_string(),
                    48,
                )
                .unwrap();

            // Vote on it
            let ballot = Ballot {
                voter: "persistent_voter".to_string(),
                vote: true,
                timestamp: Utc::now(),
            };

            governance.vote(proposal_id, ballot).unwrap();
            proposal_id
        };

        // Create a new governance instance and verify data persisted
        {
            let governance = FileBasedGovernance::new(data_dir.clone()).unwrap();

            let proposal = governance.get_proposal(proposal_id).unwrap().unwrap();
            assert_eq!(proposal.title, "Persistent Proposal");
            assert_eq!(proposal.description, "This proposal should persist");

            let votes = governance.get_votes(proposal_id).unwrap();
            assert_eq!(votes.len(), 1);
            assert_eq!(votes[0].voter, "persistent_voter");
            assert_eq!(votes[0].vote, true);

            let result = governance.tally(proposal_id).unwrap();
            assert_eq!(result.yes_votes, 1);
            assert_eq!(result.no_votes, 0);
            assert_eq!(result.total_votes, 1);
        }
    }

    #[test]
    fn test_duplicate_voting_prevention() {
        let mut governance = InMemoryGovernance::new();

        let proposal_id = governance
            .propose(
                "No Double Voting".to_string(),
                "Test duplicate vote prevention".to_string(),
                24,
            )
            .unwrap();

        let ballot1 = Ballot {
            voter: "voter1".to_string(),
            vote: true,
            timestamp: Utc::now(),
        };

        let ballot2 = Ballot {
            voter: "voter1".to_string(), // Same voter
            vote: false,
            timestamp: Utc::now(),
        };

        // First vote should succeed
        governance.vote(proposal_id, ballot1).unwrap();

        // Second vote from same voter should fail
        let result = governance.vote(proposal_id, ballot2);
        assert!(matches!(result, Err(GovernanceError::AlreadyVoted)));
    }

    #[test]
    fn test_voting_on_nonexistent_proposal() {
        let mut governance = InMemoryGovernance::new();

        let ballot = Ballot {
            voter: "voter1".to_string(),
            vote: true,
            timestamp: Utc::now(),
        };

        let result = governance.vote(999, ballot);
        assert!(matches!(result, Err(GovernanceError::ProposalNotFound)));
    }

    #[test]
    fn test_proposal_expiration() {
        let mut governance = InMemoryGovernance::new();

        // Create a proposal with very short duration
        let proposal_id = governance
            .propose(
                "Quick Expiry".to_string(),
                "This expires quickly".to_string(),
                0, // 0 hours duration
            )
            .unwrap();

        // Wait a moment to ensure expiration
        thread::sleep(Duration::from_millis(10));

        let ballot = Ballot {
            voter: "late_voter".to_string(),
            vote: true,
            timestamp: Utc::now(),
        };

        // Voting should fail on expired proposal
        let result = governance.vote(proposal_id, ballot);
        assert!(matches!(result, Err(GovernanceError::VotingClosed)));
    }

    #[test]
    fn test_proposal_listing_order() {
        let mut governance = InMemoryGovernance::new();

        // Create multiple proposals
        let _id1 = governance
            .propose("First Proposal".to_string(), "First".to_string(), 24)
            .unwrap();

        thread::sleep(Duration::from_millis(1));

        let _id2 = governance
            .propose("Second Proposal".to_string(), "Second".to_string(), 24)
            .unwrap();

        thread::sleep(Duration::from_millis(1));

        let _id3 = governance
            .propose("Third Proposal".to_string(), "Third".to_string(), 24)
            .unwrap();

        // Proposals should be listed in reverse chronological order (newest first)
        let proposals = governance.list_proposals().unwrap();
        assert_eq!(proposals.len(), 3);
        assert_eq!(proposals[0].title, "Third Proposal");
        assert_eq!(proposals[1].title, "Second Proposal");
        assert_eq!(proposals[2].title, "First Proposal");
    }

    #[test]
    fn test_file_based_governance_storage_error_handling() {
        // Test with invalid directory path
        let invalid_path = PathBuf::from("/invalid/path/that/should/not/exist");
        let result = FileBasedGovernance::new(invalid_path);
        assert!(matches!(result, Err(GovernanceError::StorageError(_))));
    }
}
