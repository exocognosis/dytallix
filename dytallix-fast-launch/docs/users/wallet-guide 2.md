---
title: "Wallet Guide"
---

# Wallet Guide

Manage testnet accounts and keys.

> Last updated: 2025-08-20

## Options

- CLI wallet
- Browser extension
- Hardware wallet (coming soon)

## Generate Key

```bash
npm run gen-pqc-mnemonic
```

Addresses use `dyt1` prefix.

## Backup

Store seed phrases offline. To restore:

```bash
npm run gen-mnemonic -- --restore
```

Common errors & fixes

- Wrong prefix → ensure `dyt1`.
- Lost seed → tokens unrecoverable.

Next: [Faucet Guide](faucet-guide.md)
