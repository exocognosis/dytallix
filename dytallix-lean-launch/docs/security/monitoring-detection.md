---
title: Monitoring & Detection
---

# Monitoring & Detection

## Telemetry

| Metric | Source | Purpose |
|--------|--------|---------|
| Block height | Node RPC | Liveness / stall detection |
| Peer count | P2P stack | Network health |
| Tx throughput | RPC | Capacity planning |
| Faucet tx count | Faucet svc | Abuse detection |
| Bridge relays | Relayer process | Cross-chain health |
| PQ handshake ratio | Node logs | Adoption tracking |

## Logging

- Structured JSON logs
- Correlation IDs for API requests
- Log rotation + compression
- Sensitive fields redacted (address salts, secrets)

## Alerting (Initial Rules)

| Condition | Threshold | Action |
|-----------|-----------|--------|
| Block stall | >90s no increment | Page on-call |
| Peer count low | &lt;3 for 5m | Investigate network |
| Excess faucet req | >N / min / IP | Throttle + ban |
| Relayer failure burst | >5 errors / 1m | Escalate |

## Anomaly Detection (Roadmap)

- Statistical baseline for tx rate deviations
- PQ downgrade attempt flagging
- Bridge latency percentile drift

Next: [Incident Response](incident-response.md)
