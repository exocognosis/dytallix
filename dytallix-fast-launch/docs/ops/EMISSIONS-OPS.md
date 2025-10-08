# Emissions Operations (uDRT)

This doc covers scheduling, running, and monitoring uDRT emissions.

## Overview
- Engine tracks emission pools per height and supports claiming to addresses via `POST /emission/claim`.
- CronJob drives deterministic claims from a YAML schedule, idempotent via stamps on a PVC.
- Prometheus exposes emissions metrics for dashboards and alerting.

## Metrics
Exported by the node metrics server:
- `drt_emission_applied_height`: last height applied by the engine
- `drt_emission_pending_claims`: current pending uDRT total in pools
- `drt_emission_last_apply_timestamp_seconds`: UNIX timestamp of last apply

Enable metrics via env:
```
DY_METRICS=1
DY_METRICS_ADDR=0.0.0.0:9464
```

## Schedule Format
`ConfigMap` mounted at `/etc/dyt/emissions/schedule.yaml`:
```
entries:
  - height: 1000
    pool: staking_rewards
    to: dyt1exampleaddress000000000000000000
    amount_udrt: 1000000  # micro-DRT
```

## Helm Values
`helm/values.yaml`:
```
emissions:
  cron:
    enabled: true
    schedule: "*/5 * * * *"
    image: alpine:3.19
    rpcUrl: http://dytallix-rpc.dytallix.svc.cluster.local:3030
    logPvc:
      size: 1Gi
      retentionDays: 14
    resources:
      requests: { cpu: 50m, memory: 64Mi }
      limits:   { cpu: 200m, memory: 256Mi }
  networkPolicy:
    enabled: true
```

## Deploy
```
# Apply schedule (optional; Helm creates an empty placeholder)
kubectl -n dytallix create configmap dytallix-emissions-schedule \
  --from-file=schedule.yaml=./schedule.yaml --dry-run=client -o yaml | kubectl apply -f -

# Enable CronJob
helm upgrade --install dytallix ./helm -n dytallix --set emissions.cron.enabled=true --atomic
```

## Runner
- Script: `scripts/emissions_cron.sh` (packaged by Helm into a ConfigMap)
- Idempotent: creates stamps under `/var/log/dytallix-emissions/.state/` to avoid repeats.
- Logs: `/var/log/dytallix-emissions/<YYYYMMDD>.log` contain `height=.. denom=uDRT pool=.. to=.. amount_udrt=.. status=..` lines.

## Security
- Runs under a dedicated `ServiceAccount` and NetworkPolicy allowing only egress to DNS and RPC:3030 in-namespace.
- No cluster write permissions required.

## Troubleshooting
- Check CronJob:
```
kubectl -n dytallix get cronjob dytallix-emissions
kubectl -n dytallix logs job/<job-name>
```
- Verify metrics:
```
curl $METRICS_ADDR/metrics | grep -E 'drt_emission_|dyt_block_height'
```
- Idempotency: remove a stamp file in the logs PVC to re-run a specific entry.

