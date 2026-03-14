# Deployment Guide: QuantumVaultMVP

This guide describes how to deploy the **QuantumVaultMVP** application to a Linux server (Ubuntu/Debian) to be accessible at `https://www.dytallix.com/QuantumVaultMVP`.

## Prerequisites

*   Node.js v18+ installed
*   Nginx installed
*   PM2 installed globally (`npm install -g pm2`)
*   PostgreSQL running (or accessible via connection string)

## 1. Build the Applications

Navigate to the project root on your server and run the following commands to build both the frontend and backend.

```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Build Backend
cd ../backend
npm run build

# Build Frontend
# NOTE: This will build the app with the base path /QuantumVaultMVP
cd ../frontend
npm run build
```

## 2. Configure Process Manager (PM2)

Create a `ecosystem.config.js` file in the root directory to manage both processes.

```javascript
module.exports = {
  apps: [
    {
      name: "qv-backend",
      script: "./backend/dist/main.js",
      env: {
        NODE_ENV: "production",
        PORT: 13000,
        // Add other backend env vars here
      }
    },
    {
      name: "qv-frontend",
      script: "npm",
      args: "start",
      cwd: "./frontend",
      env: {
        NODE_ENV: "production",
        PORT: 13002,
        NEXT_PUBLIC_BASE_PATH: "/QuantumVaultMVP"
      }
    }
  ]
};
```

Start the services:
```bash
pm2 start ecosystem.config.js
pm2 save
```

The production frontend is expected on port `13002`, and the backend is expected on port `13000`.

For the internal secure-access path, the backend process also needs:

```bash
ENTERPRISE_IDP_PROVIDER=azure_ad
ENTERPRISE_IDP_JWKS_URL=https://login.microsoftonline.com/<tenant>/discovery/v2.0/keys
ENTERPRISE_IDP_ISSUER=https://login.microsoftonline.com/<tenant>/v2.0
ENTERPRISE_IDP_AUDIENCE=<enterprise-app-audience>
ENTERPRISE_STEP_UP_JWKS_URL=https://login.microsoftonline.com/<tenant>/discovery/v2.0/keys
ENTERPRISE_STEP_UP_ISSUER=https://login.microsoftonline.com/<tenant>/v2.0
ENTERPRISE_STEP_UP_AUDIENCE=<step-up-audience>
DEVICE_ATTESTATION_JWKS_URL=https://device-attestation.internal.example/.well-known/jwks.json
DEVICE_ATTESTATION_ISSUER=https://device-attestation.internal.example
DEVICE_ATTESTATION_AUDIENCE=quantumvault
ACCESS_AUDIT_ANCHOR_EVENTS=ACCESS_REQUEST,APPROVAL,DENIAL,SESSION_START,SESSION_END,REVOCATION
SIEM_EXPORT_ENABLED=true
SIEM_EXPORT_URL=https://splunk.internal.example/services/collector
SIEM_EXPORT_FORMAT=splunk_hec
SIEM_EXPORT_AUTH_TOKEN=<siem-hec-token>
AUTH_COOKIE_SECURE=true
STORAGE_BACKEND=s3
OBJECT_STORAGE_BUCKET=quantumvault
OBJECT_STORAGE_ENDPOINT=https://minio.internal.example
OBJECT_STORAGE_REGION=us-east-1
OBJECT_STORAGE_ACCESS_KEY_ID=<storage-access-key>
OBJECT_STORAGE_SECRET_ACCESS_KEY=<storage-secret-key>
MONITORING_BEARER_TOKEN=<internal-scrape-token>
GRAFANA_ADMIN_PASSWORD=<grafana-admin-password>
```

## 3. Nginx Configuration

Edit your Nginx configuration (usually `/etc/nginx/sites-available/dytallix.com`) to add the location blocks.

```nginx
server {
    listen 80;
    server_name www.dytallix.com dytallix.com;

  location = /api/v1 {
    return 301 /api/v1/;
  }

  # Browser requests from the QuantumVault frontend may call /api/v1 directly.
  location ^~ /api/v1/ {
    proxy_pass http://localhost:13000/api/v1/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

  location = /QuantumVaultMVP/api/v1 {
    return 301 /QuantumVaultMVP/api/v1/;
  }

  # Backend API: Serve under the app namespace to avoid collisions with the main site API
  location ^~ /QuantumVaultMVP/api/v1/ {
    proxy_pass http://localhost:13000/api/v1/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

  # Frontend: Serve under /QuantumVaultMVP
  location ^~ /QuantumVaultMVP {
    proxy_pass http://localhost:13002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 4. Final Steps

1.  **Restart Nginx**: `sudo systemctl restart nginx`
2.  **Verify Access**: Navigate to `http://www.dytallix.com/QuantumVaultMVP`
3.  **Login**: Ensure you can log in. The public host should expose both `/api/v1/*` and `/QuantumVaultMVP/api/v1/*` to the QuantumVault backend so older frontend bundles and namespaced routes both work.
4.  **Enterprise exchange**: Verify `POST /api/v1/auth/enterprise/exchange` succeeds with a real enterprise IdP token.
5.  **Trusted posture headers**: Ensure only the corporate ingress tier can inject `x-qv-device-id`, `x-qv-device-compliance`, `x-qv-device-trust`, `x-qv-network-zone`, and `x-qv-location`.
6.  **Storage backend**: Verify `GET /api/v1/storage/backend` reports the intended backend as available.
7.  **Monitoring**: Verify `GET /api/v1/monitoring/metrics` and `GET /api/v1/monitoring/runtime` are reachable only with the monitoring bearer token or from private network sources.
8.  **Controlled viewer**: Verify `POST /api/v1/access/sessions/:id/view` returns `viewerToken` + `viewerUrl` for L3/L4 assets and that `GET /api/v1/access/sessions/:id/viewer` renders watermarked HTML without raw JSON payload.
9.  **SIEM export**: Verify the `siem-export` BullMQ queue drains successfully and your SIEM receives `qv.audit.siem.v1` payloads.
10. **Observability stack**: If using Compose, verify Prometheus (`:9090`), Grafana (`:3002`), and the OpenTelemetry Collector (`:4317`, `:4318`, `:9464`) are reachable on the internal network.

### Critical Note on API URL
In production, your frontend running in the browser needs to reach the backend.
This app uses a Next.js rewrite for `/api/v1/*`, so the host Nginx config must forward `/api/v1/*` to port `13000` before the general `/api/*` block. Keep the app namespace route as well:
```
NEXT_PUBLIC_BASE_PATH=/QuantumVaultMVP
```
(Changing the frontend build requires `npm run build`; changing the Nginx proxy only requires `nginx -t && systemctl reload nginx`.)
