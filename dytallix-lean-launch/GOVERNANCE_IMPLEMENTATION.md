# Governance Happy-Path Implementation

This document describes the complete implementation of the governance happy-path flow in Dytallix, allowing parameter-change proposals to be submitted, deposited on, voted on, tallied, and executed.

## Overview

The governance system supports the complete lifecycle:
```
DepositPeriod → VotingPeriod → (Passed | Rejected) → Executed
```

## API Endpoints

### Core Governance Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/governance/submit_proposal` | Submit a new parameter change proposal |
| POST | `/governance/deposit` | Deposit tokens on a proposal |
| POST | `/governance/vote` | Vote on a proposal (Yes/No/Abstain/NoWithVeto) |
| GET | `/governance/tally/{proposal_id}` | Get current vote tally for a proposal |
| POST | `/governance/execute` | **[NEW]** Execute a passed proposal |

### Query Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/gov/proposal/{id}` | Get proposal details |
| GET | `/gov/config` | Get current governance parameters |
| GET | `/api/governance/proposals` | List all proposals with tally info |
| GET | `/api/governance/proposals/{id}/votes` | Get votes for a specific proposal |
| GET | `/api/governance/voting-power/{address}` | Get voting power for an address |
| GET | `/api/governance/total-voting-power` | Get total voting power |

## CLI Commands

### Basic Operations
```bash
# Submit proposal
dytx gov submit --title "Gas Limit Increase" --description "..." --key gas_limit --value 50000

# Deposit on proposal  
dytx gov deposit --proposal 1 --from depositor1 --amount 1000000000

# Vote on proposal
dytx gov vote --proposal 1 --from voter1 --option yes

# Execute proposal (NEW)
dytx gov execute --proposal 1
```

### Query Operations
```bash
# List all proposals
dytx gov proposals

# Get proposal tally
dytx gov tally --proposal 1

# Get current configuration
curl http://localhost:3030/gov/config
```

## Supported Parameters

The system currently supports changing these parameters:

- `gas_limit` - Transaction gas limit (1,000 to 100,000,000)
- `consensus.max_gas_per_block` - Maximum gas per block (1,000,000 to 1,000,000,000)

## Governance Configuration

Default governance parameters:
```json
{
  "min_deposit": 1000000000,      // 1000 DGT
  "deposit_period": 300,          // blocks
  "voting_period": 300,           // blocks  
  "quorum": 3333,                 // 33.33% (basis points)
  "threshold": 5000,              // 50% (basis points)
  "veto_threshold": 3333,         // 33.33% (basis points)
  "gas_limit": 21000,             // Current gas limit
  "max_gas_per_block": 10000000   // Current max gas per block
}
```

## Example Complete Flow

### 1. Submit Proposal
```bash
dytx gov submit \
  --title "Gas Limit Increase" \
  --description "Increase gas limit for better UX" \
  --key "gas_limit" \
  --value "50000"
# Returns: {"proposal_id": 1}
```

### 2. Deposit
```bash
dytx gov deposit --proposal 1 --from depositor1 --amount 1000000000
# Moves proposal from DepositPeriod to VotingPeriod
```

### 3. Vote
```bash
dytx gov vote --proposal 1 --from voter1 --option yes
dytx gov vote --proposal 1 --from voter2 --option yes
```

### 4. Check Tally
```bash
dytx gov tally --proposal 1
# Shows current vote counts and status
```

### 5. Execute (Manual)
```bash
dytx gov execute --proposal 1
# Executes the proposal and applies parameter change
```

### 6. Verify Change
```bash
curl http://localhost:3030/gov/config | jq '.gas_limit'
# Should show new value: 50000
```

## Automatic vs Manual Execution

The system supports both execution modes:

### Automatic Execution
- Proposals are automatically executed in `end_block` processing
- Happens one block after voting period ends
- No manual intervention required

### Manual Execution  
- Use the new `/governance/execute` endpoint
- Allows immediate execution of passed proposals
- Useful for testing and controlled execution

## Events and Evidence

The system emits governance events and maintains evidence logs:

### Events
- `ProposalSubmitted` - When proposal is created
- `ProposalVotingStarted` - When deposit threshold met
- `ProposalExecuted` - When proposal successfully executed
- `ParameterChanged` - When parameter is updated
- And more...

### Evidence Files
- Proposal details stored in `launch-evidence/governance/proposals/`
- Event logs in `launch-evidence/governance/events.jsonl`
- CLI actions logged in `launch-evidence/cli/`

## State Persistence

- All governance state persists across node restarts
- Parameters changes are immediately reflected in queries
- Proposal history is maintained permanently
- Vote records are preserved

## Error Handling

Common error scenarios:
- Executing non-existent proposal → `404 Not Found`
- Executing proposal that hasn't passed → `400 Bad Request`  
- Insufficient deposit → `400 Bad Request`
- Governance disabled → `501 Not Implemented`

## Demo Script

Run the complete demo:
```bash
# Start node with governance enabled
DYT_ENABLE_GOVERNANCE=true cargo run

# In another terminal
./governance-demo.sh
```

This will demonstrate the complete happy-path flow end-to-end.