#!/bin/bash
set -e

# Server Configuration
SERVER_IP="178.156.187.81"
SERVER_USER="root"
REMOTE_DIR="/opt/quantumvault"
LOCAL_ARCHIVE="quantumvault-deploy.tar.gz"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Deploying QuantumVaultMVP to ${SERVER_IP}...${NC}"

# Check if archive exists
if [ ! -f "$LOCAL_ARCHIVE" ]; then
    echo "Error: $LOCAL_ARCHIVE not found. Did you run the packaging step?"
    exit 1
fi

# 1. Prepare Remote Directory
echo -e "\n${BLUE}[1/4] Preparing remote directory...${NC}"
ssh $SERVER_USER@$SERVER_IP "mkdir -p $REMOTE_DIR"

# 2. Upload Archive
echo -e "\n${BLUE}[2/4] Uploading archive...${NC}"
scp $LOCAL_ARCHIVE $SERVER_USER@$SERVER_IP:$REMOTE_DIR/

# 3. Extract and Install
echo -e "\n${BLUE}[3/4] Extracting and installing dependencies...${NC}"
ssh $SERVER_USER@$SERVER_IP bash -s -- "$REMOTE_DIR" "$LOCAL_ARCHIVE" << 'EOF'
    REMOTE_DIR=$1
    LOCAL_ARCHIVE=$2

    cd $REMOTE_DIR
    
    echo "Extracting..."
    tar -xzf $LOCAL_ARCHIVE
    
    # Install production dependencies for Backend
    echo "Installing Backend dependencies..."
    cd backend
    npm install --production --legacy-peer-deps
    cd ..
    
    # Install dependencies for Frontend
    echo "Installing Frontend dependencies..."
    cd frontend
    npm install
    rm -f .env.local  # Ensure we don't use local overrides in production
    echo "Building Frontend..."
    npm run build
    cd ..

    # Install production dependencies for Main Frontend
    echo "Installing Main Frontend dependencies..."
    cd main-frontend
    npm install
    echo "Building Main Frontend..."
    npm run build
    cd ..
    
    # Install dependencies for Fast Launch API Server
    echo "Installing Fast Launch API dependencies..."
    cd dytallix-fast-launch/server
    npm install --production
    cd ../..
    
    # Build Blockchain Node
    echo "Building Blockchain Node (This may take a while)..."
    if command -v cargo &> /dev/null; then
        cd dytallix-fast-launch/node
        cargo build --release
        cd ../..
    else
        echo "⚠️  Cargo not found! Attempting to install Rust..."
        curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
        source $HOME/.cargo/env
        cd dytallix-fast-launch/node
        cargo build --release
        cd ../..
    fi

    # Install PM2 if missing
    if ! command -v pm2 &> /dev/null; then
        echo "Installing PM2..."
        npm install -g pm2
    fi
EOF

# 4. Start Application
echo -e "\n${BLUE}[4/4] Starting application with PM2...${NC}"
ssh $SERVER_USER@$SERVER_IP bash -s -- "$REMOTE_DIR" << 'EOF'
    REMOTE_DIR=$1
    
    cd $REMOTE_DIR
    pm2 delete all || true
    pm2 start ecosystem.config.js
    pm2 save
    
    # NGINX CONFIGURATION RECONSTRUCTION
    CONFFILE="/etc/nginx/sites-enabled/dytallix"
    SNIPPET="/etc/nginx/snippets/quantumvault.conf"
    BACKUP="/etc/nginx/dytallix.bak.$(date +%s)"
    
    echo "--- DEPLOYING NGINX SNIPPET ---"
    sudo mkdir -p /etc/nginx/snippets
    sudo cp nginx-quantumvault.conf "$SNIPPET"
    
    if [ -f "$CONFFILE" ]; then
        echo "Creating backup at $BACKUP..."
        sudo cp "$CONFFILE" "$BACKUP"
        
        # EXTRACT KEY INFO (Fail gracefully if not found)
        # We search for the first occurrence of these directives
        CERT_PATH=$(grep -m 1 "ssl_certificate " "$CONFFILE" | awk '{print $2}' | tr -d ';')
        KEY_PATH=$(grep -m 1 "ssl_certificate_key " "$CONFFILE" | awk '{print $2}' | tr -d ';')
        
        echo "Detected Cert: $CERT_PATH"
        echo "Detected Key: $KEY_PATH"
        
        if [ -z "$CERT_PATH" ] || [ -z "$KEY_PATH" ]; then
            echo "Warning: SSL certs not found! Generatin HTTP-only config..."
            BLOCK_SSL=""
            BLOCK_HTTP_REDIRECT=""
            LISTEN_Directive="listen 80;"
        else
            # Construct SSL Block parts
            BLOCK_HTTP_REDIRECT="server {
    listen 80;
    server_name dytallix.com www.dytallix.com;
    return 301 https://\$host\$request_uri;
}"
            LISTEN_Directive="listen 443 ssl;"
            BLOCK_SSL="
    ssl_certificate $CERT_PATH;
    ssl_certificate_key $KEY_PATH;
    include /etc/letsencrypt/options-ssl-nginx.conf; 
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;"
        fi

        # GENERATE NEW CONFIG
        # Note: We hardcode dytallix.com because we saw it in logs.
        # We assume root -> 3000 (Wallet) and QuantumVault -> 13002 (Via snippet)
        
        echo "Reconstructing Nginx Config..."
        
        cat > /tmp/dytallix_nginx.conf << NGINXCONF
$BLOCK_HTTP_REDIRECT

server {
    $LISTEN_Directive
    server_name dytallix.com www.dytallix.com;

    $BLOCK_SSL

    # QuantumVault App
    include $SNIPPET;

    # API Server (Aegis Dashboard, Faucet, etc)
    location /api/ {
        proxy_pass http://localhost:8787;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    # Default App (Wallet)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINXCONF
        sudo cp /tmp/dytallix_nginx.conf $CONFFILE

        # Verify and Reload
        echo "--- NEW NGINX CONFIG ---"
        cat "$CONFFILE"
        echo "------------------------"
        
        if sudo nginx -t; then
            sudo systemctl reload nginx
            echo "Nginx reloaded."
        else
            echo "Reconstructed config invalid! Restoring backup..."
            sudo cp "$BACKUP" "$CONFFILE"
            sudo systemctl reload nginx
        fi
        
        # Connection Test
        echo "Testing local connection..."
        curl -I http://localhost/QuantumVaultMVP || true
    else
        echo "Error: Config file $CONFFILE not found."
    fi
    
    echo -e "✓ Application started!"
EOF

echo -e "\n${GREEN}🎉 Deployment Complete!${NC}"
echo -e "Next Step: Configure Nginx on the server using the instructions in DEPLOY.md (included in the upload)."
