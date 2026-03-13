# Dytallix Auto-Deployment Script

This Python script automates the complete deployment of Dytallix on your Hetzner server.

## Features

- ✅ **Automated SSH connection testing**
- ✅ **Server prerequisite installation** (Docker, Docker Compose, etc.)
- ✅ **Firewall configuration**
- ✅ **File transfer and deployment**
- ✅ **Environment configuration**
- ✅ **Service deployment and health checks**
- ✅ **Real-time status monitoring**
- ✅ **Comprehensive error handling**

## Usage

### Basic Deployment
```bash
# Deploy everything automatically
python3 auto_deploy.py 178.156.187.81

# Deploy with custom SSH user
python3 auto_deploy.py 178.156.187.81 --user root

# Deploy with specific SSH key
python3 auto_deploy.py 178.156.187.81 --ssh-key ~/.ssh/id_rsa
```

### Check Deployment Status
```bash
# Only check status of existing deployment
python3 auto_deploy.py 178.156.187.81 --check-only
```

## What the Script Does

1. **Tests SSH connectivity** to your server
2. **Gathers server information** (OS, memory, disk, etc.)
3. **Installs prerequisites**:
   - Updates system packages
   - Installs Docker and Docker Compose
   - Installs utility tools (curl, git, jq, etc.)
4. **Configures firewall** with UFW rules for all required ports
5. **Transfers deployment files** from local machine to server
6. **Sets up environment configuration** (.env file)
7. **Initializes the blockchain** and sets up directories
8. **Deploys all services** using Docker Compose:
   - Dytallix blockchain node
   - Frontend application
   - Explorer
   - Faucet service
   - Bridge service
   - Monitoring stack (Grafana, Prometheus)
9. **Performs health checks** on all services
10. **Displays access URLs** for all deployed services

## Services Deployed

After successful deployment, you'll have access to:

- **Frontend**: `http://178.156.187.81:3000`
- **Explorer**: `http://178.156.187.81:3002`
- **Faucet**: `http://178.156.187.81:3001`
- **RPC Endpoint**: `http://178.156.187.81:26657`
- **API Endpoint**: `http://178.156.187.81:1317`
- **Bridge Service**: `http://178.156.187.81:8080`
- **Grafana**: `http://178.156.187.81:3003`
- **Prometheus**: `http://178.156.187.81:9090`

## Requirements

- Python 3.6+
- SSH access to your Hetzner server
- rsync installed locally
- Server with at least 4GB RAM and 50GB disk space

## Error Handling

The script includes comprehensive error handling and will:
- Stop execution if any critical step fails
- Provide detailed error messages
- Show exactly which step failed
- Allow you to retry individual steps

## Manual Commands (if needed)

If you prefer to run individual steps manually on the server:

```bash
# SSH to server
ssh root@178.156.187.81

# Navigate to deployment directory
cd ~/dytallix

# Check deployment status
docker-compose -f docker-compose/docker-compose.yml ps

# View service logs
docker-compose -f docker-compose/docker-compose.yml logs

# Restart services
docker-compose -f docker-compose/docker-compose.yml restart

# Stop services
docker-compose -f docker-compose/docker-compose.yml down

# Start services
docker-compose -f docker-compose/docker-compose.yml up -d
```

## Troubleshooting

If deployment fails:

1. **Check SSH connectivity**: Ensure you can SSH to the server manually
2. **Verify server resources**: Ensure adequate RAM and disk space
3. **Check firewall**: Ensure ports are open
4. **Review logs**: Use `--check-only` flag to see service status
5. **Manual intervention**: SSH to server and run commands manually

## Examples

```bash
# Full deployment with verbose output
python3 auto_deploy.py 178.156.187.81

# Check if deployment is working
python3 auto_deploy.py 178.156.187.81 --check-only

# Deploy with custom SSH configuration
python3 auto_deploy.py 178.156.187.81 --user ubuntu --ssh-key ~/.ssh/hetzner_key
```
