# Helm

This Helm chart deploys **backend** and **frontend** services.

It intentionally does not bundle Postgres/Vault/EVM dependencies; use managed services or your platform equivalents.

## Install

```bash
helm install quantumvault ./infra/helm/quantumvault \
  --set backend.env.QV_DB_DSN='postgres://...' \
  --set backend.env.QV_JWT_SECRET='...' \
  --set frontend.env.NEXT_PUBLIC_API_BASE='https://.../api'
```
