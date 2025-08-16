# Migration Guide: DYT to DGT/DRT Dual-Token System

## Overview

This document outlines the migration from the legacy umbrella token symbol DYT/udyt to the new dual-token system with DGT (Governance Token) and DRT (Reward Token).

## Background

The Dytallix tokenomics have evolved into a dual-token model to better serve different use cases:

- **DGT (Governance Token)**: Fixed supply (1B DGT), used for governance voting, staking, fees, and protocol decisions
- **DRT (Reward Token)**: Inflationary supply (~6% annual), used for rewards, incentives, staking rewards, and AI service payments

## Token Mapping

### DGT (Governance Token) - `udgt`
**Used for:**
- Transaction fees and gas
- Base chain denomination (bond_denom)
- Governance deposits and voting
- Staking deposits
- Wallet balance displays
- Faucet distribution (10 DGT per request, 50 DGT limit)
- Bridging operations (Wrapped DGT)
- MetaMask nativeCurrency
- Explorer fee displays
- Minimum gas prices
- Validator funding
- Genesis configuration
- Cross-chain transactions as primary network asset

### DRT (Reward Token) - `udrt`
**Used for:**
- Reward emissions and incentives
- Block rewards
- Staking rewards distribution
- AI module payouts
- Distribution module rewards
- Faucet distribution (100 DRT per request, 500 DRT limit)

## File Changes Summary

### Configuration Files
- `testnet/init/config/genesis.json`: Updated bond_denom and governance min_deposit from udyt to udgt
- `docker-compose.yml`: Replaced FAUCET_AMOUNT with DGT_FAUCET_AMOUNT and DRT_FAUCET_AMOUNT
- `docker-compose/.env.faucet`: Added dual token configuration
- `init_testnet.sh`: Updated genesis accounts, gentx, and minimum-gas-prices to use udgt

### Frontend (TypeScript/React)
- `frontend/src/lib/tokens.ts`: New centralized token definitions with helper functions
- `frontend/src/services/config.ts`: MetaMask nativeCurrency changed to DGT with 6 decimals
- `frontend/src/pages/Wallet.tsx`: Updated balance displays, send forms, and UI labels

### Backend Services (Node.js)
- `faucet/src/tokens.js`: New token metadata and formatting functions
- `faucet/src/controllers/faucetController.js`: Complete dual-token distribution system
- `explorer/src/tokens.js`: New token metadata and formatting functions
- `explorer/src/controllers/explorerController.js`: Dual token balance displays
- `explorer/src/services/blockchainService.js`: Updated fee displays

### Rust Components
- `developer-tools/src/tokens.rs`: New token definitions and conversion functions
- `developer-tools/src/commands/account.rs`: Updated balance displays
- `developer-tools/src/commands/transaction.rs`: Updated transaction amounts and fees
- `developer-tools/src/commands/node.rs`: Updated mock logs

### Ethereum Contracts & Deployment
- `deployment/ethereum-contracts/contracts/WrappedDytallix.sol`: Updated comments to reference DGT
- `deployment/ethereum-contracts/scripts/deploy-sepolia.js`: Updated to deploy Wrapped DGT
- `docs/DEPLOYMENT_LOG.md`: Updated references to Wrapped DGT Token

### Documentation
- `NEXT_PHASE_IMPLEMENTATION_PLAN.md`: Updated cross-chain transaction example
- This migration guide

## Breaking Changes

### Environment Variables
- **DEPRECATED**: `FAUCET_AMOUNT=1000000udyt`
- **NEW**: 
  - `DGT_FAUCET_AMOUNT=10000000udgt`
  - `DRT_FAUCET_AMOUNT=100000000udrt`

### API Responses
- **Faucet**: Now returns dual tokens with tokenomics information
- **Explorer**: Address endpoints now return balances object with both DGT and DRT
- **Balance queries**: Support denomination parameter for specific token queries

### Blockchain Configuration
- **Genesis**: bond_denom changed from udyt to udgt
- **Gas prices**: minimum-gas-prices uses udgt
- **Governance**: Deposits require udgt instead of udyt

## Backward Compatibility

### Temporary Support (One Version)
For one interim version, the following legacy environment variables will be read with deprecation warnings:

- `FAUCET_AMOUNT` → Mapped to `DGT_FAUCET_AMOUNT`
- `SEPOLIA_WRAPPED_DYT_ADDRESS` → Mapped to `SEPOLIA_WRAPPED_DGT_ADDRESS`

### Migration Scripts
A verification script ensures no legacy references remain:
```bash
make verify-token-migration
```

This runs:
```bash
git grep -RIn -E '\\b[Dd][Yy][Tt]\\b|u[Dd][Yy][Tt]|udyt' --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build --exclude-dir=.git --exclude-dir=target --exclude-dir=coverage
```

## Testing Requirements

### Unit Tests
- All token formatting functions tested in each language
- Balance conversion accuracy verified
- API response format validation

### Integration Tests
- Faucet dual-token distribution
- Explorer dual-balance displays
- Frontend wallet balance updates
- Cross-chain bridge operations (DGT only)

### Manual Verification
- Docker Compose services start successfully
- Frontend displays correct token symbols
- CLI tools show proper formatting
- No legacy DYT references in logs

## Deployment Checklist

- [ ] Update genesis file with udgt denominations
- [ ] Deploy new faucet with dual-token support
- [ ] Update explorer with dual-balance displays
- [ ] Deploy frontend with new token system
- [ ] Update bridge contracts for DGT wrapping
- [ ] Verify all services start correctly
- [ ] Run token migration verification script
- [ ] Test cross-chain DGT operations
- [ ] Update documentation and README files

## Rollback Plan

If issues are encountered:

1. Revert genesis.json to udyt denominations
2. Restore single-token faucet configuration
3. Revert frontend to DYT displays
4. Update bridge to use legacy DYT references
5. Run regression tests

## Support

For questions or issues during migration:
- Check this documentation first
- Review change report in `docs/TOKEN_MIGRATION_CHANGELOG.md`
- Examine specific file changes in git history
- Test with verification script before deployment