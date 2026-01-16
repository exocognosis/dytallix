---
title: Incident Response
---

# Incident Response

## Severity Matrix

| Sev | Impact | Example | Response Time |
|-----|--------|---------|---------------|
| 1 | Network halt / key compromise | Validator keys exfiltrated | Immediate |
| 2 | Critical degraded performance | Blocks delayed &gt;3m | &lt;15m |
| 3 | Partial outage | Single API component down | &lt;30m |
| 4 | Minor bug | Non-critical endpoint flaky | Next sprint |

## Lifecycle

1. Detect (alert triggers)
2. Triage (assign severity, incident commander)
3. Contain (isolate node, revoke keys, rate limit)
4. Eradicate (patch, reconfigure)
5. Recover (restore service, monitor)
6. Postmortem (blameless, action items)

## Communication

- Internal channel for coordination
- Status page update for Sev1/2 (roadmap)
- Public post-incident summary for Sev1 after remediation

## Runbooks (Initial)

| Scenario | Action |
|----------|--------|
| Validator compromise | Remove from active set, rotate keys, resync new node |
| Bridge replay spike | Enable stricter nonce window, investigate relayers |
| Faucet abuse | Ban offending IPs, raise difficulty/rate limit |
| PQ downgrade attempt | Disable affected peers, inspect handshake logs |

Next: [Roadmap](roadmap.md)
