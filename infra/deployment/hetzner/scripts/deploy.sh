#!/bin/bash

# Dytallix Hetzner Cloud Deployment Script
# This script sets up the complete Dytallix testnet infrastructure on Hetzner Cloud

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
DOCKER_COMPOSE_DIR="$SCRIPT_DIR/../docker-compose"
ENV_FILE="$DOCKER_COMPOSE_DIR/.env"

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_requirements() {
    log_info "Checking system requirements..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check if required ports are available
    REQUIRED_PORTS=(80 443 26656 26657 1317 9090)
    for port in "${REQUIRED_PORTS[@]}"; do
        if netstat -tuln | grep ":$port " &> /dev/null; then
            log_warning "Port $port is already in use. This may cause conflicts."
        fi
    done
    
    log_info "System requirements check completed."
}

setup_environment() {
    log_info "Setting up environment configuration..."
    
    if [ ! -f "$ENV_FILE" ]; then
        log_info "Creating environment file from template..."
        cp "$DOCKER_COMPOSE_DIR/.env.example" "$ENV_FILE"
        
        # Get server IP
        SERVER_IP=$(curl -s http://ipv4.icanhazip.com || curl -s http://ifconfig.me/ip)
        if [ -n "$SERVER_IP" ]; then
            sed -i "s/your-server-ip-here/$SERVER_IP/g" "$ENV_FILE"
            log_info "Auto-detected server IP: $SERVER_IP"
        else
            log_warning "Could not auto-detect server IP. Please update EXTERNAL_IP in $ENV_FILE"
        fi
        
        log_warning "Please update the following values in $ENV_FILE:"
        log_warning "  - DOMAIN_NAME (your domain name)"
        log_warning "  - ACME_EMAIL (your email for Let's Encrypt)"
        log_warning "  - FAUCET_MNEMONIC (mnemonic for faucet wallet)"
        log_warning "  - All password fields"
        
        read -p "Press Enter to continue after updating the environment file..."
    else
        log_info "Environment file already exists."
    fi
}

setup_directories() {
    log_info "Setting up data directories..."
    
    # Create data directories with proper permissions
    sudo mkdir -p /var/lib/dytallix/{node,postgres,grafana,prometheus,loki,redis}
    sudo chown -R $USER:$USER /var/lib/dytallix
    
    # Create log directories
    sudo mkdir -p /var/log/dytallix
    sudo chown -R $USER:$USER /var/log/dytallix
    
    log_info "Data directories created successfully."
}

setup_firewall() {
    log_info "Configuring firewall..."
    
    # Enable UFW if not already enabled
    if ! ufw --version &> /dev/null; then
        log_warning "UFW is not installed. Please configure your firewall manually."
        return
    fi
    
    # Configure UFW rules
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    
    # Allow SSH
    sudo ufw allow ssh
    
    # Allow HTTP and HTTPS
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    
    # Allow Dytallix P2P
    sudo ufw allow 26656/tcp
    
    # Allow monitoring (optional, can be restricted to specific IPs)
    sudo ufw allow from any to any port 9090 proto tcp comment 'Prometheus'
    sudo ufw allow from any to any port 3000 proto tcp comment 'Grafana'
    
    # Enable UFW
    sudo ufw --force enable
    
    log_info "Firewall configured successfully."
}

generate_genesis() {
    log_info "Generating genesis file if not exists..."
    
    if [ ! -f "$PROJECT_ROOT/genesis.json" ]; then
        log_info "Genesis file not found. Creating testnet genesis..."
        
        # Create a basic genesis file (you may want to customize this)
        cat > "$PROJECT_ROOT/genesis.json" << EOF
{
  "genesis_time": "$(date -u +%Y-%m-%dT%H:%M:%S.%6NZ)",
  "chain_id": "dytallix-testnet-1",
  "initial_height": "1",
  "consensus_params": {
    "block": {
      "max_bytes": "22020096",
      "max_gas": "-1",
      "time_iota_ms": "1000"
    },
    "evidence": {
      "max_age_num_blocks": "100000",
      "max_age_duration": "172800000000000",
      "max_bytes": "1048576"
    },
    "validator": {
      "pub_key_types": ["ed25519"]
    },
    "version": {}
  },
  "app_hash": "",
  "app_state": {
    "auth": {
      "params": {
        "max_memo_characters": "256",
        "tx_sig_limit": "7",
        "tx_size_cost_per_byte": "10",
        "sig_verify_cost_ed25519": "590",
        "sig_verify_cost_secp256k1": "1000"
      },
      "accounts": []
    },
    "bank": {
      "params": {
        "send_enabled": [],
        "default_send_enabled": true
      },
      "balances": [],
      "supply": [],
      "denom_metadata": []
    },
    "staking": {
      "params": {
        "unbonding_time": "1814400s",
        "max_validators": 100,
        "max_entries": 7,
        "historical_entries": 10000,
        "bond_denom": "stake"
      },
      "last_total_power": "0",
      "last_validator_powers": [],
      "validators": [],
      "delegations": [],
      "unbonding_delegations": [],
      "redelegations": [],
      "exported": false
    },
    "distribution": {
      "params": {
        "community_tax": "0.020000000000000000",
        "base_proposer_reward": "0.010000000000000000",
        "bonus_proposer_reward": "0.040000000000000000",
        "withdraw_addr_enabled": true
      },
      "fee_pool": {
        "community_pool": []
      },
      "delegator_withdraw_infos": [],
      "previous_proposer": "",
      "outstanding_rewards": [],
      "validator_accumulated_commissions": [],
      "validator_historical_rewards": [],
      "validator_current_rewards": [],
      "delegator_starting_infos": [],
      "validator_slash_events": []
    },
    "gov": {
      "starting_proposal_id": "1",
      "deposits": [],
      "votes": [],
      "proposals": [],
      "deposit_params": {
        "min_deposit": [
          {
            "denom": "stake",
            "amount": "10000000"
          }
        ],
        "max_deposit_period": "172800s"
      },
      "voting_params": {
        "voting_period": "172800s"
      },
      "tally_params": {
        "quorum": "0.334000000000000000",
        "threshold": "0.500000000000000000",
        "veto_threshold": "0.334000000000000000"
      }
    }
  }
}
EOF
        log_info "Genesis file created successfully."
    else
        log_info "Genesis file already exists."
    fi
}

build_images() {
    log_info "Building Docker images..."
    
    cd "$DOCKER_COMPOSE_DIR"
    
    # Build all images
    docker-compose build --no-cache
    
    log_info "Docker images built successfully."
}

start_services() {
    log_info "Starting Dytallix services..."
    
    cd "$DOCKER_COMPOSE_DIR"
    
    # Start services in dependency order
    docker-compose up -d traefik
    sleep 10
    
    docker-compose up -d postgres redis
    sleep 10
    
    docker-compose up -d prometheus loki
    sleep 10
    
    docker-compose up -d grafana promtail
    sleep 10
    
    docker-compose up -d dytallix-node
    sleep 30
    
    docker-compose up -d dytallix-frontend dytallix-explorer dytallix-faucet
    
    log_info "All services started successfully."
}

check_health() {
    log_info "Checking service health..."
    
    cd "$DOCKER_COMPOSE_DIR"
    
    # Wait for services to be healthy
    timeout=300
    elapsed=0
    
    while [ $elapsed -lt $timeout ]; do
        if docker-compose ps | grep -q "Up (healthy)\|Up [0-9]"; then
            log_info "Services are starting up..."
        fi
        
        # Check if dytallix-node is responding
        if curl -s http://localhost:26657/status &> /dev/null; then
            log_info "Dytallix node is responding!"
            break
        fi
        
        sleep 10
        elapsed=$((elapsed + 10))
    done
    
    if [ $elapsed -ge $timeout ]; then
        log_error "Services failed to start within timeout period."
        docker-compose logs --tail=50
        exit 1
    fi
    
    log_info "Health check completed successfully."
}

show_status() {
    log_info "Deployment Status:"
    
    cd "$DOCKER_COMPOSE_DIR"
    docker-compose ps
    
    echo ""
    log_info "Service URLs:"
    
    # Read domain from env file
    DOMAIN=$(grep "DOMAIN_NAME=" "$ENV_FILE" | cut -d'=' -f2)
    
    echo "  Frontend:     https://$DOMAIN"
    echo "  Explorer:     https://explorer.$DOMAIN"
    echo "  Faucet:       https://faucet.$DOMAIN"
    echo "  RPC:          https://rpc.$DOMAIN"
    echo "  API:          https://api.$DOMAIN"
    echo "  Monitoring:   https://monitoring.$DOMAIN"
    echo "  Prometheus:   https://prometheus.$DOMAIN"
    echo "  Traefik:      https://traefik.$DOMAIN"
    echo ""
    echo "  Local Access:"
    echo "  Node RPC:     http://localhost:26657"
    echo "  Node API:     http://localhost:1317"
    echo "  Prometheus:   http://localhost:9090"
    echo "  Grafana:      http://localhost:3003"
    echo "  Traefik:      http://localhost:8080"
}

main() {
    log_info "Starting Dytallix Hetzner Cloud deployment..."
    
    check_requirements
    setup_environment
    setup_directories
    setup_firewall
    generate_genesis
    build_images
    start_services
    check_health
    show_status
    
    log_info "Deployment completed successfully!"
    log_info "Please make sure your DNS is pointing to this server for the configured domain."
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
