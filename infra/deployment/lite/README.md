Lite Dytallix Testnet Deployment

Services:
- node: single dytallix-lean node (RPC + Prometheus metrics)
- frontend: nginx serving existing built frontend from ../../frontend/dist-testnet, proxies /rpc to node
- prometheus: scrapes node metrics
- grafana: manual datasource setup (Prometheus at http://prometheus:9090)

Prereqs:
- Docker and Docker Compose installed
- Frontend build present at frontend/dist-testnet (run `npm run build:testnet` in frontend if needed)

Usage:
1) Build and start
   docker compose -f deployment/lite/docker-compose.yml up -d --build

2) Open
   Frontend: http://<host>:8080
   Prometheus: http://<host>:9090
   Grafana: http://<host>:3000 (user/pass: admin/admin or set GRAFANA_USER/GRAFANA_PASSWORD env)

3) Stop
   docker compose -f deployment/lite/docker-compose.yml down
