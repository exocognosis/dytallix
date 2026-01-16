Feature Flags – Governance and Staking

Overview
- Flags are runtime-configurable and default to disabled. Queries remain available; transaction endpoints return 501 Not Implemented with a clear message when disabled.
- Flags are passed via environment variables to the node:
  - DYT_ENABLE_GOVERNANCE: "true"/"1" enables governance transactions
  - DYT_ENABLE_STAKING: "true"/"1" enables staking transactions and reward accrual

Defaults
- governance.enabled: false
- staking.enabled: false

Behavior
- Governance
  - Queries available regardless of flag:
    - GET /gov/proposal/:id, /gov/tally/:id, /gov/config
    - GET /api/governance/proposals, /api/governance/proposals/:id/votes
    - GET /api/governance/voting-power/:address, /api/governance/total-voting-power
  - Mutations gated by flag:
    - POST /gov/submit, /gov/deposit, /gov/vote → 501 with { error: NOT_IMPLEMENTED, message: "governance feature disabled" }
  - Node background processing (end_block) only runs when enabled.

- Staking
  - Queries available regardless of flag:
    - GET /api/staking/accrued/:address returns zeros when disabled
    - GET /api/stats and /api/rewards include staking stats; returns zeros when disabled
  - Mutations gated by flag:
    - POST /api/staking/claim, /api/staking/delegate, /api/staking/undelegate → 501 with { error: NOT_IMPLEMENTED, message: "staking feature disabled" }
  - Emission → staking reward distribution runs only when enabled.

How to Enable
- Via Helm values (recommended):
  - dytallix-lean-launch/helm/values.yaml
    features:
      governance:
        enabled: false
      staking:
        enabled: false
  - The RPC StatefulSet injects these as env vars automatically.
  - Example enable in staging:
    helm upgrade --install dytallix dytallix-lean-launch/helm -n dytallix \
      --set features.governance.enabled=true \
      --set features.staking.enabled=true

Notes
- Compile-time cfg for governance/staking has been removed; modules are always compiled.
- Runtime flags determine whether mutation endpoints execute and whether staking emissions are applied.
- Queries read any existing on-chain state; when disabled, no new governance or staking state transitions are executed.
