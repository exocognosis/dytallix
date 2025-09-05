# Metrics Dashboard Deployment Guide

This guide documents how to deploy the Dytallix Metrics Dashboard + Proxy in a production (same-origin) setup.

## Components
- api-proxy.js (Node/Express) – Normalizes upstream Prometheus or JSON metrics to dashboard format
- Frontend (built Vite bundle) – Serves dashboard UI under /
- Reverse proxy (Nginx) – Terminates TLS, routes / and /api/* (and /api/ws)

## 1. Build & Bundle
```
# From repo root
npm install --production
npm --prefix dytallix-lean-launch install --production
npm --prefix dytallix-lean-launch run build
# Copy dist/ to a deploy directory (e.g. /var/www/dytallix-dashboard)
```

## 2. Environment Variables
Create /opt/dytallix/metrics-proxy.env:
```
PORT=4000
METRICS_BASE=http://127.0.0.1:26660
RATE_PER_MIN=60
METRICS_POLL_MS=5000
LOG_LEVEL=info
# Optional feature toggles:
# USE_UPSTREAM_WS=false   # Future: if upstream provides native streaming
```

## 3. Systemd Unit (api-proxy)
`/etc/systemd/system/dytallix-metrics-proxy.service`
```
[Unit]
Description=Dytallix Metrics Proxy
After=network.target

[Service]
Type=simple
EnvironmentFile=/opt/dytallix/metrics-proxy.env
WorkingDirectory=/opt/dytallix/app
ExecStart=/usr/bin/node api-proxy.js
Restart=on-failure
RestartSec=5
User=dytallix
Group=dytallix
NoNewPrivileges=true
ProtectSystem=full
ProtectHome=true
MemoryMax=300M
LimitNOFILE=8192

[Install]
WantedBy=multi-user.target
```
```
systemctl daemon-reload
systemctl enable dytallix-metrics-proxy --now
```

## 4. Nginx Configuration (Same-Origin)
```
server {
    listen 80;
    server_name metrics.example.com;
    # (Add `listen 443 ssl http2;` with certs in production)

    # Serve static UI
    root /var/www/dytallix-dashboard;
    index index.html;

    # Gzip / security headers (minimal example)
    add_header X-Frame-Options SAMEORIGIN;
    add_header X-Content-Type-Options nosniff;
    add_header Referrer-Policy no-referrer;

    location /api/ws {
        proxy_pass http://127.0.0.1:4000/api/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 65s;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:4000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 5s;
        proxy_read_timeout 10s;
    }

    # Cache-bust index.html only via deploy versioning
    location / {
        try_files $uri /index.html;
    }
}
```

## 5. Prometheus Mapping Notes
The proxy synthesizes overview fields; map your exporter metrics accordingly:
| Overview Field | Expected Metric Candidates |
| -------------- | -------------------------- |
| height         | block_height / latest_block_height |
| tps            | tx_per_second / txs_per_second / tps |
| blockTime      | block_time_seconds_avg / block_time_seconds |
| peers          | p2p_peers / peer_count |
| validators     | validator_active_total / validators |
| finality       | block_finality_seconds / finality |
| mempool        | mempool_size |
| cpu            | process_cpu_percent |
| memory         | process_resident_memory_percent |
| diskIO         | disk_io_bytes_per_sec |

Missing metrics are filled with bounded synthetic placeholders (visible in logs).

## 6. Rate Limiting & Security
- Default 60 req/min/IP/path (tune RATE_PER_MIN)
- Deploy behind Nginx with real client IP forwarded (ensure `set_real_ip_from` if using load balancer)
- Consider adding authentication (e.g. bearer token) if sensitive infrastructure metrics
- Run proxy as non-root user; restrict filesystem (see ProtectSystem/NoNewPrivileges)

## 7. Health & Observability
- `/api/health` returns `{ ok, height, peers, updatedAt, error }`
- Add external uptime check: expect HTTP 200 and `ok:true`
- Log output: structured JSON with ISO timestamps (ship to ELK / Loki)

## 8. Zero-Downtime Deploy Steps
1. Build new UI bundle
2. Copy to versioned dir: `/var/www/dytallix-dashboard-<gitsha>`
3. Update symlink `/var/www/dytallix-dashboard` -> new dir
4. `systemctl reload nginx`
5. (If proxy changed) `systemctl restart dytallix-metrics-proxy`

## 9. Rollback
- Point symlink back to previous directory
- Restart Nginx (if necessary)
- Confirm `/api/health` OK

## 10. Future Enhancements
- USE_UPSTREAM_WS toggle to bridge native streaming metrics
- Persistent cache (Redis) for overview snapshots
- AuthN/Z (JWT or API key) for sensitive fields
- Enhanced timeseries via real Prometheus range queries

---
Maintained by Dytallix Release Engineering.
