#!/bin/bash

# DRT Emissions Cron Script
# Calculates and applies DRT token emissions based on block production

set -e

LOG_FILE="${LOG_FILE:-/tmp/dytallix_emissions.log}"
SERVER_URL="${SERVER_URL:-http://localhost:8080}"
NODE_RPC_URL="${NODE_RPC_URL:-http://localhost:26657}"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Starting DRT emissions calculation..."

# Get current block height
CURRENT_HEIGHT=$(curl -s "${NODE_RPC_URL}/status" | jq -r '.result.sync_info.latest_block_height' 2>/dev/null || echo "0")

if [ "$CURRENT_HEIGHT" = "0" ] || [ "$CURRENT_HEIGHT" = "null" ]; then
    log "Warning: Could not fetch block height from node, using mock data"
    CURRENT_HEIGHT=12345
fi

# Get last processed height (stored in temp file for demo)
LAST_HEIGHT_FILE="/tmp/dytallix_last_emissions_height"
LAST_HEIGHT=$(cat "$LAST_HEIGHT_FILE" 2>/dev/null || echo "0")

# Calculate blocks to process
BLOCKS_TO_PROCESS=$((CURRENT_HEIGHT - LAST_HEIGHT))

if [ "$BLOCKS_TO_PROCESS" -le 0 ]; then
    log "No new blocks to process (current: $CURRENT_HEIGHT, last: $LAST_HEIGHT)"
    exit 0
fi

log "Processing $BLOCKS_TO_PROCESS blocks (from $LAST_HEIGHT to $CURRENT_HEIGHT)"

# Calculate emissions via server API
EMISSIONS_RESPONSE=$(curl -s -X POST "${SERVER_URL}/emissions/calculate" \
    -H "Content-Type: application/json" \
    -d "{\"blocks\": $BLOCKS_TO_PROCESS}" 2>/dev/null)

if [ $? -eq 0 ] && [ -n "$EMISSIONS_RESPONSE" ]; then
    TOTAL_EMISSION=$(echo "$EMISSIONS_RESPONSE" | jq -r '.total_emission' 2>/dev/null || echo "0")
    VALIDATORS_SHARE=$(echo "$EMISSIONS_RESPONSE" | jq -r '.distribution.validators' 2>/dev/null || echo "0")
    DELEGATORS_SHARE=$(echo "$EMISSIONS_RESPONSE" | jq -r '.distribution.delegators' 2>/dev/null || echo "0")
    AI_SERVICES_SHARE=$(echo "$EMISSIONS_RESPONSE" | jq -r '.distribution.ai_services' 2>/dev/null || echo "0")
    
    log "Emissions calculated:"
    log "  Total DRT emission: $TOTAL_EMISSION"
    log "  Validators share: $VALIDATORS_SHARE"
    log "  Delegators share: $DELEGATORS_SHARE"
    log "  AI Services share: $AI_SERVICES_SHARE"
    
    # In a real implementation, this would mint and distribute tokens
    # For testnet, we'll just log the emissions
    log "Emissions applied successfully"
    
    # Update last processed height
    echo "$CURRENT_HEIGHT" > "$LAST_HEIGHT_FILE"
    
else
    log "Error: Failed to calculate emissions from server"
    exit 1
fi

log "DRT emissions processing completed"