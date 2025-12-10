use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Clone)]
pub struct GovernanceState {
    pub admin: String,
    pub parameters: HashMap<String, GovernanceParameter>,
    pub proposals: HashMap<u64, Proposal>,
    pub next_proposal_id: u64,
    pub voting_period: u64, // blocks
    pub quorum_threshold: u64, // percentage (0-100)
    pub approval_threshold: u64, // percentage (0-100)
}

#[derive(Serialize, Deserialize, Clone)]
pub struct GovernanceParameter {
    pub name: String,
    pub value: String,
    pub description: String,
    pub param_type: String, // "uint64", "string", "bool"
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Proposal {
    pub id: u64,
    pub title: String,
    pub description: String,
    pub proposer: String,
    pub parameter_name: String,
    pub new_value: String,
    pub votes_yes: u64,
    pub votes_no: u64,
    pub status: ProposalStatus,
    pub start_height: u64,
    pub end_height: u64,
    pub voters: HashMap<String, VoteChoice>,
}

#[derive(Serialize, Deserialize, Clone)]
pub enum ProposalStatus {
    Active,
    Passed,
    Rejected,
    Executed,
}

#[derive(Serialize, Deserialize, Clone)]
pub enum VoteChoice {
    Yes,
    No,
    Abstain,
}

#[derive(Serialize, Deserialize)]
pub struct InitMsg {
    pub admin: String,
    pub voting_period: u64,
    pub quorum_threshold: u64,
    pub approval_threshold: u64,
}

#[derive(Serialize, Deserialize)]
pub struct CreateProposalMsg {
    pub title: String,
    pub description: String,
    pub parameter_name: String,
    pub new_value: String,
}

#[derive(Serialize, Deserialize)]
pub struct VoteMsg {
    pub proposal_id: u64,
    pub vote: VoteChoice,
}

// Global state storage simulation
static mut STATE: Option<GovernanceState> = None;
static mut CURRENT_HEIGHT: u64 = 0;

#[no_mangle]
pub extern "C" fn init(msg_ptr: *const u8, msg_len: usize) -> *const u8 {
    let msg_slice = unsafe { std::slice::from_raw_parts(msg_ptr, msg_len) };
    let init_msg: InitMsg = serde_json::from_slice(msg_slice).unwrap();
    
    // Initialize with some default parameters
    let mut parameters = HashMap::new();
    parameters.insert("gas_limit".to_string(), GovernanceParameter {
        name: "gas_limit".to_string(),
        value: "1000000".to_string(),
        description: "Maximum gas limit per transaction".to_string(),
        param_type: "uint64".to_string(),
    });
    
    parameters.insert("block_time".to_string(), GovernanceParameter {
        name: "block_time".to_string(),
        value: "6000".to_string(), // 6 seconds in milliseconds
        description: "Target block time in milliseconds".to_string(),
        param_type: "uint64".to_string(),
    });
    
    let state = GovernanceState {
        admin: init_msg.admin,
        parameters,
        proposals: HashMap::new(),
        next_proposal_id: 1,
        voting_period: init_msg.voting_period,
        quorum_threshold: init_msg.quorum_threshold,
        approval_threshold: init_msg.approval_threshold,
    };
    
    unsafe {
        STATE = Some(state);
        CURRENT_HEIGHT = 1;
    }
    
    let response = serde_json::to_string(&"governance_initialized").unwrap();
    let ptr = response.as_ptr();
    std::mem::forget(response);
    ptr
}

#[no_mangle]
pub extern "C" fn create_proposal(msg_ptr: *const u8, msg_len: usize, sender_ptr: *const u8, sender_len: usize) -> *const u8 {
    let msg_slice = unsafe { std::slice::from_raw_parts(msg_ptr, msg_len) };
    let sender_slice = unsafe { std::slice::from_raw_parts(sender_ptr, sender_len) };
    
    let proposal_msg: CreateProposalMsg = serde_json::from_slice(msg_slice).unwrap();
    let sender = String::from_utf8(sender_slice.to_vec()).unwrap();
    
    let state = unsafe { STATE.as_mut().unwrap() };
    let current_height = unsafe { CURRENT_HEIGHT };
    
    // Check if parameter exists
    if !state.parameters.contains_key(&proposal_msg.parameter_name) {
        let error = serde_json::to_string(&"parameter_not_found").unwrap();
        let ptr = error.as_ptr();
        std::mem::forget(error);
        return ptr;
    }
    
    let proposal_id = state.next_proposal_id;
    let proposal = Proposal {
        id: proposal_id,
        title: proposal_msg.title,
        description: proposal_msg.description,
        proposer: sender,
        parameter_name: proposal_msg.parameter_name,
        new_value: proposal_msg.new_value,
        votes_yes: 0,
        votes_no: 0,
        status: ProposalStatus::Active,
        start_height: current_height,
        end_height: current_height + state.voting_period,
        voters: HashMap::new(),
    };
    
    state.proposals.insert(proposal_id, proposal);
    state.next_proposal_id += 1;
    
    let response = serde_json::to_string(&proposal_id).unwrap();
    let ptr = response.as_ptr();
    std::mem::forget(response);
    ptr
}

#[no_mangle]
pub extern "C" fn vote(msg_ptr: *const u8, msg_len: usize, sender_ptr: *const u8, sender_len: usize) -> *const u8 {
    let msg_slice = unsafe { std::slice::from_raw_parts(msg_ptr, msg_len) };
    let sender_slice = unsafe { std::slice::from_raw_parts(sender_ptr, sender_len) };
    
    let vote_msg: VoteMsg = serde_json::from_slice(msg_slice).unwrap();
    let sender = String::from_utf8(sender_slice.to_vec()).unwrap();
    
    let state = unsafe { STATE.as_mut().unwrap() };
    let current_height = unsafe { CURRENT_HEIGHT };
    
    let proposal = match state.proposals.get_mut(&vote_msg.proposal_id) {
        Some(p) => p,
        None => {
            let error = serde_json::to_string(&"proposal_not_found").unwrap();
            let ptr = error.as_ptr();
            std::mem::forget(error);
            return ptr;
        }
    };
    
    // Check if proposal is still active
    if current_height > proposal.end_height {
        let error = serde_json::to_string(&"voting_period_ended").unwrap();
        let ptr = error.as_ptr();
        std::mem::forget(error);
        return ptr;
    }
    
    // Check if already voted
    if proposal.voters.contains_key(&sender) {
        let error = serde_json::to_string(&"already_voted").unwrap();
        let ptr = error.as_ptr();
        std::mem::forget(error);
        return ptr;
    }
    
    // Record vote
    match vote_msg.vote {
        VoteChoice::Yes => proposal.votes_yes += 1,
        VoteChoice::No => proposal.votes_no += 1,
        VoteChoice::Abstain => {}, // Don't increment either counter
    }
    proposal.voters.insert(sender, vote_msg.vote);
    
    let response = serde_json::to_string(&"vote_recorded").unwrap();
    let ptr = response.as_ptr();
    std::mem::forget(response);
    ptr
}

#[no_mangle]
pub extern "C" fn get_parameter(param_ptr: *const u8, param_len: usize) -> *const u8 {
    let param_slice = unsafe { std::slice::from_raw_parts(param_ptr, param_len) };
    let param_name = String::from_utf8(param_slice.to_vec()).unwrap();
    
    let state = unsafe { STATE.as_ref().unwrap() };
    
    let default_value = "not_found".to_string();
    let param_value = state.parameters.get(&param_name).map(|p| &p.value).unwrap_or(&default_value);
    
    let response = serde_json::to_string(param_value).unwrap();
    let ptr = response.as_ptr();
    std::mem::forget(response);
    ptr
}

#[no_mangle]
pub extern "C" fn get_proposal(proposal_id: u64) -> *const u8 {
    let state = unsafe { STATE.as_ref().unwrap() };
    
    let proposal = state.proposals.get(&proposal_id);
    let response = serde_json::to_string(&proposal).unwrap();
    let ptr = response.as_ptr();
    std::mem::forget(response);
    ptr
}