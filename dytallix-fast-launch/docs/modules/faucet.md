---
title: Faucet Module
---

# Faucet Module

Dispenses testnet tokens with abuse prevention.

## Controls

| Control | Description |
|---------|-------------|
| Rate Limit | Per IP / address cooldown |
| CAPTCHA (roadmap) | Prevent automated draining |
| Daily Cap | Total tokens per 24h window |
| Address blacklist | Deny known abuse addresses |

## API

`POST /api/faucet { address }`

Returns success or error with cooldown remaining.

Next: [Telemetry Module](telemetry.md)
