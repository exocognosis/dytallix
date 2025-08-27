use crate::{
    runtime::staking::StakingModule,
    state::{AccountState, State},
    storage::state::Storage,
};
use serde::{Deserialize, Serialize};
use std::{
    collections::{BTreeMap, HashMap},
    sync::{Arc, Mutex},
};

/// Governance configuration with sensible defaults
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GovernanceConfig {
    pub min_deposit: u128,      // 1000 DGT in micro units
    pub deposit_period: u64,    // blocks
    pub voting_period: u64,     // blocks
    pub gas_limit: u64,         // Current gas limit parameter
    pub max_gas_per_block: u64, // Consensus parameter for max gas per block
    pub quorum: u128,           // Minimum participation required (in micro units)
    pub threshold: u128, // Minimum yes votes for proposal to pass (in basis points, e.g., 5000 = 50%)
    pub veto_threshold: u128, // Minimum no_with_veto votes to veto proposal (in basis points)
}

impl Default for GovernanceConfig {
    fn default() -> Self {
        Self {
            min_deposit: 1_000_000_000,    // 1000 DGT (assuming 6 decimal places)
            deposit_period: 300,           // 300 blocks for deposit period
            voting_period: 300,            // 300 blocks for voting period
            gas_limit: 21_000,             // Default gas limit
            max_gas_per_block: 10_000_000, // Default max gas per block
            quorum: 3333,                  // 33.33% quorum required (in basis points)
            threshold: 5000,               // 50% threshold for passing (in basis points)
            veto_threshold: 3333,          // 33.33% veto threshold (in basis points)
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
    Failed, // For expired deposits without reaching minimum
    Executed,
    FailedExecution, // For proposals that passed but failed to execute
}

/// Vote on a proposal
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Vote {
    pub proposal_id: u64,
    pub voter: String,
    pub option: VoteOption,
    pub weight: u128, // DGT balance at time of vote
}

/// Deposit on a proposal (for tracking individual deposits)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Deposit {
    pub proposal_id: u64,
    pub depositor: String,
    pub amount: u128,
    pub denom: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum VoteOption {
    Yes,
    No,
    NoWithVeto,
    Abstain,
}

/// Tally result for a proposal
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TallyResult {
    pub yes: u128,
    pub no: u128,
    pub no_with_veto: u128,
    pub abstain: u128,
    pub total_voting_power: u128,
}

/// Governance events
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum GovernanceEvent {
    ProposalSubmitted {
        id: u64,
    },
    Deposit {
        id: u64,
        amount: u128,
    },
    VotingStarted {
        id: u64,
    },
    VoteCast {
        id: u64,
        voter: String,
    },
    ProposalPassed {
        id: u64,
        yes: u128,
        no: u128,
        abstain: u128,
    },
    ProposalRejected {
        id: u64,
        reason: Option<String>,
    },
    ProposalExecuted {
        id: u64,
    },
    ExecutionFailed {
        id: u64,
        error: String,
    },
    ParameterChanged {
        key: String,
        old_value: String,
        new_value: String,
    },
    DepositBurned {
        proposal_id: u64,
        depositor: String,
        amount: u128,
    },
}

pub struct GovernanceModule {
    storage: Arc<Storage>,
    state: Arc<Mutex<State>>,
    staking: Arc<Mutex<StakingModule>>,
    config: GovernanceConfig,
    events: Vec<GovernanceEvent>,
}

impl GovernanceModule {
    pub fn new(
        storage: Arc<Storage>,
        state: Arc<Mutex<State>>,
        staking: Arc<Mutex<StakingModule>>,
    ) -> Self {
        let config = GovernanceConfig::default();
        Self {
            storage,
            state,
            staking,
            config,
            events: Vec::new(),
        }
    }

    pub fn new_with_config(
        storage: Arc<Storage>,
        state: Arc<Mutex<State>>,
        staking: Arc<Mutex<StakingModule>>,
        config: GovernanceConfig,
    ) -> Self {
        Self {
            storage,
            state,
            staking,
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

        let mut proposal = self
            ._get_proposal(proposal_id)?
            .ok_or("Proposal not found")?;

        // Check if we're in deposit period
        if proposal.status != ProposalStatus::DepositPeriod || height > proposal.deposit_end_height
        {
            return Err("Proposal is not in deposit period".to_string());
        }

        // Deduct from depositor's balance
        {
            let mut state = self.state.lock().unwrap();
            let mut account = state.get_account(depositor);
            account.sub_balance(denom, amount)?;
            state
                .accounts
                .insert(depositor.to_string(), account.clone());
            let _ = state.storage.set_balances_db(depositor, &account.balances);
        }

        // Store individual deposit for refund/burn tracking
        let deposit = Deposit {
            proposal_id,
            depositor: depositor.to_string(),
            amount,
            denom: denom.to_string(),
        };
        self.store_deposit(&deposit)?;

        // Update proposal deposit
        proposal.total_deposit += amount;

        // Check if min deposit reached - transition to voting period
        if proposal.total_deposit >= self.config.min_deposit {
            proposal.status = ProposalStatus::VotingPeriod;
            self.emit_event(GovernanceEvent::VotingStarted { id: proposal_id });
        }

        self.store_proposal(&proposal)?;
        self.emit_event(GovernanceEvent::Deposit {
            id: proposal_id,
            amount,
        });
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
        let proposal = self
            ._get_proposal(proposal_id)?
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

        // Get voter's voting power from staking (delegations + validator self-stake)
        let weight = self.voting_power(voter)?;

        let vote = Vote {
            proposal_id,
            voter: voter.to_string(),
            option,
            weight,
        };

        self.store_vote(&vote)?;
        self.emit_event(GovernanceEvent::VoteCast {
            id: proposal_id,
            voter: voter.to_string(),
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
                            proposal.status = ProposalStatus::Failed;
                            self.store_proposal(&proposal)?;
                            // Burn deposits for failed proposals (insufficient deposits)
                            self.burn_deposits(proposal_id)?;
                            self.emit_event(GovernanceEvent::ProposalRejected {
                                id: proposal_id,
                                reason: Some("Insufficient deposits - proposal failed".to_string()),
                            });
                        }
                    }
                    ProposalStatus::VotingPeriod => {
                        if height > proposal.voting_end_height {
                            // Voting period ended - tally votes
                            let tally = self.tally(proposal_id)?;
                            proposal.tally = Some(tally.clone());

                            // Use enhanced tally logic to determine if proposal passes
                            if self.proposal_passes(&tally)? {
                                proposal.status = ProposalStatus::Passed;
                                self.emit_event(GovernanceEvent::ProposalPassed {
                                    id: proposal_id,
                                    yes: tally.yes,
                                    no: tally.no,
                                    abstain: tally.abstain,
                                });
                            } else {
                                proposal.status = ProposalStatus::Rejected;
                                // Burn deposits for rejected proposals
                                self.burn_deposits(proposal_id)?;
                                let reason = if tally.total_voting_power
                                    < (self.get_total_staking_power()? * self.config.quorum) / 10000
                                {
                                    "Quorum not met"
                                } else if tally.no_with_veto
                                    >= (tally.total_voting_power * self.config.veto_threshold)
                                        / 10000
                                {
                                    "Proposal vetoed"
                                } else {
                                    "Threshold not met"
                                };
                                self.emit_event(GovernanceEvent::ProposalRejected {
                                    id: proposal_id,
                                    reason: Some(reason.to_string()),
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
                                // Refund deposits for successfully executed proposals
                                self.refund_deposits(proposal_id)?;
                                self.emit_event(GovernanceEvent::ProposalExecuted {
                                    id: proposal_id,
                                });
                            }
                            Err(e) => {
                                proposal.status = ProposalStatus::FailedExecution;
                                self.store_proposal(&proposal)?;
                                // Refund deposits for failed execution (not the proposer's fault)
                                self.refund_deposits(proposal_id)?;
                                self.emit_event(GovernanceEvent::ExecutionFailed {
                                    id: proposal_id,
                                    error: e,
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
        let votes = self._get_proposal_votes(proposal_id)?;

        let mut yes = 0u128;
        let mut no = 0u128;
        let mut no_with_veto = 0u128;
        let mut abstain = 0u128;

        for vote in votes {
            match vote.option {
                VoteOption::Yes => yes += vote.weight,
                VoteOption::No => no += vote.weight,
                VoteOption::NoWithVeto => no_with_veto += vote.weight,
                VoteOption::Abstain => abstain += vote.weight,
            }
        }

        let total_voting_power = yes + no + no_with_veto + abstain;

        Ok(TallyResult {
            yes,
            no,
            no_with_veto,
            abstain,
            total_voting_power,
        })
    }

    /// Check if a proposal passes based on governance parameters
    pub fn proposal_passes(&self, tally: &TallyResult) -> Result<bool, String> {
        // Get total staking power for quorum calculation
        let total_staking_power = self.get_total_staking_power()?;

        // Check quorum: minimum participation required
        let quorum_required = (total_staking_power * self.config.quorum) / 10000; // basis points
        if tally.total_voting_power < quorum_required {
            return Ok(false); // Quorum not met
        }

        // Check veto threshold: if no_with_veto >= veto_threshold, proposal is vetoed
        let veto_threshold = (tally.total_voting_power * self.config.veto_threshold) / 10000;
        if tally.no_with_veto >= veto_threshold {
            return Ok(false); // Proposal vetoed
        }

        // Check threshold: yes votes must be >= threshold of participating votes (excluding abstain)
        let participating_votes = tally.yes + tally.no + tally.no_with_veto;
        if participating_votes == 0 {
            return Ok(false); // No participating votes
        }

        let threshold_required = (participating_votes * self.config.threshold) / 10000;
        Ok(tally.yes >= threshold_required)
    }

    /// Get voting power for a specific address (derived from delegations and validator self-bond)
    pub fn voting_power(&self, address: &str) -> Result<u128, String> {
        let staking = self.staking.lock().unwrap();

        // Get delegator stake amount
        let delegator_record = staking.load_delegator_record(address);
        let mut total_power = delegator_record.stake_amount;

        // If the address is a validator, add self-stake (validator power)
        // Note: We need to check if the address is registered as a validator
        // For now, we'll aggregate all delegator stake power since the staking module
        // tracks delegations which include validator self-stake

        Ok(total_power)
    }

    /// Get total voting power across all eligible stakers
    pub fn total_voting_power(&self) -> Result<u128, String> {
        let staking = self.staking.lock().unwrap();
        Ok(staking.total_stake)
    }

    /// Get active set voting power (currently same as total for MVP)
    pub fn active_set_voting_power(&self) -> Result<u128, String> {
        // For MVP, active set is same as total staking power
        // In future this would filter to only active validators
        self.total_voting_power()
    }

    /// Get total staking power for quorum calculation (updated to use staking module)
    fn get_total_staking_power(&self) -> Result<u128, String> {
        // Use the new total_voting_power function
        let total_power = self.total_voting_power()?;

        // Minimum total power to avoid division by zero
        Ok(total_power.max(1))
    }

    /// Execute a passed proposal
    pub fn execute(&mut self, proposal_id: u64) -> Result<(), String> {
        let proposal = self
            ._get_proposal(proposal_id)?
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

    /// Apply parameter changes with enhanced governance event emission
    fn apply_parameter_change(&mut self, key: &str, value: &str) -> Result<(), String> {
        // Validate that the parameter is allowed to be changed
        let old_value = self.get_parameter_value(key)?;

        match key {
            "gas_limit" => {
                let gas_limit: u64 = value
                    .parse()
                    .map_err(|_| "Invalid gas_limit value: must be a valid u64".to_string())?;

                // Validation: gas limit should be reasonable (between 1K and 100M)
                if gas_limit < 1_000 || gas_limit > 100_000_000 {
                    return Err("gas_limit must be between 1,000 and 100,000,000".to_string());
                }

                self.config.gas_limit = gas_limit;
                self.store_config()?;

                // Emit parameter change event
                self.emit_event(GovernanceEvent::ParameterChanged {
                    key: key.to_string(),
                    old_value,
                    new_value: value.to_string(),
                });
                Ok(())
            }
            "consensus.max_gas_per_block" => {
                let max_gas_per_block: u64 = value.parse().map_err(|_| {
                    "Invalid consensus.max_gas_per_block value: must be a valid u64".to_string()
                })?;

                // Validation: max gas per block should be reasonable (between 1M and 1B)
                if max_gas_per_block < 1_000_000 || max_gas_per_block > 1_000_000_000 {
                    return Err(
                        "consensus.max_gas_per_block must be between 1,000,000 and 1,000,000,000"
                            .to_string(),
                    );
                }

                self.config.max_gas_per_block = max_gas_per_block;
                self.store_config()?;

                // Emit parameter change event
                self.emit_event(GovernanceEvent::ParameterChanged {
                    key: key.to_string(),
                    old_value,
                    new_value: value.to_string(),
                });
                Ok(())
            }
            _ => Err(format!(
                "Parameter '{}' is not governable. Allowed parameters: {:?}",
                key,
                self.get_governable_parameters()
            )),
        }
    }

    /// Get current value of a governance parameter
    fn get_parameter_value(&self, key: &str) -> Result<String, String> {
        match key {
            "gas_limit" => Ok(self.config.gas_limit.to_string()),
            "consensus.max_gas_per_block" => Ok(self.config.max_gas_per_block.to_string()),
            _ => Err(format!("Unknown parameter: {}", key)),
        }
    }

    /// Get list of governable parameters
    pub fn get_governable_parameters(&self) -> Vec<String> {
        vec![
            "gas_limit".to_string(),
            "consensus.max_gas_per_block".to_string(),
        ]
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

    /// Get all proposals (for API endpoint)
    pub fn get_all_proposals(&self) -> Result<Vec<Proposal>, String> {
        let last_id = self
            .storage
            .db
            .get("gov:last_proposal_id".to_string())
            .ok()
            .flatten()
            .and_then(|b| bincode::deserialize::<u64>(&b).ok())
            .unwrap_or(0);

        let mut proposals = Vec::new();
        for id in 1..=last_id {
            if let Some(proposal) = self._get_proposal(id)? {
                proposals.push(proposal);
            }
        }
        Ok(proposals)
    }

    /// Get votes for a proposal (exposed for RPC)
    pub fn get_proposal_votes(&self, proposal_id: u64) -> Result<Vec<Vote>, String> {
        self._get_proposal_votes(proposal_id)
    }

    // Storage helper methods

    fn next_proposal_id(&self) -> u64 {
        let last_id = self
            .storage
            .db
            .get("gov:last_proposal_id".to_string())
            .ok()
            .flatten()
            .and_then(|b| bincode::deserialize::<u64>(&b).ok())
            .unwrap_or(0);

        let next_id = last_id + 1;
        let _ = self.storage.db.put(
            "gov:last_proposal_id".to_string(),
            bincode::serialize(&next_id).unwrap(),
        );
        next_id
    }

    fn store_proposal(&self, proposal: &Proposal) -> Result<(), String> {
        let key = format!("gov:proposal:{}", proposal.id);
        let data = bincode::serialize(proposal)
            .map_err(|e| format!("Failed to serialize proposal: {}", e))?;
        self.storage
            .db
            .put(key, data)
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
        let data =
            bincode::serialize(vote).map_err(|e| format!("Failed to serialize vote: {}", e))?;
        self.storage
            .db
            .put(key, data)
            .map_err(|e| format!("Failed to store vote: {}", e))?;
        Ok(())
    }

    fn has_voted(&self, proposal_id: u64, voter: &str) -> Result<bool, String> {
        let key = format!("gov:vote:{}:{}", proposal_id, voter);
        Ok(self
            .storage
            .db
            .get(key)
            .map_err(|e| format!("Failed to check vote: {}", e))?
            .is_some())
    }

    fn _get_proposal_votes(&self, proposal_id: u64) -> Result<Vec<Vote>, String> {
        let prefix = format!("gov:vote:{}:", proposal_id);
        let mut votes = Vec::new();

        // This is a simplified implementation that scans all possible vote keys
        // In a production system, you'd want a more efficient prefix scan
        // For now, we'll iterate through potential voter addresses

        // Get all accounts to check for votes
        let state = self.state.lock().unwrap();
        for (voter_addr, _) in &state.accounts {
            let vote_key = format!("gov:vote:{}:{}", proposal_id, voter_addr);
            if let Ok(Some(data)) = self.storage.db.get(vote_key) {
                if let Ok(vote) = bincode::deserialize::<Vote>(&data) {
                    votes.push(vote);
                }
            }
        }

        Ok(votes)
    }

    fn get_all_proposal_ids(&self) -> Result<Vec<u64>, String> {
        let last_id = self
            .storage
            .db
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
        self.storage
            .db
            .put("gov:config".to_string(), data)
            .map_err(|e| format!("Failed to store config: {}", e))?;
        Ok(())
    }

    fn emit_event(&mut self, event: GovernanceEvent) {
        self.events.push(event);
    }

    // Deposit storage and retrieval functions

    fn store_deposit(&self, deposit: &Deposit) -> Result<(), String> {
        let key = format!("gov:deposit:{}:{}", deposit.proposal_id, deposit.depositor);
        let data = bincode::serialize(deposit)
            .map_err(|e| format!("Failed to serialize deposit: {}", e))?;
        self.storage
            .db
            .put(key, data)
            .map_err(|e| format!("Failed to store deposit: {}", e))?;
        Ok(())
    }

    fn get_proposal_deposits(&self, proposal_id: u64) -> Result<Vec<Deposit>, String> {
        let mut deposits = Vec::new();

        // Get all accounts to check for deposits (similar to vote retrieval)
        let state = self.state.lock().unwrap();
        for (depositor_addr, _) in &state.accounts {
            let deposit_key = format!("gov:deposit:{}:{}", proposal_id, depositor_addr);
            if let Ok(Some(data)) = self.storage.db.get(deposit_key) {
                if let Ok(deposit) = bincode::deserialize::<Deposit>(&data) {
                    deposits.push(deposit);
                }
            }
        }

        Ok(deposits)
    }

    /// Refund deposits to depositors (for successful or failed execution)
    fn refund_deposits(&mut self, proposal_id: u64) -> Result<(), String> {
        let deposits = self.get_proposal_deposits(proposal_id)?;

        {
            let mut state = self.state.lock().unwrap();
            for deposit in deposits {
                let mut account = state.get_account(&deposit.depositor);
                account.add_balance(&deposit.denom, deposit.amount);
                let account_clone = account.clone();
                state.accounts.insert(deposit.depositor.clone(), account);
                let _ = state
                    .storage
                    .set_balances_db(&deposit.depositor, &account_clone.balances);
            }
        }

        Ok(())
    }

    /// Burn deposits (for rejected or failed proposals)
    fn burn_deposits(&mut self, proposal_id: u64) -> Result<(), String> {
        let deposits = self.get_proposal_deposits(proposal_id)?;

        // Deposits are already deducted from accounts, so burning means not refunding them
        // In a production system, you might want to emit specific burn events or track burned amounts

        // Emit events for each burned deposit
        for deposit in deposits {
            self.emit_event(GovernanceEvent::DepositBurned {
                proposal_id,
                depositor: deposit.depositor,
                amount: deposit.amount,
            });
        }

        Ok(())
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

        let proposal_id = governance
            .submit_proposal(
                100,
                "Test Proposal".to_string(),
                "Test Description".to_string(),
                ProposalType::ParameterChange {
                    key: "gas_limit".to_string(),
                    value: "500000".to_string(),
                },
            )
            .unwrap();

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

        let proposal_id = governance
            .submit_proposal(
                100,
                "Test Proposal".to_string(),
                "Test Description".to_string(),
                ProposalType::ParameterChange {
                    key: "gas_limit".to_string(),
                    value: "500000".to_string(),
                },
            )
            .unwrap();

        // Deposit enough to meet minimum
        governance
            .deposit(150, "depositor1", proposal_id, 1_000_000_000, "udgt")
            .unwrap();

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

        let proposal_id = governance
            .submit_proposal(
                100,
                "Test Proposal".to_string(),
                "Test Description".to_string(),
                ProposalType::ParameterChange {
                    key: "gas_limit".to_string(),
                    value: "500000".to_string(),
                },
            )
            .unwrap();

        // Manually transition to voting period for test
        {
            let mut proposal = governance.get_proposal(proposal_id).unwrap().unwrap();
            proposal.status = ProposalStatus::VotingPeriod;
            governance.store_proposal(&proposal).unwrap();
        }

        governance
            .vote(200, "voter1", proposal_id, VoteOption::Yes)
            .unwrap();

        let tally = governance.tally(proposal_id).unwrap();
        assert_eq!(tally.yes, 500_000_000);
        assert_eq!(tally.no, 0);
        assert_eq!(tally.no_with_veto, 0);
        assert_eq!(tally.abstain, 0);
    }

    #[test]
    fn test_no_with_veto_vote() {
        let (mut governance, _temp_dir) = setup_test_governance();

        // Setup account with DGT balance
        {
            let mut state = governance.state.lock().unwrap();
            let mut account = state.get_account("voter1");
            account.add_balance("udgt", 500_000_000); // 500 DGT
            state.accounts.insert("voter1".to_string(), account);
        }

        let proposal_id = governance
            .submit_proposal(
                100,
                "Test Proposal".to_string(),
                "Test Description".to_string(),
                ProposalType::ParameterChange {
                    key: "consensus.max_gas_per_block".to_string(),
                    value: "15000000".to_string(),
                },
            )
            .unwrap();

        // Manually transition to voting period for test
        {
            let mut proposal = governance.get_proposal(proposal_id).unwrap().unwrap();
            proposal.status = ProposalStatus::VotingPeriod;
            governance.store_proposal(&proposal).unwrap();
        }

        governance
            .vote(200, "voter1", proposal_id, VoteOption::NoWithVeto)
            .unwrap();

        let tally = governance.tally(proposal_id).unwrap();
        assert_eq!(tally.yes, 0);
        assert_eq!(tally.no, 0);
        assert_eq!(tally.no_with_veto, 500_000_000);
        assert_eq!(tally.abstain, 0);
    }

    #[test]
    fn test_parameter_change_execution() {
        let (mut governance, _temp_dir) = setup_test_governance();

        // Test gas_limit parameter change
        governance
            .apply_parameter_change("gas_limit", "100000")
            .unwrap();
        assert_eq!(governance.config.gas_limit, 100000);

        // Test consensus.max_gas_per_block parameter change
        governance
            .apply_parameter_change("consensus.max_gas_per_block", "20000000")
            .unwrap();
        assert_eq!(governance.config.max_gas_per_block, 20000000);

        // Test invalid parameter
        assert!(governance
            .apply_parameter_change("invalid_param", "123")
            .is_err());
    }
}
