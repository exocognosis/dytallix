# Dytallix Service Port Configuration

## Fixed Port Assignments

| Service | Port | URL | Description |
|---------|------|-----|-------------|
| **Frontend** | 3000 | http://localhost:3000 | React/Vite frontend |
| **Blockchain Core** | 3030 | http://localhost:3030 | Rust blockchain node |
| **QuantumVault API** | 3031 | http://localhost:3031 | Node.js QuantumVault service |
| **Advanced API** | 8787 | http://localhost:8787 | Advanced blockchain API |
| **Backend API** | 8080 | http://localhost:8080 | Main backend service |
| **WebSocket** | 9000 | ws://localhost:9000 | Real-time updates |

## Environment Variables

```bash
# Frontend
VITE_PORT=3000
VITE_API_URL=http://localhost:8787
VITE_QUANTUMVAULT_API_URL=http://localhost:3031
VITE_BLOCKCHAIN_URL=http://localhost:3030
VITE_WEBSOCKET_URL=ws://localhost:9000

# Blockchain Core
BLOCKCHAIN_PORT=3030
BLOCKCHAIN_RPC_PORT=3030

# QuantumVault API
QUANTUMVAULT_PORT=3031

# Advanced API
ADVANCED_API_PORT=8787

# Backend API
BACKEND_PORT=8080

# WebSocket
WEBSOCKET_PORT=9000
```

## No More Random Ports!

- All services now have fixed, documented ports
- Port conflicts are resolved by proper service management
- Each service checks if its port is available before starting
- Clear error messages if ports are in use
