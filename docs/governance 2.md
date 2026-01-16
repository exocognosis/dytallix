# Governance System Documentation

## Overview

The Dytallix governance system implements stake-weighted voting for decentralized decision-making, integrating with the existing staking module to derive voting power from validator delegations and self-bonds.

## Architecture

### Core Components

1. **Governance Module** (`dytallix-lean-launch/node/src/runtime/governance.rs`)
   - Proposal lifecycle management
   - Stake-weighted voting and tallying
   - Parameter change execution
   - Integration with staking module for voting power

2. **Parameter Registry**
   - Governed key-value store for blockchain parameters
   - Whitelisted modifiable parameters
   - Validation and execution of parameter changes

3. **Staking Integration**
   - Voting power derived from delegations and validator self-bonds
   - Consistent snapshot semantics at proposal end height
   - Active validator set distinction

## Proposal Types

### Parameter Change Proposals

Parameter change proposals allow governance to modify blockchain parameters.

**Supported Parameters:**
- `gas_limit` - Transaction gas limit
- `consensus.max_gas_per_block` - Maximum gas per block

**Structure:**
```rust
ProposalType::ParameterChange {
    key: String,    // Parameter key
    value: String   // New parameter value
}
```

## Proposal Lifecycle

### State Transitions

```
DepositPeriod → VotingPeriod → (Passed | Rejected) → (Executed | FailedExecution)
```

1. **DepositPeriod**: Proposal awaits minimum deposit threshold
2. **VotingPeriod**: Automatic transition when `min_deposit` reached
3. **Passed/Rejected**: Determined by tally rules at voting end
4. **Executed**: Successful execution of passed proposals

### Deposit Management

**Deposit Requirements:**
- Minimum deposit: 1,000 DGT (1,000,000,000 uDGT)
- Deposit period: 300 blocks
- Automatic transition to voting when threshold met

**Deposit Refund Policy:**
- **Passed & Executed**: Full refund to depositors
- **Rejected or Vetoed**: Deposits forfeited (moved to community pool)
- **Failed Execution**: Considered passed, deposits still refunded

## Voting Power Derivation

### Stake-Weighted Voting

Voting power is derived from staking participation:

1. **Delegator Power**: Amount delegated to validators (uDGT)
2. **Validator Self-Stake**: Validator's own stake contribution
3. **Total Aggregation**: Sum of all delegations and self-stakes

### Voting Power Functions

```rust
// Get voting power for specific address
pub fn voting_power(address: &str) -> Result<u128, String>

// Get total voting power across all stakers
pub fn total_voting_power() -> Result<u128, String>

// Get active validator set voting power
pub fn active_set_voting_power() -> Result<u128, String>
```

### Snapshot Semantics

- Voting power calculated at end-of-voting height
- Consistent tally using final block state
- No mid-voting power changes affect ongoing proposals

## Tally Rules & Formulas

### Parameters

All thresholds use basis points (1/100th of 1%):
- **Quorum**: 3,333 (33.33%) - minimum participation required
- **Threshold**: 5,000 (50%) - minimum yes votes for passing
- **Veto Threshold**: 3,333 (33.33%) - minimum veto votes for rejection

### Calculation Formulas

**Quorum Check:**
```
(Yes + No + Abstain + NoWithVeto) / total_voting_power >= quorum
```

**Veto Check:**
```
NoWithVeto / (Yes + No + Abstain + NoWithVeto) >= veto_threshold
```

**Threshold Check:**
```
Yes / (Yes + No + NoWithVeto) >= threshold
```
*Note: Abstain votes excluded from threshold denominator*

### Outcome Rules

Evaluated at end of voting period:

1. **Quorum Not Met**: `total_participated < quorum` → Rejected (QuorumNotMet)
2. **Vetoed**: `veto_ratio >= veto_threshold` → Rejected (Veto)
3. **Passed**: `yes_ratio >= threshold` → Passed
4. **Failed**: Otherwise → Rejected

## CLI Usage

### Command Structure

All governance commands use the `dyt gov` prefix:

### Submit Proposal
```bash
dyt gov submit \
  --title "Increase Gas Limit" \
  --description "Increase transaction gas limit to 2M" \
  --param-key gas_limit \
  --new-value 2000000 \
  --deposit 500000 \
  --from <address>
```

### Make Deposit
```bash
dyt gov deposit \
  --from <address> \
  --proposal <id> \
  --amount 100000
```

### Cast Vote
```bash
dyt gov vote \
  --from <address> \
  --proposal <id> \
  --option <yes|no|abstain|no_with_veto>
```

### Query Proposals
```bash
# List all proposals
dyt gov proposals

# Show specific proposal
dyt gov show --proposal <id>

# Show proposal tally
dyt gov tally --proposal <id>

# Show governance config
dyt gov config
```

### Example Output

```json
{
  "proposal_id": 1,
  "title": "Increase Gas Limit",
  "description": "Increase transaction gas limit to 2M",
  "status": "VotingPeriod",
  "tally": {
    "yes": "450000000000",
    "no": "100000000000",
    "abstain": "50000000000",
    "no_with_veto": "25000000000",
    "total_voting_power": "625000000000"
  },
  "participation": "62.5%",
  "quorum_met": true
}
```

## HTTP API Endpoints

### List Proposals
```
GET /api/governance/proposals
```

**Response:**
```json
{
  "proposals": [
    {
      "id": 1,
      "type": "ParameterChange",
      "title": "Increase Gas Limit",
      "status": "VotingPeriod",
      "submit_time": "2024-01-15T10:30:00Z",
      "deposit_end": "2024-01-15T11:30:00Z",
      "voting_end": "2024-01-15T12:30:00Z",
      "current_tally": {
        "yes": "450000000000",
        "no": "100000000000",
        "abstain": "50000000000",
        "no_with_veto": "25000000000",
        "total_voting_power": "1000000000000",
        "participating_voting_power": "625000000000",
        "quorum_met": true
      }
    }
  ]
}
```

### Proposal Details
```
GET /api/governance/proposals/{id}
```

**Response includes:**
- Complete proposal metadata
- Parameter change details (old vs new values)
- Deposit information
- Final execution results
- Timeline of lifecycle events

### Proposal Votes
```
GET /api/governance/proposals/{id}/votes
```

**Response:**
```json
{
  "votes": [
    {
      "voter": "dyt1validator1...",
      "option": "yes",
      "voting_power": "100000000000",
      "timestamp": "2024-01-15T11:45:00Z"
    }
  ]
}
```

## Explorer Integration

### Proposal List Page

**Columns:**
- ID, Type, Title
- Status (DepositPeriod, VotingPeriod, Passed, Rejected, Executed)
- Time remaining (Ends In)
- Live tally bars (Yes/No/Abstain/Veto percentages)
- Participation percentage

### Proposal Detail Page

**Sections:**
1. **Metadata**: Title, description, proposer, timestamps
2. **Parameter Diff**: Old vs new values for parameter changes
3. **Lifecycle Timeline**: Deposit → Voting → Execution events
4. **Live Tally**: Real-time voting progress with stake weights
5. **Deposits**: Contributor list and amounts
6. **Votes Table**: Voter addresses, options, voting power, timestamps

**Visualization:**
- Progress bars showing Yes/No/Abstain/Veto percentages
- Participation meter against quorum requirement
- Parameter comparison (current vs proposed)

## Events System

### Governance Events

```rust
pub enum GovernanceEvent {
    ProposalSubmitted { id: u64 },
    Deposit { id: u64, amount: u128 },
    VotingStarted { id: u64 },
    VoteCast { id: u64, voter: String },
    ProposalPassed { id: u64, yes: u128, no: u128, abstain: u128 },
    ProposalRejected { id: u64, reason: Option<String> },
    ProposalExecuted { id: u64 },
    ExecutionFailed { id: u64, error: String },
    ParameterChanged { key: String, old_value: String, new_value: String },
}
```

### Event Emission

Events are emitted at key lifecycle transitions:
- Proposal submission and deposit additions
- Voting period activation and vote casting
- Final tally and execution results
- Parameter changes with before/after values

## Configuration

### Governance Parameters

```rust
pub struct GovernanceConfig {
    pub min_deposit: u128,           // 1,000 DGT (1_000_000_000 uDGT)
    pub deposit_period: u64,         // 300 blocks
    pub voting_period: u64,          // 300 blocks
    pub quorum: u128,               // 3333 basis points (33.33%)
    pub threshold: u128,            // 5000 basis points (50%)
    pub veto_threshold: u128,       // 3333 basis points (33.33%)
    pub gas_limit: u64,             // Current: 21,000
    pub max_gas_per_block: u64,     // Current: 10,000,000
}
```

### Parameter Modifications

```bash
# Example: Change gas limit through governance
dyt gov submit \
  --title "Gas Limit Update" \
  --description "Increase gas limit for complex transactions" \
  --param-key gas_limit \
  --new-value 50000 \
  --deposit 1000000000 \
  --from dyt1proposer...
```

## Testing Examples

### Tally Edge Cases

```rust
// Quorum not met
total_votes = 250_000_000_000  // 25% participation
quorum_required = 333_300_000_000  // 33.33% of 1T total
// Result: Rejected (QuorumNotMet)

// Veto triggered
yes = 400_000_000_000
no = 100_000_000_000
veto = 500_000_000_000  // 50% veto votes
total = 1_000_000_000_000
// veto_ratio = 50% >= 33.33% → Rejected (Veto)

// Threshold success
yes = 600_000_000_000
no = 300_000_000_000
abstain = 100_000_000_000
// threshold = 60% >= 50% → Passed
```

### Integration Test Flow

```bash
#!/bin/bash
# Full governance flow test

# 1. Submit proposal (insufficient deposit)
PROPOSAL_ID=$(dyt gov submit --title "Test" --param-key gas_limit --new-value 50000 --deposit 0 --from proposer)

# 2. Add deposit to reach threshold
dyt gov deposit --proposal $PROPOSAL_ID --amount 1000000000 --from depositor

# 3. Cast weighted votes
dyt gov vote --proposal $PROPOSAL_ID --option yes --from validator1
dyt gov vote --proposal $PROPOSAL_ID --option no --from validator2

# 4. Wait for voting period end (simulate block progression)

# 5. Verify execution and parameter change
dyt gov show --proposal $PROPOSAL_ID
# Should show: status="Executed", gas_limit updated
```

## Future Extensions

### Planned Enhancements

1. **Additional Proposal Types**
   - Text proposals for signaling
   - Software upgrade proposals
   - Community fund spending

2. **Advanced Parameter Support**
   - Staking parameters (commission rates, unbonding period)
   - Economic parameters (inflation, emission rates)
   - Consensus parameters (block size, timeouts)

3. **Enhanced Voting Features**
   - Delegated voting (vote inheritance from validators)
   - Weighted voting by delegation amount
   - Vote privacy and anonymity options

4. **Governance Improvements**
   - Emergency procedures for critical fixes
   - Expedited proposal tracks
   - Community pool integration

### Community Pool Integration

Future proposals may utilize community pool funds:
- Spend proposals for development funding
- Parameter changes affecting pool usage
- Integration with treasury management

## Security Considerations

### Governance Attacks

1. **Vote Buying**: Stake-weighting reduces impact vs token-based voting
2. **Proposal Spam**: Minimum deposit requirement provides economic barrier
3. **Last-Minute Attacks**: Transparent voting allows monitoring
4. **Quorum Manipulation**: High participation threshold prevents minority control

### Parameter Safety

1. **Validation**: All parameter changes validated before execution
2. **Rollback**: Failed executions don't modify state
3. **Bounds Checking**: Reasonable limits on parameter values
4. **Emergency Override**: Administrative functions for critical fixes

### Audit Trail

- Complete event history for all governance actions
- Immutable proposal and vote records
- Transparent tally calculations
- Public parameter change logs

## Conclusion

The Dytallix governance system provides a robust, stake-weighted mechanism for decentralized decision-making. By integrating with the staking module, it ensures that voting power reflects actual network participation and economic stake, creating aligned incentives for good governance decisions.

The system balances accessibility (reasonable deposit requirements) with security (economic barriers to spam), while providing transparency through comprehensive APIs and event systems for external monitoring and integration.