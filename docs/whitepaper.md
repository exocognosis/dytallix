# Dytallix Technical White Paper

## Abstract

Dytallix is a proposed Layer 1 protocol for authenticated digital ownership, deterministic execution, and programmable asset coordination with post-quantum cryptography at the protocol boundary.

The architecture separates consensus, execution, economics, governance, and optional external services. The base protocol does not depend on artificial intelligence, bridge operators, external oracles, or application-specific logic for transaction validity or finality.

Validators use stake-weighted Byzantine fault tolerant consensus. Finality requires a quorum of authenticated validator voting power. Accounts and protocol messages use explicit cryptographic domains, canonical encodings, replay protection, and public-key-to-account binding. State transitions commit atomically to authenticated block and state roots.

Dytallix uses two native assets. DGT is the fixed-supply staking and governance asset. DRT is the service-payment and reward asset. DRT issuance is controlled by a bounded deterministic policy. Issuance, fees, rewards, treasury transfers, and burns use one supply-accounting system.

This paper defines the target protocol architecture and its rationale. It identifies open protocol decisions where an exact parameter or mechanism has not been approved. It does not treat source availability, a local test, or a component implementation as proof that the complete protocol satisfies this specification.

## 1. Document conventions

This paper uses three requirement labels.

- **Normative:** The protocol must satisfy the stated rule.
- **Optional module:** The base protocol does not require the component. Activation requires a separate specification and review.
- **Open decision:** The architecture requires a decision before the affected rule can become normative.

The words **must**, **must not**, **required**, and **prohibited** identify normative requirements.

The words **should** and **recommended** identify a preferred design that still requires an approval record.

## 2. Objectives and scope

### 2.1 Protocol objectives

Dytallix has these protocol objectives:

1. Authenticate transactions, validator messages, governance actions, and protocol upgrades with approved post-quantum signature schemes.
2. Establish authenticated peer sessions without quantum-vulnerable asymmetric cryptography inside the protocol trust boundary.
3. Finalize one ordered transaction history under a stated Byzantine fault model.
4. Apply deterministic and atomic state transitions.
5. Preserve explicit supply and custody invariants for DGT and DRT.
6. Limit governance authority through typed proposals, bounded parameters, voting-power snapshots, and delayed execution.
7. Keep optional applications and external data outside base consensus authority.
8. Support versioned cryptographic and protocol migration without silently changing historical meaning.

### 2.2 Non-goals

The base protocol does not make these claims:

- It does not make an external blockchain post-quantum secure.
- It does not treat an artificial-intelligence result as consensus truth.
- It does not guarantee that a bridge, wallet, browser, exchange, operating system, or network provider uses the same cryptographic boundary.
- It does not infer security from an algorithm name without verifying the parameter set, encoding, backend, caller, and key lifecycle.
- It does not permit local configuration to change consensus rules.

### 2.3 Architectural separation

The protocol separates these functions:

| Layer | Responsibility |
|---|---|
| Protocol types | Canonical addresses, transactions, votes, blocks, receipts, and version identifiers |
| Cryptography | Key generation, signing, verification, key establishment, hashing, domain separation, and algorithm policy |
| Networking | Peer identity, authenticated sessions, message framing, admission, rate limits, and peer management |
| Consensus | Proposal ordering, voting, locking, finality, evidence, and validator-set transitions |
| Execution | Deterministic transaction application, gas accounting, events, receipts, and atomic state changes |
| Economics | Supply accounting, issuance, fees, burns, staking, rewards, and treasury transfers |
| Governance | Proposals, voting-power snapshots, tally, execution delay, bounded parameter changes, and emergency controls |
| Node services | RPC, operator interfaces, monitoring, indexing, and process supervision |
| Optional modules | Smart contracts, bridges, external oracles, and advisory artificial-intelligence services |

Lower protocol layers must not depend on RPC handlers, local wall-clock decisions, uncontrolled external services, or application databases.

## 3. Threat model

### 3.1 Adversaries

The protocol assumes adversaries can:

- Control clients and submit malformed or adversarial transactions.
- Control network peers and delay, duplicate, reorder, or drop messages.
- Compromise some validator operators.
- Attempt equivocation, censorship, denial of service, long-range replay, and state divergence.
- Attempt key theft, key substitution, downgrade, and cross-network replay.
- Acquire or borrow stake to influence governance.
- Compromise bridge signers, oracle operators, or administrative accounts.
- Trigger process termination or storage failure during a state transition.
- Possess a cryptographically relevant quantum computer during the protected lifetime of signed data.

### 3.2 Consensus assumption

The consensus safety target assumes fewer than one-third of active voting power is Byzantine. Finality requires more than two-thirds of active voting power under the approved validator-set snapshot.

The liveness target assumes the network eventually becomes sufficiently synchronous and more than two-thirds of active voting power can communicate.

The exact timing model, timeout schedule, proposer-selection mechanism, and validator-set transition rules are open decisions.

### 3.3 Trust boundaries

The protocol trust boundary includes:

- Account identity and transaction authorization.
- Validator identity and consensus messages.
- Peer identity and key establishment.
- Genesis, upgrade, and emergency authorization.
- State, supply, and validator-set commitments.
- Wallet and signer encodings that create protocol-valid messages.

External applications, bridges, oracle services, indexers, web interfaces, and exchanges have separate trust assumptions. Their security properties must not be generalized to the base protocol.

## 4. Canonical runtime and protocol authority

### 4.1 One authoritative runtime

**Normative:** One executable composition defines authoritative protocol state. It uses one implementation for each consensus-critical function.

The canonical runtime must have:

- One transaction type and canonical encoding.
- One account and address format.
- One consensus state machine.
- One block format and block-hash definition.
- One execution state machine.
- One supply-accounting owner.
- One genesis schema.
- One protocol-version activation process.

Compatibility packages can expose protocol types or client functions. They must not define a second authoritative state transition.

### 4.2 Version domains

The protocol tracks separate versions for:

1. Public API behavior.
2. Wire messages.
3. Persisted state.
4. Consensus rules.
5. Cryptographic profiles.

A software package version does not replace a consensus-rule version.

## 5. Genesis and chain identity

### 5.1 Canonical genesis document

**Normative:** One canonical genesis document initializes the chain.

The document commits:

- Chain identifier.
- Protocol and state-format versions.
- Address prefix and encoding.
- Cryptographic profile identifiers.
- DGT supply and allocations.
- DRT initial state.
- Vesting and custody contracts.
- Initial validator identities and voting power.
- Consensus and staking parameters.
- Governance parameters.
- Treasury accounts and authorities.
- Enabled protocol modules.
- Initial state root.

Every validator must derive identical genesis bytes, genesis hash, and initial state root.

Missing files, parsing failures, unknown fields, duplicate allocations, invalid keys, and hash mismatches must stop initialization.

### 5.2 Genesis authorization

Genesis authorization uses a separate root-signature policy. The selected signature family is SLH-DSA under FIPS 205.

**Open decision:** The final SLH-DSA parameter set, signer quorum, custody procedure, revocation rule, and recovery procedure require approval.

### 5.3 Chain identity

The chain identifier and protocol version form part of every signed protocol domain. They must be included in:

- Transactions.
- Consensus proposals and votes.
- Evidence records.
- Governance proposals and votes.
- Upgrade authorizations.
- Bridge and oracle messages.
- Peer-authentication transcripts.

This domain separation prevents a valid message for one network or protocol version from becoming valid on another.

## 6. Cryptographic profile

### 6.1 Operational signatures

**Normative:** Operational protocol signatures use ML-DSA-65 under FIPS 204.

The operational profile covers:

- Transactions.
- Wallet authorization.
- Validator identity.
- Block proposals.
- Consensus votes.
- Peer authentication.

The algorithm identifier is part of the signed envelope. A verifier must reject unknown, disallowed, or ambiguous identifiers.

Historical Dilithium, ML-DSA-87, Falcon, SPHINCS+, or other key material must not be relabeled as ML-DSA-65. Historical decoding requires an explicit compatibility and migration rule.

### 6.2 Peer key establishment

**Normative:** Peer key establishment uses ML-KEM-768 under FIPS 203.

The session protocol must bind:

- Both peer identities.
- Both ephemeral contributions.
- Chain identifier.
- Protocol version.
- Negotiated algorithms.
- Session direction.
- Key-confirmation messages.

The record layer must use unique nonces, directional keys, bounded key use, authenticated framing, explicit rekeying, and secret disposal.

### 6.3 Root authorization

Genesis, protocol-upgrade, and emergency-root actions use a separate SLH-DSA authorization domain. A root signature cannot authorize an ordinary transaction or consensus vote.

### 6.4 Hashes and symmetric cryptography

The protocol can retain approved symmetric and hash primitives when their roles and quantum security margins are explicit.

Candidate primitives include:

- ChaCha20-Poly1305 for authenticated record encryption.
- HKDF-SHA-256 and HMAC-SHA-256 for key derivation and confirmation.
- SHA-256, SHA3-256, and BLAKE3-256 for defined hash and commitment roles.
- SHA-512 and SHAKE256 where required by standardized algorithms.
- An operating-system cryptographically secure random-number generator for key generation and fresh randomness.

Each use must define domain separation, output length, truncation, collision or preimage requirement, and migration behavior.

### 6.5 Account binding

A valid signature proves control of a key. It does not prove control of an arbitrary account string.

**Normative:** The verifier derives or resolves the authorized account from the verified public key. Every message sender must match that authority unless the message type defines an explicit multi-authority rule.

## 7. Accounts and transactions

### 7.1 Address format

An account address commits to:

- Address format version.
- Network prefix.
- Cryptographic scheme identifier when required.
- Hash or encoding of the authorized public key or account record.
- Checksum.

**Open decision:** The final human-readable prefix, binary payload, checksum, and rotation-address behavior require approval.

### 7.2 Transaction envelope

A signed transaction contains:

- Transaction-format version.
- Chain identifier.
- Account sequence.
- Expiry condition.
- Ordered messages.
- Fee limit and fee denomination.
- Gas limit.
- Signer public key or key reference.
- Signature algorithm identifier.
- Signature.

The signature covers all consensus-critical fields through one canonical encoding.

### 7.3 Validation order

Validators apply this order:

1. Decode with strict size and nesting limits.
2. Check format version, chain identifier, and expiry.
3. Check the cryptographic policy and key format.
4. Verify the signature.
5. Bind the public key to the account.
6. Verify authority for every message.
7. Check the account sequence.
8. Check denominations, amounts, and arithmetic bounds.
9. Check fee and gas limits.
10. Apply message-specific validation.
11. Execute atomically against ordered pre-state.

Mempool acceptance does not establish final validity. Validators revalidate every transaction during ordered execution.

### 7.4 Batch behavior

Messages in one transaction commit together or revert together. The fee and sequence behavior for a failed transaction must be deterministic and stated in the receipt.

## 8. Peer network

### 8.1 Authenticated sessions

Peers authenticate before their consensus messages affect state. Each session binds the peer identity, chain identifier, protocol version, key-establishment transcript, and selected algorithms.

### 8.2 Network controls

The node enforces:

- Maximum inbound and outbound connections.
- Per-peer message and byte budgets.
- Message-size and decompression limits.
- Handshake and idle timeouts.
- Replay and duplicate detection.
- Peer scoring and temporary isolation.
- Seed and discovery separation from consensus authority.
- Network and autonomous-system diversity targets.

### 8.3 Consensus messages

Each proposal, vote, evidence item, and validator-set update includes its height, round, type, signer, chain identifier, protocol version, and signature domain.

## 9. Consensus and finality

### 9.1 Consensus model

Dytallix uses stake-weighted Byzantine fault tolerant consensus.

At each height, validators progress through numbered rounds. A round has one authorized proposer and authenticated voting phases. A block becomes final only after the required voting-power quorum commits it.

The protocol must define:

- Proposer selection.
- Proposal validity.
- Prevote and precommit rules or equivalent voting phases.
- Validator locks and unlock conditions.
- Timeout progression.
- Quorum-certificate construction.
- Conflicting proposal behavior.
- Finality proof verification.
- Evidence creation and expiry.
- Validator-set changes.
- State synchronization and recovery.

### 9.2 Quorum

For total active voting power `S`, a finality quorum must have voting power greater than `2S/3`.

Two such quorums overlap by more than `S/3`. Safety requires honest validators in the overlap to follow the locking and non-equivocation rules.

### 9.3 Proposer selection

**Open decision:** Select one proposer mechanism and specify it completely.

Candidate mechanisms include deterministic weighted rotation or a verifiable-random-function construction. A VRF design is not part of the protocol until the paper defines:

- The exact VRF primitive and parameter set.
- Input and output encodings.
- Secret-key and public-key roles.
- Proof verification.
- Stake weighting.
- Bias and grinding resistance.
- Fallback and missed-proposal behavior.
- Deterministic test vectors.

Hashing random inputs is not a VRF implementation.

### 9.4 Fork handling

The protocol must define pre-finality conflict handling through its round, locking, and proposal-selection rules. Finalized blocks cannot be replaced by an ordinary fork-choice rule.

Recovery from conflicting finality requires an explicit safety procedure. A node must not select a conflicting finalized branch through local configuration.

### 9.5 Validator-set transitions

Validator-set changes activate at deterministic boundaries. The final block before activation commits the next validator-set hash. Evidence and slashing rules preserve responsibility for faults committed before exit.

## 10. Blocks, execution, and state

### 10.1 Block header

A block header commits:

- Protocol version.
- Chain identifier or its fixed domain.
- Height and round.
- Parent block hash.
- Transaction root.
- Post-state root.
- Receipt root.
- Event root.
- Validator-set hash.
- Evidence root.
- Timestamp under the approved consensus-time rule.
- Proposer identity.
- Proposal signature.
- Finality certificate reference or commitment.

The block hash uses one canonical binary encoding.

### 10.2 Deterministic execution

Execution cannot depend on local wall-clock time, floating-point arithmetic, external HTTP responses, process scheduling, or uncontrolled randomness.

Every arithmetic operation that affects consensus state must define overflow, underflow, rounding, and failure behavior.

### 10.3 Atomic commitment

A block executes in an isolated write batch. The node commits account state, module state, supply counters, validator state, receipts, events, block indexes, and the new state root atomically.

A process failure results in either the previous committed height or the complete new height. It must not expose a partial state transition.

### 10.4 Mempool

The mempool is not consensus state. It applies bounded admission rules for bytes, transaction count, signature cost, per-account transactions, future sequences, and peer contribution.

The proposer-ordering policy must be documented. Different mempool contents cannot change transaction validity.

## 11. Native assets and accounting

### 11.1 DGT

DGT is the fixed-supply staking and governance asset.

Approved properties:

- Total supply cap: `1,000,000,000 DGT`.
- Base unit: `udgt`.
- Decimal places: `6`.
- Base units per DGT: `1,000,000`.

Approved category allocation:

| Category | Share | DGT amount |
|---|---:|---:|
| Ecosystem growth | 30% | 300,000,000 |
| Team and advisors | 20% | 200,000,000 |
| Public sale | 15% | 150,000,000 |
| Private sale | 15% | 150,000,000 |
| Reserve | 20% | 200,000,000 |
| **Total** | **100%** | **1,000,000,000** |

**Open decisions:** Recipient identities, custody, vesting, lock enforcement, initial delegation, post-genesis mint policy, and burn authority require approval.

Category labels do not create enforceable locks. The state machine must implement every vesting and custody restriction.

### 11.2 DRT

DRT is the service-payment and reward asset.

Approved properties:

- Base unit: `udrt`.
- Decimal places: `6`.
- Base units per DRT: `1,000,000`.
- Reward-pool allocation: validators 40%, stakers 30%, treasury 30%.
- Emission-policy direction: bounded corrected adaptive controller.

**Open decisions:** Initial liquid supply, supply cap or issuance envelope, controller parameters, protocol timebase, validated observations, mint authority, burn rule, residual ownership, custody, and failure behavior require approval.

### 11.3 Accounting invariant

For each asset:

`ending supply = starting supply + recognized minting - recognized burning`

Transfers do not change supply.

Module-account conservation requires:

`sender debits = recipient credits + protocol custody changes + burns`

Pending rewards, accrued rewards, claimed rewards, undistributed amounts, and rounding residuals remain separate accounting categories.

### 11.4 Supply owner

One accounting component owns mint and burn transitions. An emission policy can propose issuance. It cannot mint directly or bypass supply limits and authorization.

## 12. DRT issuance, fees, and rewards

### 12.1 Adaptive issuance

The selected issuance direction is a corrected adaptive controller. The controller accepts:

- Prior controller state.
- Validated protocol observations.
- Protocol time measured in finalized blocks or epochs.
- Approved integer parameters.

It returns new controller state and a proposed issuance amount.

The controller must use deterministic fixed-point or integer arithmetic. Output clipping proves only an output bound. It does not prove stability.

Before the controller becomes normative, its specification must define:

- Plant model and delay assumptions.
- Initial state.
- Observation definitions.
- Parameter domain.
- Stable operating region.
- Soft and hard control regimes.
- Missing-data behavior.
- Maximum issuance and rate-of-change bounds.
- Exact reference vectors.
- Restart and migration behavior.

### 12.2 Reward allocation

Each issuance interval allocates the approved reward budget:

- 40% to validator rewards.
- 30% to staker rewards.
- 30% to treasury.

Each bucket uses integer floor division. The protocol records split remainders separately. It distributes interval budgets across the interval with a deterministic extra-unit rule.

### 12.3 Fees

**Open decision:** Approve one fee model.

The model must define:

- Fee asset.
- Compute and bandwidth pricing.
- Optional priority fee.
- Maximum liability at admission.
- Charge for successful and failed execution.
- Refund calculation.
- Proposer, treasury, and burn allocation.
- Integer rounding.
- Supply-counter updates.

Admission and execution must use the same versioned fee interface.

### 12.4 Burn

A burn is a consensus state transition. Recording a burn event is not sufficient. The transition must reduce the payer or fee-pool balance and the asset supply counter in the same atomic commitment.

## 13. Staking, validators, and slashing

### 13.1 Stake custody

Bonded DGT secures consensus. Delegation transfers DGT from liquid balance into protocol custody.

The stake lifecycle is:

`liquid -> pending bond -> bonded -> pending unbond -> liquid`

Stake changes, custody changes, validator records, and reward settlement occur atomically.

### 13.2 Validator identity

The protocol separates:

- Operator identity.
- Consensus-signing authority.
- Withdrawal authority.
- Governance authority.
- Validator self-bond.

Key rotation must preserve validator identity through a signed state transition.

### 13.3 Delegation

Each delegation identifies one delegator, one validator, one amount, and one reward cursor. Validator commission and commission-change limits require explicit parameters.

**Open decisions:** Minimum self-bond, minimum delegation, activation delay, unbonding period, redelegation limits, maximum validator count, and commission bounds require approval.

### 13.4 Rewards

A cumulative fixed-point reward index provides constant-time reward accounting.

The protocol settles a delegation before each stake change. A new delegator cannot claim past rewards. A departing delegator retains only earned rewards.

The accounting invariant is:

`reward input = claimed + accrued + undistributed + residual`

### 13.5 Slashing and jailing

Slashing requires objective signed evidence.

Eligible offenses include:

- Double proposal or double vote for conflicting values at the same height and round.
- A protocol-specific surround vote when the selected consensus protocol defines that offense.
- Sustained missed-signature behavior under the approved downtime rule.

Evidence has a validity window and unique identifier. It cannot execute twice. Penalties cannot exceed slashable stake.

Artificial-intelligence scores, service-quality scores, bridge reports, and subjective governance decisions cannot directly slash consensus stake.

**Open decisions:** Penalty rates, jail periods, tombstone rules, delegator exposure, correlated-fault policy, and appeal procedure require approval.

## 14. Governance and treasury

### 14.1 Voting power

Approved governance eligibility uses bonded stake only. Liquid DGT does not provide voting power.

Each proposal snapshots eligible voting power at a defined point. Vote weights and the quorum denominator use the same immutable snapshot.

The protocol must prevent stake movement, delegation cycling, or replay from creating duplicate voting power.

### 14.2 Proposal lifecycle

A proposal moves through explicit states:

`deposit -> voting -> passed or rejected -> execution delay -> executed, canceled, or expired`

Every proposal includes:

- Authenticated proposer.
- Proposal type and version.
- Exact typed actions.
- Action hash.
- Deposit.
- Voting-power snapshot identifier.
- Voting and execution deadlines.

### 14.3 Proposal classes

| Class | Examples | Control rationale |
|---|---|---|
| Routine | Resource bounds inside approved ranges | Limited protocol effect |
| Economic | Issuance allocations, fee rules, reward parameters, treasury spending | Direct supply and incentive effect |
| Security | Cryptographic profile, consensus version, slashing rules, bridge activation | Changes protocol trust assumptions |
| Constitutional | Supply cap, governance formula, root authority | Changes foundational constraints |

Each governable parameter needs a type, minimum, maximum, maximum rate of change, approval threshold, and execution delay.

### 14.4 Governance limits

Governance must not:

- Rewrite finalized history.
- Execute an untyped arbitrary state mutation.
- Bypass supply accounting.
- Bypass transaction or consensus signature policy.
- Change consensus rules through a local setting.
- Permit an AI service to override a vote.

### 14.5 Treasury

Treasury balances use protocol module accounts with purpose restrictions. Every spend records the proposal, recipient, asset, amount, purpose, and execution height.

Large transfers should use staged release or milestone controls.

**Open decisions:** Governance quorum, approval and veto thresholds, deposits, periods, timelocks, delegation ownership, treasury limits, cancellation, and emergency authority require approval.

## 15. Smart contracts

Smart contracts are an optional protocol module.

If activated, contract execution must provide:

- Deterministic WebAssembly execution.
- Versioned gas metering.
- Memory and call-depth limits.
- Host-function allowlist.
- Deterministic storage access.
- Event and receipt commitments.
- Reentrancy and capability rules.
- Upgrade and migration rules.

Solidity or Ethereum Virtual Machine compatibility is not a base-protocol property. It requires a separate compatibility specification and activation decision.

Contracts cannot call external artificial-intelligence or web services during consensus execution. External data enters through an approved oracle message.

## 16. Oracles and artificial intelligence

### 16.1 Oracle boundary

Oracles are optional modules. An oracle message must define:

- Source identity.
- Signed observation.
- Observation time and expiry.
- Data schema and version.
- Aggregation rule.
- Quorum.
- Dispute rule.
- Missing-data and stale-data behavior.

### 16.2 Artificial-intelligence boundary

Artificial-intelligence systems can provide advisory risk scores, monitoring, summaries, and application-level analysis.

They must not determine:

- Base transaction validity.
- Consensus proposals or votes.
- Finality.
- Validator slashing.
- Token minting or burning.
- Governance vote validity or weight.
- Root authorization.

An application can use an AI result only through a defined authenticated interface and stated failure behavior.

## 17. Bridges and interoperability

Bridges are optional modules with security assumptions separate from base consensus.

A bridge specification must define:

- Source and destination chain identifiers.
- Proof or signer model.
- Signer-set and quorum transitions.
- Message sequence and replay protection.
- Asset custody and supply accounting.
- Value caps and rate limits.
- Pause and recovery authority.
- Destination finality assumptions.
- Cryptographic limitations of the destination chain.

A post-quantum signature on one bridge message does not make the destination chain or its custody system post-quantum secure.

Inter-Blockchain Communication support, wrapped assets, and chain-specific bridges require separate specifications. They are not implicit base-protocol capabilities.

## 18. Protocol upgrades

### 18.1 Versioned activation

Each upgrade record includes:

- New consensus-rule version.
- Source and binary digests.
- Activation height.
- State migration.
- Compatibility interval.
- Unknown-version behavior.
- Rollback boundary.
- Required validator readiness.

### 18.2 Deterministic migration

State migrations must be deterministic and idempotent. Validators dry-run the migration against an agreed state snapshot and compare resulting state roots.

Rollback cannot cross finalized state without a separate recovery protocol.

### 18.3 Cryptographic migration

A cryptographic transition defines:

- Old and new algorithms and parameter sets.
- Key, signature, and message encodings.
- Allowed roles.
- Activation and retirement points.
- Historical verification policy.
- Key replacement and identity continuity.

The protocol must not relabel existing key bytes under a new algorithm name.

## 19. Interfaces and key custody

### 19.1 Interface separation

The node separates:

- Public query interfaces.
- Signed transaction submission.
- Validator control.
- Operator administration.

Public interfaces cannot directly change balances, stake, governance, issuance pools, bridge state, or block production.

Administrative interfaces require mutual authentication, authorization, audit records, and network isolation.

### 19.2 Validator signer

Consensus private keys reside in a sealed signer or hardware-backed service. The node requests signatures through an authenticated local or private interface.

Private keys must not appear in logs, repositories, process arguments, unencrypted files, or ordinary backups.

Provisioning, rotation, revocation, backup recovery, and signer outage procedures require two-person control where root or validator authority warrants it.

## 20. Observability and incident response

Nodes monitor:

- Finalized height and finality delay.
- Consensus round progression.
- Local and peer state roots.
- Peer count and diversity.
- Validator participation and concentration.
- Signer health.
- DGT and DRT supply totals.
- Bonded stake, rewards, fees, burns, and treasury balances.
- Governance proposals and pending executions.
- Storage errors and recovery state.
- RPC abuse and resource saturation.

Monitoring observes protocol state. It does not define protocol truth.

Each alert maps to a tested response procedure.

## 21. State synchronization, backup, and recovery

Snapshots anchor to finalized block hashes and state roots. A node verifies:

- Chain identifier.
- Protocol version.
- Height.
- Finalized block hash.
- State root.
- Validator-set commitment.
- Finality certificate.

Snapshot producers cannot redefine consensus state.

Nodes must be able to reconstruct state from genesis and finalized blocks. Recovery tests compare state roots, validator state, and supply invariants.

Backups must not contain plaintext private keys.

## 22. Protocol invariants

The protocol must preserve these invariants:

1. One canonical runtime defines authoritative state.
2. Every state transition has authenticated authority.
3. All validators compute the same output from the same ordered input.
4. Finalized blocks have a verifiable quorum certificate.
5. A finalized block commits all consensus-critical roots and versions.
6. Account identity is bound to the verified signing key.
7. Cross-network and cross-version replay fails.
8. A block commits fully or does not commit.
9. DGT supply does not exceed its approved cap.
10. DRT minting and burning pass through one accounting owner.
11. Every reward input reconciles to claimed, accrued, undistributed, or residual value.
12. Bonded stake is held in protocol custody.
13. Governance voting power uses one immutable snapshot per proposal.
14. Governance executes only typed, bounded, delayed actions.
15. Optional services cannot redefine base validity or finality.
16. Protocol changes activate only through a versioned state transition.

## 23. Open decision register

The following decisions require exact values or mechanisms before their rules can become normative:

| ID | Decision |
|---|---|
| OD-01 | Canonical consensus implementation and complete protocol mapping |
| OD-02 | Proposer-selection mechanism and any VRF construction |
| OD-03 | Consensus timing model and timeout schedule |
| OD-04 | Active validator count and validator-set transition interval |
| OD-05 | Address prefix, binary encoding, checksum, and key-rotation behavior |
| OD-06 | Final SLH-DSA root parameter set, custody, and quorum |
| OD-07 | Genesis recipients, custody, vesting, and initial delegation |
| OD-08 | DRT initial liquid supply, supply envelope, and bootstrap rule |
| OD-09 | Adaptive-controller model, parameter domain, observations, and timebase |
| OD-10 | Fee asset, compute and bandwidth prices, tip, refund, and burn rules |
| OD-11 | Staking minimums, delays, unbonding, redelegation, and commission bounds |
| OD-12 | Slashing rates, evidence window, jail periods, and correlated-fault rule |
| OD-13 | Governance thresholds, deposits, periods, timelocks, and emergency authority |
| OD-14 | Treasury custody, spend limits, and residual ownership |
| OD-15 | Smart-contract activation and compatibility scope |
| OD-16 | Bridge and oracle activation specifications |
| OD-17 | Resource limits for blocks, transactions, mempool, and RPC |
| OD-18 | Snapshot cadence, retention, and recovery objectives |

An approved decision record must include the selected option, rationale, units, bounds, protocol owner, independent reviewer, activation rule, migration rule, and verification vectors.

## 24. Verification requirements

Protocol verification includes:

- Canonical encoding and known-answer vectors.
- Cross-network and cross-version replay tests.
- Multi-message authorization tests.
- Consensus safety and liveness fault tests.
- Network partition, delay, duplicate, and Byzantine-peer tests.
- Atomic-commit crash injection.
- Supply and custody property tests.
- Randomized staking and reward reconciliation.
- Governance capture and voting-power manipulation simulations.
- Upgrade, restart, and migration rehearsals.
- Malicious snapshot and state-sync tests.
- Cryptographic backend, parameter, side-channel, and cross-implementation review.
- Independent protocol, economic, and implementation review.

A bounded simulation supports a stated input range. It does not prove behavior for all possible inputs.

## References

1. National Institute of Standards and Technology, [FIPS 203: Module-Lattice-Based Key-Encapsulation Mechanism Standard](https://csrc.nist.gov/pubs/fips/203/final).
2. National Institute of Standards and Technology, [FIPS 204: Module-Lattice-Based Digital Signature Standard](https://csrc.nist.gov/pubs/fips/204/final).
3. National Institute of Standards and Technology, [FIPS 205: Stateless Hash-Based Digital Signature Standard](https://csrc.nist.gov/pubs/fips/205/final).
4. Ethan Buchman, Jae Kwon, and Zarko Milosevic, [The Latest Gossip on BFT Consensus](https://arxiv.org/abs/1807.04938).
5. WebAssembly Community Group, [WebAssembly Core Specification](https://www.w3.org/TR/wasm-core-2/).
