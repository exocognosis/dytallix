# Dytallix Fast-Launch - Unified Port Configuration
# MASTER PORT ASSIGNMENT - All services use these standardized ports

## 🎯 **Final Port Assignments (No Conflicts)**

| Service | Port | URL | Description | Status |
|---------|------|-----|-------------|---------|
| **Frontend** | 3000 | http://localhost:3000 | React/Vite development server | ✅ Active |
| **Backend API** | 3001 | http://localhost:3001 | Faucet + Dashboard API | 🔄 Move from 8787 |
| **QuantumVault API** | 3002 | http://localhost:3002 | Encrypted storage service | 🔄 Move from 3031 |
| **Blockchain Node** | 3003 | http://localhost:3003 | Primary blockchain JSON-RPC | 🔄 Move from 3030 |
| **WebSocket** | 3004 | ws://localhost:3004 | Real-time updates | 🔄 Move from 9000 |

## 🐳 **Docker Compose Network (Internal)**

| Service | External Port | Internal Port | Description |
|---------|---------------|---------------|-------------|
| **Seed Node** | 3010 | 3030 | Blockchain seed node |
| **Validator 1** | 3011 | 3030 | Validator node 1 |
| **Validator 2** | 3012 | 3030 | Validator node 2 |
| **Validator 3** | 3013 | 3030 | Validator node 3 |
| **RPC Node** | 3014 | 3030 | Public RPC endpoint |

## 📊 **Monitoring & Metrics**

| Service | Port | Description |
|---------|------|-------------|
| **Node Metrics** | 9464-9468 | Prometheus metrics |
| **Health Checks** | Same as service | /health, /status endpoints |

## 🔧 **Environment Variables**

```bash
# Development Environment
FRONTEND_PORT=3000
BACKEND_API_PORT=3001
QUANTUMVAULT_API_PORT=3002
BLOCKCHAIN_NODE_PORT=3003
WEBSOCKET_PORT=3004

# Service URLs
FRONTEND_URL=http://localhost:3000
BACKEND_API_URL=http://localhost:3001
QUANTUMVAULT_API_URL=http://localhost:3002
BLOCKCHAIN_NODE_URL=http://localhost:3003
WEBSOCKET_URL=ws://localhost:3004

# Frontend API proxies
VITE_BACKEND_API_URL=http://localhost:3001
VITE_QUANTUMVAULT_API_URL=http://localhost:3002
VITE_BLOCKCHAIN_URL=http://localhost:3003
VITE_WEBSOCKET_URL=ws://localhost:3004

# Docker Network (containerized)
DOCKER_SEED_PORT=3010
DOCKER_VALIDATOR1_PORT=3011
DOCKER_VALIDATOR2_PORT=3012
DOCKER_VALIDATOR3_PORT=3013
DOCKER_RPC_PORT=3014
```

## 🚀 **Production Deployment**

```bash
# Production ports (behind nginx/load balancer)
FRONTEND_PROD_PORT=80
BACKEND_PROD_PORT=8001
QUANTUMVAULT_PROD_PORT=8002
BLOCKCHAIN_PROD_PORT=8003
WEBSOCKET_PROD_PORT=8004
```

## ⚠️ **Legacy Ports to Avoid**

- ~~3030~~ - Currently conflicts between blockchain and docker
- ~~3031~~ - QuantumVault moving to 3002
- ~~8787~~ - Backend moving to 3001  
- ~~9000~~ - WebSocket moving to 3004
- ~~5173~~ - Old Vite default, now using 3000

## 📋 **Migration Checklist**

### Files to Update:
- [ ] `/frontend/vite.config.js` - Update proxy targets
- [ ] `/server/index.js` - Change PORT from 8787 to 3001
- [ ] `/services/quantumvault-api/server.js` - Change PORT from 3031 to 3002
- [ ] `/start-all-services.sh` - Update all port variables
- [ ] `/.env*` files - Update environment variables
- [ ] `/docker-compose.yml` - Keep internal network, update external ports

### Frontend API Client Updates:
- [ ] `/frontend/src/lib/quantum/api.js` - Update base URLs
- [ ] `/frontend/src/lib/api.js` - Update backend URL
- [ ] `/frontend/src/components/IntegrationStatus.jsx` - Update health check URLs

### Documentation Updates:
- [ ] Replace PORTS.md with this file
- [ ] Update PORT_CONFIG.md to reference this file
- [ ] Update README.md with new port scheme

## 🎯 **Benefits of This Scheme**

1. **Sequential & Logical**: 3000-3004 for core services
2. **Docker Isolated**: 3010-3014 for containerized network
3. **Production Ready**: 8000+ range for external deployment
4. **No Conflicts**: Each service has unique, documented port
5. **Easy to Remember**: Frontend=3000, +1 for each service
6. **Monitoring Friendly**: Separate range for metrics

## 🔍 **Service Health Checks**

```bash
# Quick health check script
curl -s http://localhost:3000 && echo " ✅ Frontend"
curl -s http://localhost:3001/health && echo " ✅ Backend API"  
curl -s http://localhost:3002/health && echo " ✅ QuantumVault"
curl -s http://localhost:3003/status && echo " ✅ Blockchain"
curl -s http://localhost:3004 && echo " ✅ WebSocket"
```

---

**This is the SINGLE SOURCE OF TRUTH for port assignments.**  
All other port documentation files should reference this document.
