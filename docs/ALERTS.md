# Dytallix Alerting System

This document describes the threshold-based alerting subsystem for the Dytallix node, designed to detect and surface reliability issues in real-time.

## Overview

The alerting system monitors key metrics and triggers alerts when predefined thresholds are exceeded for configurable consecutive evaluation intervals. It supports webhook notifications, logging, and Prometheus metrics integration.

## Features

- **Non-blocking**: Runs as a background task without impacting transaction processing
- **Configurable**: All thresholds and evaluation intervals are configurable
- **Lightweight**: Minimal performance overhead when enabled, zero overhead when disabled  
- **Observable**: Exposes Prometheus metrics for alert states and events
- **Extensible**: Trait-based design allows for easy addition of new metrics sources

## Alert Types

### 1. TPS Drop Alert

Triggers when the transactions-per-second rate falls below a configured threshold for N consecutive evaluation intervals.

**Configuration:**
```yaml
rules:
  tps_drop:
    enabled: true
    threshold: 1500        # TPS below this value triggers condition
    consecutive: 3         # Number of consecutive intervals required
```

**Alert Details:**
- `current_tps`: Current calculated TPS
- `threshold`: Configured threshold value

### 2. Oracle Timeout Alert

Triggers when oracle response latency (95th percentile) exceeds a configured timeout threshold for M consecutive evaluation intervals.

**Configuration:**
```yaml
rules:
  oracle_timeout:
    enabled: true
    threshold_ms: 800      # p95 latency threshold in milliseconds
    consecutive: 2         # Number of consecutive intervals required
```

**Alert Details:**
- `current_latency_ms`: Current p95 latency in milliseconds
- `threshold_ms`: Configured threshold value

**Note:** Currently returns `None` for oracle latency as oracle tracking is not yet implemented. This will be added when the oracle module becomes available.

### 3. Validator Offline Alert

Triggers when a validator's last heartbeat timestamp exceeds the offline threshold.

**Configuration:**
```yaml
rules:
  validator_offline:
    enabled: true
    offline_secs: 30       # Seconds since last heartbeat considered offline
    consecutive: 1         # Number of consecutive intervals required
```

**Alert Details:**
- `offline_validators`: Array of validator IDs that are offline
- `offline_threshold_secs`: Configured offline threshold

**Note:** Currently returns an empty validator map as validator tracking is not yet implemented. This will be added when the consensus module becomes available.

## Configuration

### Configuration File

The alerting system is configured via `configs/alerts.yaml`. If the file doesn't exist, sensible defaults are used.

```yaml
# Global enable/disable
enabled: true

# Default evaluation interval in seconds
evaluation_interval_secs: 5

# Optional webhook URL (omit to disable)
webhook_url: "https://example.com/alert-webhook"

# Log alert JSON payloads
log_on_fire: true

# Rule-specific configuration
rules:
  tps_drop:
    enabled: true
    threshold: 1500
    consecutive: 3
    
  oracle_timeout:
    enabled: true
    threshold_ms: 800
    consecutive: 2
    
  validator_offline:
    enabled: true
    offline_secs: 30
    consecutive: 1
```

### Environment Variables

- `DYT_ALERTS_CONFIG`: Path to alerts configuration file (default: `./configs/alerts.yaml`)

### Default Values

If configuration values are missing, the following defaults are used:

- `enabled`: `true`
- `evaluation_interval_secs`: `5`
- `log_on_fire`: `true`
- `webhook_url`: `None` (disabled)
- TPS threshold: `1500`
- Oracle timeout threshold: `800ms`
- Validator offline threshold: `30s`
- Consecutive failures required: varies by rule type

## Webhook Integration

When a webhook URL is configured, alert events are sent as HTTP POST requests with JSON payloads:

```json
{
  "kind": "TPSDrop",
  "timestamp": "2023-12-25T10:30:00Z",
  "details": {
    "current_tps": 1200,
    "threshold": 1500
  }
}
```

### Webhook Behavior

- 10-second timeout per request
- Errors are logged but don't stop the alerting system
- Both firing and recovery events are sent (when supported)

## Prometheus Metrics

The alerting system exposes the following Prometheus metrics:

### `dytallix_alert_rule_firing`

**Type:** Gauge  
**Labels:** `rule`  
**Description:** Whether an alert rule is currently firing (1) or not (0)

Example:
```
dytallix_alert_rule_firing{rule="tpsdrop"} 1
dytallix_alert_rule_firing{rule="oracletimeout"} 0
dytallix_alert_rule_firing{rule="validatoroffline"} 0
```

### `dytallix_alert_events_total`

**Type:** Counter  
**Labels:** `rule`, `event_type`  
**Description:** Total number of alert events (firing or recovery)

Example:
```
dytallix_alert_events_total{rule="tpsdrop",event_type="firing"} 5
dytallix_alert_events_total{rule="tpsdrop",event_type="recovery"} 4
```

## Performance Considerations

### When Enabled

- Evaluation runs every `evaluation_interval_secs` (default: 5 seconds)
- Each evaluation involves reading current metrics (TPS window, oracle latency, validator heartbeats)
- Minimal CPU and memory overhead
- Non-blocking of critical transaction/validation paths

### When Disabled

- Zero performance impact
- Evaluation loop returns immediately without starting
- No metrics collection or webhook calls

## Integration with Grafana/Alertmanager

The alerting system is designed to complement, not replace, Prometheus alerting:

### For Development/Testing
Use the built-in webhook and logging features for immediate feedback.

### For Production
1. Enable Prometheus metrics exposure
2. Create Prometheus alert rules based on `dytallix_alert_rule_firing`
3. Route alerts through Alertmanager for proper escalation and notification

Example Prometheus alert rule:
```yaml
groups:
- name: dytallix-alerts
  rules:
  - alert: DytallixTPSDropAlert
    expr: dytallix_alert_rule_firing{rule="tpsdrop"} == 1
    for: 0m
    labels:
      severity: warning
    annotations:
      summary: "Dytallix TPS has dropped below threshold"
```

## Implementation Details

### Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Node Metrics  │───▶│  MetricsGatherer │───▶│  AlertsEngine   │
│  (TPS, Oracle,  │    │     (Trait)      │    │                 │
│   Validators)   │    └──────────────────┘    └─────────────────┘
└─────────────────┘                                      │
                                                         ▼
                              ┌─────────────────────────────────────┐
                              │           Alert Actions             │
                              │  • Log Events                       │
                              │  • Send Webhooks                    │
                              │  • Update Prometheus Metrics        │
                              └─────────────────────────────────────┘
```

### Key Components

1. **MetricsGatherer Trait**: Abstracts metric collection, allowing for different implementations
2. **NodeMetricsGatherer**: Concrete implementation that reads from existing node metrics
3. **AlertsEngine**: Core evaluation loop and state management
4. **AlertsConfig**: Configuration management with serde deserialization

### State Management

Each alert rule maintains:
- `consecutive_failures`: Count of consecutive threshold violations
- `firing`: Whether the alert is currently active

State transitions:
- Normal → Firing: When consecutive failures >= configured threshold
- Firing → Normal: When threshold is no longer violated (recovery)

## Testing

### Unit Tests

- Configuration loading and parsing
- Alert rule evaluation logic
- State transitions (normal ↔ firing)
- Webhook payload generation

### Integration Tests

- TPS drop detection with real TpsWindow
- Validator offline simulation
- Performance impact measurement

### Running Tests

```bash
# Run all tests
cargo test alerts

# Run with metrics feature enabled
cargo test --features metrics alerts

# Run with alerts feature enabled  
cargo test --features alerts alerts
```

## Troubleshooting

### Common Issues

1. **Alerts not firing**: Check configuration file path and rule enablement
2. **Webhook failures**: Verify URL accessibility and check logs for timeout errors
3. **High false positives**: Increase `consecutive` threshold values
4. **Missing metrics**: Ensure proper MetricsGatherer implementation

### Debug Information

Enable detailed logging to troubleshoot:
```bash
RUST_LOG=dytallix_lean_node::alerts=debug ./dytallix-node
```

### Health Checks

Monitor these indicators:
- `dytallix_alert_events_total` should increment when conditions occur
- `dytallix_alert_rule_firing` should reflect current alert states
- Webhook endpoint should receive properly formatted JSON

## Future Enhancements

### Planned Features

1. **Oracle Integration**: Complete oracle latency tracking when oracle module is available
2. **Validator Integration**: Add validator heartbeat tracking when consensus module is available
3. **Custom Alert Rules**: Support for user-defined alert conditions
4. **Alert Grouping**: Batch multiple alerts to reduce notification noise
5. **Circuit Breaker**: Automatic webhook disabling on repeated failures

### Extension Points

The trait-based design allows for easy extension:

```rust
impl MetricsGatherer for CustomGatherer {
    fn get_current_tps(&self) -> f64 { /* custom implementation */ }
    fn get_oracle_latency_p95_ms(&self) -> Option<f64> { /* custom implementation */ }
    fn get_validator_heartbeats(&self) -> HashMap<String, u64> { /* custom implementation */ }
}
```

## Security Considerations

- Webhook URLs should use HTTPS in production
- Consider webhook authentication/authorization mechanisms
- Monitor webhook endpoints for suspicious activity
- Sensitive configuration should use environment variables rather than config files

---

For implementation details, see the source code in `dytallix-lean-launch/node/src/alerts.rs`.