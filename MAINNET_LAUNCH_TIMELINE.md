# Dytallix mainnet launch plan

Task-driven, not date-driven: each step starts when the steps it depends on are done. This is the founder's working plan, not a repository record.

Repository: `DytallixHQ/dytallix`. Paths below are in that repository.

---

## Where we are

- **Engineering:** E01–E05 complete. The E06 reproducible release is built; the freeze is a milestone, not code.
- **Records:** brought up to date (#46, #47). The Hashlock audit, the simulation order and the seven capacity values are approved (#48). The simulation plan, the statistical campaign and the hosting decisions are in #49.
- **Values:** every E05 value is approved (199, none open).
- **Progress:**
  - Engineering about 96%. The simulation tools are the main engineering left.
  - Overall about 81%.

---

## Order at a glance

| Phase | What | Who | Starts when |
|---|---|---|---|
| **A** | Finish engineering | Claude, with founder decisions | Now |
| **B** | Lead-time work: holders, Hashlock, providers, hardware | Founder | Now; runs alongside A. **Critical path** |
| **C** | Key ceremony | Founder and the four holders | The holders are confirmed (B1) and the hardware is bought (B7) |
| **D** | Rent the hosts; staging runs | Founder runs; Claude fixes | Providers are chosen (B3–B5), and the simulation tools are proven in CI (A3) |
| **E** | Freeze the candidate; hand it to Hashlock | Both | A and D are done, and Hashlock is booked (B2) |
| **F** | Audit and fixes | Hashlock and Claude | The freeze (E) |
| **G** | Seven simulation runs on the final candidate | Founder runs; Claude fixes | The audit fixes are done (F3) |
| **H** | Final inputs, genesis signing, launch | Founder and three holders | G passes and the ceremony (C) is done |

**What sets the pace:**
- how quickly the four holders are confirmed;
- Hashlock's availability and audit length;
- what the audit and the simulations find.

---

## Decisions

| # | Decision | Needed before | Status |
|---|---|---|---|
| 1 | **Hashlock audit**, with the public review kept alongside; scope: the node application, the PQC CometBFT fork, the root-signing tools and the CLI wallet; "unaudited" dropped when the report is published | Contacting Hashlock | **Approved** (`launch/approvals/P01_E06_AUDIT_2026-10-10.json`, #48) |
| 2 | **Simulations after the audit fixes,** on the final candidate | Phase G | **Approved** (same record, #48) |
| 3 | **Simulation pass thresholds (D14-Q02),** the timings, host access, load source, the statistical campaign and the calendar (task-driven) | The simulation plan (A2) | **Approved** (`launch/approvals/P01_T06_SIMULATION_PLAN_2026-10-11.json`, #49) |
| 3b | **Hosting:** all on Hetzner Cloud (validator and sentry in different countries), 8 GB+ per seat, dedicated vCPU for the validator, the endpoint on its own server | Phase D | **Approved** (`launch/approvals/P01_E05_HOSTING_2026-10-11.json`, #49) |
| 4 | **Seven capacity values** | Phase D | **Approved** (`launch/approvals/P01_E05_CAPACITY_VALUES_2026-10-10.json`, #48) |
| 5 | **Bug bounty tiers and amounts,** paid in DGT from Ecosystem growth after genesis | The freeze (E) | **Open** |
| 6 | **The records:** all addresses, the validator self-bond, the DRT bootstrap rows, the treasury record | The final input freeze (H1) | **Open** |

---

## Phase A — Finish engineering

- [x] **A1.** Bring the specifications and token models up to date (#47).
- [x] **A2. Simulation plan** (#49).
  - A procedure and pass criteria for each of the seven runs, written for one validator.
  - The scenario list (`node/docs/mainnet/launch-rehearsals.md`) updated.
  - The tools still missing.
  - *Needs:* decision 3 and its three related choices.
- [ ] **A3. Simulation tools,** each proven in the CI staging network first *(Claude)*:
  - a rehearsal genesis whose accounts have real keys, so wallets can fund, send, stake and vote;
  - a way to drive the console-only hosts (decision 3);
  - a load generator and wallet fleet;
  - an adversarial transaction and request generator;
  - network and host fault injection;
  - a supply and state reconciliation report;
  - a checkpoint recorder for the dress rehearsal (T−6h to T+24h);
  - the upgrade drill: a real old-to-new release pair (RC1 to RC2);
  - the validator recovery drill.
- [ ] **A4. Gate text reconciliation.** Each gate's completed work, remaining work and blocker rewritten against current code, and the founder's name replaced in three gate entries. *(Claude)*
- [x] **A5. The seven capacity values,** approved and wired into the host configuration (#48).
- [ ] **A6. Audit and review package** *(Claude)*:
  - a review guide that doubles as Hashlock's scope document;
  - the threat model and trust model;
  - issue templates and the security contact.
- [ ] **A7. AI review of the current code,** labeled as AI. Every finding fixed or answered before the freeze. *(Claude)*
- [x] **A8. Record the decisions** (Hashlock and the simulation order) (#48).

## Phase B — Lead-time work (founder; starts now)

- [ ] **B1. Recruit the four other key holders.** The ceremony and the genesis both wait on this. Their names never go into the repository; records say "kit holder 1" to "kit holder 5".
- [ ] **B2. Hashlock:**
  - send them the scope (A6) and the repository, and say the freeze follows the staging runs;
  - get a quote, a start and their fix re-check process;
  - arrange funding.
- [x] **B3. Hosting decided** (all Hetzner Cloud). The seats, provisioned when Phase D starts:

  **Two seats, no new server** (your choice, for cost): the validator private on Falkenstein, and one public node on Helsinki that is both the sentry (archive, backups, block relay) and the endpoint (client channel, status page). Start on the current 4 GB servers with the node's memory limit at 3 GiB; resize only what the staging capacity runs prove too small.

  | Server | Seat | Before staging |
  |---|---|---|
  | Falkenstein (CX23, 4 GB) | **Validator** (private) | Save anything wanted (`/opt/quantumlink`, `/root`; QuantumLink is dormant, the Telegram bot not needed), then rebuild clean from Ubuntu 24.04 |
  | Helsinki (CX23, 4 GB) | **Public node** (sentry and endpoint) | Move its active services (exocognosis service, Caddy, bots) to Ashburn or retire them, then rebuild clean; add a small volume for the archive when the archive needs it |
  | Ashburn (CPX21) | **Web server, not a seat** | Unchanged: the sites, the testnet until it retires, the testnet history export, and Helsinki's services if they move here |

  Recording and engineering (one PR after #50 and #51 merge): the decision record; the supervisor letting a sentry also serve the client channel and status page; its firewall and AppArmor profile; monitoring; the CI staging network on the two-seat shape; the docs.

  Each seat: Ubuntu 24.04 (x86_64), its public IPv4 on its own interface, nothing but Dytallix. Inventory taken: Falkenstein runs dormant QuantumLink services; Helsinki runs active services that must move or retire first.
- [x] **B3a. Testnet history export:** running on Ashburn as the `testnet-history` service (first pass about 21 hours, then it follows new blocks); see `testnet-history/README.md`. At retirement: final verify and summary, encrypted archive, remove the service.
- [ ] **B4. Backup storage:** an S3-compatible bucket at a second provider, with a write-only key.
- [ ] **B5. Monitoring services:** a free alerting service and a free uptime checker; create the accounts (artifact A22).
- [ ] **B6. Backup on-call:** name one person, a root key holder, kept outside the repository.
- [ ] **B7. Hardware for the five holder packs** (Phase C):
  - 5 **kit fobs** (USB sticks the holder encrypts), labeled kit 1 to kit 5;
  - 5 **throwaway fobs** for the rehearsal;
  - 5 **wallet fobs**, separate from the kit fobs;
  - 5 **public sticks** (FAT32 or exFAT) to carry only public records back to you;
  - 5 **live USBs** (Debian 12, checked against Debian's published SHA512SUMS) and 5 **tools USBs**; one of each is enough if you host every session on one machine;
  - an x86_64 **offline laptop** that boots from USB, if a holder has none of their own; its disk is never used.
- [ ] **B8. Paper** for the seal codes, backup code and history code, each written twice (Phase D).

## Phase C — Key ceremony

*Starts when:* the holders are confirmed (B1) and the hardware is bought (B7). Procedure: `launch/custody/KEY_CEREMONY.md`.

**The rule** (root key holders approval, confirmed): you supply the fobs, the holders make the kits. Each holder makes their own kit on their own fob in their own offline session, and keeps it. No one, you included, ever sees another holder's kit secret or passphrase. You may host a session and lend the laptop, but the holder works alone at the screen.

- [ ] **C1. Build the tools.** Build `dytallix-root-sign` (and the `dytallix` CLI for the wallets) reproducibly with `release/reproduce.sh`, check them against CI's checksums, and copy them with `SHA256SUMS` onto the tools USBs.
- [ ] **C2. Prepare a pack for each holder:**
  - their labeled **kit fob** (kit N) and a **throwaway fob**;
  - a **wallet fob** and a **public stick**;
  - a **live USB** and a **tools USB**, unless you host the session;
  - a printed copy of `KEY_CEREMONY.md`;
  - their **kit number** (1 to 5), their **controller ID** (`kit-holder-N`, which names the kit and never the person), and a **session ID** (for example `ceremony-kit-3`).
- [ ] **C3. Hand each holder their pack,** and arrange their session.
- [ ] **C4. Rehearsal.** Each holder runs the whole session once on the throwaway fob, with session ID `rehearsal`, then wipes it. This also confirms the live USB has `cryptsetup`, `mkfs.ext4` and a text editor.
- [ ] **C5. Each holder's real session,** offline, network unplugged:
  - encrypt the kit fob with their own passphrase (LUKS2);
  - make the kit on it: the genesis, upgrade, freeze and resume keys, plus the proofs of possession;
  - check the fob against the public keys, close it, and shut down;
  - store the kit fob in a place of their own, never with their wallet fob or another holder's kit.
- [ ] **C6. Each holder's wallet fob,** on their own online machine: `dytallix wallet create --name kit-holder-N`, then copy the *encrypted* keystore to the wallet fob. Never use `wallet export`, which writes the key in plaintext.
- [ ] **C7. What comes back to you:** each holder returns the **public stick** (public key records and proofs only) and sends their **wallet address**. Nothing secret ever leaves a holder.
- [ ] **C8. Assemble and check.** You build the genesis signer policy and the emergency, upgrade and genesis custody packets from the five public sticks. `node/tools/mainnet-preparation/five_holder_custody.py` checks all three together.
- [ ] **C9. Records.** Holder records stay in your custody records, outside the repository. The public keys and proofs are public; names never are.

After launch, each holder checks their fob yearly on the offline machine (step 4.4 of the ceremony). A lost fob or a forgotten passphrase loses that kit; three of the remaining four replace it with a kit replacement control.

## Phase D — Hosts and staging

*Starts when:* providers are chosen (B3–B5) and the simulation tools are proven in CI (A3).

- [ ] **D1.** Rent the three hosts and the storage bucket.
- [ ] **D2.** Founder's offline node-key session:
  - every host's node keys, sealed into its bundle;
  - the seal codes, the chain's backup code and the history code, on paper, two copies each, kept in two separate places.
- [ ] **D3.** Install each host from its sealed bundle; install the monitor settings; check that live alerts arrive and clear (M6).
- [ ] **D4.** Staging runs on the production hosts with throwaway rehearsal identities:
  - [ ] E03 / T02 negative-peer runs (each run approved separately);
  - [ ] the test suites (consensus, wallet, supply, staking, rewards, fees, governance, recovery);
  - [ ] T05 capacity measurements, which confirm the capacity values;
  - [ ] freeze, resume and kit-replacement drills signed with the real kits (needs C).
- [ ] **D5.** Claude fixes whatever staging finds.

## Phase E — Freeze and hand over

*Starts when:* A and D are done, and Hashlock is booked (B2).

- [ ] **E1. E06 freeze:** tag the release candidate. CI builds it twice on separate runners, the founder's machine builds it a third time (`release/reproduce.sh`), and all must match byte for byte.
- [ ] **E2.** Publish the checksums, the review guide and the bug bounty terms (needs decision 5).
- [ ] **E3. Hand over to Hashlock:**
  - the frozen commit and release checksums;
  - the specification (`launch/MAINNET_V1_SPEC.md`);
  - the threat model, the trust model (`launch/TRUST_MODEL.md`) and the scope.
- [ ] **E4.** The 30-day public review starts at the freeze.

## Phase F — Audit and fixes

*Starts when:* the freeze (E).

- [ ] **F1.** Claude fixes each finding in a new candidate, with a documented diff and regression tests.
- [ ] **F2.** Hashlock re-checks the fixes. Public review findings are fixed or answered on the record.
- [ ] **F3.** The final candidate, frozen. Publish Hashlock's report.

## Phase G — Seven simulation runs

*Starts when:* the audit fixes are done (F3).

Definitions: `launch/MAINNET_EXECUTION_PLAN.md`, "Seven simulation runs". Each run lasts 24 hours on the three production hosts, rebuilt clean for each run, one run after another.

- [ ] **G1.** Fix the RC1-to-RC2 upgrade pair before run 1.
- [ ] **G2.** Run 1: clean genesis and complete economic startup.
- [ ] **G3.** Run 2: infrastructure loss and restoration.
- [ ] **G4.** Run 3: network resilience.
- [ ] **G5.** Run 4: production upgrade.
- [ ] **G6.** Run 5: operator error.
- [ ] **G7.** Run 6: sustained economic activity.
- [ ] **G8.** Run 7: final dress rehearsal, with checkpoints at T−6h, T−1h, T0, T+15m, T+1h, T+6h and T+24h.
- [ ] **G9.** A launch-blocking failure means fix, new candidate, and rerun the affected runs. All seven must pass on the final candidate.
- [ ] **G10.** Wipe the hosts.

## Phase H — Genesis and launch

*Starts when:* G passes and the ceremony (C) is done.

- [ ] **H1. Final input freeze:**
  - [ ] bucket, treasury, holder and validator account addresses (D08-Q01);
  - [ ] the validator self-bond, from Ecosystem growth (D09-Q02);
  - [ ] the DRT bootstrap rows, out of the 1,000,000 DRT (D08-Q03);
  - [ ] the treasury record (D02-Q02);
  - [ ] the genesis time, chosen now: by the approved rule, a weekday at 14:00:00 UTC, at least 72 hours after the final build, so every step below fits before it.
- [ ] **H2.** Build the genesis (`node/docs/mainnet/e05-genesis-builder.md`) and write the release manifest (`release/release_manifest.py`). Set the manifest's SHA-512 in the genesis inputs and rebuild. Reproduce byte for byte in CI and locally.
- [ ] **H3.** Three of the five holders each sign the genesis bundle offline with their genesis keys (`node/docs/mainnet/root-genesis-signing.md`).
- [ ] **H4.** Install the production bundles on the three hosts.
- [ ] **H5.** Go/no-go at T−6h. If the signatures or the go/no-go aren't complete, set a new genesis time and rebuild.
- [ ] **H6.** T0: the chain starts. Checks at T+15m, T+1h, T+6h and T+24h.
- [ ] **H7.** Publish the genesis files and digests, the release and its checksums, the pin plan, the trust model and the audit report.

---

## What we need, by phase

| Phase | Inputs | Hardware and accounts | Decisions |
|---|---|---|---|
| A | — | — | 3 |
| B | — | Hashlock engagement and funding; hosting accounts at two providers; object storage; alerting and uptime accounts | — |
| C | Four confirmed holders; the reproducible ceremony tool and CLI | Five holder packs: kit fob, throwaway fob, wallet fob, public stick, live USB, tools USB, printed procedure; a lendable offline laptop | — |
| D | The proven simulation tools; rented hosts | Paper for the codes | — |
| E–F | The frozen candidate; the audit package | — | 5 |
| G | The final candidate; the upgrade pair | The three hosts; load machines if chosen | — |
| H | Every record; three holders available to sign | — | 6 |

## Critical path

**Holders → ceremony** (the genesis needs the holders' keys), and **Hashlock booking → audit → fixes → simulations → genesis**. Phase A's engineering, the hosting accounts and the staging runs fit alongside, so the pace is set mainly by how fast the four holders are confirmed and when Hashlock can start.
