# Dytallix PQC Wallet Migration Guide

## Overview

This document outlines the migration from EVM-based wallet integrations (MetaMask) to the native Dytallix Post-Quantum Cryptography (PQC) wallet system. This migration ensures quantum resistance and provides a secure, integrated experience for Dytallix network interactions.

## Migration Rationale

### Why Move Away from EVM Wallets?

1. **Quantum Vulnerability**: Traditional EVM wallets use ECDSA signatures which are vulnerable to quantum attacks
2. **Network Mismatch**: Dytallix is a Cosmos SDK-based chain, not EVM-compatible
3. **Security**: Native PQC wallets provide post-quantum cryptographic security
4. **User Experience**: Integrated wallet eliminates the need for external browser extensions
5. **Feature Completeness**: Direct integration with Dytallix-specific features and transaction types

### PQC Advantages

- **Quantum Resistance**: Uses Dilithium5, Falcon1024, and SPHINCS+ algorithms
- **Future-Proof**: Designed to withstand both classical and quantum computing attacks
- **Algorithm Agility**: Support for multiple PQC algorithms with upgrade paths
- **Native Integration**: Direct support for Dytallix transaction types and features

## Technical Implementation

### Core Components

#### 1. Wallet Provider (`lib/wallet/dytallixProvider.ts`)
- Encrypted vault storage using AES-GCM encryption
- PBKDF2 key derivation for secure password handling
- Mock PQC key generation and signing (to be replaced with actual implementations)
- Account management (create, import, export)
- Transaction signing and broadcasting

#### 2. State Management (`state/walletStore.ts`)
- Zustand-based reactive state management
- Auto-lock functionality (10-minute default timeout)
- Persistent encrypted vault storage in localStorage
- Balance tracking and refresh capabilities

#### 3. Transaction Builders (`lib/tx/builders.ts`)
- Type-safe transaction payload construction
- Support for transfers, faucet requests, governance votes, and contract calls
- Validation utilities for addresses and amounts
- Token amount formatting and parsing

#### 4. UI Components (`components/ConnectDytallixWalletModal.tsx`)
- Accessible modal interface for wallet operations
- Create vault, unlock, account creation, and import flows
- Keyboard navigation and screen reader support
- Secure password handling with visibility toggle

### Storage Architecture

#### Vault Structure
```typescript
interface Vault {
  version: 1
  accounts: Account[]
  encryptionSalt: string
  createdAt: string
  lastModified: string
}
```

#### Account Model
```typescript
interface Account {
  address: string
  algo: PQCAlgo
  publicKey: string
  encryptedPrivKey?: string
  createdAt: string
  label?: string
}
```

#### Persistent Storage
- **Key**: `dyt-vault:v1` in localStorage
- **Format**: Encrypted JSON blob with metadata
- **Security**: No plain private keys or mnemonics persisted

### Security Features

#### Encryption
- **Algorithm**: AES-GCM for authenticated encryption
- **Key Derivation**: PBKDF2 with 100,000 iterations
- **Salt**: Unique 16-byte salt per vault
- **IV**: Unique 12-byte initialization vector per encryption

#### Auto-Lock
- **Timeout**: 10 minutes of inactivity (configurable)
- **Trigger**: All sensitive operations reset the timer
- **State**: Complete memory clearing on lock

#### Private Key Protection
- Private keys are encrypted with vault password
- No plain text private keys in memory longer than necessary
- Secure key generation using browser crypto APIs

## Migration Checklist

### For Developers

#### Code Changes
- [x] Remove all `window.ethereum` references
- [x] Replace MetaMask connection logic with native wallet modal
- [x] Update transaction signing to use PQC provider
- [x] Replace balance fetching with native RPC calls
- [x] Update address validation for bech32 format

#### Documentation Updates
- [x] Update README wallet integration instructions
- [x] Remove MetaMask references from all docs
- [x] Add PQC wallet usage examples
- [x] Update migration changelog

#### Testing Requirements
- [ ] Test vault creation and unlock flows
- [ ] Verify account creation with different PQC algorithms
- [ ] Test transaction signing and broadcasting
- [ ] Validate auto-lock functionality
- [ ] Check accessibility compliance

### For Users

#### Migration Steps
1. **Install/Update**: Ensure you have the latest Dytallix frontend
2. **Create Vault**: Click "Connect Dytallix Wallet" and create a new vault
3. **Set Password**: Choose a strong password for vault encryption
4. **Create Account**: Generate a new PQC account or import existing keys
5. **Fund Account**: Use the faucet to get testnet tokens
6. **Test Operations**: Verify you can sign transactions and check balances

#### Security Recommendations
- Use a strong, unique password for your vault
- Keep your vault password secure and never share it
- Regularly backup your private keys (export functionality available)
- Be aware of auto-lock timeout and plan accordingly

## API Reference

### Wallet Store Hooks

```typescript
// Get wallet state
const { isUnlocked, currentAccount, accounts } = useWalletState()

// Access wallet actions
const { createVault, unlock, createAccount } = useWalletActions()

// Get current account balances
const { dgt, drt } = useCurrentAccountBalance()
```

### Transaction Building

```typescript
import { buildTransfer, createDGTTransfer } from '../lib/tx/builders'

// Build a transfer transaction
const transferTx = buildTransfer(
  'dytallix1recipient...',
  [{ denom: 'udgt', amount: '1000000' }], // 1 DGT
  { chainId, accountNumber, sequence }
)

// Quick transfer helper
const quickTransfer = createDGTTransfer(config, toAddress, 5) // 5 DGT
```

### Provider Integration

```typescript
import { DytallixWalletProvider, createDefaultConfig } from '../lib/wallet/dytallixProvider'

const provider = new DytallixWalletProvider(createDefaultConfig())
await provider.createVault(password)
const account = await provider.createAccount('dilithium5', 'Main Account')
```

## Troubleshooting

### Common Issues

#### Vault Won't Unlock
- **Problem**: "Invalid password" error
- **Solution**: Ensure correct password, check for caps lock, try refreshing page

#### Transaction Fails
- **Problem**: Transaction broadcast returns error
- **Solution**: Check account has sufficient balance for fees, verify network connectivity

#### Auto-Lock Too Frequent
- **Problem**: Wallet locks too often during use
- **Solution**: Activity resets timer; ensure you're actively using wallet features

#### Account Import Fails
- **Problem**: Cannot import existing private key
- **Solution**: Verify key format, ensure correct algorithm selection

### Development Issues

#### Build Errors
- Ensure all TypeScript types are properly imported
- Check that zustand is installed: `npm install zustand`
- Verify file extensions (.ts/.tsx) are correct

#### RPC Connection Issues
- Check `VITE_RPC_HTTP_URL` and `VITE_LCD_HTTP_URL` environment variables
- Ensure testnet endpoints are accessible
- Verify CORS configuration for local development

## Future Enhancements

### Planned Features
- Hardware wallet integration for enhanced security
- Multi-signature account support
- Advanced transaction batching
- Integration with Dytallix governance modules
- Mobile wallet companion app

### PQC Implementation Timeline
- **Phase 1**: Mock implementations (current)
- **Phase 2**: Integrate with Dytallix PQC libraries
- **Phase 3**: Hardware acceleration support
- **Phase 4**: Advanced key management features

## Support

For technical support or questions about the PQC wallet migration:

- **GitHub Issues**: [Dytallix Repository](https://github.com/HisMadRealm/dytallix)
- **Documentation**: Check the main README and technical docs
- **Community**: Join the Dytallix Discord for community support

---

**Migration Status**: ✅ Complete
**Last Updated**: January 2025
**Version**: 1.0.0