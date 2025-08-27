Determinism Burn Test
======================

Artifacts produced by the automated determinism burn test:

- burn_test.log : Human-readable summary + PASS/FAIL lines
- final_state_roots.json : Mapping of node -> final state_root at block N
- gas_samples.json : Array of sampled blocks with gas_used and per-tx gas sum

The burn test performs:
1. Spins 3-node devnet via docker-compose.devnet.yml (derived from scripts/devnet/docker-compose.yml).
2. Submits scripted tx sequence (5 transfers, 2 deploys, 8 calls, 3 stake ops, 1 undelegate) repeatedly across first 10 blocks then idles until block 50.
3. Collects:
   - Final state_root from each node
   - Per-block gas_used monotonicity assertions (sample 3 random blocks > height 5)
   - Nonce progression for two accounts
4. Negative cases:
   - Wrong nonce tx rejected by mempool
   - Forged block (bad proposer signature) rejected on submission

Implementation scripts live alongside this README.
