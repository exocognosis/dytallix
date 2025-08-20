---
title: Telemetry Module
---

# Telemetry Module

Aggregates metrics and emits structured events.

## Metrics

| Metric | Description |
|--------|-------------|
| block_height | Current height |
| tx_per_sec | Throughput smoothing window |
| peers | Active peer count |
| relays | Successful bridge relays |
| pq_handshakes | PQ handshake attempts |

## Export

Prometheus endpoint scraped by monitoring stack.

Next: [WASM Contracts Module](wasm.md)
