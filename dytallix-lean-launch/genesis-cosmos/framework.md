# Dytallix Cosmos SDK Testnet Framework

This document records the Cosmos SDK and CometBFT versions, the binary used, and exact steps to build and run the single-node testnet for the Dual Tokenomics chain (DGT + DRT).

Binary name
- Preferred: dytallixd (custom Cosmos SDK app)
- Fallback: simd (Cosmos SDK simapp)

Version snapshot
- Filled by scripts/build.sh at runtime. It will query `$BINARY version --long`.
- CometBFT version will be read from `$BINARY version --long` output when available.

Build instructions
- If `$BINARY` is already on PATH, scripts use it as-is.
- If not found, scripts/build.sh will attempt to install `simd`:
  - Prereqs: Go 1.22+
  - Install: `go install cosmossdk.io/simapp/simd@latest`
  - Ensure `$GOPATH/bin` is on PATH.

Runbook summary
1) scripts/build.sh         # detect/install binary and record versions here
2) scripts/init_chain.sh    # create keys, init chain-id, add genesis accts
3) scripts/configure.sh     # set ports (26656/26657/1317), APIs, gas prices, CORS
4) scripts/seed_state.sh    # apply denoms metadata, staking/gov params, vesting
5) scripts/enable_emissions.sh # optional periodic DRT emissions job (no code change)
6) scripts/start.sh         # start the node and print endpoints
7) scripts/reset.sh         # DEV ONLY: unsafe reset and re-init

Notes on emissions and burns
- MVP uses a periodic job (enable_emissions.sh) that transfers uDRT from an `emissions_reserve` key to distribution pools (dist_pool, ai_incentives, bridge_ops). This avoids custom module code and works on any SDK app.
- True per-block minting and fee burn hooks require application code changes (x/emissions and fee collector override). These are out of scope for the shell-only MVP, but all schedules/parameters are exposed in params.json for the future module.

Idempotency
- All scripts are safe to re-run. They will detect existing keys and state, and will update or skip steps accordingly.

Artifacts
- outputs/genesis.json     # final validated genesis
- outputs/addresses.json   # resolved addresses for created keys
- outputs/node_info.txt    # node-id and endpoints
