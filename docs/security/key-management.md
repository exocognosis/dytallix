---
title: Key Management
---

# Key Management

## Key Types

| Type | Purpose | Storage | Rotation |
|------|---------|---------|----------|
| Validator consensus | Tendermint consensus signing | Encrypted disk / HSM (planned) | Manual initial, automated planned |
| Validator block proposer | Block proposal | Same as above | Coupled |
| PQC identity (Dilithium) | Future post-quantum authentication | Encrypted volume | Quarterly (test) |
| Bridge relayer | Off-chain signing / attestation | Secrets manager | Monthly |
| Faucet hot key | Signing faucet txs | Hot wallet + rate limits | By threshold trigger |

## Generation

Use provided scripts (`scripts/gen-mnemonic.cjs`, `scripts/gen-pqc-mnemonic.cjs`). Always perform generation on an isolated machine or secure container.

## Storage Controls

- Disk encryption enabled (LUKS / FileVault / Cloud KMS-managed disks)
- Restrict UNIX permissions (chmod 600) for private keys
- Separate OS users for validator vs. relayer processes
- No keys in container images; mounted at runtime only

## Rotation

| Phase | Trigger | Action |
|-------|---------|--------|
| Scheduled | Quarterly | Generate new PQC + relayer keys, update config, revoke old |
| Compromise suspected | Alert / anomaly | Immediate revoke + redeploy |
| Validator migration | Host move | Recreate keys unless continuity required |

## Backup & Recovery

- Encrypted off-site backups using age or GPG
- Split mnemonic using Shamir (>=2-of-3) for critical keys (roadmap)
- Document restore procedure and test in staging

## Validation

- Periodic checksum of key directories compared to inventory
- Automated startup check ensures key presence & correct permissions

Next: [Network Security](network-security.md)
