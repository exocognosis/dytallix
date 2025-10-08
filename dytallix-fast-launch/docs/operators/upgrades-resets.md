---
title: "Upgrades & Resets"
---

# Upgrades & Resets

Handle network upgrades and state resets.

> Last updated: 2025-08-20

## Upgrade

1. Pull new image.
   ```bash
   docker pull dytallix/validator:latest
   docker compose restart validator
   ```
2. Verify binary hash.

## Reset

1. Stop node.
   ```bash
   docker compose down
   ```
2. Remove data and start fresh on next launch day.

Next: [Security Overview](../security/overview.md)
