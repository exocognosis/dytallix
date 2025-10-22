# Dytallix Fixed Port Configuration

This directory contains the fixed port configuration to eliminate the chaos of constantly changing ports during development.

## 🎯 Fixed Port Assignments

| Service | Port | URL | Description |
|---------|------|-----|-------------|
| **Frontend** | `3000` | http://localhost:3000 | React app (Vite dev server) |
| **Backend API** | `8787` | http://localhost:8787 | API proxy server |
| **Blockchain Node** | `3030` | http://localhost:3030 | Rust blockchain core |
| **QuantumVault API** | `3031` | http://localhost:3031 | QuantumVault microservice |

## 🚀 Quick Start

### Start All Services
```bash
./start-fixed-ports.sh
```

### Stop All Services  
```bash
./stop-services.sh
```

### Stop All Services + Clean Logs
```bash
./stop-services.sh --clean-logs
```

## 📁 Files

- **`.env.local`** - Fixed port environment variables
- **`start-fixed-ports.sh`** - Starts all services with fixed ports
- **`stop-services.sh`** - Stops all services cleanly
- **`logs/`** - Service log files directory

## 🔧 Configuration

The fixed ports are configured in:

1. **`.env.local`** - Environment variables
2. **`frontend/vite.config.js`** - Frontend port and API proxies
3. **`frontend/package.json`** - Vite dev server port

## 🐛 Troubleshooting

### Port Already in Use
The startup script automatically kills processes on the required ports before starting new ones.

### Service Won't Start
Check the log files in the `logs/` directory:
- `logs/blockchain.log` - Blockchain node logs
- `logs/quantumvault.log` - QuantumVault API logs  
- `logs/backend.log` - Backend API logs

### Reset Everything
```bash
./stop-services.sh --clean-logs
./start-fixed-ports.sh
```

## 📝 Benefits

✅ **No more port chaos** - Services always run on the same ports  
✅ **Predictable URLs** - Easy to bookmark and share  
✅ **Proxy configuration** - Frontend properly proxies to backend services  
✅ **Clean shutdown** - Proper service lifecycle management  
✅ **Log management** - Centralized logging for all services  

## 🌐 API Endpoints

With the fixed port setup, your API endpoints are:

- **Blockchain RPC**: http://localhost:3030
- **QuantumVault API**: http://localhost:3031  
- **Backend API**: http://localhost:8787
- **Frontend**: http://localhost:3000

The frontend automatically proxies API calls to the correct backend services.
