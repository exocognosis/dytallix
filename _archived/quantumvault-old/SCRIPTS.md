# QuantumVault Management Scripts

This directory contains convenient scripts to manage your QuantumVault deployment.

## Quick Start

```bash
# Start all services (PostgreSQL + Backend + Frontend)
./start.sh

# Check if services are running
./status.sh

# Stop all services
./stop.sh
```

## Available Scripts

### 🚀 start.sh
**Starts all QuantumVault services**

This script will:
1. Check prerequisites (Docker, Rust, Node.js)
2. Start PostgreSQL database (via Docker Compose)
3. Build and start the Rust backend API server
4. Install dependencies and start the React frontend

The services will run in the background, and logs will be saved to:
- `backend.log` - Backend API logs
- `frontend.log` - Frontend development server logs

**Usage:**
```bash
./start.sh
```

**What it does:**
- ✅ Validates prerequisites
- ✅ Creates `.env` from `.env.example` if needed
- ✅ Starts PostgreSQL on port 5432
- ✅ Starts backend API on port 8080
- ✅ Starts frontend UI on port 5173
- ✅ Waits for each service to be healthy before proceeding
- ✅ Displays service URLs and helpful commands

**After starting, access:**
- Web UI: http://localhost:5173
- Backend API: http://localhost:8080
- Health Check: http://localhost:8080/health

---

### 🔍 status.sh
**Check the status of all services**

This script checks if each service is running and responding:
- PostgreSQL database (port 5432)
- Backend API server (port 8080)
- Frontend web server (port 5173)

**Usage:**
```bash
./status.sh
```

**Example output:**
```
✓ PostgreSQL is running
✓ Backend is running (http://localhost:8080/health)
✓ Frontend is running (http://localhost:5173)
✓ All services are running! 🎉
```

---

### 🛑 stop.sh
**Stop all QuantumVault services**

This script will gracefully stop:
1. Frontend development server
2. Backend API server
3. PostgreSQL Docker container

**Usage:**
```bash
./stop.sh
```

**Note:** PostgreSQL data is preserved in Docker volumes. To completely remove data:
```bash
docker-compose down -v
```

---

### 🧪 verify_crypto_deps.sh
**Verify PQC cryptographic dependencies**

Checks that all required PQC libraries are properly installed:
- Kyber (KEM)
- Dilithium (Signatures)
- Falcon (Compact signatures)
- SPHINCS+ (Hash-based signatures)

**Usage:**
```bash
./verify_crypto_deps.sh
```

---

### 🧪 run_tests.sh
**Run backend test suite**

Executes the Rust test suite:
```bash
./run_tests.sh
```

Equivalent to:
```bash
cargo test --workspace
```

---

### 📝 examples_curl.sh
**API usage examples**

Contains curl commands demonstrating all API endpoints:
- Create policies
- Register assets
- Apply protection
- View audit trail

**Usage:**
```bash
./examples_curl.sh
```

---

### ⚡ quickstart.sh
**Quick demonstration**

Runs a complete workflow demonstration:
1. Creates a PQC policy
2. Registers an asset
3. Applies protection
4. Shows audit trail

**Usage:**
```bash
./quickstart.sh
```

---

## Typical Workflow

### First Time Setup
```bash
# 1. Start all services
./start.sh

# 2. Wait for services to be ready (status.sh)
./status.sh

# 3. Open browser to http://localhost:5173
open http://localhost:5173

# 4. (Optional) Run API examples
./examples_curl.sh
```

### Daily Development
```bash
# Start services
./start.sh

# ... do your work ...

# Check service health
./status.sh

# View logs
tail -f backend.log
tail -f frontend.log

# Stop when done
./stop.sh
```

### Troubleshooting
```bash
# Check what's running
./status.sh

# View backend logs
tail -f backend.log

# View frontend logs
tail -f frontend.log

# View PostgreSQL logs
docker-compose logs -f postgres

# Restart everything
./stop.sh
./start.sh
```

## Process Management

### Background Processes
When you run `./start.sh`, the backend and frontend run in the background with their PIDs saved to:
- `backend.pid` - Backend process ID
- `frontend.pid` - Frontend process ID

### Manual Process Management
```bash
# Kill backend manually
kill $(cat backend.pid)

# Kill frontend manually
kill $(cat frontend.pid)

# Or kill by port
lsof -ti:8080 | xargs kill  # Backend
lsof -ti:5173 | xargs kill  # Frontend
```

## Environment Configuration

Edit `.env` to customize:
```bash
# Database
DATABASE_URL=postgresql://quantumvault:secure_password@localhost/quantumvault_db

# API Security
API_KEY=your-secure-api-key-here

# Encryption
MASTER_ENCRYPTION_KEY=your-64-char-hex-key-here

# Server
HOST=127.0.0.1
PORT=8080
```

## Port Reference

| Service    | Port | URL                       |
|------------|------|---------------------------|
| PostgreSQL | 5432 | localhost:5432            |
| Backend    | 8080 | http://localhost:8080     |
| Frontend   | 5173 | http://localhost:5173     |

## Logs

All logs are stored in the quantumvault directory:
- `backend.log` - Backend API server logs
- `frontend.log` - Frontend development server logs

View logs in real-time:
```bash
# Backend
tail -f backend.log

# Frontend  
tail -f frontend.log

# Both
tail -f backend.log frontend.log

# PostgreSQL
docker-compose logs -f postgres
```

## Docker Commands

```bash
# View Docker containers
docker-compose ps

# Stop PostgreSQL
docker-compose stop postgres

# Start PostgreSQL
docker-compose up -d postgres

# Remove PostgreSQL and data
docker-compose down -v

# View PostgreSQL logs
docker-compose logs -f postgres
```

## Health Checks

```bash
# Backend health
curl http://localhost:8080/health

# Frontend health
curl http://localhost:5173

# PostgreSQL health
docker-compose ps postgres

# API with authentication
curl -H "X-API-Key: dev-api-key-change-in-production" \
  http://localhost:8080/api/assets
```

## Security Notes

⚠️ **Before deploying to production:**

1. Change the default API key in `.env`
2. Use a strong PostgreSQL password
3. Generate a new MASTER_ENCRYPTION_KEY:
   ```bash
   openssl rand -hex 32
   ```
4. Enable HTTPS/TLS
5. Configure firewall rules
6. Review security best practices in main README.md

---

**For full documentation, see:** [README.md](./README.md)
