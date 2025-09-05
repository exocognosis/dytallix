# Release Notes

## Metrics Dashboard Integration (Lean Launch)

### What�s New
- Integrated Network Metrics proxy (`api-proxy.js`) delivering normalized overview + synthetic timeseries.
- Same-origin dev workflow via `npm run dev:all` (proxy + frontend) with deterministic port selection.
- WebSocket `/api/ws` broadcasting overview snapshots at `METRICS_POLL_MS` interval.
- Structured JSON logging with ISO UTC timestamps.
- Per-IP+path sliding rate limiter (configurable via `RATE_PER_MIN`).
- Health endpoint `/api/health` with upstream error surfacing.
- Deployment guide (`docs/metrics-deploy.md`) including Nginx + systemd patterns.

### How to Run (Development)
```
cp -n .env.example .env  # if .env doesn�t exist
npm install
npm run dev:all
```
Expected output banners:
- Proxy on http://localhost:4000 (WS: /api/ws)
- UI on http://localhost:5173 (or 5174 if 5173 occupied)
- `METRICS_BASE=<value>` logged at startup.

### Endpoints
- GET /api/overview
- GET /api/timeseries?metric=tps|blockTime|peers&range=15m|1h|24h
- GET /api/status/height
- GET /api/health
- WS /api/ws

### Known Limitations
- Timeseries currently synthetic (randomized baseline) until real Prometheus range queries added.
- Upstream WS bridging not yet implemented. (Toggle planned: `USE_UPSTREAM_WS`).
- No persistent cache layer; memory only.
- Auth not enforced; rely on network isolation or reverse proxy for now.

### Environment Variables
```
PORT=4000                # Proxy listen port (dev falls back 8788->4000 normalization)
METRICS_BASE=http://localhost:26660
RATE_PER_MIN=60
METRICS_POLL_MS=5000
LOG_LEVEL=info           # debug|info|warn|error
```

### Smoke Test
```
./scripts/smoke_metrics.sh
```
Validates `/api/overview` essential keys; extend with jq queries for timeseries & health.

### Local Testing & Evidence Collection
1. Full stack (proxy + UI):
```
npm run dev:all
```
2. Smoke metrics (captures JSON artifacts under `dytallix-lean-launch/launch-evidence/metrics-dashboard/`):
```
./scripts/smoke_metrics.sh
```
3. UI + client unit tests (Vitest in jsdom):
```
npm run test:ui
```
4. WebSocket capture (records first 5 overview frames):
```
npm run ws:capture
```
5. Aggregate evidence (smoke, ws capture, ui tests):
```
(cd dytallix-lean-launch && ./scripts/collect_evidence.sh)
```
Artifacts (ISO-UTC filenames) expected:
- curl_health_*.json
- curl_overview_*.json
- curl_timeseries_tps_*.json
- ws_capture_*.txt
- test_report_*.txt

Non-zero exit if required artifacts missing. Provides reproducible evidence for release sign-off.

### Next Steps / Toggles
- `USE_UPSTREAM_WS`: When true, connect to upstream streaming metrics and forward raw events.
- Add Prometheus range query support for `/api/timeseries` (replace synthetic generator).
- Introduce `REDIS_URL` for distributed rate limiting & snapshot persistence.
- Implement JSON schema validation for upstream responses.

### Migration / Upgrade Notes
If upgrading from pre-integration state:
1. Install new root dependencies (`express`, `express-rate-limit`, `ws`, `node-fetch`, `concurrently`).
2. Adopt new scripts in root `package.json`.
3. Add `docs/metrics-deploy.md` to deployment runbooks.

### Observability
Logs are single-line JSON. Example:
```
{"ts":"2025-09-04T12:00:00.000Z","level":"info","msg":"proxy_started","PORT":4000,"METRICS_BASE":"http://localhost:26660"}
```
Ship to central log aggregator and build alerts on absence of `overview` events.

---
Dytallix Release Engineering
