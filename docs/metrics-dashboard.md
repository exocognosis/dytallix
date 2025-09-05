# Network Metrics Dashboard Integration

This document describes how to run the Network Dashboard with the same-origin Metrics API proxy and optional WebSocket live updates.

## Components

1. `api-proxy.js` (root) – Node/Express proxy that normalizes upstream metrics (Prometheus or JSON) into a simple shape used by the frontend.
2. Frontend React (Vite) – Dashboard page consuming `/api/*` endpoints and `/api/ws` WebSocket.
3. Environment variables in `.env` (copy from `.env.example`).

## Endpoints (Proxy)

- `GET /api/overview` -> `{ height,tps,blockTime,peers,validators,finality,mempool,cpu,memory,diskIO,updatedAt }`
- `GET /api/timeseries?metric=tps|blockTime|peers&range=1h` -> `{ metric,range,points:[{ ts,value }],updatedAt }`
- `GET /api/status/height` -> `{ height }`
- `GET /api/health` -> `{ ok,height,peers,updatedAt,error }`
- `WS /api/ws` -> frames: `{ type:"overview", data:{...overview} }`

## Environment

Create `.env` in repo root:
```
PORT=8788
METRICS_BASE=http://localhost:26660
RATE_PER_MIN=30
METRICS_POLL_MS=4000
LOG_LEVEL=info
```

## Scripts

Root `package.json` now includes:
- `npm run proxy:dev` – start proxy only
- `npm run dev:all` – proxy + lean launch app (which already has its own server)

Run all:
```
npm run dev:all
```
Then open: http://localhost:5173 (assuming existing frontend dev port).

## Frontend Usage

`frontend/src/lib/metricsClient.ts` exposes:
- `getOverview()`
- `getTimeseries(metric, range)`
- `openDashboardSocket({ onOverview })`

Dashboard page requests data on load and subscribes to WebSocket. If WS fails it continues polling.

## Timeseries Ranges
Currently synthetic. Ranges accepted: `15m`, `1h` (default), `24h`. Modify generator in `api-proxy.js` or implement upstream fetch.

## Handling Prometheus Upstream
If `METRICS_BASE/metrics` is text/plain Prometheus, proxy parses a subset and synthesizes the overview. Provide metrics such as:
- `block_height`
- `tx_per_second`
- `block_time_seconds_avg`
- `p2p_peers`

Fallback random values are generated if missing – clearly visible in logs.

## Rate Limiting
Per-IP+path sliding window (1 minute). Default limit 30/min configurable via `RATE_PER_MIN`.

## Health Behavior
If upstream unreachable, last successful overview is served with `error` field populated. First failure before any success provides a synthetic baseline.

## Smoke Test
Execute:
```
./scripts/smoke_metrics.sh
```
Expect JSON keys: height, tps, blockTime, peers.

## WebSocket
Connect to `ws://localhost:8788/api/ws` (or same host under reverse proxy). Messages every `METRICS_POLL_MS` (~4s). Cloud load balancers may require periodic pings (implemented).

## Extending
Replace synthetic timeseries by implementing upstream query in `/api/timeseries` route or adding caching layer.

## Failure Modes & UI Fallbacks
- WS failure: silently ignored; polling continues.
- Upstream failure: UI shows placeholders ("—") but remains interactive.
- Rate limit: client should back off (HTTP 429). Dashboard only performs limited calls per refresh cycle.

## Security Notes
- Same-origin; ensure reverse proxy routes `/api/*` and `/api/ws` to proxy port.
- Add auth in production if exposing sensitive metrics.

## License
Part of Dytallix project; internal use.
