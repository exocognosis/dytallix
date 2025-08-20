---
title: Governance Module
---

# Governance Module

Handles on-chain parameter updates.

## Proposal Lifecycle

1. Submit proposal (title, description, changes)
2. Deposit period (ensure minimum stake)
3. Voting period (Yes/No/Abstain/NoWithVeto)
4. Tally + execution

## Parameters

| Param | Description |
|-------|-------------|
| MinDeposit | Minimum tokens to enter voting |
| VotingPeriod | Blocks for voting |
| Quorum | Min participation fraction |
| Threshold | Yes votes needed |

Next: [PQC Crypto Module](pqc-crypto.md)
