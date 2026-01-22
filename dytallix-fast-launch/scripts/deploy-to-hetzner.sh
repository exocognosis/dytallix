#!/bin/bash
set -e

##############################################################################
# Dytallix Fast Launch - Hetzner Deployment Script
##############################################################################
# 
# Server Details:
#   - Name: docker-ce-ubuntu-4gb-ash-1 (CPX21)
#   - IP: 178.156.187.81
#   - Location: Ashburn, VA, US
#   - Specs: 3 vCPU, 4GB RAM, 80GB Disk
#
# Usage:
#   ./scripts/deploy-to-hetzner.sh [full|update|verify]
#
##############################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Server configuration
SERVER_IP="178.156.187.81"
SERVER_USER="root"
DEPLOY_DIR="/opt/dytallix-fast-launch"
LOCAL_DIR="/Users/rickglenn/Desktop/dytallix/dytallix-fast-launch"

# Deployment mode (full, update, verify)
MODE="${1:-full}"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Dytallix Fast Launch - Hetzner Deployment Script      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Server:${NC} $SERVER_IP (Ashburn, VA)"
echo -e "${GREEN}Mode:${NC} $MODE"
echo ""

# Function to check SSH connectivity
check_ssh() {
    echo -e "${YELLOW}[1/7] Checking SSH connectivity...${NC}"
    if ssh -o ConnectTimeout=5 "$SERVER_USER@$SERVER_IP" "echo 'SSH connection successful'" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ SSH connection successful${NC}"
    else
        echo -e "${RED}✗ Failed to connect to server${NC}"
        echo -e "${YELLOW}Please ensure:${NC}"
        echo "  1. SSH key is added: ssh-copy-id $SERVER_USER@$SERVER_IP"
        echo "  2. Server is accessible: ping $SERVER_IP"
        echo "  3. Firewall allows SSH (port 22)"
        exit 1
    fi
}

# Function to prepare remote server
prepare_server() {
    echo -e "\n${YELLOW}[2/7] Preparing remote server...${NC}"
    
    ssh "$SERVER_USER@$SERVER_IP" << 'ENDSSH'
        # Update system packages
        echo "Updating system packages..."
        apt-get update -qq
        
        # Install required dependencies
        echo "Installing dependencies..."
        apt-get install -y -qq \
            docker.io \
            docker-compose \
            curl \
            git \
            build-essential \
            pkg-config \
            libssl-dev \
            jq \
            htop \
            net-tools
        
        # Start and enable Docker
        systemctl start docker
        systemctl enable docker
        
        # Create deployment directory
        mkdir -p /opt/dytallix-fast-launch
        
        echo "✓ Server preparation complete"
ENDSSH
    
    echo -e "${GREEN}✓ Server prepared${NC}"
}

# Function to sync files to server
sync_files() {
    echo -e "\n${YELLOW}[3/7] Syncing files to server...${NC}"
    
    rsync -av --progress \
        --exclude='node_modules' \
        --exclude='target' \
        --exclude='*.log' \
        --exclude='dist' \
        --exclude='data' \
        --exclude='launch-evidence' \
        --exclude='e2e-artifacts' \
        --exclude='.git' \
        --exclude='.github' \
        --exclude='*.swp' \
        --exclude='*.swo' \
        --exclude='.DS_Store' \
        "$LOCAL_DIR/" \
        "$SERVER_USER@$SERVER_IP:$DEPLOY_DIR/"
    
    echo -e "${GREEN}✓ Files synced successfully${NC}"
}

# Function to setup environment
setup_environment() {
    echo -e "\n${YELLOW}[4/7] Setting up environment...${NC}"
    
    ssh "$SERVER_USER@$SERVER_IP" << ENDSSH
        cd $DEPLOY_DIR
        
        # Create .env from example if it doesn't exist
        if [ ! -f .env ]; then
            echo "Creating .env from template..."
            cp .env.example .env
            
            # Update with server-specific values
            sed -i "s|NODE_RPC_URL=.*|NODE_RPC_URL=http://178.156.187.81:3030|g" .env
            sed -i "s|FAUCET_API_URL=.*|FAUCET_API_URL=http://178.156.187.81:8787|g" .env
            sed -i "s|VITE_API_BASE_URL=.*|VITE_API_BASE_URL=http://178.156.187.81:8787|g" .env
            sed -i "s|VITE_RPC_URL=.*|VITE_RPC_URL=http://178.156.187.81:3030|g" .env
            
            # Ensure VITE_FRONTEND_URL is set for Playwright (internal access)
            if ! grep -q "VITE_FRONTEND_URL" .env; then
                echo "VITE_FRONTEND_URL=http://127.0.0.1" >> .env
            fi
            
            echo "✓ Environment file created"
        else
            echo "✓ Environment file already exists"
        fi
        
        # Make scripts executable
        chmod +x deploy.sh
        chmod +x scripts/*.sh
        find scripts -type f -name "*.sh" -exec chmod +x {} \;
        
        echo "✓ Environment setup complete"
ENDSSH
    
    echo -e "${GREEN}✓ Environment configured${NC}"
}


# Function to build and deploy
deploy() {
    echo -e "\n${YELLOW}[5/7] Building and deploying services...${NC}"

    # Build frontend locally
    echo -e "${YELLOW}Building frontend...${NC}"
    cd "$LOCAL_DIR/build" && npm install && npm run build && cd -

    # Sync frontend build to server's nginx html directory
    echo -e "${YELLOW}Syncing frontend build to /usr/share/nginx/html on server...${NC}"
    rsync -av --delete "$LOCAL_DIR/build/dist/" "$SERVER_USER@$SERVER_IP:/usr/share/nginx/html/"

    # Deploy backend/services as before
    ssh "$SERVER_USER@$SERVER_IP" << ENDSSH
        cd $DEPLOY_DIR
        echo "Running deployment script..."
        
        # Kill existing services to free ports
        echo "Freeing up ports..."
        for port in 3030 8787 5173 3000 3001 3002 3003 3004 3005; do
             if lsof -ti:\$port >/dev/null; then
                 echo "Killing process on port \$port"
                 lsof -ti:\$port | xargs kill -9 || true
             fi
        done
        
        nohup ./deploy.sh > deployment.log 2>&1 &
        echo "✓ Deployment started in background"
        # Reload nginx to pick up new frontend
        systemctl reload nginx
ENDSSH

    echo -e "${GREEN}✓ Services and frontend deployed${NC}"
}

# Function to verify deployment
verify_deployment() {
    echo -e "\n${YELLOW}[6/7] Verifying deployment...${NC}"
    
    sleep 15  # Give services time to start
    
    # Check Docker containers
    echo -e "\n${BLUE}Docker Containers:${NC}"
    ssh "$SERVER_USER@$SERVER_IP" "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"
    
    # Check node health
    echo -e "\n${BLUE}Node Health Check:${NC}"
    if curl -s http://$SERVER_IP:3030/status | jq . > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Node is responding${NC}"
        curl -s http://$SERVER_IP:3030/status | jq .
    else
        echo -e "${YELLOW}⚠ Node not responding yet (may still be starting)${NC}"
    fi
    
    # Check faucet/API health
    echo -e "\n${BLUE}Faucet/API Health Check:${NC}"
    if curl -s http://$SERVER_IP:8787/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Faucet/API is responding${NC}"
    else
        echo -e "${YELLOW}⚠ Faucet/API not responding yet${NC}"
    fi
    
    # Check frontend
    echo -e "\n${BLUE}Frontend Health Check:${NC}"
    if curl -s http://$SERVER_IP:5173/ > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Frontend is responding${NC}"
    else
        echo -e "${YELLOW}⚠ Frontend not responding yet${NC}"
    fi
    
    echo -e "${GREEN}✓ Verification complete${NC}"
}

# Function to display access information
display_info() {
    echo -e "\n${YELLOW}[7/7] Deployment Summary${NC}"
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                    Access Information                      ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}Frontend:${NC}        https://dytallix.com"
    echo -e "${GREEN}Node RPC:${NC}        https://rpc.dytallix.com"
    echo -e "${GREEN}Faucet/API:${NC}      https://api.dytallix.com"
    echo -e "${GREEN}Prometheus:${NC}      http://$SERVER_IP:9090"
    echo -e "${GREEN}Grafana:${NC}         http://$SERVER_IP:3000"
    echo -e "${GREEN}Jaeger:${NC}          http://$SERVER_IP:16686"
    echo ""
    echo -e "${BLUE}SSH Access:${NC}"
    echo -e "  ssh $SERVER_USER@$SERVER_IP"
    echo ""
    echo -e "${BLUE}Useful Commands:${NC}"
    echo -e "  View logs:        ssh $SERVER_USER@$SERVER_IP 'cd $DEPLOY_DIR && docker-compose logs -f'"
    echo -e "  Check status:     ssh $SERVER_USER@$SERVER_IP 'cd $DEPLOY_DIR && docker-compose ps'"
    echo -e "  Restart services: ssh $SERVER_USER@$SERVER_IP 'cd $DEPLOY_DIR && docker-compose restart'"
    echo ""
}

# Main execution flow
main() {
    case "$MODE" in
        full)
            check_ssh
            prepare_server
            sync_files
            setup_environment
            deploy
            verify_deployment
            display_info
            ;;
        update)
            check_ssh
            sync_files
            deploy
            verify_deployment
            display_info
            ;;
        verify)
            check_ssh
            verify_deployment
            display_info
            ;;
        logs)
            check_ssh
            echo -e "${YELLOW}Fetching remote node logs...${NC}"
            ssh "$SERVER_USER@$SERVER_IP" "tail -n 50 $DEPLOY_DIR/logs/node.log"
            echo -e "${YELLOW}Fetching remote api logs...${NC}"
            ssh "$SERVER_USER@$SERVER_IP" "tail -n 50 $DEPLOY_DIR/logs/api.log"
            ;;
        reset)
            check_ssh
            echo -e "${YELLOW}Resetting chain data...${NC}"
            ssh "$SERVER_USER@$SERVER_IP" "rm -rf $DEPLOY_DIR/data"
            echo -e "${GREEN}✓ Chain data wiped${NC}"
            ;;
        *)
            echo -e "${RED}Invalid mode: $MODE${NC}"
            echo "Usage: $0 [full|update|verify]"
            echo ""
            echo "  full   - Complete deployment (prepare server, sync, build, deploy)"
            echo "  update - Quick update (sync files and redeploy)"
            echo "  verify - Only verify deployment status"
            exit 1
            ;;
    esac
    
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║           Deployment Complete Successfully! 🚀             ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
}

# Run main function
main
