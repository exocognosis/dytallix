---
title: "Network Architecture"
---

# Network Architecture

Overview of components and data flow.

> Last updated: 2025-08-20

```mermaid
graph TD
  A[Client] --> B[RPC]
  B --> C[Mempool]
  C --> D[Consensus]
  D --> E[Blockchain]
  E --> F[Explorer]
```

Components:

- Nodes
- Consensus
- Mempool
- RPC
- PQC layer
- Faucet
- Explorer
- AI modules

See [Parameters](parameters.md) and [PQC Primer](pqc-primer.md).

Next: [PQC Primer](pqc-primer.md)
