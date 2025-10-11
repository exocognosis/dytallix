# Genesis Block Analysis - dytallix-fast-launch

## Current Genesis Configuration

**File**: `genesis.json`

### ✅ What's Working (Currently Implemented)

1. **Chain ID**: `dytallix-gov-e2e` (but node uses `dyt-local-1` from ENV)
2. **Account Balances** - Successfully applied:
   - `dyt1valoper000000000001`: 2,000 DGT, 100 DRT
   - `dyt1valoper000000000002`: 2,000 DGT, 100 DRT
   - `dyt1valoper000000000003`: 2,000 DGT, 100 DRT
   - `dyt1userstake0000000001`: 500 DGT, 0 DRT

3. **Governance Configuration** - Applied:
   - Deposit period: 5 blocks
   - Voting period: 10 blocks
   - Min deposit: 1,000 DGT
   - Quorum: 33.33%
   - Threshold: 50%
   - Veto threshold: 33.33%

4. **Emission Configuration** - Applied:
   - Initial inflation: 5%
   - Target inflation: 10%

5. **Staking Reward Rate**: 5% (500 bps)

### ❌ What's NOT Working (Defined but Not Applied)

1. **Staking Delegations** - Defined but not applied at genesis:
   ```json
   "delegations": [
     {"delegator": "dyt1valoper000000000001", "validator": "dyt1valoper000000000001", "amount_udgt": "600000000000"},
     {"delegator": "dyt1valoper000000000002", "validator": "dyt1valoper000000000002", "amount_udgt": "400000000000"},
     {"delegator": "dyt1valoper000000000003", "validator": "dyt1valoper000000000003", "amount_udgt": "300000000000"}
   ]
   ```
   **Status**: Not applied - checking `/api/staking/balance/dyt1userstake0000000001` shows `staked: 0`

2. **Governance Proposals** - Defined but not created at genesis:
   ```json
   "governance_proposal": {
     "title": "Increase Annual Emission To 10%",
     "description": "...",
     "parameter_key": "emission.annual_inflation_rate",
     "target_rate_bps": 1000,
     "depositors": ["dyt1valoper000000000001"],
     "voters": [...]
   }
   ```
   **Status**: Not created - `/api/governance/proposals` returns empty array

3. **Simulation Settings** - Not used:
   ```json
   "simulation": {
     "blocks_to_run": 50
   }
   ```

## What Data is ACTUALLY in the Genesis Block?

Checking block 1 (genesis is parent):
```json
{
  "hash": "0xf8e859a8bebe3cfdac53d0c5394c96a122661b628626044c60d90fbc18495340",
  "height": 1,
  "parent": "genesis",
  "timestamp": 1759692904,
  "txs": []
}
```

**Genesis data is NOT stored as a queryable block** - it's applied during node initialization.

## Missing Data Points

### 1. Genesis Block Should Include:

#### Current (Implemented):
- ✅ Account initial balances
- ✅ Governance parameters
- ✅ Emission parameters
- ✅ Staking reward rate

#### Missing (Should Implement):
- ❌ **Genesis timestamp** - First block timestamp reference
- ❌ **Initial validator set** - Who can produce blocks from start
- ❌ **Initial delegations** - Pre-stake tokens to validators
- ❌ **Genesis transactions** - Initial proposal, stakes, etc.
- ❌ **Network parameters**:
  - Block time
  - Max block size
  - Max transactions per block
  - Gas limits
- ❌ **Token supply information**:
  - Total DGT supply
  - Initial DRT supply
  - Supply caps
- ❌ **Bridge configuration** (if applicable):
  - Supported chains
  - Initial bridge validators
  - Relay thresholds

### 2. Blockchain Metadata

#### Should Add to Genesis:
```json
{
  "chain_id": "dyt-local-1",
  "genesis_time": "2025-10-10T00:00:00Z",
  "network_params": {
    "block_time_ms": 2000,
    "max_block_size_bytes": 1000000,
    "max_tx_per_block": 100,
    "max_tx_size_bytes": 8192
  },
  "token_supply": {
    "dgt": {
      "initial_supply": "1000000000000000",
      "max_supply": "1000000000000000",
      "denomination": "udgt",
      "decimals": 6
    },
    "drt": {
      "initial_supply": "0",
      "max_supply": null,
      "denomination": "udrt", 
      "decimals": 6
    }
  }
}
```

### 3. Initial State Data

#### Currently Missing:
- **Validator Set**:
  ```json
  "validators": [
    {
      "address": "dyt1valoper000000000001",
      "pub_key": "...",
      "power": 600000000000,
      "name": "Validator 1"
    }
  ]
  ```

- **Initial Contracts** (if WASM enabled):
  ```json
  "contracts": [
    {
      "address": "dyt1contract000000001",
      "code_hash": "0x...",
      "creator": "dyt1valoper000000000001",
      "label": "Treasury",
      "initial_state": {}
    }
  ]
  ```

### 4. Historical/Audit Data

#### Should Include:
- **Genesis participants** - Who created the chain
- **Chain version** - Software version at genesis
- **Consensus parameters** - BFT settings
- **Hash of genesis config** - For verification

## Recommendations

### High Priority (Implement First):

1. **Add Genesis Block Endpoint**:
   - `/block/genesis` or `/genesis` endpoint
   - Return full genesis configuration
   - Include computed state hash

2. **Apply Staking Delegations at Genesis**:
   - Parse `staking.delegations` array
   - Apply delegations during node initialization
   - Validators should start with staked tokens

3. **Create Initial Governance Proposal**:
   - Parse `governance_proposal` from genesis
   - Auto-create and apply votes at genesis
   - Allows testing of governance flow immediately

4. **Add Network Parameters to Genesis**:
   - Block time, size limits, gas limits
   - Should be queryable via `/genesis/params`

### Medium Priority:

5. **Add Validator Set to Genesis**:
   - Define initial validators with public keys
   - Required for proper consensus

6. **Add Token Supply Information**:
   - Document total supply caps
   - Make queryable via `/supply` or `/api/token/supply`

7. **Add Genesis Metadata**:
   - Genesis time, chain version, creator info
   - Helps with block explorer display

### Low Priority:

8. **Add Bridge Configuration**:
   - If cross-chain bridge is active
   - Initial bridge validators and thresholds

9. **Add Initial Contracts**:
   - If WASM contracts enabled
   - Deploy essential contracts at genesis

## Implementation Notes

### Code Locations:
- Genesis parsing: `node/src/main.rs` lines 127-250
- Account balance application: Lines 133-152
- Staking delegation parsing: Lines 156-186 (partially implemented)
- Governance config: Lines 201-245

### To Fix Staking Delegations:
The code at lines 157-186 tries to parse delegations but may have issues. Check:
1. Are delegations being applied to the staking module?
2. Are validator addresses recognized?
3. Is the staking module initialized before delegations?

### To Add Genesis Block Query:
Add new endpoint in `node/src/rpc/mod.rs`:
```rust
pub async fn get_genesis(State(ctx): State<Arc<NodeContext>>) -> impl IntoResponse {
    // Return genesis.json content + computed state hash
}
```

## Current Chain State Summary

**Block Height**: ~6300+
**Chain ID**: dyt-local-1 (from ENV, not genesis.json)
**Active Accounts**: 5 (4 from genesis, 1 testkey)
**Active Proposals**: 0
**Active Delegations**: 0 (should be 4 from genesis)
**Validators**: 0 registered (should be 3 from genesis)

## Conclusion

The genesis file defines good data, but **only account balances and governance/emission parameters** are actually applied. Staking delegations and governance proposals are defined but not created at genesis.

**Recommended Action**: 
1. Fix staking delegation application
2. Add genesis block query endpoint  
3. Add validator set to genesis
4. Add network parameters section
5. Create governance proposal at genesis if defined
