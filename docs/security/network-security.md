---
title: Network Security
---

# Network Security

## Topology

Sentry architecture isolates validator nodes from public exposure. Public RPC / API nodes forward required gossip while shielding validator consensus endpoints.

```
[Clients]
   |
[Public API / RPC / gRPC]
   |
[Sentry Nodes] -- (Private Peers Only) -- [Validators]
```

## Controls

| Control | Description | Status |
|---------|-------------|--------|
| Firewall baseline | Default deny inbound except required ports | Implemented |
| Sentry isolation | Validators only peer with allowlisted sentries | Implemented |
| DDoS mitigation | Upstream provider + rate limits | Partial |
| TLS termination | At edge / ingress | Implemented |
| mTLS (intra-cluster) | For internal bridge + privileged APIs | Roadmap |
| PQ handshake | Hybrid classical+PQC negotiation | Prototype |

## Port Matrix (Testnet)

| Service | Port | Exposure |
|---------|------|----------|
| RPC (HTTP) | 26657 | Public | 
| gRPC | 9090 | Public |
| REST API | 1317 | Public |
| P2P (Tendermint) | 26656 | Sentry only |
| Prometheus | 9100 | Private |

## Hardening

- Disable SSH password login; use keys only
- Fail2ban on bastions
- Regular kernel updates (automated)
- Minimal base images; scan weekly
- Sysctl tuning: SYN cookies, ICMP rate limit

Next: [Application Security](application-security.md) | See: [Incident Response](incident-response.md)
