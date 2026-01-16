# Dytallix Governance Module

A robust governance system for the Dytallix blockchain that provides DAO voting, proposal management, and persistence capabilities.

## Features

- **Proposal Management**: Create, list, and track proposals with detailed metadata
- **Voting System**: Cast votes with duplicate prevention and deadline enforcement
- **Vote Tallying**: Real-time vote counting with support for different proposal statuses
- **Persistence**: File-based storage for proposals and votes that persists across restarts
- **Error Handling**: Comprehensive error types for all governance operations
- **Testing**: Both in-memory and file-based implementations with extensive test coverage

## Quick Start

```rust
use dytallix_governance::*;
use chrono::Utc;
use std::path::PathBuf;

// Create a governance system
let data_dir = PathBuf::from("./governance_data");
let mut governance = FileBasedGovernance::new(data_dir)?;

// Create a proposal
let proposal_id = governance.propose(
    "Upgrade Network Protocol".to_string(),
    "Proposal to upgrade the network protocol to version 2.0".to_string(),
    48 // 48 hours voting period
)?;

// Cast a vote
let ballot = Ballot {
    voter: "alice".to_string(),
    vote: true,
    timestamp: Utc::now(),
};
governance.vote(proposal_id, ballot)?;

// Tally votes
let results = governance.tally(proposal_id)?;
println!("YES votes: {}, NO votes: {}", results.yes_votes, results.no_votes);
```

## Architecture

### Core Components

1. **Proposal**: Represents a governance proposal with metadata and voting deadline
2. **Ballot**: Represents a vote cast by a user
3. **VoteResult**: Contains vote tallies and proposal status
4. **GovernanceError**: Comprehensive error handling for all operations

### Storage Implementations

- **FileBasedGovernance**: Persistent storage using JSON files
- **InMemoryGovernance**: In-memory storage for testing
- **DummyGovernance**: Legacy stub implementation

### Proposal Statuses

- **Active**: Proposal is currently accepting votes
- **Passed**: Proposal has more YES votes than NO votes and voting period ended
- **Rejected**: Proposal has more NO votes than YES votes and voting period ended
- **Expired**: Proposal voting period has ended (transitional state)

## API Reference

### DaoGovernance Trait

All governance implementations must implement this trait:

```rust
pub trait DaoGovernance {
    fn propose(&mut self, title: String, description: String, voting_duration_hours: u64) -> Result<u64, GovernanceError>;
    fn vote(&mut self, proposal_id: u64, ballot: Ballot) -> Result<(), GovernanceError>;
    fn tally(&self, proposal_id: u64) -> Result<VoteResult, GovernanceError>;
    fn get_proposal(&self, proposal_id: u64) -> Result<Option<Proposal>, GovernanceError>;
    fn list_proposals(&self) -> Result<Vec<Proposal>, GovernanceError>;
    fn get_votes(&self, proposal_id: u64) -> Result<Vec<Ballot>, GovernanceError>;
}
```

### Error Types

```rust
pub enum GovernanceError {
    InvalidProposal,
    VotingClosed,
    AlreadyVoted,
    ProposalNotFound,
    StorageError(String),
}
```

## Persistence

The `FileBasedGovernance` implementation stores data in JSON files:

- `proposals.json`: All proposals with metadata
- `votes.json`: All votes organized by proposal ID

Data is automatically loaded on startup and saved after each operation.

## Testing

Run the comprehensive test suite:

```bash
cargo test
```

Run the interactive demo:

```bash
cargo run --example governance_demo
```

## Security Features

- **Duplicate Vote Prevention**: Users can only vote once per proposal
- **Deadline Enforcement**: Votes are rejected after the voting period expires
- **Data Validation**: All inputs are validated before storage
- **Atomic Operations**: All state changes are atomic and consistent

## Integration

The governance module is designed to integrate seamlessly with the broader Dytallix ecosystem:

- Uses standard Rust error handling patterns
- Implements `std::error::Error` for all error types
- Provides both sync and async-compatible interfaces
- Follows Dytallix naming conventions and data structures

## Future Enhancements

- **Stake-weighted voting**: Vote power based on token holdings
- **Quorum requirements**: Minimum participation thresholds
- **Proposal categories**: Different types of proposals with different rules
- **Voting delegation**: Allow users to delegate their voting power
- **Multi-signature proposals**: Require multiple approvals for sensitive changes
