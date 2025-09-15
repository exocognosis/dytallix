# Monitoring Evidence Summary

## Prometheus Target Verification
Attempted to query Prometheus at `http://localhost:9090/api/v1/targets`. The service was unreachable, so no metrics could be collected. See `prometheus_targets.json` for details.

## Grafana Dashboard Export
Attempted to export dashboard `dytallix-monitoring` from Grafana (`http://localhost:3000`). The service was unreachable. Output captured in `grafana_dashboard.json`.

## Alert Test
Simulated node pause and queried Alertmanager. No Alertmanager instance reachable and no alerts observed. See `alert_test_output.log`.

## Rollback Drill
Recorded current and previous git commit hashes and simulated redeploy from previous binary. See `rollback_dry_run.log`.

_No dashboards or metrics screenshots were captured due to missing running services._
