# Wallet Migration from Legacy EVM to PQC-Only

## Overview

Dytallix has completed the migration from legacy EVM/MetaMask-style wallet integration to a native post-quantum cryptography (PQC) wallet system. This document explains the rationale, what was removed, and how to use the new PQC wallet infrastructure.

## Rationale for Migration

Dytallix is a PQC-only blockchain leveraging:
- **Dilithium**, **Falcon**, **SPHINCS+** for digital signatures
- **Kyber (HPKE)** for key encapsulation (future)

Continuing to expose EVM-centric "Connect Wallet" UX (MetaMask, EIP-1193, ethers, web3 connectors) was:
- **Misleading**: Users expected Ethereum-compatible functionality
- **Security hazard**: Mixed cryptographic paradigms create confusion
- **Conceptual mismatch**: Quantum-resistant vs classical cryptography

## What Was Removed

### UI Components
- "Connect Wallet" buttons referencing MetaMask
- "Switch Network" functionality for Ethereum networks
- EVM chain/network selection dropdowns
- Ethereum address format displays

### Code Patterns
- `window.ethereum` access and detection
- `ethereum.request()` method calls
- EIP-1193 event handlers (`accountsChanged`, `chainChanged`)
- Web3/ethers.js provider instances

### Dependencies (Future Cleanup)
The following packages will be removed in future updates:
- `ethers` - Ethereum library
- `web3` - Alternative Ethereum library
- `wagmi` - React hooks for Ethereum
- `@web3modal/*` - Wallet connection modals

## New PQC Wallet Integration

### SDK Structure

The new wallet system is organized under `/dytallix-lean-launch/src/lib/wallet/`:

```
src/lib/wallet/
├── types.ts          # TypeScript interfaces
├── crypto.ts         # PQC cryptographic operations
├── provider.ts       # Main wallet provider API
└── vault.ts          # Encrypted storage management
```

### Basic Usage

```typescript
import { DytallixWalletProvider } from './lib/wallet/provider'

// Initialize wallet provider
const wallet = new DytallixWalletProvider({
  autoLockMs: 10 * 60 * 1000, // 10 minutes
  rpcUrl: 'https://rpc-testnet.dytallix.com',
  chainId: 'dytallix-testnet-1'
})

// Create new PQC key
const account = await wallet.createKey({
  algo: 'dilithium',
  label: 'My PQC Wallet',
  passphrase: 'secure_passphrase'
})

// Unlock wallet
await wallet.unlock('secure_passphrase')

// Sign transaction
const signature = await wallet.signTx({
  address: account.address,
  algo: account.algo,
  payload: {
    type: 'transfer',
    body: {
      from: account.address,
      to: 'dytallix1recipient...',
      amount: '1000000',
      denom: 'udgt'
    }
  }
})

// Broadcast transaction
const result = await wallet.broadcastTx({ signedTx })
```

### Supported Algorithms

| Algorithm | Description | Use Case |
|-----------|-------------|----------|
| `dilithium` | NIST standardized, balanced security/performance | General purpose (default) |
| `falcon` | Compact signatures, faster verification | High-throughput applications |
| `sphincs+` | Conservative choice, hash-based security | Maximum security scenarios |

### UI Components

Replace MetaMask-style components with PQC-specific ones:

```jsx
import ConnectModal from './components/Wallet/ConnectModal'
import AccountPill from './components/Wallet/AccountPill'

// Instead of "Connect MetaMask"
<ConnectModal
  isOpen={showConnect}
  onClose={() => setShowConnect(false)}
  onConnect={handleWalletConnect}
/>

// Instead of address + network display
<AccountPill
  account={activeAccount}
  balances={balances}
  onCopyAddress={() => navigator.clipboard.writeText(account.address)}
  onExportKey={() => setShowExport(true)}
  onLock={() => wallet.lock()}
  onDisconnect={() => wallet.reset()}
/>
```

## CLI Integration

Use the new `dytx` CLI for development and scripting:

```bash
# Generate new key
dytx keygen --algo dilithium --label "dev-key"

# Check balances
dytx balances dytallix1abc123...

# Sign transaction
dytx sign --address dytallix1abc123... --payload transfer.json

# Broadcast signed transaction
dytx broadcast --file signed-tx.json

# Direct transfer
dytx transfer \
  --from dytallix1abc123... \
  --to dytallix1def456... \
  --amount 1.5 \
  --denom udgt
```

## Migration Checklist for Developers

### 1. Update Wallet Connection Logic
- [ ] Remove `window.ethereum` detection
- [ ] Replace with `DytallixWalletProvider` initialization
- [ ] Update UI to use `ConnectModal` component

### 2. Update Address Handling
- [ ] Change address format validation from Ethereum (0x...) to Bech32 (dytallix1...)
- [ ] Update address display components
- [ ] Remove checksumming logic (not needed for Bech32)

### 3. Update Transaction Signing
- [ ] Replace ethers/web3 signing with `wallet.signTx()`
- [ ] Update transaction payload structure
- [ ] Handle PQC signature formats

### 4. Update Network Configuration
- [ ] Remove Ethereum network configs
- [ ] Configure Dytallix RPC/REST endpoints
- [ ] Update chain ID references

### 5. Update Dependencies
- [ ] Remove ethers, web3, wagmi packages
- [ ] Update import statements
- [ ] Test functionality without EVM dependencies

## Security Considerations

### Key Storage
- Private keys are encrypted at rest using XChaCha20-Poly1305
- Automatic memory zeroing after inactivity timeout
- No plaintext keys in localStorage or logs

### Passphrase Requirements
- Minimum 8 characters (recommended 16+)
- Keys locked after 10 minutes of inactivity by default
- Configurable auto-lock timeout

### Algorithm Selection
- **Dilithium**: Best general-purpose choice, NIST standardized
- **Falcon**: Use when signature size matters
- **SPHINCS+**: Use for maximum conservative security

## Troubleshooting

### Common Issues

**"No wallet detected" errors**
- Remove code checking for `window.ethereum`
- Initialize `DytallixWalletProvider` instead

**Address format errors**
- Dytallix uses Bech32 format: `dytallix1...`
- Length: 39-59 characters (vs Ethereum's 42)
- No checksumming needed

**Transaction signature failures**
- Ensure correct algorithm specified in `signTx()`
- Verify wallet is unlocked before signing
- Check payload structure matches expected format

**CLI command not found**
- Install CLI dependencies: `cd cli/dytx && npm install`
- Build CLI: `npm run build`
- Add to PATH or use `npx tsx src/index.ts`

## Support

- **SDK Documentation**: `/dytallix-lean-launch/src/lib/wallet/`
- **CLI Documentation**: `/dytallix-lean-launch/cli/dytx/README.md`
- **Example Transactions**: `/dytallix-lean-launch/cli/examples/`
- **Test Cases**: `/dytallix-lean-launch/src/lib/wallet/__tests__/`

For additional support, refer to the main Dytallix documentation or open an issue on the repository.