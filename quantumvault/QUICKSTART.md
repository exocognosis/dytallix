# QuantumVault - Quick Reference Guide

## 🎯 One-Command Operations

### Starting QuantumVault
```bash
./start.sh
```
**What it does:**
- ✅ Starts PostgreSQL (Docker)
- ✅ Builds & starts Rust backend (port 8080)
- ✅ Installs & starts React frontend (port 5173)
- ✅ Displays URLs and helpful commands

### Checking Status
```bash
./status.sh
```
**Shows:**
- ✅ PostgreSQL status (port 5432)
- ✅ Backend API status (port 8080)
- ✅ Frontend UI status (port 5173)

### Running Demo
```bash
./demo.sh
```
**Demonstrates:**
1. Creating a PQC policy
2. Registering an asset
3. Applying protection
4. Viewing audit trail

### Stopping Everything
```bash
./stop.sh
```
**Stops:**
- Frontend server
- Backend server
- PostgreSQL container (data preserved)

---

## 🌐 Access Points

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:5173 | Web UI (React) |
| **Backend** | http://localhost:8080 | REST API |
| **Health** | http://localhost:8080/health | Health check |
| **PostgreSQL** | localhost:5432 | Database |

---

## 🔑 API Quick Reference

All requests require API key header:
```bash
-H "X-API-Key: dev-api-key-change-in-production"
```

### Common Endpoints

**List Assets:**
```bash
curl -H "X-API-Key: dev-api-key-change-in-production" \
  http://localhost:8080/api/assets | jq
```

**List Policies:**
```bash
curl -H "X-API-Key: dev-api-key-change-in-production" \
  http://localhost:8080/api/policies | jq
```

**View Audit Log:**
```bash
curl -H "X-API-Key: dev-api-key-change-in-production" \
  "http://localhost:8080/api/audit?limit=10" | jq
```

**Health Check:**
```bash
curl http://localhost:8080/health
```

---

## 📊 Web UI Navigation

### Home Page
- Platform overview
- Feature list
- API status
- Quick links

**URL:** http://localhost:5173/

### Assets Page
- View all cryptographic assets
- See protection status
- Risk scores
- Encryption profiles

**URL:** http://localhost:5173/assets

### Policies Page
- Browse PQC policies
- View algorithm choices (KEM, Signature, Symmetric)
- See encryption modes (hybrid, pqc, classical)
- Check rotation intervals

**URL:** http://localhost:5173/policies

### Audit Log Page
- Tamper-evident event trail
- Cryptographic hash chains
- Event types and actors
- Timestamps

**URL:** http://localhost:5173/audit

---

## 🔐 PQC Algorithms Available

### Key Encapsulation (KEM)
- `kyber512` - NIST Level 1 (~AES-128)
- `kyber768` - NIST Level 3 (~AES-192) ⭐ Recommended
- `kyber1024` - NIST Level 5 (~AES-256) 🔒 Maximum Security
- `x25519` - Classical ECDH (for comparison)

### Digital Signatures
- `dilithium2` - NIST Level 2
- `dilithium3` - NIST Level 3 ⭐ Recommended
- `dilithium5` - NIST Level 5 🔒 Maximum Security
- `falcon512` - Compact signatures
- `falcon1024` - Larger, more secure
- `sphincsplus_*` - Hash-based (stateless)
- `ed25519` - Classical (for comparison)

### Symmetric Encryption
- `aes256gcm` - AES-256 in GCM mode ⭐ Standard
- `chacha20poly1305` - ChaCha20-Poly1305 (alternative)

### Modes
- `hybrid` - PQC + Classical (defense-in-depth) ⭐ Recommended
- `pqc` - Pure post-quantum
- `classical` - Classical only (baseline)

---

## 📝 Typical Workflows

### First Time Setup
```bash
# 1. Start services
./start.sh

# 2. Verify everything is running
./status.sh

# 3. Run interactive demo
./demo.sh

# 4. Open web UI
open http://localhost:5173
```

### Daily Development
```bash
# Start services
./start.sh

# Check status anytime
./status.sh

# View logs
tail -f backend.log
tail -f frontend.log

# Stop when done
./stop.sh
```

### Testing API
```bash
# Start services
./start.sh

# Use curl for API calls
curl -H "X-API-Key: dev-api-key-change-in-production" \
  http://localhost:8080/api/assets | jq

# Or use the demo script
./demo.sh
```

---

## 📁 Log Files

| File | Description | View Command |
|------|-------------|--------------|
| `backend.log` | Backend API logs | `tail -f backend.log` |
| `frontend.log` | Frontend dev server logs | `tail -f frontend.log` |
| PostgreSQL | Docker logs | `docker-compose logs -f postgres` |

---

## 🔧 Troubleshooting

### Services won't start
```bash
# Check status
./status.sh

# Check logs
tail -f backend.log
tail -f frontend.log

# Restart everything
./stop.sh
./start.sh
```

### Port already in use
```bash
# Find what's using the port
lsof -i :8080  # Backend
lsof -i :5173  # Frontend
lsof -i :5432  # PostgreSQL

# Kill the process
kill <PID>

# Or use stop script
./stop.sh
```

### Database issues
```bash
# Check PostgreSQL status
docker-compose ps postgres

# View PostgreSQL logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres

# Reset database (WARNING: deletes data)
docker-compose down -v
docker-compose up -d postgres
```

### Frontend shows blank page
```bash
# Check backend is running
curl http://localhost:8080/health

# Check frontend logs
tail -f frontend.log

# Check browser console for errors
# Open DevTools (F12) and check Console tab
```

---

## 🎯 Quick Commands

```bash
# Start all services
./start.sh

# Check status
./status.sh

# Run demo
./demo.sh

# Stop all services
./stop.sh

# View backend logs
tail -f backend.log

# View frontend logs
tail -f frontend.log

# View all logs
tail -f backend.log frontend.log

# PostgreSQL logs
docker-compose logs -f postgres

# Restart PostgreSQL
docker-compose restart postgres

# Health check
curl http://localhost:8080/health

# List assets
curl -H "X-API-Key: dev-api-key-change-in-production" \
  http://localhost:8080/api/assets | jq

# Open web UI
open http://localhost:5173
```

---

## 📚 Documentation

- **Main README**: [README.md](./README.md) - Complete documentation
- **Scripts Guide**: [SCRIPTS.md](./SCRIPTS.md) - Detailed script documentation
- **Completion Summary**: [COMPLETION_SUMMARY.md](./COMPLETION_SUMMARY.md) - Project status

---

## 🚀 Production Deployment

Before going to production:

1. ✅ Change default API key in `.env`
2. ✅ Use strong PostgreSQL password
3. ✅ Generate new MASTER_ENCRYPTION_KEY: `openssl rand -hex 32`
4. ✅ Enable HTTPS/TLS
5. ✅ Configure firewall rules
6. ✅ Set up monitoring
7. ✅ Review security checklist in README.md

---

**Need Help?**

1. Check logs: `tail -f backend.log frontend.log`
2. Run status check: `./status.sh`
3. View documentation: [README.md](./README.md)
4. Review scripts guide: [SCRIPTS.md](./SCRIPTS.md)

**System Status:** 🟢 ALL SYSTEMS GO!
