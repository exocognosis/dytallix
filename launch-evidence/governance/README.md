# Governance Evidence Collection

This directory contains scripts and templates for collecting governance functionality evidence including parameter change proposals, voting processes, and execution verification.

## Overview

The governance evidence collection demonstrates:

1. **Proposal Submission**: Creating and submitting parameter change proposals
2. **Voting Process**: Automated voting from multiple validator accounts
3. **Execution Verification**: Confirming parameter changes were applied
4. **Transaction Records**: JSON artifacts of all governance transactions

## Files

- `README.md` - This documentation
- `proposal_param_change.example.json` - Template for parameter change proposals
- `capture_governance.sh` - Main automation script
- `.keep` - Directory tracking placeholder

## Generated Artifacts

After successful execution:

- `proposal_tx.json` - Transaction hash and details from proposal submission
- `vote_tx.json` - Voting transaction records from all participating validators
- `execution_log.json` - Parameter query results confirming changes applied
- `screenshots/` - Optional UI screenshots of governance process

## Configuration

### Environment Variables

```bash
# Chain binary and endpoints
export DY_BINARY="dytallixd"          # Chain binary name
export DY_LCD="http://localhost:1317" # LCD/REST endpoint
export DY_RPC="http://localhost:26657" # RPC endpoint

# Governance configuration
export DY_DENOM="uDRT"                # Base denomination for deposits/fees
export VOTER_KEYS="val1,val2,val3"    # Comma-separated validator key names

# Proposal parameters
export PROPOSAL_DEPOSIT="10000000uDRT" # Minimum deposit amount
export PROPOSAL_TITLE="Test Parameter Change"
export PROPOSAL_DESCRIPTION="Launch evidence parameter change test"
```

### Validator Requirements

- Validator keys must be present in keyring
- Validators must have sufficient voting power
- Validators must have tokens for transaction fees

## Usage

### Basic Execution

```bash
cd governance/
./capture_governance.sh
```

### Advanced Usage

```bash
# Custom proposal with specific parameter
export PARAM_SUBSPACE="staking"
export PARAM_KEY="UnbondingTime"  
export PARAM_VALUE="1814400s"    # 21 days
./capture_governance.sh

# Custom voter set
export VOTER_KEYS="validator1,validator2"
./capture_governance.sh
```

## Script Workflow

The `capture_governance.sh` script performs the following steps:

1. **Preparation**
   - Validate environment configuration
   - Check validator key availability
   - Verify chain connectivity

2. **Proposal Creation**
   - Generate proposal JSON from template
   - Submit proposal transaction
   - Save proposal details and transaction hash

3. **Voting Process**
   - Wait for proposal to enter voting period
   - Submit YES votes from all configured validators
   - Record voting transaction details

4. **Execution Verification**
   - Monitor proposal status until passed
   - Wait for execution completion
   - Query parameter to confirm change applied
   - Generate execution log

5. **Artifact Collection**
   - Save all transaction JSON files
   - Copy any referenced screenshots
   - Generate summary report

## Proposal Template

The included template supports standard Cosmos SDK parameter changes:

```json
{
  "@type": "/cosmos.gov.v1beta1.MsgSubmitProposal",
  "content": {
    "@type": "/cosmos.params.v1beta1.ParameterChangeProposal",
    "title": "Example Parameter Change",
    "description": "Test parameter modification for launch evidence",
    "changes": [
      {
        "subspace": "staking",
        "key": "UnbondingTime", 
        "value": "\"1814400s\""
      }
    ]
  },
  "initial_deposit": [
    {
      "denom": "uDRT",
      "amount": "10000000"
    }
  ],
  "proposer": "dy1..."
}
```

## Troubleshooting

### Common Issues

1. **Proposal Rejected**
   - Check minimum deposit amount
   - Verify proposer has sufficient balance
   - Ensure parameter key/value format is correct

2. **Voting Failures**
   - Verify validator keys exist in keyring
   - Check voting power and delegation status
   - Ensure validators have fee tokens

3. **Execution Timeout**
   - Governance may require longer voting periods
   - Check quorum and threshold requirements
   - Verify network participation levels

### Manual Verification

```bash
# Check proposal status
$DY_BINARY query gov proposal 1 --node $DY_RPC

# Verify parameter change
$DY_BINARY query staking params --node $DY_RPC

# Check voting results
$DY_BINARY query gov votes 1 --node $DY_RPC
```

## Security Considerations

- Validator keys should be properly secured
- Test on dedicated testnet environment
- Parameter changes should be carefully validated
- Monitor governance process for unexpected behavior

---

**Note**: This script is designed for testnet evidence collection. Production governance should include additional safeguards and community participation.