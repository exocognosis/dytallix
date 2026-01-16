Sun Dec 28 08:10:02 MST 2025

## Git
quantumvaultmvp-remediation-2025-12-28
bf5a01e7a04325efba30f0c51b0c7fdd6bcef13a

## Compose config
time="2025-12-28T08:10:02-07:00" level=warning msg="/Users/rickglenn/Desktop/dytallix/QuantumVaultMVP/infra/docker-compose.yml: the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion"
compose config: OK

## Compose up
time="2025-12-28T08:10:02-07:00" level=warning msg="/Users/rickglenn/Desktop/dytallix/QuantumVaultMVP/infra/docker-compose.yml: the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion"
 Container quantumvault-vault  Running
 Container quantumvault-redis  Running
 Container quantumvault-postgres  Running
 Container quantumvault-backend  Running
 Container quantumvault-frontend  Running
 Container quantumvault-postgres  Waiting
 Container quantumvault-redis  Waiting
 Container quantumvault-vault  Waiting
 Container quantumvault-vault  Healthy
 Container quantumvault-postgres  Healthy
 Container quantumvault-redis  Healthy

## Compose ps
time="2025-12-28T08:10:03-07:00" level=warning msg="/Users/rickglenn/Desktop/dytallix/QuantumVaultMVP/infra/docker-compose.yml: the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion"
NAME                    IMAGE                    COMMAND                  SERVICE    CREATED        STATUS                  PORTS
quantumvault-backend    infra-backend            "docker-entrypoint.s…"   backend    15 hours ago   Up 15 hours (healthy)   0.0.0.0:13000->3000/tcp, [::]:13000->3000/tcp
quantumvault-frontend   infra-frontend           "docker-entrypoint.s…"   frontend   15 hours ago   Up 15 hours (healthy)   0.0.0.0:3001->3000/tcp, [::]:3001->3000/tcp
quantumvault-postgres   postgres:15-alpine       "docker-entrypoint.s…"   postgres   25 hours ago   Up 15 hours (healthy)   0.0.0.0:5432->5432/tcp, [::]:5432->5432/tcp
quantumvault-redis      redis:7-alpine           "docker-entrypoint.s…"   redis      25 hours ago   Up 15 hours (healthy)   0.0.0.0:6379->6379/tcp, [::]:6379->6379/tcp
quantumvault-vault      hashicorp/vault:latest   "docker-entrypoint.s…"   vault      25 hours ago   Up 15 hours (healthy)   0.0.0.0:8200->8200/tcp, [::]:8200->8200/tcp

## E2E
================================
QuantumVault MVP E2E Test Suite
================================

Starting E2E tests at Sun Dec 28 08:10:04 MST 2025

[1;33mℹ INFO[0m: Testing system health...
[0;31m✗ FAIL[0m: Backend is not responding
[1;33mℹ INFO[0m: Testing admin login...
[0;31m✗ FAIL[0m: Admin login failed
Response: {"error":"Invalid credentials"}

## Triage notes (baseline root causes)

- `scripts/e2e.sh` defaults `API_URL` to `http://localhost:3000/api/v1`, but compose publishes the backend on `http://localhost:13000`.
- Backend container does not run `prisma db seed`, so `admin@quantumvault.local / QuantumVault2024!` may not exist on a fresh DB.
