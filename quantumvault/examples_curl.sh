#!/bin/bash

# QuantumVault API Examples
# Make sure the server is running: docker-compose up -d

BASE_URL="http://localhost:8080"
API_KEY="dev-api-key-change-in-production"

echo "🔒 QuantumVault API Examples"
echo "============================"
echo ""

# Health check
echo "1️⃣ Health Check"
echo "----------------"
curl -s $BASE_URL/health
echo -e "\n"

# List policies
echo "2️⃣ List Protection Policies"
echo "---------------------------"
POLICIES=$(curl -s -H "X-API-Key: $API_KEY" $BASE_URL/api/policies)
echo "$POLICIES" | jq '.'
echo ""

# Extract first policy ID for later use
POLICY_ID=$(echo "$POLICIES" | jq -r '.policies[0].id')
echo "📋 Using policy ID: $POLICY_ID"
echo ""

# Create a data store asset
echo "3️⃣ Create Data Store Asset"
echo "--------------------------"
ASSET_RESPONSE=$(curl -s -X POST $BASE_URL/api/assets/manual \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "name": "Production Database",
    "asset_type": "datastore",
    "endpoint_or_path": "postgresql://prod-db:5432/app",
    "owner": "platform-team",
    "sensitivity": "confidential",
    "regulatory_tags": ["HIPAA", "GDPR"],
    "exposure_level": "internal",
    "data_lifetime_days": 2555
  }')
echo "$ASSET_RESPONSE" | jq '.'
ASSET_ID=$(echo "$ASSET_RESPONSE" | jq -r '.id')
echo ""
echo "📦 Created asset ID: $ASSET_ID"
echo ""

# Discover TLS endpoint
echo "4️⃣ Discover TLS Endpoint"
echo "------------------------"
TLS_ASSET=$(curl -s -X POST $BASE_URL/api/assets/discover/tls \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "hostname": "example.com",
    "port": 443,
    "name": "Example.com API",
    "owner": "api-team",
    "sensitivity": "internal"
  }')
echo "$TLS_ASSET" | jq '.'
TLS_ASSET_ID=$(echo "$TLS_ASSET" | jq -r '.id')
echo ""

# List all assets
echo "5️⃣ List All Assets"
echo "------------------"
curl -s -H "X-API-Key: $API_KEY" $BASE_URL/api/assets | jq '.assets[] | {name, asset_type, risk_score, owner}'
echo ""

# Get single asset details
echo "6️⃣ Get Asset Details"
echo "--------------------"
curl -s -H "X-API-Key: $API_KEY" $BASE_URL/api/assets/$ASSET_ID | jq '.'
echo ""

# Update classification
echo "7️⃣ Update Asset Classification"
echo "------------------------------"
UPDATED_ASSET=$(curl -s -X PATCH $BASE_URL/api/assets/$ASSET_ID/classification \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "owner": "security-team",
    "sensitivity": "secret",
    "regulatory_tags": ["HIPAA", "GDPR", "PCI-DSS"],
    "exposure_level": "publicinternet",
    "data_lifetime_days": 3650
  }')
echo "$UPDATED_ASSET" | jq '{name, risk_score, sensitivity, owner, regulatory_tags}'
echo ""

# Apply protection policy
echo "8️⃣ Apply Protection Policy"
echo "--------------------------"
JOB_RESPONSE=$(curl -s -X POST $BASE_URL/api/assets/$ASSET_ID/apply-policy \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d "{\"policy_id\": \"$POLICY_ID\"}")
echo "$JOB_RESPONSE" | jq '.'
JOB_ID=$(echo "$JOB_RESPONSE" | jq -r '.id')
echo ""

# Wait for job to complete
echo "⏳ Waiting for job to complete..."
sleep 3
echo ""

# Check job status
echo "9️⃣ Check Job Status"
echo "-------------------"
curl -s -H "X-API-Key: $API_KEY" $BASE_URL/api/jobs/$JOB_ID | jq '.'
echo ""

# List jobs for asset
echo "🔟 List Jobs for Asset"
echo "---------------------"
curl -s -H "X-API-Key: $API_KEY" "$BASE_URL/api/jobs?asset_id=$ASSET_ID" | jq '.'
echo ""

# Query audit log
echo "1️⃣1️⃣ Query Audit Log (Asset Events)"
echo "-----------------------------------"
curl -s -H "X-API-Key: $API_KEY" "$BASE_URL/api/audit?asset_id=$ASSET_ID" | jq '.events[] | {event_type, actor, created_at}'
echo ""

# Verify audit chain
echo "1️⃣2️⃣ Verify Audit Chain Integrity"
echo "----------------------------------"
curl -s -H "X-API-Key: $API_KEY" $BASE_URL/api/audit/chain/verify | jq '.'
echo ""

# Filter assets by risk score
echo "1️⃣3️⃣ Filter High-Risk Assets (risk_score >= 60)"
echo "----------------------------------------------"
curl -s -H "X-API-Key: $API_KEY" "$BASE_URL/api/assets?min_risk_score=60" | jq '.assets[] | {name, risk_score, sensitivity, exposure_level}'
echo ""

# Get updated asset with protection profile
echo "1️⃣4️⃣ View Protected Asset Encryption Profile"
echo "-------------------------------------------"
curl -s -H "X-API-Key: $API_KEY" $BASE_URL/api/assets/$ASSET_ID | jq '.encryption_profile'
echo ""

echo "✅ All API examples completed!"
echo ""
echo "💡 Tips:"
echo "   - Asset IDs: $ASSET_ID, $TLS_ASSET_ID"
echo "   - Policy ID: $POLICY_ID"
echo "   - Job ID: $JOB_ID"
echo "   - Frontend: http://localhost:3000"
echo ""
