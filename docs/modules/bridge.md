---
title: Bridge Module
---

# Bridge Module

Facilitates cross-chain asset and message transfer.

## Components

| Component | Role |
|-----------|------|
| Relayer | Observes src chain events, submits proofs |
| Proof Store | Retains recent finalized proofs |
| Nonce Manager | Prevents replay |
| Fee Module | Accounts for relay cost |

## Flow (High Level)

1. Lock or burn asset on source
2. Emit event captured by relayer
3. Relay submits proof with nonce
4. Destination mints / unlocks asset

## Security

- Nonce + finality gating
- Multi-relayer threshold (future)
- Rate limiting suspicious relays

Next: [Faucet Module](faucet.md)
