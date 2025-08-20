---
title: PQC Crypto Module
---

# PQC Crypto Module

Integrates post-quantum primitives (e.g., Dilithium) in a hybrid model.

## Goals

- Enable hybrid signatures (ECDSA + Dilithium) for forward security
- Provide key registration & version negotiation
- Support phased rollout and fallback safety

## Status

Pilot phase: limited nodes advertising PQ capability, logging handshake metrics.

## Handshake (Conceptual)

```
Client -> Node : capability request
Node -> Client : supported versions + PQ algs
Client -> Node : select (hybrid scheme)
Both : exchange ephemeral + PQ pubkeys, derive session
```

Next: [Bridge Module](bridge.md)
