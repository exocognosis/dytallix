# Dytallix Deployment Guide

## Overview
This document describes staging & production deployment using:
- Nginx (TLS termination, HSTS, CSP)
- Docker Compose (frontend, backend, proxy)
- Strict environment variable contract
- Structured logging with rotation
- Health & CORS validation steps

## 1. Prerequisites
- Domain(s): dytallix.com (+ staging if used)
- DNS A/AAAA -> server
- TLS certificates (Let's Encrypt / ACME). For nginx: `/etc/letsencrypt/live/dytallix.com/{fullchain.pem,privkey.pem}`
- Node 20 & Docker / compose plugin
- Secrets stored outside repo (export or manager)

## 2. Build Frontend
```bash
export $(grep -v '^#' dytallix-lean-launch/.env.production | xargs) # or source securely
bash scripts/verify_env.sh production
npm ci
npm run build
```
Artifacts: `dytallix-lean-launch/dist/`

## 3. Backend Environment
Create `dytallix-lean-launch/.env.production` (never commit):
```
NODE_ENV=production
PORT=8787
ALLOWED_ORIGINS=https://dytallix.com,https://www.dytallix.com
VITE_API_URL=https://api.dytallix.com
VITE_FAUCET_API_URL=https://api.dytallix.com/api/faucet
VITE_LCD_HTTP_URL=...
VITE_RPC_HTTP_URL=...
VITE_RPC_WS_URL=...
VITE_CHAIN_ID=dytallix-mainnet-1
ENABLE_SEC_HEADERS=1
ENABLE_CSP=1
LOG_LEVEL=info
LOG_DIR=/var/log/dytallix
LOG_ROTATE_DAYS=7
```
Do NOT include mnemonics or secrets unless absolutely required (prefer external signer / vault).

## 4. Deploy with Docker Compose
```bash
cd deploy
docker compose -f docker-compose.prod.yaml up -d --build
docker compose ps
```

## 5. Nginx Alternative (Bare Metal)
Copy `deploy/nginx.conf` to `/etc/nginx/nginx.conf` and reload:
```bash
nginx -t && systemctl reload nginx
```
`/var/www/dytallix` must contain built `dist` contents.

## 6. Caddy Option
```bash
caddy validate --config deploy/Caddyfile
caddy reload --config deploy/Caddyfile
```

## 7. Health Check
```bash
curl -s https://api.dytallix.com/api/health | jq
```
Expect: `{ ok: true, version, commit, chainId }`.

## 8. CORS Preflight
```bash
ORIGIN=https://dytallix.com bash scripts/test_cors.sh https://api.dytallix.com
```
Allowed origin returns ACAO header. Unlisted origin must fail (no ACAO).

## 9. Logging
Logs rotate daily at size 10M: `/var/log/dytallix/app.log` + gzip archives.
```bash
docker compose logs -f backend | jq .
```

## 10. TLS / SSL Labs Validation
Run external scan (https://www.ssllabs.com/ssltest/). Expect HSTS preload, strong ciphers.

## 11. Production Build Guard
CI workflow `.github/workflows/env-sanity.yml` fails if mandatory env absent or insecure.

## 12. Mixed Content Audit
Load https://dytallix.com in browser devtools: no mixed content warnings.

## 13. Secret Hygiene
Audit potential mnemonic leakage:
```bash
git grep -i 'mnemonic' | grep -v example || true
```
Rotate any exposed accounts.

## 14. Rollback
List images & redeploy older tag:
```bash
docker images | grep dytallix
# Then
docker compose -f deploy/docker-compose.prod.yaml down
FRONTEND_TAG=prev BACKEND_TAG=prev docker compose -f deploy/docker-compose.prod.yaml up -d
```

## 15. Staging Differences
Use `.env.staging.example` template & domain `staging.dytallix.com`. Lower log retention.

## 16. Future Hardening (Post-PR)
- WAF / rate limiting at proxy
- Centralized log shipping (Loki / ELK)
- mTLS internal traffic
- Web Application Security Testing (DAST/SAST integration)

## Verification Matrix
| Check | Command | Expected |
|-------|---------|----------|
| Health | curl /api/health | 200 ok true |
| CORS allowed | scripts/test_cors.sh | 200 + ACAO |
| CORS denied | change ORIGIN | Denied |
| Logs | tail log | Structured JSON |
| Build guard | unset VITE_API_URL | Fail |
| SSL | SSL Labs | A grade |
| Mixed content | Browser | None |

---
All sensitive values injected at runtime only.