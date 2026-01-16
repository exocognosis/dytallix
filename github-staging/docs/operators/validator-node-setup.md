---
title: "Validator Node Setup"
---

# Validator Node Setup

Run a validator on the public testnet.

> Last updated: 2025-08-20

## Requirements

- 4 CPU, 8GB RAM, 200GB SSD
- Ports 26656,26657 open

## Install

```bash
docker compose up -d validator
```

## systemd

```bash
sudo systemctl enable dytallixd
sudo systemctl start dytallixd
```

## Health Check

```bash
curl localhost:26657/status
```

## Snapshot Restore

```bash
curl -L https://snapshots.dytallix.example/latest.tar.gz | tar xz -C ~/.dytallix
```

## Upgrade

```bash
docker pull dytallix/validator:latest && docker compose restart validator
```

Next: [Monitoring & Troubleshooting](monitoring-troubleshooting.md)
