# API

Base URL (compose): `https://localhost:8443/api`

All endpoints below require a Bearer token except login/refresh/health.

## Auth

### Login

```bash
curl -sk https://localhost:8443/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"admin@local","password":"ChangeMe!12345"}'
```

## Targets

### Create TLS target

```bash
curl -sk https://localhost:8443/api/targets \
  -H "authorization: Bearer $ACCESS" \
  -H 'content-type: application/json' \
  -d '{"name":"Example TLS","type":"TLS","environment":"prod","address":"example.com","port":443}'
```

## Scans

### Start scan

```bash
curl -sk https://localhost:8443/api/scans \
  -H "authorization: Bearer $ACCESS" \
  -H 'content-type: application/json' \
  -d '{"target_id":"TARGET_ID"}'
```

## Assets

### Upload secret

```bash
curl -sk https://localhost:8443/api/assets/ASSET_ID/secrets \
  -H "authorization: Bearer $ACCESS" \
  -H 'content-type: application/json' \
  -d '{"secret_b64":"<base64-raw>","secret_type":"BLOB"}'
```

## Anchors

```bash
curl -sk https://localhost:8443/api/anchors \
  -H "authorization: Bearer $ACCESS" \
  -H 'content-type: application/json' \
  -d '{"name":"anchor-1","environment":"prod"}'
```

## Wrap & Attest

```bash
curl -sk https://localhost:8443/api/wrap \
  -H "authorization: Bearer $ACCESS" \
  -H 'content-type: application/json' \
  -d '{"asset_ids":["ASSET_ID"]}'

curl -sk https://localhost:8443/api/attest \
  -H "authorization: Bearer $ACCESS" \
  -H 'content-type: application/json' \
  -d '{"asset_ids":["ASSET_ID"]}'
```
