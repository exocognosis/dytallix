use crate::{
    state::{State, AccountState},
    storage::state::Storage,
};
use serde::{Deserialize, Serialize};
use std::{
    collections::{HashMap, BTreeMap},
    sync::{Arc, Mutex},
};

/// Governance configuration with sensible defaults
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GovernanceConfig {
    pub min_deposit: u128,        // 1000 DGT in micro units
    pub deposit_period: u64,      // blocks
    pub voting_period: u64,       // blocks
    pub gas_limit: u64,          // Current gas limit parameter
}

impl Default for GovernanceConfig {
    fn default() -> Self {
        Self {
            min_deposit: 1_000_000_000, // 1000 DGT (assuming 6 decimal places)
            deposit_period: 300,         // 300 blocks for deposit period
            voting_period: 300,          // 300 blocks for voting period
            gas_limit: 21_000,          // Default gas limit
        }
    }
}

/// Proposal data structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Proposal {
    pub id: u64,
    pub title: String,
    pub description: String,
    pub proposal_type: ProposalType,
    pub status: ProposalStatus,
    pub total_deposit: u128,
    pub submit_height: u64,
    pub deposit_end_height: u64,
    pub voting_start_height: u64,
    pub voting_end_height: u64,
    pub tally: Option<TallyResult>,
}

/// Types of proposals supported
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ProposalType {
    ParameterChange { key: String, value: String },
}

/// Proposal status transitions
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ProposalStatus {
    DepositPeriod,
    VotingPeriod,
    Passed,
    Rejected,
    Executed,
}

/// Vote on a proposal
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Vote {
    pub proposal_id: u64,
    pub voter: String,
    pub option: VoteOption,
    pub weight: u128, // DGT balance at time of vote
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum VoteOption {
    Yes,
    No,
    Abstain,
}

/// Tally result for a proposal
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TallyResult {
    pub yes: u128,
    pub no: u128,
    pub abstain: u128,
}

/// Governance events
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum GovernanceEvent {
    ProposalSubmitted { id: u64 },
    Deposit { id: u64, amount: u128 },
    VotingStarted { id: u64 },
    VoteCast { id: u64, voter: String },
    ProposalPassed { id: u64, yes: u128, no: u128, abstain: u128 },
    ProposalRejected { id: u64, reason: Option<String> },
    ProposalExecuted { id: u64 },
    ExecutionFailed { id: u64, error: String },
}

pub struct GovernanceModule {
    storage: Arc<Storage>,
    state: Arc<Mutex<State>>,
    config: GovernanceConfig,
    events: Vec<GovernanceEvent>,
}

impl GovernanceModule {
    pub fn new(storage: Arc<Storage>, state: Arc<Mutex<State>>) -> Self {
        let config = GovernanceConfig::default();
        Self {
            storage,
            state,
            config,
            events: Vec::new(),
        }
    }

    pub fn new_with_config(
        storage: Arc<Storage>, 
        state: Arc<Mutex<State>>, 
        config: GovernanceConfig
    ) -> Self {
        Self {
            storage,
            state,
            config,
            events: Vec::new(),
        }
    }

    /// Submit a new proposal
    pub fn submit_proposal(
        &mut self,
        height: u64,
        title: String,
        description: String,
        proposal_type: ProposalType,
    ) -> Result<u64, String> {
        let proposal_id = self.next_proposal_id();
        
        let proposal = Proposal {
            id: proposal_id,
            title,
            description,
            proposal_type,
            status: ProposalStatus::DepositPeriod,
            total_deposit: 0,
            submit_height: height,
            deposit_end_height: height + self.config.deposit_period,
            voting_start_height: height + self.config.deposit_period,
            voting_end_height: height + self.config.deposit_period + self.config.voting_period,
            tally: None,
        };

        self.store_proposal(&proposal)?;
        self.emit_event(GovernanceEvent::ProposalSubmitted { id: proposal_id });
        Ok(proposal_id)
    }

    /// Deposit DGT tokens on a proposal
    pub fn deposit(
        &mut self,
        height: u64,
        depositor: &str,
        proposal_id: u64,
        amount: u128,
        denom: &str,
    ) -> Result<(), String> {
        if denom != "udgt" {
            return Err("Only DGT (udgt) deposits are allowed".to_string());
        }

        let mut proposal = self._get_proposal(proposal_id)?
            .ok_or("Proposal not found")?;

        // Check if we're in deposit period
        if proposal.status != ProposalStatus::DepositPeriod || height > proposal.deposit_end_height {
            return Err("Proposal is not in deposit period".to_string());
        }

        // Deduct from depositor's balance
        {
            let mut state = self.state.lock().unwrap();
            let mut account = state.get_account(depositor);
            account.sub_balance(denom, amount)?;
            state.accounts.insert(depositor.to_string(), account.clone());
            let _ = state.storage.set_balances_db(depositor, &account.balances);
        }

        // Update proposal deposit
        proposal.total_deposit += amount;

        // Check if min deposit reached - transition to voting period
        if proposal.total_deposit >= self.config.min_deposit {
            proposal.status = ProposalStatus::VotingPeriod;
            self.emit_event(GovernanceEvent::VotingStarted { id: proposal_id });
        }

        self.store_proposal(&proposal)?;
        self.emit_event(GovernanceEvent::Deposit { id: proposal_id, amount });
        Ok(())
    }

    /// Vote on a proposal
    pub fn vote(
        &mut self,
        height: u64,
        voter: &str,
        proposal_id: u64,
        option: VoteOption,
    ) -> Result<(), String> {
        let proposal = self._get_proposal(proposal_id)?
            .ok_or("Proposal not found")?;

        // Check if we're in voting period
        if proposal.status != ProposalStatus::VotingPeriod {
            return Err("Proposal is not in voting period".to_string());
        }

        if height < proposal.voting_start_height || height > proposal.voting_end_height {
            return Err("Not in voting period".to_string());
        }

        // Check if voter already voted
        if self.has_voted(proposal_id, voter)? {
            return Err("Voter has already voted on this proposal".to_string());
        }

        // Get voter's DGT balance as voting weight
        let weight = {
            let mut state = self.state.lock().unwrap();
            let account = state.get_account(voter);
            account.balance_of("udgt")
        };

        let vote = Vote {
            proposal_id,
            voter: voter.to_string(),
            option,
            weight,
        };

        self.store_vote(&vote)?;
        self.emit_event(GovernanceEvent::VoteCast { 
            id: proposal_id, 
            voter: voter.to_string() 
        });
        Ok(())
    }

    /// Process end of block - handle period transitions and execution
    pub fn end_block(&mut self, height: u64) -> Result<(), String> {
        let proposal_ids = self.get_all_proposal_ids()?;
        
        for proposal_id in proposal_ids {
            if let Some(mut proposal) = self._get_proposal(proposal_id)? {
                match proposal.status {
                    ProposalStatus::DepositPeriod => {
                        if height > proposal.deposit_end_height {
                            // Deposit period ended without reaching min deposit
                            proposal.status = ProposalStatus::Rejected;
                            self.store_proposal(&proposal)?;
                            self.emit_event(GovernanceEvent::ProposalRejected { 
                                id: proposal_id, 
                                reason: Some("Insufficient deposits".to_string()) 
                            });
                        }
                    }
                    ProposalStatus::VotingPeriod => {
                        if height > proposal.voting_end_height {
                            // Voting period ended - tally votes
                            let tally = self.tally(proposal_id)?;
                            proposal.tally = Some(tally.clone());
                            
                            if tally.yes > tally.no {
                                proposal.status = ProposalStatus::Passed;
                                self.emit_event(GovernanceEvent::ProposalPassed { 
                                    id: proposal_id, 
                                    yes: tally.yes, 
                                    no: tally.no, 
                                    abstain: tally.abstain 
                                });
                            } else {
                                proposal.status = ProposalStatus::Rejected;
                                self.emit_event(GovernanceEvent::ProposalRejected { 
                                    id: proposal_id, 
                                    reason: Some("Majority voted no".to_string()) 
                                });
                            }
                            self.store_proposal(&proposal)?;
                        }
                    }
                    ProposalStatus::Passed => {
                        // Execute passed proposals
                        match self.execute(proposal_id) {
                            Ok(_) => {
                                proposal.status = ProposalStatus::Executed;
                                self.store_proposal(&proposal)?;
                                self.emit_event(GovernanceEvent::ProposalExecuted { id: proposal_id });
                            }
                            Err(e) => {
                                self.emit_event(GovernanceEvent::ExecutionFailed { 
                                    id: proposal_id, 
                                    error: e 
                                });
                            }
                        }
                    }
                    _ => {} // Terminal states
                }
            }
        }
        Ok(())
    }

    /// Tally votes for a proposal
    pub fn tally(&self, proposal_id: u64) -> Result<TallyResult, String> {
        let votes = self.get_proposal_votes(proposal_id)?;
        
        let mut yes = 0u128;
        let mut no = 0u128;
        let mut abstain = 0u128;

        for vote in votes {
            match vote.option {
                VoteOption::Yes => yes += vote.weight,
                VoteOption::No => no += vote.weight,
                VoteOption::Abstain => abstain += vote.weight,
            }
        }

        Ok(TallyResult { yes, no, abstain })
    }

    /// Execute a passed proposal
    pub fn execute(&mut self, proposal_id: u64) -> Result<(), String> {
        let proposal = self._get_proposal(proposal_id)?
            .ok_or("Proposal not found")?;

        if proposal.status != ProposalStatus::Passed {
            return Err("Proposal has not passed".to_string());
        }

        match &proposal.proposal_type {
            ProposalType::ParameterChange { key, value } => {
                self.apply_parameter_change(key, value)?;
            }
        }

        Ok(())
    }

    /// Apply parameter changes
    fn apply_parameter_change(&mut self, key: &str, value: &str) -> Result<(), String> {
        match key {
            "gas_limit" => {
                let gas_limit: u64 = value.parse()
                    .map_err(|_| "Invalid gas_limit value".to_string())?;
                self.config.gas_limit = gas_limit;
                self.store_config()?;
                Ok(())
            }
            _ => Err(format!("Unknown parameter: {}", key))
        }
    }

    /// Get current governance configuration
    pub fn get_config(&self) -> &GovernanceConfig {
        &self.config
    }

    /// Get events
    pub fn get_events(&self) -> &[GovernanceEvent] {
        &self.events
    }

    /// Clear events (should be called after processing)
    pub fn clear_events(&mut self) {
        self.events.clear();
    }

    /// Public method to get proposal (exposed for RPC)
    pub fn get_proposal(&self, proposal_id: u64) -> Result<Option<Proposal>, String> {
        self._get_proposal(proposal_id)
    }

    // Storage helper methods

    fn next_proposal_id(&self) -> u64 {
        let last_id = self.storage.db
            .get("gov:last_proposal_id".to_string())
            .ok()
            .flatten()
            .and_then(|b| bincode::deserialize::<u64>(&b).ok())
            .unwrap_or(0);
        
        let next_id = last_id + 1;
        let _ = self.storage.db
            .put("gov:last_proposal_id".to_string(), bincode::serialize(&next_id).unwrap());
        next_id
    }

    fn store_proposal(&self, proposal: &Proposal) -> Result<(), String> {
        let key = format!("gov:proposal:{}", proposal.id);
        let data = bincode::serialize(proposal)
            .map_err(|e| format!("Failed to serialize proposal: {}", e))?;
        self.storage.db.put(key, data)
            .map_err(|e| format!("Failed to store proposal: {}", e))?;
        Ok(())
    }

    fn _get_proposal(&self, proposal_id: u64) -> Result<Option<Proposal>, String> {
        let key = format!("gov:proposal:{}", proposal_id);
        match self.storage.db.get(key) {
            Ok(Some(data)) => {
                let proposal = bincode::deserialize::<Proposal>(&data)
                    .map_err(|e| format!("Failed to deserialize proposal: {}", e))?;
                Ok(Some(proposal))
            }
            Ok(None) => Ok(None),
            Err(e) => Err(format!("Failed to get proposal: {}", e)),
        }
    }

    fn store_vote(&self, vote: &Vote) -> Result<(), String> {
        let key = format!("gov:vote:{}:{}", vote.proposal_id, vote.voter);
        let data = bincode::serialize(vote)
            .map_err(|e| format!("Failed to serialize vote: {}", e))?;
        self.storage.db.put(key, data)
            .map_err(|e| format!("Failed to store vote: {}", e))?;
        Ok(())
    }

    fn has_voted(&self, proposal_id: u64, voter: &str) -> Result<bool, String> {
        let key = format!("gov:vote:{}:{}", proposal_id, voter);
        Ok(self.storage.db.get(key)
            .map_err(|e| format!("Failed to check vote: {}", e))?
            .is_some())
    }

    fn get_proposal_votes(&self, proposal_id: u64) -> Result<Vec<Vote>, String> {
        let prefix = format!("gov:vote:{}:", proposal_id);
        let mut votes = Vec::new();
        
        // Note: This is a simplified implementation. In production, you'd want
        // a more efficient way to iterate over keys with a prefix.
        // For now, we'll implement a basic version.
        Ok(votes)
    }

    fn get_all_proposal_ids(&self) -> Result<Vec<u64>, String> {
        let last_id = self.storage.db
            .get("gov:last_proposal_id".to_string())
            .ok()
            .flatten()
            .and_then(|b| bincode::deserialize::<u64>(&b).ok())
            .unwrap_or(0);
        
        Ok((1..=last_id).collect())
    }

    fn store_config(&self) -> Result<(), String> {
        let data = bincode::serialize(&self.config)
            .map_err(|e| format!("Failed to serialize config: {}", e))?;
        self.storage.db.put("gov:config".to_string(), data)
            .map_err(|e| format!("Failed to store config: {}", e))?;
        Ok(())
    }

    fn emit_event(&mut self, event: GovernanceEvent) {
        self.events.push(event);
    }
}

/// Gas accounting constants for governance operations
pub const GAS_SUBMIT_PROPOSAL: u64 = 50_000;
pub const GAS_DEPOSIT: u64 = 30_000;
pub const GAS_VOTE: u64 = 20_000;
pub const GAS_TALLY: u64 = 10_000;

#[cfg(test)]
mod tests {
    use super::*;
    use crate::storage::state::Storage;
    use std::sync::{Arc, Mutex};
    use tempfile::TempDir;

    fn setup_test_governance() -> (GovernanceModule, TempDir) {
        let temp_dir = TempDir::new().unwrap();
        let storage = Arc::new(Storage::new(temp_dir.path()).unwrap());
        let state = Arc::new(Mutex::new(State::new(storage.clone())));
        
        let governance = GovernanceModule::new(storage, state);
        (governance, temp_dir)
    }

    #[test]
    fn test_submit_proposal() {
        let (mut governance, _temp_dir) = setup_test_governance();
        
        let proposal_id = governance.submit_proposal(
            100,
            "Test Proposal".to_string(),
            "Test Description".to_string(),
            ProposalType::ParameterChange {
                key: "gas_limit".to_string(),
                value: "500000".to_string(),
            },
        ).unwrap();
        
        assert_eq!(proposal_id, 1);
        
        let proposal = governance.get_proposal(proposal_id).unwrap().unwrap();
        assert_eq!(proposal.title, "Test Proposal");
        assert_eq!(proposal.status, ProposalStatus::DepositPeriod);
        assert_eq!(proposal.submit_height, 100);
    }

    #[test]
    fn test_deposit_transitions_to_voting() {
        let (mut governance, _temp_dir) = setup_test_governance();
        
        // Setup account with DGT balance
        {
            let mut state = governance.state.lock().unwrap();
            let mut account = state.get_account("depositor1");
            account.add_balance("udgt", 2_000_000_000); // 2000 DGT
            state.accounts.insert("depositor1".to_string(), account);
        }
        
        let proposal_id = governance.submit_proposal(
            100,
            "Test Proposal".to_string(),
            "Test Description".to_string(),
            ProposalType::ParameterChange {
                key: "gas_limit".to_string(),
                value: "500000".to_string(),
            },
        ).unwrap();
        
        // Deposit enough to meet minimum
        governance.deposit(150, "depositor1", proposal_id, 1_000_000_000, "udgt").unwrap();
        
        let proposal = governance.get_proposal(proposal_id).unwrap().unwrap();
        assert_eq!(proposal.status, ProposalStatus::VotingPeriod);
        assert_eq!(proposal.total_deposit, 1_000_000_000);
    }

    #[test]
    fn test_vote_with_dgt_weight() {
        let (mut governance, _temp_dir) = setup_test_governance();
        
        // Setup account with DGT balance
        {
            let mut state = governance.state.lock().unwrap();
            let mut account = state.get_account("voter1");
            account.add_balance("udgt", 500_000_000); // 500 DGT
            state.accounts.insert("voter1".to_string(), account);
        }
        
        let proposal_id = governance.submit_proposal(
            100,
            "Test Proposal".to_string(),
            "Test Description".to_string(),
            ProposalType::ParameterChange {
                key: "gas_limit".to_string(),
                value: "500000".to_string(),
            },
        ).unwrap();
        
        // Manually transition to voting period for test
        {
            let mut proposal = governance.get_proposal(proposal_id).unwrap().unwrap();
            proposal.status = ProposalStatus::VotingPeriod;
            governance.store_proposal(&proposal).unwrap();
        }
        
        governance.vote(200, "voter1", proposal_id, VoteOption::Yes).unwrap();
        
        let tally = governance.tally(proposal_id).unwrap();
        assert_eq!(tally.yes, 500_000_000);
        assert_eq!(tally.no, 0);
    }
}