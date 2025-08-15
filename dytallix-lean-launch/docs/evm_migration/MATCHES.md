# EVM/Hardhat Audit Matches

This document lists all discovered EVM/Hardhat-related artifacts, their classification, and actions taken during the Cosmos SDK migration.

Legend:
- KEEP: kept for historical reference or pending migration
- MIGRATE: functionality re-implemented against Cosmos SDK
- REMOVE: deleted/ignored as not applicable

| Path / Pattern | Type | Classification | Action |
|---|---|---|---|
| hardhat.config.js | config | REMOVE | Remove from repo; no longer used |
| tokenomics/scripts/deploy-local.js | script | REMOVE | Remove; EVM deploy script |
| artifacts/ | build output | REMOVE | Purge artifacts folder |
| cache/solidity-files-cache.json | build cache | REMOVE | Purge cache folder |
| deployments/ | deploy records | REMOVE | Purge deployments folder |
| package.json hardhat scripts (test) | script | MIGRATE | Switched test to vitest |
| package.json deps: hardhat, @nomicfoundation/* | dep | REMOVE | Removed from devDependencies |
| package.json deps: ethers | dep | MIGRATE | Server faucet now uses CosmJS instead of ethers |
| server/index.js ethers checksum | code | MIGRATE | Replaced with bech32 prefix validation |
| server/transfer.js (ethers) | code | MIGRATE | Rewrote using CosmJS sendTokens |
| src/components/FaucetForm.jsx (window.ethereum) | code | MIGRATE | Autofill from local PQC wallet; bech32 validation |
| .env hardhat references | config | REMOVE | Prefer VITE_* Cosmos vars |
| vitest.config.js exclude hardhat.config.* | config | KEEP | Exclude pattern left harmless |
| README.md EVM mentions | docs | MIGRATE | Update to Cosmos-only instructions (pending) |

Notes:
- Cosmos endpoints from .env.staging are used via VITE_LCD_HTTP_URL / VITE_RPC_HTTP_URL.
- Faucet server expects FAUCET_MNEMONIC and RPC_HTTP_URL, and denominates DGT/DRT as uDGT/uDRT (6 decimals).
- UI remains centered and responsive; faucet form uses bech32 addresses and keeps cooldown UX.
