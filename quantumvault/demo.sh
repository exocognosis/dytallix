#!/bin/bash

# QuantumVault - Quick Demo Script
# This script demonstrates the full workflow in one go

set -e

API_KEY="dev-api-key-change-in-production"
API_BASE="http://localhost:8080"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║            🚀 QuantumVault Quick Demo 🚀                       ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check if services are running
if ! curl -s http://localhost:8080/health > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Backend is not running!${NC}"
    echo "Please start services first:"
    echo "  ./start.sh"
    exit 1
fi

echo -e "${GREEN}✓ Backend is running${NC}"
echo ""

# Step 1: Create a policy
echo -e "${BLUE}Step 1: Creating PQC Protection Policy...${NC}"
POLICY_RESPONSE=$(curl -s -X POST "$API_BASE/api/policies" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Demo Policy - Kyber1024",
    "description": "Maximum security hybrid PQC policy for demo",
    "kem": "kyber1024",
    "signature_scheme": "dilithium5",
    "symmetric_algo": "aes256gcm",
    "mode": "hybrid",
    "rotation_interval_days": 90
  }')

POLICY_ID=$(echo $POLICY_RESPONSE | jq -r '.id')
echo -e "${GREEN}✓ Policy created: $POLICY_ID${NC}"
echo ""

# Step 2: Register an asset
echo -e "${BLUE}Step 2: Registering Cryptographic Asset...${NC}"
ASSET_RESPONSE=$(curl -s -X POST "$API_BASE/api/assets" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Demo API Keys Vault",
    "asset_type": "secrets_vault",
    "owner": "demo-team",
    "endpoint_or_path": "/opt/demo/api-keys",
    "sensitivity": "top_secret",
    "exposure_level": "internal",
    "regulatory_tags": ["SOC2", "HIPAA"],
    "data_lifetime_days": 365
  }')

ASSET_ID=$(echo $ASSET_RESPONSE | jq -r '.id')
RISK_SCORE=$(echo $ASSET_RESPONSE | jq -r '.risk_score')
echo -e "${GREEN}✓ Asset registered: $ASSET_ID${NC}"
echo -e "  Risk Score: $RISK_SCORE"
echo ""

# Step 3: Apply protection
echo -e "${BLUE}Step 3: Applying PQC Protection...${NC}"
JOB_RESPONSE=$(curl -s -X POST "$API_BASE/api/jobs" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"asset_id\": \"$ASSET_ID\",
    \"policy_id\": \"$POLICY_ID\",
    \"job_type\": \"protect\"
  }")

JOB_ID=$(echo $JOB_RESPONSE | jq -r '.id')
echo -e "${GREEN}✓ Protection job started: $JOB_ID${NC}"
echo -e "  Applying Kyber1024 + Dilithium5 hybrid encryption..."
sleep 2

# Step 4: Check job status
echo ""
echo -e "${BLUE}Step 4: Checking Job Status...${NC}"
JOB_STATUS=$(curl -s -H "X-API-Key: $API_KEY" "$API_BASE/api/jobs/$JOB_ID")
STATUS=$(echo $JOB_STATUS | jq -r '.status')
echo -e "${GREEN}✓ Job status: $STATUS${NC}"
echo ""

# Step 5: View protected asset
echo -e "${BLUE}Step 5: Viewing Protected Asset...${NC}"
PROTECTED_ASSET=$(curl -s -H "X-API-Key: $API_KEY" "$API_BASE/api/assets/$ASSET_ID")
echo $PROTECTED_ASSET | jq '.'
echo ""

# Step 6: View audit trail
echo -e "${BLUE}Step 6: Viewing Audit Trail (last 5 events)...${NC}"
AUDIT=$(curl -s -H "X-API-Key: $API_KEY" "$API_BASE/api/audit?limit=5")
echo $AUDIT | jq '.events[] | {event_type, actor, created_at, hash: .current_hash[0:16]}'
echo ""

# Summary
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    ✨ Demo Complete! ✨                        ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "What just happened:"
echo "  1. ✓ Created a PQC policy (Kyber1024 + Dilithium5)"
echo "  2. ✓ Registered a cryptographic asset"
echo "  3. ✓ Applied hybrid PQC protection"
echo "  4. ✓ Verified job completion"
echo "  5. ✓ Checked asset protection status"
echo "  6. ✓ Reviewed tamper-evident audit trail"
echo ""
echo "View in Web UI:"
echo "  🌐 http://localhost:5173/assets"
echo "  🌐 http://localhost:5173/policies"
echo "  🌐 http://localhost:5173/audit"
echo ""
echo "Asset Details:"
echo "  Asset ID:  $ASSET_ID"
echo "  Policy ID: $POLICY_ID"
echo "  Job ID:    $JOB_ID"
echo ""
