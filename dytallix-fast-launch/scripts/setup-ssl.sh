#!/bin/bash
# Setup SSL/HTTPS for Dytallix
# Run this script AFTER DNS has been updated to point to 178.156.187.81

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Dytallix SSL Setup ===${NC}\n"

# Check if we're on the server
if [ ! -f "/etc/nginx/sites-available/dytallix" ]; then
    echo -e "${RED}Error: This script must be run on the Hetzner server${NC}"
    echo "Run: ssh root@178.156.187.81 'bash -s' < scripts/setup-ssl.sh"
    exit 1
fi

# Step 1: Check DNS
echo -e "${YELLOW}Step 1: Checking DNS...${NC}"
CURRENT_IP=$(dig +short dytallix.com A | head -1)
EXPECTED_IP="178.156.187.81"

if [ "$CURRENT_IP" != "$EXPECTED_IP" ]; then
    echo -e "${RED}DNS Error: dytallix.com points to $CURRENT_IP${NC}"
    echo -e "${RED}Expected: $EXPECTED_IP${NC}"
    echo -e "${YELLOW}Please update your DNS records and wait for propagation${NC}"
    echo ""
    echo "Required DNS records:"
    echo "  Type: A, Name: @, Value: 178.156.187.81"
    echo "  Type: A, Name: www, Value: 178.156.187.81"
    exit 1
fi

echo -e "${GREEN}✓ DNS is correctly configured${NC}\n"

# Step 2: Check if certbot is installed
echo -e "${YELLOW}Step 2: Checking certbot installation...${NC}"
if ! command -v certbot &> /dev/null; then
    echo "Installing certbot..."
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
fi
echo -e "${GREEN}✓ Certbot is installed${NC}\n"

# Step 3: Check nginx
echo -e "${YELLOW}Step 3: Checking nginx...${NC}"
if ! systemctl is-active --quiet nginx; then
    echo "Starting nginx..."
    systemctl start nginx
fi
echo -e "${GREEN}✓ Nginx is running${NC}\n"

# Step 4: Request SSL certificate
echo -e "${YELLOW}Step 4: Requesting SSL certificate...${NC}"
read -p "Enter your email for Let's Encrypt notifications: " EMAIL

if [ -z "$EMAIL" ]; then
    echo -e "${RED}Email is required${NC}"
    exit 1
fi

# Get certificate and automatically configure nginx
certbot --nginx \
    -d dytallix.com \
    -d www.dytallix.com \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    --redirect

echo -e "${GREEN}✓ SSL certificate installed${NC}\n"

# Step 5: Verify certificate
echo -e "${YELLOW}Step 5: Verifying certificate...${NC}"
if certbot certificates | grep -q "dytallix.com"; then
    echo -e "${GREEN}✓ Certificate is valid${NC}"
    certbot certificates
else
    echo -e "${RED}✗ Certificate verification failed${NC}"
    exit 1
fi

# Step 6: Test renewal
echo -e "\n${YELLOW}Step 6: Testing auto-renewal...${NC}"
if certbot renew --dry-run; then
    echo -e "${GREEN}✓ Auto-renewal is configured${NC}"
else
    echo -e "${RED}✗ Auto-renewal test failed${NC}"
    exit 1
fi

# Step 7: Final verification
echo -e "\n${YELLOW}Step 7: Final verification...${NC}"
echo "Testing HTTPS access..."

if curl -s -o /dev/null -w "%{http_code}" https://dytallix.com | grep -q "200"; then
    echo -e "${GREEN}✓ HTTPS is working${NC}"
else
    echo -e "${RED}✗ HTTPS test failed${NC}"
    exit 1
fi

# Summary
echo -e "\n${GREEN}=== SSL Setup Complete! ===${NC}\n"
echo "Your site is now secured with HTTPS:"
echo "  🔒 https://dytallix.com"
echo "  🔒 https://www.dytallix.com"
echo ""
echo "Certificate details:"
certbot certificates | grep -A 10 "Certificate Name: dytallix.com"
echo ""
echo "Next renewal: Check with 'certbot certificates'"
echo "Auto-renewal is enabled via systemd timer"
echo ""
echo -e "${GREEN}✓ All done!${NC}"
