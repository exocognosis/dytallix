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
        PORT: 3000
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

## 3. Nginx Configuration

Edit your Nginx configuration (usually `/etc/nginx/sites-available/dytallix.com`) to add the location blocks.

```nginx
server {
    listen 80;
    server_name www.dytallix.com dytallix.com;

    # Frontend: Serve under /QuantumVaultMVP
    location /QuantumVaultMVP {
        proxy_pass http://localhost:13002/QuantumVaultMVP;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API: Serve under /api
    # Adjust valid origin in backend CORS config if needed
    location /api {
        proxy_pass http://localhost:13000/api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 4. Final Steps

1.  **Restart Nginx**: `sudo systemctl restart nginx`
2.  **Verify Access**: Navigate to `http://www.dytallix.com/QuantumVaultMVP`
3.  **Login**: Ensure you can log in. If `api.ts` in frontend points to `localhost:13000`, you might need to rebuild the frontend with `NEXT_PUBLIC_API_URL=https://www.dytallix.com/api/v1` in your `.env.local` or environment variables.

### Critical Note on API URL
In production, your frontend running in the browser needs to reach the backend.
Make sure `frontend/.env.local` (or server environment variable) has:
```
NEXT_PUBLIC_API_URL=https://www.dytallix.com/api/v1
```
(Changing this requires a frontend rebuild: `npm run build`)
