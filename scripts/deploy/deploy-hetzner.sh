#!/bin/bash

# Hetzner Deployment Script for QuantumVault
# Deploys the complete QuantumVault stack to Hetzner Cloud

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
HETZNER_TOKEN="${HETZNER_TOKEN}"
DOMAIN="dytallix.com"
SERVER_NAME="dytallix-production"
SERVER_TYPE="cx21"  # 2 vCPU, 4GB RAM
LOCATION="nbg1"     # Nuremberg
IMAGE="ubuntu-22.04"

echo -e "${BLUE}🚀 Hetzner Deployment Script for QuantumVault${NC}"
echo ""

# Check prerequisites
if [ -z "$HETZNER_TOKEN" ]; then
    echo -e "${RED}❌ HETZNER_TOKEN environment variable not set${NC}"
    echo "Please set your Hetzner Cloud API token:"
    echo "export HETZNER_TOKEN=your_token_here"
    exit 1
fi

if ! command -v hcloud &> /dev/null; then
    echo -e "${YELLOW}⚠️  Hetzner CLI not found. Installing...${NC}"
    # Install hcloud CLI
    curl -sL https://github.com/hetznercloud/cli/releases/latest/download/hcloud-linux-amd64.tar.gz | tar -xz
    sudo mv hcloud /usr/local/bin/
    hcloud version
fi

echo -e "${BLUE}🔧 Configuring Hetzner CLI...${NC}"
hcloud context create dytallix-production --token "$HETZNER_TOKEN"
hcloud context use dytallix-production

# Create SSH key if it doesn't exist
if ! hcloud ssh-key list | grep -q "dytallix-deploy-key"; then
    echo -e "${BLUE}🔑 Creating SSH key...${NC}"
    if [ ! -f ~/.ssh/dytallix_deploy ]; then
        ssh-keygen -t ed25519 -f ~/.ssh/dytallix_deploy -N "" -C "dytallix-deploy-$(date +%Y%m%d)"
    fi
    hcloud ssh-key create --name dytallix-deploy-key --public-key-from-file ~/.ssh/dytallix_deploy.pub
fi

# Create firewall rules
echo -e "${BLUE}🔥 Creating firewall rules...${NC}"
if ! hcloud firewall list | grep -q "dytallix-firewall"; then
    hcloud firewall create --name dytallix-firewall
    
    # SSH access
    hcloud firewall add-rule dytallix-firewall --direction in --source-ips 0.0.0.0/0 --protocol tcp --port 22
    
    # HTTP/HTTPS
    hcloud firewall add-rule dytallix-firewall --direction in --source-ips 0.0.0.0/0 --protocol tcp --port 80
    hcloud firewall add-rule dytallix-firewall --direction in --source-ips 0.0.0.0/0 --protocol tcp --port 443
    
    # Blockchain RPC
    hcloud firewall add-rule dytallix-firewall --direction in --source-ips 0.0.0.0/0 --protocol tcp --port 3030
    
    # QuantumVault API
    hcloud firewall add-rule dytallix-firewall --direction in --source-ips 0.0.0.0/0 --protocol tcp --port 3031
    
    # Frontend
    hcloud firewall add-rule dytallix-firewall --direction in --source-ips 0.0.0.0/0 --protocol tcp --port 8787
    
    # Cosmos ports
    hcloud firewall add-rule dytallix-firewall --direction in --source-ips 0.0.0.0/0 --protocol tcp --port 26656
    hcloud firewall add-rule dytallix-firewall --direction in --source-ips 0.0.0.0/0 --protocol tcp --port 26657
    hcloud firewall add-rule dytallix-firewall --direction in --source-ips 0.0.0.0/0 --protocol tcp --port 1317
    
    echo -e "${GREEN}✅ Firewall rules created${NC}"
fi

# Create volume for persistent data
echo -e "${BLUE}💾 Creating storage volume...${NC}"
if ! hcloud volume list | grep -q "dytallix-data"; then
    hcloud volume create --name dytallix-data --size 50 --location $LOCATION
    echo -e "${GREEN}✅ Storage volume created${NC}"
fi

# Create server
echo -e "${BLUE}🖥️  Creating server...${NC}"
if hcloud server list | grep -q "$SERVER_NAME"; then
    echo -e "${YELLOW}⚠️  Server $SERVER_NAME already exists${NC}"
    SERVER_IP=$(hcloud server describe $SERVER_NAME -o format='{{.PublicNet.IPv4.IP}}')
else
    # User data script for initial setup
    cat > cloud-init.yml << 'EOF'
#cloud-config
package_update: true
package_upgrade: true

packages:
  - docker.io
  - docker-compose
  - nginx
  - certbot
  - python3-certbot-nginx
  - git
  - curl
  - htop
  - fail2ban

users:
  - name: dytallix
    sudo: ALL=(ALL) NOPASSWD:ALL
    shell: /bin/bash
    ssh_authorized_keys:
      - ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGxxx # Will be replaced with actual key

write_files:
  - path: /etc/systemd/system/dytallix.service
    content: |
      [Unit]
      Description=Dytallix Blockchain Node
      After=network.target

      [Service]
      Type=simple
      User=dytallix
      WorkingDirectory=/opt/dytallix
      ExecStart=/opt/dytallix/start-production.sh
      Restart=always
      RestartSec=10

      [Install]
      WantedBy=multi-user.target

  - path: /etc/nginx/sites-available/dytallix.com
    content: |
      server {
          listen 80;
          server_name dytallix.com www.dytallix.com;
          
          location /.well-known/acme-challenge/ {
              root /var/www/html;
          }
          
          location / {
              return 301 https://$server_name$request_uri;
          }
      }
      
      server {
          listen 443 ssl http2;
          server_name dytallix.com www.dytallix.com;
          
          # SSL configuration will be added by certbot
          
          location / {
              proxy_pass http://localhost:8787;
              proxy_set_header Host $host;
              proxy_set_header X-Real-IP $remote_addr;
              proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
              proxy_set_header X-Forwarded-Proto $scheme;
          }
          
          location /api/ {
              proxy_pass http://localhost:3030/;
              proxy_set_header Host $host;
              proxy_set_header X-Real-IP $remote_addr;
              proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
              proxy_set_header X-Forwarded-Proto $scheme;
          }
          
          location /quantumvault/ {
              proxy_pass http://localhost:3031/;
              proxy_set_header Host $host;
              proxy_set_header X-Real-IP $remote_addr;
              proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
              proxy_set_header X-Forwarded-Proto $scheme;
          }
      }

runcmd:
  - systemctl enable docker
  - systemctl start docker
  - usermod -aG docker dytallix
  - systemctl enable fail2ban
  - systemctl start fail2ban
  - ln -s /etc/nginx/sites-available/dytallix.com /etc/nginx/sites-enabled/
  - rm /etc/nginx/sites-enabled/default
  - systemctl reload nginx
EOF

    # Replace SSH key placeholder
    PUB_KEY=$(cat ~/.ssh/dytallix_deploy.pub)
    sed -i "s|ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGxxx.*|$PUB_KEY|" cloud-init.yml

    hcloud server create \
        --name $SERVER_NAME \
        --type $SERVER_TYPE \
        --location $LOCATION \
        --image $IMAGE \
        --ssh-key dytallix-deploy-key \
        --firewall dytallix-firewall \
        --user-data-from-file cloud-init.yml

    echo -e "${GREEN}✅ Server created${NC}"
    
    # Wait for server to be ready
    echo -e "${YELLOW}⏳ Waiting for server to be ready...${NC}"
    sleep 30
    
    SERVER_IP=$(hcloud server describe $SERVER_NAME -o format='{{.PublicNet.IPv4.IP}}')
fi

echo -e "${GREEN}🌐 Server IP: $SERVER_IP${NC}"

# Attach volume
echo -e "${BLUE}💾 Attaching storage volume...${NC}"
if ! hcloud server describe $SERVER_NAME | grep -q "dytallix-data"; then
    hcloud volume attach dytallix-data $SERVER_NAME
    echo -e "${GREEN}✅ Volume attached${NC}"
fi

# Deploy application
echo -e "${BLUE}📦 Deploying application...${NC}"

# Create deployment script
cat > deploy-to-server.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 Starting Dytallix deployment on server..."

# Mount volume
sudo mkdir -p /mnt/dytallix-data
if ! mountpoint -q /mnt/dytallix-data; then
    sudo mount /dev/sdb /mnt/dytallix-data || {
        sudo mkfs.ext4 /dev/sdb
        sudo mount /dev/sdb /mnt/dytallix-data
    }
    echo '/dev/sdb /mnt/dytallix-data ext4 defaults 0 0' | sudo tee -a /etc/fstab
fi

# Create application directory
sudo mkdir -p /opt/dytallix
sudo chown dytallix:dytallix /opt/dytallix
cd /opt/dytallix

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source ~/.cargo/env

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone repository
if [ ! -d "dytallix-main" ]; then
    git clone https://github.com/your-org/dytallix-main.git
fi

cd dytallix-main

# Copy Hetzner environment configuration
cp dytallix-fast-launch/.env.hetzner .env

# Build blockchain core
cd blockchain-core
cargo build --release --features api
cd ..

# Build and setup QuantumVault API
cd dytallix-fast-launch/services/quantumvault-api
npm install
cd ../../..

# Build frontend
cd dytallix-fast-launch/frontend
npm install
npm run build
cd ../..

# Create production startup script
cat > start-production.sh << 'PRODEOF'
#!/bin/bash
export NODE_ENV=production
export RUST_LOG=info

# Start blockchain core
./blockchain-core/target/release/blockchain-core --features api &
BLOCKCHAIN_PID=$!

# Start QuantumVault API
cd dytallix-fast-launch/services/quantumvault-api
npm start &
QUANTUMVAULT_PID=$!
cd ../../..

# Start frontend
cd dytallix-fast-launch/frontend
npm run preview &
FRONTEND_PID=$!
cd ../..

# Wait for services
wait $BLOCKCHAIN_PID $QUANTUMVAULT_PID $FRONTEND_PID
PRODEOF

chmod +x start-production.sh

# Start services
sudo systemctl enable dytallix
sudo systemctl start dytallix

echo "✅ Deployment complete!"
EOF

# Copy deployment script to server and execute
scp -i ~/.ssh/dytallix_deploy -o StrictHostKeyChecking=no deploy-to-server.sh dytallix@$SERVER_IP:/tmp/
ssh -i ~/.ssh/dytallix_deploy -o StrictHostKeyChecking=no dytallix@$SERVER_IP 'bash /tmp/deploy-to-server.sh'

# Setup SSL certificates
echo -e "${BLUE}🔒 Setting up SSL certificates...${NC}"
ssh -i ~/.ssh/dytallix_deploy dytallix@$SERVER_IP << 'EOF'
sudo certbot --nginx -d dytallix.com -d www.dytallix.com --non-interactive --agree-tos --email admin@dytallix.com
sudo systemctl reload nginx
EOF

# Configure DNS (manual step)
echo -e "${YELLOW}📋 DNS Configuration Required:${NC}"
echo "Please configure your DNS records:"
echo "  A    dytallix.com      $SERVER_IP"
echo "  A    www.dytallix.com  $SERVER_IP"
echo "  A    api.dytallix.com  $SERVER_IP"
echo "  A    rpc.dytallix.com  $SERVER_IP"
echo "  A    quantumvault.dytallix.com  $SERVER_IP"
echo ""

# Final status
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo ""
echo -e "${BLUE}📊 Deployment Summary:${NC}"
echo "  🖥️  Server: $SERVER_NAME"
echo "  🌐 IP Address: $SERVER_IP"
echo "  📍 Location: $LOCATION"
echo "  💾 Storage: 50GB volume attached"
echo ""
echo -e "${BLUE}🔗 Service URLs (after DNS configuration):${NC}"
echo "  🌐 Frontend: https://dytallix.com"
echo "  🔗 API: https://api.dytallix.com"
echo "  ⚡ RPC: https://rpc.dytallix.com"
echo "  🔐 QuantumVault: https://quantumvault.dytallix.com"
echo ""
echo -e "${BLUE}🔧 Management:${NC}"
echo "  📡 SSH: ssh -i ~/.ssh/dytallix_deploy dytallix@$SERVER_IP"
echo "  📊 Logs: journalctl -u dytallix -f"
echo "  🔄 Restart: sudo systemctl restart dytallix"
echo ""

# Cleanup
rm -f cloud-init.yml deploy-to-server.sh

echo -e "${GREEN}✅ Hetzner deployment script completed successfully!${NC}"
