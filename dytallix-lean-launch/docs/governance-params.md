# Governance Parameters

This document defines the canonical governance parameters for the Dytallix Lean Launch. The authoritative configuration is stored in `../config/governance.toml`. Any operational change MUST be reflected there and reviewed through standard governance / devops change control.

| Parameter | Default | Description |
|-----------|---------|-------------|
| `quorum` | `0.33` | Minimum fraction of total bonded voting power that must participate (Yes + No + NoWithVeto + Abstain) for the proposal to be valid. |
| `threshold` | `0.50` | Minimum proportion of YES votes (excluding Abstain) required for passage once quorum is met. |
| `veto` | `0.334` | Proportion of NO_WITH_VETO votes (of total votes cast) that triggers proposal rejection (and may slash deposits depending on chain rules). |
| `deposit_min` | `1000udgt` | Minimum total deposit required before a proposal enters the voting period. |
| `voting_period` | `100` (blocks) | Duration of the voting window measured in blocks. |

## Parameter Details & CLI Examples

> NOTE: Commands below are illustrative. Replace `dytallixd` with the actual daemon binary if different and ensure proper key/chain flags are supplied.

### quorum
- Default: `0.33`
- Purpose: Ensures a minimum level of validator participation, preventing low-engagement proposal passage.
- Enforcement: Proposal fails if final participation < quorum.

Example (propose an update):
```bash
# Submit a parameter change proposal to set quorum to 0.35
dytallixd tx gov submit-proposal param-change \
  --title "Raise quorum to 35%" \
  --description "Increase participation requirement" \
  --changes '[{"subspace":"gov","key":"quorum","value":"0.35"}]' \
  --deposit 1000udgt \
  --from proposer --chain-id dytallix-lean
```

### threshold
- Default: `0.50`
- Purpose: Majority requirement for YES votes once quorum reached.

Example:
```bash
dytallixd tx gov submit-proposal param-change \
  --title "Adjust passing threshold" \
  --description "Raise threshold to 55%" \
  --changes '[{"subspace":"gov","key":"threshold","value":"0.55"}]' \
  --deposit 1000udgt \
  --from proposer --chain-id dytallix-lean
```

### veto
- Default: `0.334`
- Purpose: Protective minority veto. If NO_WITH_VETO >= veto fraction, proposal rejected.

Example:
```bash
dytallixd tx gov submit-proposal param-change \
  --title "Tighten veto" \
  --description "Increase veto threshold to 0.40" \
  --changes '[{"subspace":"gov","key":"veto_threshold","value":"0.40"}]' \
  --deposit 1000udgt \
  --from proposer --chain-id dytallix-lean
```

### deposit_min
- Default: `1000udgt`
- Purpose: Economic spam deterrent; proposal enters voting only after cumulative deposits >= deposit_min.

Example:
```bash
dytallixd tx gov submit-proposal param-change \
  --title "Lower min deposit" \
  --description "Reduce economic barrier" \
  --changes '[{"subspace":"gov","key":"min_deposit","value":[{"denom":"udgt","amount":"800"}]}]' \
  --deposit 1000udgt \
  --from proposer --chain-id dytallix-lean
```

### voting_period
- Default: `100` blocks
- Purpose: Defines duration validators/delegators can cast votes.

Example:
```bash
dytallixd tx gov submit-proposal param-change \
  --title "Extend voting period" \
  --description "Allow more deliberation time" \
  --changes '[{"subspace":"gov","key":"voting_period","value":"150"}]' \
  --deposit 1000udgt \
  --from proposer --chain-id dytallix-lean
```

## Source of Truth
The file `../config/governance.toml` is the single source of truth. Automated deployment pipelines ingest that file to set initial chain parameters. Always update both this document and the TOML file in the same pull request when modifying values.
