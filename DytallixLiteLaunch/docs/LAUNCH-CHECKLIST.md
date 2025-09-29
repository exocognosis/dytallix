# DytallixLiteLaunch Deployment Checklist

This checklist ensures a successful deployment of the Dytallix testnet environment.

## Pre-Deployment Checklist

### System Requirements
- [ ] Linux x86_64 or macOS (Apple Silicon supported)
- [ ] Docker and Docker Compose installed
- [ ] Node.js 18+ installed
- [ ] Rust 1.75+ installed (optional, for building from source)
- [ ] At least 4GB RAM available
- [ ] At least 10GB disk space available
- [ ] Ports available: 26657, 26656, 1317, 8080, 8787, 3001, 3000

### Network Configuration
- [ ] Firewall allows inbound connections on required ports
- [ ] DNS resolution working (for external dependencies)
- [ ] No proxy blocking Docker registry access

### Environment Setup
- [ ] Repository cloned: `git clone <repo> && cd DytallixLiteLaunch`
- [ ] Environment configured: `cp .env.example .env`
- [ ] Environment variables reviewed and customized in `.env`
- [ ] Docker daemon running: `docker info`

## Deployment Steps

### 1. Dependencies Installation
- [ ] Run: `make install`
- [ ] Verify all package.json dependencies installed
- [ ] Check for any installation errors

### 2. Service Building
- [ ] Run: `make build`
- [ ] Verify server built successfully
- [ ] Verify faucet built successfully  
- [ ] Verify frontend built successfully
- [ ] Check for any build errors or warnings

### 3. WASM Contracts (Optional)
- [ ] Run: `make wasm-build` (if Rust installed)
- [ ] Verify counter contract compiled
- [ ] Verify PQC contract compiled
- [ ] Check WASM artifacts in `/tmp/wasm_artifacts/`

### 4. Network Startup
- [ ] Run: `make up`
- [ ] Wait for all containers to start (may take 30-60 seconds)
- [ ] Check container status: `docker ps`
- [ ] Verify no containers in "Restarting" state

### 5. Service Health Checks
- [ ] Node RPC: `curl http://localhost:26657/status`
- [ ] Server health: `curl http://localhost:8080/health`
- [ ] Faucet health: `curl http://localhost:8787/health`
- [ ] Frontend accessible: http://localhost:3001
- [ ] All health checks return 200 OK

## Post-Deployment Verification

### Blockchain Operations
- [ ] Node producing blocks (check latest_block_height increasing)
- [ ] Genesis accounts have expected balances
- [ ] RPC endpoints responding correctly
- [ ] REST API endpoints accessible

### Token Operations
- [ ] Faucet can dispense DGT tokens
- [ ] Faucet can dispense DRT tokens
- [ ] Token transfers work via CLI
- [ ] Balance queries return correct amounts

### Web Interface
- [ ] Frontend loads without errors
- [ ] Wallet page displays correctly
- [ ] Dashboard shows network metrics
- [ ] Faucet page can request tokens
- [ ] All navigation links work

### CLI Operations
- [ ] CLI binary exists: `./cli/dytx/target/release/dytx --help`
- [ ] Status command: `dytx status`
- [ ] Balance query: `dytx balance --address <test-address>`
- [ ] PQC keygen: `dytx pqc-keygen`

### Advanced Features
- [ ] Governance demo: `./scripts/governance-demo.sh`
- [ ] Emissions calculation: `./scripts/emissions_cron.sh`
- [ ] AI Oracle requests: Test via /oracle endpoint
- [ ] Metrics collection: Check /metrics endpoints

## Troubleshooting Checklist

### If Node Won't Start
- [ ] Check genesis.json is valid JSON
- [ ] Verify ports 26657, 26656, 1317 are not in use
- [ ] Check Docker logs: `docker logs dytallix-node`
- [ ] Ensure sufficient disk space for blockchain data

### If Services Won't Connect
- [ ] Verify all containers in same Docker network
- [ ] Check environment variables in .env
- [ ] Confirm no firewall blocking internal connections
- [ ] Test connectivity: `docker exec <container> curl <target>`

### If Frontend Shows Errors
- [ ] Check browser console for JavaScript errors
- [ ] Verify API endpoints accessible from browser
- [ ] Check CORS configuration in server/faucet
- [ ] Ensure all environment variables prefixed with VITE_

### If Faucet Rate Limited
- [ ] Check faucet logs for rate limit messages
- [ ] Verify cooldown periods in configuration
- [ ] Clear rate limit state if needed (restart faucet)
- [ ] Test with different IP/address if needed

## Performance Verification

### Load Testing
- [ ] Node handles multiple simultaneous RPC requests
- [ ] Faucet handles concurrent token requests
- [ ] Frontend responsive under normal load
- [ ] Server API responds within acceptable time limits

### Resource Usage
- [ ] Memory usage stable (no memory leaks)
- [ ] CPU usage reasonable during normal operation
- [ ] Disk usage not growing excessively
- [ ] Network bandwidth usage acceptable

## Security Checklist

### Access Control
- [ ] Default credentials changed (if any)
- [ ] No secrets committed to git
- [ ] Environment variables contain non-default values
- [ ] File permissions appropriate for deployment

### Network Security
- [ ] Only required ports exposed
- [ ] Internal services not accessible externally
- [ ] CORS properly configured for frontend
- [ ] Rate limiting active on public endpoints

## Monitoring Setup

### Logging
- [ ] All services producing logs
- [ ] Log levels appropriate (not too verbose)
- [ ] Logs accessible via `make logs`
- [ ] No critical errors in logs

### Metrics
- [ ] Prometheus metrics accessible
- [ ] Dashboard showing real-time data
- [ ] Health check endpoints responding
- [ ] Alert conditions defined (if applicable)

## Documentation Verification

### User Documentation
- [ ] README.md accurate for deployment
- [ ] API endpoints documented
- [ ] CLI usage examples work
- [ ] Troubleshooting steps valid

### Operational Documentation
- [ ] Runbook steps tested
- [ ] Backup procedures documented
- [ ] Recovery procedures tested
- [ ] Maintenance procedures defined

## Sign-off

**Deployment completed by**: ___________________  
**Date**: ___________________  
**Environment**: ___________________  
**Version**: ___________________  

**Deployment Status**: 
- [ ] ✅ Successful - All checks passed
- [ ] ⚠️ Partial - Some issues noted (document below)
- [ ] ❌ Failed - Deployment not ready

**Notes**:
_Document any issues, workarounds, or special considerations_

---

**Next Steps After Successful Deployment:**
1. Share access URLs with team
2. Set up monitoring/alerting if needed
3. Begin testing application features
4. Document any custom configuration
5. Plan maintenance windows if required