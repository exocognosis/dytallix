# Dytallix Monitoring Alerts

## Overview

This document defines the alerting strategy and specific alert rules for monitoring the Dytallix blockchain infrastructure.

## Alert Severity Levels

### Critical (P0)
- **Response Time**: Immediate (< 15 minutes)
- **Impact**: Service outage or data loss imminent
- **Escalation**: Page on-call engineer immediately
- **Examples**: Node down, consensus failure, security breach

### High (P1)
- **Response Time**: 1 hour during business hours, 4 hours off-hours
- **Impact**: Significant performance degradation
- **Escalation**: Slack alert to team, email to on-call
- **Examples**: High latency, validator missing blocks, low peer count

### Warning (P2)
- **Response Time**: Next business day
- **Impact**: Performance degradation, potential future issues
- **Escalation**: Slack notification only
- **Examples**: Resource usage approaching limits, certificate expiring

### Info (P3)
- **Response Time**: No immediate action required
- **Impact**: Informational, trend monitoring
- **Escalation**: Dashboard notification only
- **Examples**: Deployment events, configuration changes

## Blockchain-Specific Alerts

### Consensus Alerts

#### Block Production Stopped (Critical)
```yaml
alert: BlockProductionStopped
expr: increase(dyt_node_block_height[5m]) == 0
for: 2m
labels:
  severity: critical
  component: consensus
annotations:
  summary: "Block production has stopped on {{ $labels.instance }}"
  description: "No new blocks have been produced in the last 5 minutes"
  runbook_url: "https://wiki.dytallix.com/runbooks/consensus-failure"
```

#### High Block Time (High)
```yaml
alert: HighBlockTime
expr: dyt_consensus_block_interval > 10
for: 1m
labels:
  severity: high
  component: consensus
annotations:
  summary: "Block time is abnormally high: {{ $value }}s"
  description: "Block production is slower than expected (>10s)"
  runbook_url: "https://wiki.dytallix.com/runbooks/slow-blocks"
```

#### Validator Missing Blocks (High)
```yaml
alert: ValidatorMissingBlocks
expr: increase(dyt_validator_missed_blocks[1h]) > 5
for: 0m
labels:
  severity: high
  component: validator
annotations:
  summary: "Validator {{ $labels.validator }} missing blocks"
  description: "Validator has missed {{ $value }} blocks in the last hour"
  runbook_url: "https://wiki.dytallix.com/runbooks/validator-issues"
```

### Network Alerts

#### Low Peer Count (Warning)
```yaml
alert: LowPeerCount
expr: dyt_network_peers < 10
for: 5m
labels:
  severity: warning
  component: networking
annotations:
  summary: "Low peer count: {{ $value }}"
  description: "Node has fewer than 10 connected peers"
  runbook_url: "https://wiki.dytallix.com/runbooks/connectivity"
```

#### Network Partitioning (Critical)
```yaml
alert: NetworkPartition
expr: dyt_network_peers < 3
for: 2m
labels:
  severity: critical
  component: networking
annotations:
  summary: "Possible network partition detected"
  description: "Node has fewer than 3 peers, possible network partition"
  runbook_url: "https://wiki.dytallix.com/runbooks/network-partition"
```

## System Performance Alerts

### Resource Usage

#### High CPU Usage (Warning)
```yaml
alert: HighCPUUsage
expr: dyt_node_cpu_usage_percent > 80
for: 5m
labels:
  severity: warning
  component: system
annotations:
  summary: "High CPU usage: {{ $value }}%"
  description: "CPU usage has been above 80% for 5 minutes"
  runbook_url: "https://wiki.dytallix.com/runbooks/high-cpu"
```

#### High Memory Usage (High)
```yaml
alert: HighMemoryUsage
expr: dyt_node_memory_usage_percent > 90
for: 2m
labels:
  severity: high
  component: system
annotations:
  summary: "High memory usage: {{ $value }}%"
  description: "Memory usage has been above 90% for 2 minutes"
  runbook_url: "https://wiki.dytallix.com/runbooks/memory-pressure"
```

#### Disk Space Low (High)
```yaml
alert: DiskSpaceLow
expr: dyt_node_disk_usage_percent > 85
for: 1m
labels:
  severity: high
  component: storage
annotations:
  summary: "Disk space low: {{ $value }}% used"
  description: "Disk usage is above 85%, may cause issues soon"
  runbook_url: "https://wiki.dytallix.com/runbooks/disk-cleanup"
```

#### Disk Space Critical (Critical)
```yaml
alert: DiskSpaceCritical
expr: dyt_node_disk_usage_percent > 95
for: 0m
labels:
  severity: critical
  component: storage
annotations:
  summary: "Disk space critical: {{ $value }}% used"
  description: "Disk usage is above 95%, immediate action required"
  runbook_url: "https://wiki.dytallix.com/runbooks/disk-emergency"
```

## Application Performance Alerts

### API Performance

#### High API Latency (Warning)
```yaml
alert: HighAPILatency
expr: histogram_quantile(0.95, rate(dyt_rpc_request_duration_bucket[5m])) > 1000
for: 3m
labels:
  severity: warning
  component: api
annotations:
  summary: "High API latency: {{ $value }}ms (95th percentile)"
  description: "API response times are degraded"
  runbook_url: "https://wiki.dytallix.com/runbooks/api-performance"
```

#### API Error Rate High (High)
```yaml
alert: HighAPIErrorRate
expr: rate(dyt_rpc_errors_total[5m]) / rate(dyt_rpc_requests_total[5m]) > 0.05
for: 2m
labels:
  severity: high
  component: api
annotations:
  summary: "High API error rate: {{ $value | humanizePercentage }}"
  description: "API error rate is above 5%"
  runbook_url: "https://wiki.dytallix.com/runbooks/api-errors"
```

### Transaction Processing

#### High Mempool Size (Warning)
```yaml
alert: HighMempoolSize
expr: dyt_mempool_size > 1000
for: 5m
labels:
  severity: warning
  component: mempool
annotations:
  summary: "High mempool size: {{ $value }} transactions"
  description: "Mempool has more than 1000 pending transactions"
  runbook_url: "https://wiki.dytallix.com/runbooks/mempool-congestion"
```

#### Transaction Success Rate Low (High)
```yaml
alert: LowTransactionSuccessRate
expr: rate(dyt_transactions_successful[5m]) / rate(dyt_transactions_total[5m]) < 0.95
for: 3m
labels:
  severity: high
  component: transactions
annotations:
  summary: "Low transaction success rate: {{ $value | humanizePercentage }}"
  description: "Transaction success rate below 95%"
  runbook_url: "https://wiki.dytallix.com/runbooks/tx-failures"
```

## Security Alerts

### Authentication and Access

#### Failed Authentication Spike (High)
```yaml
alert: FailedAuthenticationSpike
expr: rate(dyt_failed_authentication_attempts[5m]) > 10
for: 1m
labels:
  severity: high
  component: security
annotations:
  summary: "Spike in failed authentication attempts"
  description: "{{ $value }} failed authentication attempts per second"
  runbook_url: "https://wiki.dytallix.com/runbooks/security-incident"
```

#### Certificate Expiring (Warning)
```yaml
alert: CertificateExpiring
expr: dyt_certificate_expiry_days < 30
for: 0m
labels:
  severity: warning
  component: security
annotations:
  summary: "Certificate expiring in {{ $value }} days"
  description: "TLS certificate for {{ $labels.cert_name }} expires soon"
  runbook_url: "https://wiki.dytallix.com/runbooks/cert-renewal"
```

#### Certificate Expired (Critical)
```yaml
alert: CertificateExpired
expr: dyt_certificate_expiry_days < 0
for: 0m
labels:
  severity: critical
  component: security
annotations:
  summary: "Certificate expired {{ $value }} days ago"
  description: "TLS certificate for {{ $labels.cert_name }} has expired"
  runbook_url: "https://wiki.dytallix.com/runbooks/cert-emergency"
```

## Bridge and Cross-Chain Alerts

### Bridge Operations

#### Bridge Operation Failed (High)
```yaml
alert: BridgeOperationFailed
expr: rate(dyt_bridge_operations_failed[5m]) > 0.1
for: 2m
labels:
  severity: high
  component: bridge
annotations:
  summary: "Bridge operations failing"
  description: "{{ $value }} bridge operations failing per second"
  runbook_url: "https://wiki.dytallix.com/runbooks/bridge-issues"
```

#### Bridge Confirmation Delay (Warning)
```yaml
alert: BridgeConfirmationDelay
expr: dyt_bridge_confirmation_time_seconds > 300
for: 5m
labels:
  severity: warning
  component: bridge
annotations:
  summary: "Bridge confirmations delayed"
  description: "Bridge confirmations taking {{ $value }}s (>5min)"
  runbook_url: "https://wiki.dytallix.com/runbooks/bridge-delays"
```

## Business Logic Alerts

### Governance

#### Governance Proposal Stuck (Warning)
```yaml
alert: GovernanceProposalStuck
expr: dyt_governance_proposal_duration_hours > 168
for: 0m
labels:
  severity: warning
  component: governance
annotations:
  summary: "Governance proposal {{ $labels.proposal_id }} stuck"
  description: "Proposal has been active for {{ $value }} hours (>1 week)"
  runbook_url: "https://wiki.dytallix.com/runbooks/governance"
```

### Staking

#### Low Staking Participation (Warning)
```yaml
alert: LowStakingParticipation
expr: dyt_staking_participation_rate < 0.5
for: 1h
labels:
  severity: warning
  component: staking
annotations:
  summary: "Low staking participation: {{ $value | humanizePercentage }}"
  description: "Less than 50% of tokens are staked"
  runbook_url: "https://wiki.dytallix.com/runbooks/staking-health"
```

## Alert Routing and Notification

### Notification Channels

#### Slack Integration
```yaml
slack_configs:
- api_url: 'https://hooks.slack.com/services/...'
  channel: '#dytallix-alerts'
  title: 'Dytallix Alert: {{ .GroupLabels.alertname }}'
  text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
  send_resolved: true
```

#### Email Alerts
```yaml
email_configs:
- to: 'oncall@dytallix.com'
  subject: 'Dytallix {{ .Status }}: {{ .GroupLabels.alertname }}'
  body: |
    {{ range .Alerts }}
    Alert: {{ .Annotations.summary }}
    Description: {{ .Annotations.description }}
    Runbook: {{ .Annotations.runbook_url }}
    {{ end }}
```

#### PagerDuty Integration
```yaml
pagerduty_configs:
- service_key: 'your-pagerduty-service-key'
  description: '{{ .GroupLabels.alertname }}: {{ .GroupLabels.instance }}'
  details:
    severity: '{{ .GroupLabels.severity }}'
    component: '{{ .GroupLabels.component }}'
```

### Alert Grouping
```yaml
group_by: ['alertname', 'cluster', 'service']
group_wait: 30s
group_interval: 5m
repeat_interval: 4h
```

## Runbook Links

Each alert includes a runbook URL with step-by-step troubleshooting:

- **Consensus Issues**: `/runbooks/consensus-failure`
- **Network Problems**: `/runbooks/connectivity`
- **Performance Issues**: `/runbooks/performance-degradation`
- **Security Incidents**: `/runbooks/security-incident`
- **Bridge Operations**: `/runbooks/bridge-issues`
- **System Resources**: `/runbooks/resource-management`

## Alert Testing

### Regular Testing Schedule
- **Weekly**: Test critical alert firing and notification delivery
- **Monthly**: Validate runbook procedures and escalation paths
- **Quarterly**: Review alert thresholds and tune sensitivity

### Test Scenarios
1. **Simulated node failure**: Verify consensus and network alerts
2. **Resource exhaustion**: Test CPU, memory, and disk alerts
3. **API degradation**: Validate performance and error rate alerts
4. **Security events**: Test authentication and certificate alerts

This comprehensive alerting strategy ensures proactive monitoring and rapid response to issues in the Dytallix blockchain infrastructure.