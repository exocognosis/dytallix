---
title: Staking Module
---

# Staking Module

Provides delegation, validator lifecycle, and reward distribution.

## Data Structures

| Item | Description |
|------|-------------|
| Validator | Operator address, consensus pubkey, commission, status |
| Delegation | Delegator -> Validator stake amount |
| Reward pool | Accumulated fees distributed per block |

## Flows

1. Create validator
2. Delegators bond tokens
3. Rewards accrue and are periodically withdrawn
4. Unbonding introduces delay (unbonding period param)

## Parameters (Sample)

| Param | Default |
|-------|---------|
| UnbondingTime | 14d |
| MaxValidators | 50 |
| MinSelfDelegation | 1_000 |

Next: [Governance Module](governance.md)
