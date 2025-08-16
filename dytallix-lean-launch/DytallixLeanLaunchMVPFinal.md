# Dytallix Testnet MVP Plan

## Table of Contents
1. [Overview](#overview)
2. [Core Feature Set](#core-feature-set)
   - [Dual-Token Economy (DGT & DRT)](#dual-token-economy-dgt--drt)
   - [Post-Quantum Cryptography (PQC)](#post-quantum-cryptography-pqc)
   - [WASM Smart Contracts](#wasm-smart-contracts)
   - [On-Chain Governance (DAO)](#on-chain-governance-dao)
   - [AI-Integrated Services](#ai-integrated-services)
3. [Essential Modules & Services](#essential-modules--services)
4. [Key Capabilities to Demonstrate](#key-capabilities-to-demonstrate)
5. [MVP Scale and Scope](#mvp-scale-and-scope)
6. [Dependencies & Infrastructure](#dependencies--infrastructure)
7. [Out-of-Scope / Deferred Items](#out-of-scope--deferred-items)
8. [Success Criteria](#success-criteria)
9. [Summary](#summary)

---

## Overview
The Dytallix Testnet MVP is a focused release designed to validate the platform’s core innovations:

- Quantum-resistant cryptography for all accounts and transactions.
- Dual-token economy (governance + rewards) with simplified emissions.
- WASM smart contract runtime with gas metering and secure sandboxing.
- On-chain governance for early decentralized decision-making.
- AI-integrated analytics (fraud detection, risk scoring) via oracle services.
- End-to-end developer and user experience (CLI, wallet, frontend, monitoring).

This MVP emphasizes functional completeness and demonstrability over full automation of tokenomics and cross-chain features, which will mature in later phases.

---

## Core Feature Set

### Dual-Token Economy (DGT & DRT)
- **DGT**: Fixed-supply governance token used for DAO voting and proposal deposits.
- **DRT**: Adaptive reward/emission token distributed to validators, stakers, and treasury.
- **MVP Emissions**: Off-chain scheduled script moves DRT from a reserve account to distribution pools (no on-chain mint/burn logic yet).
- **Units**: uDGT and uDRT (micro-denominations) supported in ledger and UI.

### Post-Quantum Cryptography (PQC)
- All key generation and transaction signatures use PQC schemes (e.g., Dilithium, Falcon, SPHINCS+).
- PQC verification integrated into transaction validation and (future) consensus signing.
- Crypto-agility preserved for future scheme rotation or multi-algorithm support.

### WASM Smart Contracts
- Embedded WASM runtime (e.g., Wasmi/Wasmtime) with:
  - Deterministic execution
  - Gas metering & limits
  - Persistent key-value storage
  - Event emission
- Deployment & execution via dedicated transaction types.
- Example contracts: Token logic / test utility contracts.

### On-Chain Governance (DAO)
- Proposal lifecycle: Submission → Deposit (DGT) → Voting → Tally → Execution.
- Configurable parameters: voting period, quorum, threshold, deposit min.
- Early proposal examples: Adjust emissions rate, enable feature flags, parameter changes.

### AI-Integrated Services
- Off-chain AI microservices (Python) providing:
  - Fraud / anomaly detection
  - Transaction or contract risk scoring
  - Optional bytecode pattern analysis for deployed contracts
- Oracle adapter relays structured AI responses on-chain or via event indexing.
- Frontend surfaces AI risk indicators per transaction, account, or contract.

---

## Essential Modules & Services
- **Blockchain Core**: Rust-based ledger + consensus integration (Tendermint/CometBFT style).
- **Bank / Token Modules**: Manage balances, transfers, initial genesis distributions.
- **Staking & Rewards**: Validator set handling, delegation mechanics, reward accrual via scripted emissions feeding distribution pools.
- **Governance Module**: Proposal and voting state machine.
- **WASM Contracts Module**: Deployment, invocation, gas and storage integration.
- **AI Oracle Layer**: Secure outbound calls to AI microservices; structured responses.
- **Wallet & CLI Tools**: PQC key generation, signing, transfers, contract deploy, governance commands, AI query helpers.
- **Frontend / Explorer**: React + TypeScript UI for accounts, balances, governance, contracts, AI dashboards, blocks/transactions.
- **Infrastructure & DevOps**: Vault (secrets), Prometheus/Grafana (metrics), logging aggregation, Docker/Kubernetes orchestration.

---

## Key Capabilities to Demonstrate
1. **Secure PQC Wallet Operations**: Create keys, sign, and broadcast transactions validated with PQC signatures.
2. **Token Transfers & Balances**: Real-time account balance updates (CLI + UI + explorer).
3. **Staking & Reward Distribution**: Delegation flow + periodic DRT accrual visible on accounts.
4. **Governance Voting**: End-to-end successful proposal (parameter change or feature toggle) executed after passing.
5. **Smart Contract Deployment & Execution**: Upload WASM, execute a function, observe state + gas usage.
6. **AI-Powered Risk Analysis**: Display risk score / anomaly flags on new transactions or contracts.
7. **(Optional Stretch) Cross-Chain Interoperability**: Demonstrate a basic bridge flow (e.g., Ethereum Sepolia → Dytallix locked asset representation) if stable.
8. **Unified Tooling**: Seamless parity between CLI and Web UI for all core operations.

---

## MVP Scale and Scope
### Network Topology
- Target: 3 primary validator nodes (geographically distributed) + optional seed / public RPC nodes.
- Purpose: Demonstrate decentralization, resilience, and consensus stability.

### Performance Targets (Indicative)
- Block time: ~2s target (tunable).
- Confirmation latency: 1–2s for simple transfers.
- Contract deploy latency: <5s including block inclusion.
- AI service round-trip: Sub-second target for lightweight risk evaluation.
- Throughput: Hundreds TPS baseline; stretch experimentation toward ~1000 TPS.

### Participation & Access
- Initial cohort: Invite-only or semi-private testers (dozens → low hundreds).
- Scale plan: Expand to broader community once core stability affirmed.

### Persistence & Resets
- Intention: Long-running testnet; resets only for critical upgrades or incompatible state transitions.
- Upgrade mode preference: Governance parameter changes / software updates without chain resets when feasible.

### Scope Limitations (Intentional Simplifications)
- No on-chain algorithmic inflation (scripted emissions only).
- Cross-chain bridges may be disabled or limited initially.
- Compliance / KYC modules dormant (passive instrumentation only).
- Advanced fee burning / token lifecycle automation deferred.

---

## Dependencies & Infrastructure
### Core Frameworks
- Cosmos SDK principles + CometBFT consensus integration layer.
- Rust toolchain (pinned version) + wasm32 build target for contracts.

### AI Stack
- Python microservices (FastAPI/Flask) + ML model dependencies (TensorFlow / PyTorch as needed).
- Secure RPC or message bus for oracle callbacks.

### Security & Secrets
- HashiCorp Vault for validator keys, API credentials, encryption materials.
- TLS for external endpoints (RPC, API, frontend, oracle gateway).

### Observability
- Prometheus metrics (nodes, AI services, Vault, infra).
- Grafana dashboards (consensus health, TPS, latency, gas, risk scoring trends).
- Centralized structured logging + alerting (node down, high latency, anomaly spikes).

### Deployment Platform
- Containerized components (node, AI, frontend) orchestrated by Kubernetes.
- Ingress / load balancing, persistent volumes for chain data, namespace isolation.
- CI/CD pipeline for reproducible builds and rollouts (blue/green or rolling updates).

### External / Optional Integrations
- External testnets (Ethereum Sepolia, Osmosis) for bridging (if enabled).
- Faucets for external assets if cross-chain testing proceeds.
- Community coordination (Discord / docs portal) for support and faucet requests.
- Third-party audit scheduling (security review alignment).

---

## Out-of-Scope / Deferred Items
| Feature | Status in MVP | Deferred Rationale |
|---------|---------------|--------------------|
| On-chain automatic inflation & burns | Replaced by scripted emissions | Reduce complexity; validate economics first |
| Full cross-chain bridge suite | Optional / partial | Focus on core stability before external dependencies |
| Dynamic fee market & burning | Not enabled | Introduce after baseline perf metrics gathered |
| Compliance enforcement (KYC/AML) | Passive only | Activate once governance + legal reviews complete |
| Advanced AI (deep contract semantic audits) | Prototype / limited | Gradual rollout tied to model maturity |
| Multi-PQC hybrid signatures | Single scheme per account | Add after baseline PQC adoption validated |

---

## Success Criteria
- ALL core modules compile, test, and run under sustained operation (multi-day uptime) without consensus faults.
- PQC transaction throughput meets baseline performance targets with <2s confirmation median.
- Governance proposal executed successfully on live testnet (documented end-to-end).
- At least one WASM contract deployed and interacted with (state change verified in explorer & CLI).
- DRT reward balances grow predictably for validators / delegators via emissions script.
- AI risk scoring visible in UI for transactions/contracts with <1s average response.
- Monitoring dashboards populated; alerting fires correctly on induced fault (node stop test).
- Secrets managed exclusively via Vault (no raw private keys on disk in production pods).
- Developer onboarding: Able to create key, fund account (faucet/genesis), deploy contract, vote on proposal, and observe metrics within a single documented workflow.

---

## Summary
The Dytallix Testnet MVP delivers a quantum-secure, AI-augmented, dual-token smart contract platform with governance and staking live from day one. By deliberately simplifying certain tokenomics (script-driven emissions) and optionally deferring cross-chain features, the release concentrates on proving the architectural pillars:

- Quantum resistance
- Programmability (WASM)
- Economic governance (dual-token + DAO)
- Intelligent analytics (AI oracle integration)

This cohesive baseline enables rapid iteration, community feedback, and performance tuning on the path toward a feature-complete public testnet and eventual mainnet launch.

---

*Document Version: 1.0 (MVP Structured Format)*
