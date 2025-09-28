// Voting contract implementation
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct Proposal {
    pub title: String,
    pub description: String,
    pub yes_votes: u64,
    pub no_votes: u64,
    pub status: ProposalStatus,
    pub end_height: u64,
}

#[derive(Debug, Clone)]
pub enum ProposalStatus {
    Active,
    Passed,
    Rejected,
}

#[derive(Default)]
pub struct VotingContract {
    proposals: HashMap<u64, Proposal>,
    votes: HashMap<(u64, String), bool>, // (proposal_id, voter) -> vote
    next_proposal_id: u64,
}

impl VotingContract {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn create_proposal(&mut self, title: String, description: String, end_height: u64) -> u64 {
        let proposal_id = self.next_proposal_id;
        self.next_proposal_id += 1;
        
        let proposal = Proposal {
            title,
            description,
            yes_votes: 0,
            no_votes: 0,
            status: ProposalStatus::Active,
            end_height,
        };
        
        self.proposals.insert(proposal_id, proposal);
        proposal_id
    }

    pub fn vote(&mut self, proposal_id: u64, voter: String, vote: bool, current_height: u64) -> Result<(), &'static str> {
        let proposal = self.proposals.get_mut(&proposal_id).ok_or("Proposal not found")?;
        
        if current_height > proposal.end_height {
            return Err("Voting period ended");
        }
        
        if matches!(proposal.status, ProposalStatus::Passed | ProposalStatus::Rejected) {
            return Err("Proposal already finalized");
        }
        
        // Check if already voted
        let vote_key = (proposal_id, voter.clone());
        if self.votes.contains_key(&vote_key) {
            return Err("Already voted");
        }
        
        // Record vote
        self.votes.insert(vote_key, vote);
        
        if vote {
            proposal.yes_votes += 1;
        } else {
            proposal.no_votes += 1;
        }
        
        Ok(())
    }

    pub fn finalize_proposal(&mut self, proposal_id: u64, current_height: u64) -> Result<(), &'static str> {
        let proposal = self.proposals.get_mut(&proposal_id).ok_or("Proposal not found")?;
        
        if current_height <= proposal.end_height {
            return Err("Voting period not ended");
        }
        
        proposal.status = if proposal.yes_votes > proposal.no_votes {
            ProposalStatus::Passed
        } else {
            ProposalStatus::Rejected
        };
        
        Ok(())
    }

    pub fn get_proposal(&self, proposal_id: u64) -> Option<&Proposal> {
        self.proposals.get(&proposal_id)
    }
}