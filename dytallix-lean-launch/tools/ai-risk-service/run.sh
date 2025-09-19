#!/bin/bash

# Dytallix AI Risk Service - Run Script
# 
# This script starts the AI risk scoring service with configurable parameters.
# The service provides deterministic transaction risk scoring for the Dytallix blockchain.

set -e

# Configuration
HOST=${AI_RISK_HOST:-"0.0.0.0"}
PORT=${AI_RISK_PORT:-7000}
LOG_LEVEL=${AI_RISK_LOG_LEVEL:-"info"}
WORKERS=${AI_RISK_WORKERS:-1}

# Check if requirements are installed
echo "Checking dependencies..."
python3 -c "import fastapi, uvicorn, pydantic" || {
    echo "Missing dependencies. Installing..."
    pip3 install -r requirements.txt
}

# Start the service
echo "Starting Dytallix AI Risk Service..."
echo "Host: $HOST"
echo "Port: $PORT"
echo "Log Level: $LOG_LEVEL"

exec python3 -m uvicorn app:app \
    --host "$HOST" \
    --port "$PORT" \
    --log-level "$LOG_LEVEL" \
    --workers "$WORKERS" \
    --access-log \
    "$@"