#!/bin/bash

##############################################################################
# Pre-Flight Check - Verify readiness for Hetzner deployment
##############################################################################

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SERVER_IP="178.156.187.81"
SERVER_USER="root"
REQUIRED_FILES=(
    "deploy.sh"
    "Dockerfile"
    "docker-compose.yml"
    ".env.example"
    "genesis.json"
    "Cargo.toml"
    "package.json"
)

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        Dytallix Fast Launch - Pre-Flight Check            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

PASSED=0
FAILED=0
WARNINGS=0

# Check 1: Local files exist
echo -e "${YELLOW}[1/8] Checking required files...${NC}"
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "  ${GREEN}✓${NC} $file"
        ((PASSED++))
    else
        echo -e "  ${RED}✗${NC} $file ${RED}MISSING${NC}"
        ((FAILED++))
    fi
done

# Check 2: SSH connectivity
echo -e "\n${YELLOW}[2/8] Checking SSH connectivity to $SERVER_IP...${NC}"
if ssh -o ConnectTimeout=5 -o BatchMode=yes "$SERVER_USER@$SERVER_IP" "echo 'ok'" > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} SSH connection successful"
    ((PASSED++))
else
    echo -e "  ${RED}✗${NC} Cannot connect via SSH"
    echo -e "  ${YELLOW}→${NC} Run: ssh-copy-id $SERVER_USER@$SERVER_IP"
    ((FAILED++))
fi

# Check 3: Network connectivity
echo -e "\n${YELLOW}[3/8] Checking network connectivity...${NC}"
if ping -c 1 -W 2 $SERVER_IP > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} Server is reachable"
    ((PASSED++))
else
    echo -e "  ${RED}✗${NC} Cannot ping server"
    ((FAILED++))
fi

# Check 4: Local dependencies
echo -e "\n${YELLOW}[4/8] Checking local dependencies...${NC}"

command -v rsync > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "  ${GREEN}✓${NC} rsync installed"
    ((PASSED++))
else
    echo -e "  ${RED}✗${NC} rsync not found"
    echo -e "  ${YELLOW}→${NC} Install: brew install rsync"
    ((FAILED++))
fi

command -v docker > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "  ${GREEN}✓${NC} docker installed locally"
    ((PASSED++))
else
    echo -e "  ${YELLOW}⚠${NC} docker not found locally (not required, but helpful)"
    ((WARNINGS++))
fi

command -v jq > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "  ${GREEN}✓${NC} jq installed"
    ((PASSED++))
else
    echo -e "  ${YELLOW}⚠${NC} jq not found (helpful for testing)"
    echo -e "  ${YELLOW}→${NC} Install: brew install jq"
    ((WARNINGS++))
fi

# Check 5: Remote server requirements
echo -e "\n${YELLOW}[5/8] Checking remote server...${NC}"
if ssh -o ConnectTimeout=5 "$SERVER_USER@$SERVER_IP" "command -v docker" > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} Docker available on server"
    ((PASSED++))
    
    # Check Docker version
    DOCKER_VERSION=$(ssh "$SERVER_USER@$SERVER_IP" "docker --version" 2>&1)
    echo -e "    ${BLUE}→${NC} $DOCKER_VERSION"
else
    echo -e "  ${YELLOW}⚠${NC} Docker not detected (will be installed during deployment)"
    ((WARNINGS++))
fi

# Check 6: Available disk space
echo -e "\n${YELLOW}[6/8] Checking disk space...${NC}"
if ssh -o ConnectTimeout=5 "$SERVER_USER@$SERVER_IP" "df -h /" > /dev/null 2>&1; then
    DISK_INFO=$(ssh "$SERVER_USER@$SERVER_IP" "df -h / | tail -1")
    DISK_AVAIL=$(echo $DISK_INFO | awk '{print $4}')
    DISK_USE=$(echo $DISK_INFO | awk '{print $5}')
    echo -e "  ${GREEN}✓${NC} Disk space: $DISK_AVAIL available ($DISK_USE used)"
    ((PASSED++))
else
    echo -e "  ${YELLOW}⚠${NC} Could not check disk space"
    ((WARNINGS++))
fi

# Check 7: Required ports
echo -e "\n${YELLOW}[7/8] Checking required ports availability...${NC}"
PORTS=(3030 8787 5173 9090 3000 16686)
for port in "${PORTS[@]}"; do
    if ssh "$SERVER_USER@$SERVER_IP" "! netstat -tuln | grep -q :$port" 2>/dev/null; then
        echo -e "  ${GREEN}✓${NC} Port $port available"
        ((PASSED++))
    else
        echo -e "  ${YELLOW}⚠${NC} Port $port may be in use"
        ((WARNINGS++))
    fi
done

# Check 8: Environment configuration
echo -e "\n${YELLOW}[8/8] Checking environment configuration...${NC}"
if [ -f ".env.example" ]; then
    echo -e "  ${GREEN}✓${NC} .env.example found"
    ((PASSED++))
    
    # Check for critical variables
    if grep -q "FAUCET_MNEMONIC" .env.example; then
        echo -e "  ${GREEN}✓${NC} FAUCET_MNEMONIC placeholder found"
        ((PASSED++))
    else
        echo -e "  ${YELLOW}⚠${NC} FAUCET_MNEMONIC not in template"
        ((WARNINGS++))
    fi
else
    echo -e "  ${RED}✗${NC} .env.example not found"
    ((FAILED++))
fi

# Summary
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    Pre-Flight Summary                     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${GREEN}Passed:${NC}   $PASSED"
echo -e "  ${YELLOW}Warnings:${NC} $WARNINGS"
echo -e "  ${RED}Failed:${NC}   $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║       ✓ READY FOR DEPLOYMENT                              ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "Next steps:"
    echo -e "  1. Review: cat HETZNER_DEPLOYMENT_GUIDE.md"
    echo -e "  2. Deploy: ./scripts/deploy-to-hetzner.sh full"
    echo ""
    exit 0
else
    echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║       ✗ NOT READY - Please fix errors above              ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    exit 1
fi
