---
title: "Monitoring & Troubleshooting"
---

# Monitoring & Troubleshooting

Keep nodes healthy.

> Last updated: 2025-08-20

## Metrics

Expose Prometheus on `:9100` and scrape:

- `dytallix_block_height`
- `dytallix_peer_count`

## Common Issues

- High CPU → check gossip spam.
- Missed blocks → verify time sync.

## Playbook

1. Check logs: `docker logs validator`.
2. Verify network: `curl localhost:26657/status`.
3. Restart if necessary.

Next: [Upgrades & Resets](upgrades-resets.md)
