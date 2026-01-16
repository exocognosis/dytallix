#!/bin/bash

# =============================================================================
# DYTALLIX BRIDGE - ENVIRONMENT SETUP SCRIPT
# =============================================================================
# 
# This script helps you configure the environment files needed for testnet
# deployment. You'll need to provide your own credentials and API keys.
#
# =============================================================================

set -e

echo "🔧 DYTALLIX BRIDGE - ENVIRONMENT SETUP"
echo "======================================="
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}📋 Setting up environment files for testnet deployment...${NC}"
echo ""

# Function to create environment file from template
create_env_file() {
    local template_file=$1
    local env_file=$2
    local description=$3
    
    if [ -f "$env_file" ]; then
        echo -e "${YELLOW}⚠️  Environment file already exists: $env_file${NC}"
        read -p "Do you want to overwrite it? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}Skipping $description...${NC}"
            return
        fi
    fi
    
    if [ -f "$template_file" ]; then
        cp "$template_file" "$env_file"
        echo -e "${GREEN}✅ Created $description: $env_file${NC}"
        echo -e "${YELLOW}   📝 Please edit this file with your actual credentials${NC}"
    else
        echo -e "${RED}❌ Template file not found: $template_file${NC}"
    fi
}

# Create Ethereum environment file
echo -e "${BLUE}🔗 Ethereum (Sepolia) Environment Setup${NC}"
echo "--------------------------------------"
create_env_file "deployment/ethereum-contracts/.env.template" "deployment/ethereum-contracts/.env" "Ethereum environment file"
echo ""

# Create Cosmos environment file
echo -e "${BLUE}🌌 Cosmos (Osmosis) Environment Setup${NC}"
echo "------------------------------------"
create_env_file "deployment/cosmos-contracts/.env.template" "deployment/cosmos-contracts/.env" "Cosmos environment file"
echo ""

echo -e "${GREEN}🎉 ENVIRONMENT SETUP COMPLETE!${NC}"
echo "==============================="
echo ""
echo -e "${BLUE}📋 NEXT STEPS:${NC}"
echo ""
echo -e "${YELLOW}1. Configure Ethereum environment:${NC}"
echo "   • Edit: deployment/ethereum-contracts/.env"
echo "   • Add your Infura project ID"
echo "   • Add your deployment wallet private key"
echo "   • Add your Etherscan API key"
echo "   • Set validator addresses"
echo ""
echo -e "${YELLOW}2. Configure Cosmos environment:${NC}"
echo "   • Edit: deployment/cosmos-contracts/.env"
echo "   • Add your deployment wallet mnemonic"
echo "   • Set validator addresses"
echo ""
echo -e "${YELLOW}3. Get testnet funds:${NC}"
echo "   • Sepolia ETH: https://faucets.chain.link/sepolia"
echo "   • Osmosis testnet: https://faucet.osmosis.zone/"
echo ""
echo -e "${YELLOW}4. Run deployment:${NC}"
echo "   • Execute: ./FINAL_TESTNET_DEPLOYMENT.sh"
echo ""
echo -e "${GREEN}📖 For detailed instructions, see: BRIDGE_DEPLOYMENT_FINAL.md${NC}"
echo ""
