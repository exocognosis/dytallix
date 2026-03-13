# 📋 QuantumVault - Complete Index

> **Quick Start:** Run `./start.sh` to launch everything!

---

## 🚀 Management Scripts (Executable)

### Essential Scripts
| Script | Purpose | Command |
|--------|---------|---------|
| **start.sh** | Start all services | `./start.sh` |
| **stop.sh** | Stop all services | `./stop.sh` |
| **status.sh** | Check service health | `./status.sh` |
| **demo.sh** | Interactive demo | `./demo.sh` |

### Development Scripts
| Script | Purpose | Command |
|--------|---------|---------|
| **run_tests.sh** | Run test suite | `./run_tests.sh` |
| **verify_crypto_deps.sh** | Verify PQC libraries | `./verify_crypto_deps.sh` |
| **examples_curl.sh** | API usage examples | `./examples_curl.sh` |
| **quickstart.sh** | Quick workflow demo | `./quickstart.sh` |

---

## 📚 Documentation Files

### User Documentation
| File | Description | For |
|------|-------------|-----|
| **[QUICKSTART.md](./QUICKSTART.md)** | Quick reference guide | Quick lookups |
| **[SCRIPTS.md](./SCRIPTS.md)** | Script documentation | Understanding scripts |
| **[README.md](./README.md)** | Complete documentation | Full details |
| **[COMPLETION_SUMMARY.md](./COMPLETION_SUMMARY.md)** | Project status | Current state |

### Technical Documentation
| File | Description | For |
|------|-------------|-----|
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | System architecture | Understanding design |
| **[CRYPTO_VERIFICATION.md](./CRYPTO_VERIFICATION.md)** | Cryptography verification | Security audit |

---

## 🌐 Access Points

| Service | URL | Status |
|---------|-----|--------|
| **Web UI** | http://localhost:5173 | Frontend |
| **Backend API** | http://localhost:8080 | REST API |
| **Health Check** | http://localhost:8080/health | Status |
| **PostgreSQL** | localhost:5432 | Database |

---

## 📁 Project Structure

```
quantumvault/
├── 🚀 Management Scripts
│   ├── start.sh              # Start all services ⭐
│   ├── stop.sh               # Stop all services
│   ├── status.sh             # Check status
│   └── demo.sh               # Interactive demo
│
├── 📚 Documentation
│   ├── QUICKSTART.md         # Quick reference ⭐
│   ├── README.md             # Full documentation
│   ├── SCRIPTS.md            # Script details
│   ├── COMPLETION_SUMMARY.md # Project status
│   ├── ARCHITECTURE.md       # System design
│   └── CRYPTO_VERIFICATION.md # Security docs
│
├── 🦀 Backend (Rust)
│   ├── src/
│   │   ├── main.rs           # Entry point
│   │   ├── domain/           # Core models
│   │   ├── application/      # Business logic
│   │   └── infrastructure/   # API, crypto, DB
│   ├── Cargo.toml            # Dependencies
│   └── migrations/           # Database schema
│
├── ⚛️ Frontend (React)
│   ├── src/
│   │   ├── App.tsx           # Main UI ⭐
│   │   └── main.tsx          # Entry point
│   ├── package.json          # Dependencies
│   └── vite.config.ts        # Vite config
│
├── 🐳 Docker
│   ├── docker-compose.yml    # Multi-container setup
│   ├── Dockerfile            # Backend image
│   └── Dockerfile.node       # Frontend image
│
└── ⚙️ Configuration
    ├── .env                  # Environment variables
    ├── .env.example          # Template
    └── .gitignore
```

---

## 🎯 Common Tasks

### Getting Started
```bash
# 1. Start everything
./start.sh

# 2. Check status
./status.sh

# 3. Run demo
./demo.sh

# 4. Open UI
open http://localhost:5173
```

### Daily Development
```bash
# Start services
./start.sh

# Make changes to code...

# Check logs
tail -f backend.log
tail -f frontend.log

# Test changes
curl http://localhost:8080/health

# Stop when done
./stop.sh
```

### Testing
```bash
# Run backend tests
./run_tests.sh

# Verify crypto
./verify_crypto_deps.sh

# Test API
./examples_curl.sh

# Full demo
./demo.sh
```

### Troubleshooting
```bash
# Check what's running
./status.sh

# View logs
tail -f backend.log frontend.log

# Restart everything
./stop.sh
./start.sh
```

---

## 🔐 API Key

Default API key for development:
```
X-API-Key: dev-api-key-change-in-production
```

⚠️ **Change this before production!**

---

## 📊 Features

✅ **Real PQC Cryptography**
- Kyber (KEM)
- Dilithium (Signatures)
- Falcon (Compact signatures)
- SPHINCS+ (Hash-based)

✅ **Hybrid Protection**
- PQC + Classical
- Defense-in-depth

✅ **Asset Management**
- Registration
- Risk scoring
- Protection tracking

✅ **Audit Trail**
- Tamper-evident
- Hash-chained
- Immutable

✅ **Modern UI**
- React + TypeScript
- Responsive design
- Real-time updates

✅ **REST API**
- Full CRUD operations
- Authentication
- JSON responses

---

## 🛠️ Development Commands

### Backend
```bash
# Build
cargo build --release

# Run
cargo run --release

# Test
cargo test

# Check
cargo clippy
```

### Frontend
```bash
cd frontend

# Install
npm install

# Dev server
npm run dev

# Build
npm run build

# Preview
npm run preview
```

### Database
```bash
# Start
docker-compose up -d postgres

# Logs
docker-compose logs -f postgres

# Stop
docker-compose stop postgres

# Reset (⚠️ deletes data)
docker-compose down -v
```

---

## 📖 Learning Path

1. **Start Here**: [QUICKSTART.md](./QUICKSTART.md)
2. **Run Services**: `./start.sh`
3. **Try Demo**: `./demo.sh`
4. **Explore UI**: http://localhost:5173
5. **Read Docs**: [README.md](./README.md)
6. **Understand Scripts**: [SCRIPTS.md](./SCRIPTS.md)
7. **Review Architecture**: [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## 🎓 Resources

### Documentation
- [QUICKSTART.md](./QUICKSTART.md) - Quick reference
- [README.md](./README.md) - Full documentation
- [SCRIPTS.md](./SCRIPTS.md) - Script guide
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design

### Scripts
- `./start.sh` - Start services
- `./status.sh` - Check status
- `./demo.sh` - Run demo
- `./stop.sh` - Stop services

### Logs
- `backend.log` - Backend logs
- `frontend.log` - Frontend logs
- `docker-compose logs postgres` - Database logs

---

## 🚨 Important Notes

### Before Production
1. Change API key in `.env`
2. Generate new MASTER_ENCRYPTION_KEY
3. Use strong PostgreSQL password
4. Enable HTTPS/TLS
5. Configure firewall
6. Set up monitoring
7. Review security checklist

### Data Persistence
- PostgreSQL data is in Docker volumes
- Preserved across restarts
- Use `docker-compose down -v` to delete

### Port Usage
- 5432: PostgreSQL
- 8080: Backend API
- 5173: Frontend UI

---

## ✨ Quick Tips

💡 **Fastest start:** `./start.sh`  
💡 **Check status:** `./status.sh`  
💡 **See logs:** `tail -f backend.log frontend.log`  
💡 **Run demo:** `./demo.sh`  
💡 **Stop all:** `./stop.sh`  
💡 **Open UI:** `open http://localhost:5173`  
💡 **API health:** `curl http://localhost:8080/health`

---

**Status:** 🟢 **PRODUCTION-READY MVP**

All systems operational with real PQC cryptography! 🔒🚀
