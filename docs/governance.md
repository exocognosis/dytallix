# Dytallix On-Chain Governance System

## Overview

The Dytallix governance system is a block-based on-chain governance mechanism that uses DGT tokens for voting power and proposal deposits. It enables the community to propose and vote on parameter changes to the network.

## Key Features

- **Block-based periods**: Governance periods are measured in blocks, not time
- **DGT staking**: Uses DGT token balance for voting power and proposal deposits
- **Parameter changes**: Initial support for gas_limit parameter with extensible design
- **Lifecycle management**: Automatic proposal status transitions and execution
- **Event system**: Comprehensive event logging for governance activities

## Governance Flow

### 1. Proposal Submission
Anyone can submit a proposal by calling the governance module. Proposals start in the `DepositPeriod` status.

```bash
# CLI example
dcli gov submit --title "Increase Gas Limit" --description "Increase network gas limit to 500000" --key gas_limit --value 500000
```

```json
# RPC example  
POST /gov/submit
{
  "title": "Increase Gas Limit",
  "description": "Increase network gas limit to 500000", 
  "key": "gas_limit",
  "value": "500000"
}
```

### 2. Deposit Period
During the deposit period (default: 300 blocks), community members can deposit DGT tokens to support the proposal. When total deposits reach the minimum threshold (default: 1000 DGT), the proposal automatically transitions to the `VotingPeriod` status.

```bash
# CLI example
dcli gov deposit --from dyt1sender123 --proposal 1 --amount 1000000000  # 1000 DGT in micro units
```

```json
# RPC example
POST /gov/deposit
{
  "depositor": "dyt1sender123",
  "proposal_id": 1,
  "amount": 1000000000
}
```

### 3. Voting Period  
During the voting period (default: 300 blocks), DGT holders can vote on the proposal. Voting power is determined by the voter's DGT balance at the time of voting.

```bash
# CLI example
dcli gov vote --from dyt1voter456 --proposal 1 --option yes
```

```json
# RPC example
POST /gov/vote
{
  "voter": "dyt1voter456", 
  "proposal_id": 1,
  "option": "yes"  # "yes", "no", or "abstain"
}
```

### 4. Tallying and Execution
At the end of the voting period, votes are automatically tallied using simple majority rules:
- If `yes` votes > `no` votes: Proposal passes
- Otherwise: Proposal is rejected

Passed proposals are automatically executed in the next block, applying the parameter changes.

## Configuration

The governance system uses the following default parameters:

```rust
pub struct GovernanceConfig {
    pub min_deposit: u128,        // 1,000,000,000 (1000 DGT in micro units)
    pub deposit_period: u64,      // 300 blocks
    pub voting_period: u64,       // 300 blocks  
    pub gas_limit: u64,          // 21,000 (current gas limit)
}
```

## Proposal Types

Currently supported proposal types:

### ParameterChange
Changes network parameters. Initially supports `gas_limit` with extensible design for future parameters.

```rust
ProposalType::ParameterChange { 
    key: "gas_limit".to_string(), 
    value: "500000".to_string() 
}
```

## Status Transitions

Proposals follow this lifecycle:

```
DepositPeriod -> VotingPeriod -> Passed/Rejected -> Executed (terminal)
```

- **DepositPeriod**: Collecting deposits to reach minimum threshold
- **VotingPeriod**: Active voting period for DGT holders  
- **Passed**: Proposal passed vote, ready for execution
- **Rejected**: Proposal failed (insufficient deposits or negative vote)
- **Executed**: Proposal executed and parameter changes applied (terminal state)

## Events

The governance system emits the following events:

- `ProposalSubmitted { id }`
- `Deposit { id, amount }`
- `VotingStarted { id }`
- `VoteCast { id, voter }`
- `ProposalPassed { id, yes, no, abstain }`
- `ProposalRejected { id, reason }`
- `ProposalExecuted { id }`
- `ExecutionFailed { id, error }`

## CLI Commands

### Submit Proposal
```bash
dcli gov submit --title "Proposal Title" --description "Detailed description" --key parameter_name --value new_value
```

### Deposit on Proposal
```bash
dcli gov deposit --from your_address --proposal proposal_id --amount amount_in_micro_dgt
```

### Vote on Proposal
```bash
dcli gov vote --from your_address --proposal proposal_id --option yes|no|abstain
```

### Query Proposal
```bash
dcli gov show --proposal proposal_id
```

### Query Vote Tally
```bash
dcli gov tally --proposal proposal_id
```

### Query Configuration
```bash
dcli gov config
```

## RPC Endpoints

- `POST /gov/submit` - Submit a new proposal
- `POST /gov/deposit` - Deposit DGT on a proposal
- `POST /gov/vote` - Vote on a proposal
- `GET /gov/proposal/:id` - Get proposal details
- `GET /gov/tally/:id` - Get vote tally for a proposal
- `GET /gov/config` - Get governance configuration

## Gas Accounting

Governance operations have the following gas costs:
- Submit proposal: 50,000 gas
- Deposit: 30,000 gas  
- Vote: 20,000 gas
- Tally: 10,000 gas

## Security Considerations

- **Deposit requirement**: Prevents spam proposals by requiring DGT stake
- **Block-based periods**: Provides predictable timing independent of block production variance
- **Simple majority**: Requires more yes votes than no votes to pass
- **Balance verification**: Voting power based on actual DGT balance at vote time
- **Double-vote prevention**: Users cannot vote multiple times on the same proposal

## Future Extensions

The governance system is designed for extensibility:

- Additional parameter types beyond gas_limit
- More complex voting mechanisms (quorum requirements, etc.)
- Proposal categories with different requirements  
- Staking/delegation for voting power
- Emergency governance procedures