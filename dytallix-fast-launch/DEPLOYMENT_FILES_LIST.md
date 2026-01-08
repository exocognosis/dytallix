# Dytallix Fast Launch - Deployment Files Checklist

## 📦 Essential Deployment Files for Remote Server

This document lists all necessary files to deploy the Dytallix Fast Launch system to a remote server.

---

## 🔧 Core Configuration Files

### Root Level
- [ ] `.env.example` - Environment template (copy to `.env` on server)
- [ ] `package.json` - Node.js dependencies
- [ ] `package-lock.json` - Locked dependency versions
- [ ] `Cargo.toml` - Rust workspace configuration
- [ ] `Cargo.lock` - Rust dependency lock file
- [ ] `Makefile` - Build automation commands
- [ ] `genesis.json` - Blockchain genesis configuration

### Docker Configuration
- [ ] `Dockerfile` - Main node container image
- [ ] `docker-compose.yml` - Multi-node orchestration (seed + validators)
- [ ] `docker-compose.faucet.yml` - Faucet service configuration
- [ ] `docker-compose.observability.yml` - Monitoring stack (Prometheus, Grafana, Jaeger)

---

## 🚀 Deployment Scripts

### Primary Deployment
- [ ] `deploy.sh` - Main deployment orchestration script

### Node Scripts (`scripts/`)
- [ ] `scripts/build-node.sh` - Node binary compilation
- [ ] `scripts/start-node.sh` - Node startup script
- [ ] `scripts/devnet.sh` - Local devnet initialization
- [ ] `scripts/health-check.sh` - Service health verification
- [ ] `scripts/prelaunch_validation.sh` - Pre-deployment validation
- [ ] `scripts/full-stack-e2e.sh` - End-to-end testing
- [ ] `scripts/wallet-cli.sh` - CLI wallet management

### Deployment Tools (`scripts/deployment/`)
- [ ] `scripts/deployment/*` - Server setup and deployment automation scripts

### Evidence Generation (`scripts/evidence/`)
- [ ] `scripts/evidence/observability_capture.sh` - Metrics capture for launch evidence

---

## 🌐 Frontend Application

### Source Files
- [ ] `frontend/package.json` - Frontend dependencies
- [ ] `frontend/package-lock.json` - Frontend dependency lock
- [ ] `frontend/vite.config.js` - Vite build configuration
- [ ] `frontend/tailwind.config.js` - Tailwind CSS config
- [ ] `frontend/postcss.config.js` - PostCSS configuration
- [ ] `frontend/eslint.config.js` - ESLint configuration
- [ ] `frontend/index.html` - HTML entry point
- [ ] `frontend/.env` - Frontend environment variables (create from template)

### Frontend Source Code (`frontend/src/`)
- [ ] `frontend/src/**/*` - All React components and application code
- [ ] `frontend/public/**/*` - Static assets (images, fonts, etc.)

### Frontend Build Output (Generated)
- `frontend/dist/` - **Built during deployment** (not committed to repo)

---

## 🔐 Node Configuration

### Node Source (`node/`)
- [ ] `node/Cargo.toml` - Node package configuration
- [ ] `node/src/**/*` - Node implementation source code
- [ ] `node/examples/**/*` - Example implementations
- [ ] `node/tests/**/*` - Node test suite

### Node Data Directories (Created at Runtime)
- `node/data/` - Blockchain data storage
- `node/node/` - Node runtime data
- `node/launch-evidence/` - Launch evidence artifacts

---

## 🎯 API/Faucet Server

### Server Source (`server/`)
- [ ] `server/index.js` - Main API server entry point
- [ ] `server/logger.js` - Logging configuration
- [ ] `server/metrics.js` - Metrics collection
- [ ] `server/rateLimit.js` - Rate limiting middleware
- [ ] `server/status-config.js` - Status endpoint configuration
- [ ] `server/transfer.js` - Token transfer logic
- [ ] `server/tokenomics.json` - Tokenomics parameters
- [ ] `server/oracle/**/*` - Oracle service implementation
- [ ] `server/src/**/*` - Additional server modules

---

## 📚 Documentation

### Required Documentation
- [ ] `README.md` - Project overview and setup instructions
- [ ] `BUILDER_GUIDE.md` - Build instructions for developers
- [ ] `DEPLOYMENT_SUMMARY.md` - Deployment overview
- [ ] `FAST_LAUNCH_SUMMARY.md` - Fast launch implementation details
- [ ] `FINAL_CHECKLIST.md` - Pre-launch checklist

### Technical Documentation
- [ ] `docs/**/*` - Protocol and API documentation
- [ ] `ALGORITHM_SELECTION_IMPLEMENTATION.md`
- [ ] `GENESIS_IMPLEMENTATION_COMPLETE.md`
- [ ] `KEYSTORE_IMPLEMENTATION.md`
- [ ] `TRANSACTION_FLOW.md`
- [ ] `NODE_DIFFERENCES.md`

---

## 🔍 Optional Files (Reference/Development)

### Testing & Debugging Scripts
- [ ] `test_cli_simple.sh`
- [ ] `test_cli_transactions.sh`
- [ ] `test_complex_transactions.sh`
- [ ] `test_complex_v2.sh`
- [ ] `test_real_transactions.sh`
- [ ] `test_wallet_transactions.sh`
- [ ] `debug_signature.sh`
- [ ] `debug_tx_visibility.sh`

### Evidence & Artifacts (Generated)
- `launch-evidence/` - Launch proof artifacts (generated during launch)
- `e2e-artifacts/` - End-to-end test artifacts
- `data/` - Runtime data directory

### Development Only (Not Needed for Deployment)
- `.github/` - GitHub workflows (CI/CD)
- `target/` - Rust build output (rebuilt on server)
- `node_modules/` - Node dependencies (reinstalled on server)
- `*.log` - Log files (generated at runtime)

---

## 📋 Deployment Checklist by Phase

### Phase 1: Server Preparation
1. Transfer core configuration files
2. Transfer Docker files
3. Set up environment variables (`.env`)

### Phase 2: Code Transfer
4. Transfer node source code (`node/`)
5. Transfer server source code (`server/`)
6. Transfer frontend source code (`frontend/`)
7. Transfer deployment scripts (`scripts/`)

### Phase 3: Build & Deploy
8. Run `deploy.sh` to build and start all services
9. Verify health checks
10. Generate launch evidence

---

## 🚢 Quick Deployment Command

### Using rsync (Recommended)
```bash
# From your local machine to Hetzner server
rsync -av --exclude='node_modules' \
          --exclude='target' \
          --exclude='*.log' \
          --exclude='dist' \
          --exclude='data' \
          --exclude='.git' \
          /Users/rickglenn/dytallix/dytallix-fast-launch/ \
          root@178.156.187.81:/opt/dytallix-fast-launch/

# Or use the automated deployment script
./scripts/deploy-to-hetzner.sh
```

### Using deploy script
```bash
# SSH to Hetzner server
ssh root@178.156.187.81

# Navigate to deployment directory
cd /opt/dytallix-fast-launch

# Run deployment
./deploy.sh
```

---

## 🔐 Security Notes

### Never Transfer These Files
- ❌ `.env` with production secrets
- ❌ Private keys or mnemonics
- ❌ `*.pem` or `*.key` files
- ❌ Database backups with real data

### Always Create Fresh on Server
- ✅ `.env` from `.env.example`
- ✅ Generate new mnemonics for faucet
- ✅ Create new SSL certificates
- ✅ Set unique passwords

---

## 📊 Post-Deployment Verification

### Service Health Checks
```bash
# Check all services are running
docker-compose ps

# Verify node health
curl http://localhost:3030/status

# Verify API/Faucet
curl http://localhost:8787/health

# Verify frontend
curl http://localhost:5173/
```

### Monitoring Access
- Prometheus: http://server-ip:9090
- Grafana: http://server-ip:3000
- Jaeger: http://server-ip:16686

---

## 📞 Support

For deployment issues:
1. Check logs: `docker-compose logs -f`
2. Verify environment: `cat .env`
3. Run health checks: `./scripts/health-check.sh`
4. Review documentation in `docs/`

---

**Last Updated:** $(date)
**Version:** 1.0.0
**Status:** Production Ready
