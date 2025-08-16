# Hardhat/EVM Audit Report for dytallix-lean-launch

## Executive Summary
**Status**: ✅ **CLEAN** - No Hardhat/EVM remnants found in `dytallix-lean-launch`.

The directory appears to be free of Hardhat/EVM scaffolding. This suggests either:
1. The project was created clean from the start, or
2. Previous cleanup efforts were already completed

## Search Methodology & Targets
A repository-wide search (filenames, dependency manifests, source text, env samples) was performed for typical EVM / Hardhat indicators:
- Config & build: `hardhat.config.*`, `foundry.toml`, `anvil` references, `artifacts/`, `cache/`, `deployments/`
- Solidity sources: `contracts/`, `.sol` files, `.solhint*`
- Scripts: `scripts/deploy*.(js|ts)`, `npx hardhat`, `hardhat node`
- Packages: `hardhat`, `ethers`, `viem`, `solc`, `@nomicfoundation/*`, `@nomiclabs/*`, `openzeppelin/*`
- Runtime code: `window.ethereum`, `ethereum.request`, `eth_requestAccounts`, `localhost:8545`
- Environment keys: `HARDHAT_*`, `ANVIL_*`, `LOCAL_RPC`

## Detailed Findings
| Category | Item | Status | Action | Reason |
|----------|------|--------|--------|---------|
| **Files/Folders** || `hardhat.config.*` | ❌ Not Found | N/A | No Hardhat config files present |
| | `contracts/` | ❌ Not Found | N/A | No contracts directory |
| | `scripts/deploy*.*` | ❌ Not Found | N/A | No deployment scripts |
| | `artifacts/` | ✅ Present (this report only) | None | Directory exists only for audit docs, not Hardhat outputs |
| | `cache/` | ❌ Not Found | N/A | No cache directory |
| | `deployments/` | ❌ Not Found | N/A | No deployments directory |
| | `.solhint*` | ❌ Not Found | N/A | No Solidity linting config |
| **Packages** || `hardhat` | ❌ Not Found | N/A | Not in package.json dependencies |
| | `@nomicfoundation/*` | ❌ Not Found | N/A | Not in package.json dependencies |
| | `@nomiclabs/*` | ❌ Not Found | N/A | Not in package.json dependencies |
| | `solc` | ❌ Not Found | N/A | Not in package.json dependencies |
| | `openzeppelin/*` | ❌ Not Found | N/A | Not in package.json dependencies |
| | `ethers` | ❌ Not Found | N/A | Not in package.json dependencies |
| | `viem` | ❌ Not Found | N/A | Not in package.json dependencies |
| **Scripts** || Hardhat scripts | ❌ Not Found | N/A | No Hardhat-related npm scripts |
| | `node:evm` | ❌ Not Found | N/A | No EVM node scripts |
| | `deploy:evm` | ❌ Not Found | N/A | No EVM deployment scripts |
| | `test:evm` | ❌ Not Found | N/A | No EVM test scripts |
| **Code References** || `npx hardhat` | ❌ Not Found | N/A | No Hardhat CLI usage |
| | `hardhat node` | ❌ Not Found | N/A | No Hardhat node references |
| | `localhost:8545` | ❌ Not Found | N/A | No Hardhat node URL references |
| | `window.ethereum` | ❌ Not Found | N/A | No MetaMask/Web3 references |
| | `ethereum.request({ method: 'eth_*' })` | ❌ Not Found | N/A | No Web3 method calls |
| | `ethers` | ❌ Not Found | N/A | No ethers.js usage |
| | `viem` | ❌ Not Found | N/A | No viem usage |
| **Environment Keys** || `HARDHAT_*` | ❌ Not Found | N/A | No Hardhat environment variables |
| | `LOCAL_RPC` | ❌ Not Found | N/A | No local RPC configuration |
| | `ANVIL_*` | ❌ Not Found | N/A | No Anvil environment variables |

## Current Dependencies
The project uses a clean React/Vite stack:

### Production Dependencies
- `react@^18.2.0`
- `react-dom@^18.2.0` 
- `react-router-dom@^6.8.0`

### Development Dependencies
- `@types/react@^18.2.37`
- `@types/react-dom@^18.2.15`
- `@vitejs/plugin-react@^4.1.0`
- `eslint@^8.53.0`
- `eslint-plugin-react@^7.33.2`
- `eslint-plugin-react-hooks@^4.6.0`
- `eslint-plugin-react-refresh@^0.4.4`
- `vite@^4.5.0`

## Build System
- ✅ Uses **Vite** (not Hardhat)
- ✅ Build successful with `npm run build`
- ✅ No EVM-related build configurations

## Environment Variables Needed for Cosmos (if not already present)
Add these to `.env.local` / `.env.staging`:
- `VITE_LCD_HTTP_URL` - Cosmos LCD endpoint
- `VITE_RPC_HTTP_URL` - Cosmos RPC endpoint
- `VITE_RPC_WS_URL` - Cosmos WebSocket RPC endpoint
- `VITE_CHAIN_ID` - Chain ID (e.g. `dytallix-testnet-1`)
- (Optional hardening) `VITE_FAUCET_API_URL` - Backend faucet service URL

## Recommendations & Next Steps
1. No Hardhat/EVM cleanup required (state is already clean)
2. Proceed with Cosmos SDK integration (CosmJS or gRPC-Web) for wallet + faucet
3. Replace mock faucet call with real backend + on-chain transaction flow
4. Ensure environment variables above are documented in README
5. Extend `.gitignore` to future-proof against accidental EVM scaffolding (`artifacts/`, `cache/`, `deployments/`)
6. Add a CHANGELOG entry noting Hardhat/EVM audit completion
7. Add basic health check endpoint for faucet backend and integrate status indicator in UI

## Notes
- The faucet form currently uses a mock/placeholder request helper; backend not found here
- Cosmos-style bech32 prefixes already adopted (e.g. `dytallix1...`)
- Directory `artifacts/hardhat_audit/` is documentation-only and safe to retain

## Audit Conclusion
The repository is confirmed EVM/Hardhat-free. Focus can shift entirely to strengthening Cosmos-specific functionality, observability, and security hardening.