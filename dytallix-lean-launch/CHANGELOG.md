# Changelog

All notable changes to the Dytallix Lean Launch frontend will be documented in this file.

## [1.1.0] - 2024-01-20

### Added
- Environment variable support for Cosmos network configuration
- CosmJS integration for Cosmos SDK blockchain interactions
- .env.staging template with Cosmos testnet endpoints
- EVM build artifact exclusions in .gitignore to prevent reintroduction
- Comprehensive audit documentation (artifacts/hardhat_audit/MATCHES.md)

### Changed
- **BREAKING**: Faucet now uses Cosmos API endpoints instead of mock implementation
- **BREAKING**: Address validation updated to require bech32 Cosmos addresses (dytallix1...)
- Network information now displays chain ID from environment variables
- README updated to document Cosmos-only setup and remove EVM references
- Development mode fallback behavior for faucet when API is unavailable

### Removed
- All Hardhat/EVM-specific dependencies and configurations (audit confirmed none existed)
- EVM-style address support (0x...) in favor of Cosmos bech32 addresses
- Mock API layer replaced with actual Cosmos endpoint integration

### Technical Details
- Added required environment variables: VITE_LCD_HTTP_URL, VITE_RPC_HTTP_URL, VITE_RPC_WS_URL, VITE_CHAIN_ID
- CosmJS packages: @cosmjs/stargate, @cosmjs/proto-signing, @cosmjs/encoding
- All runtime calls now use Cosmos LCD/RPC endpoints from environment configuration
- Chain ID properly handled as string value from environment variables

### Migration Notes
- This release completes the migration from EVM/Hardhat to Cosmos-only setup
- No actual EVM code was removed as the codebase was already clean
- Developers must configure environment variables for proper Cosmos integration
- Faucet component includes both production API calls and development mode fallbacks