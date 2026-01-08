#!/bin/sh
# Observability probe script - verify metrics endpoints are working
# POSIX-compliant, idempotent

set -eu

REPO_ROOT=$(cd "$(dirname "$0")/../.." && pwd)
EVIDENCE_DIR="${REPO_ROOT}/launch-evidence/monitoring"
OUTPUT_FILE="${EVIDENCE_DIR}/metrics_probe.txt"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Create evidence directory if it doesn't exist
mkdir -p "${EVIDENCE_DIR}"

echo "=== Dytallix Observability Probe ===" > "${OUTPUT_FILE}"
echo "Timestamp: ${TIMESTAMP}" >> "${OUTPUT_FILE}"
echo "" >> "${OUTPUT_FILE}"

# Function to check metrics endpoint
check_metrics() {
    local service_name="$1"
    local endpoint="$2"
    
    echo "Checking ${service_name} metrics at ${endpoint}..." | tee -a "${OUTPUT_FILE}"
    
    # Try to curl the endpoint with timeout
    if command -v curl >/dev/null 2>&1; then
        response=$(curl -s -m 5 "${endpoint}" 2>&1 || echo "FAILED")
        
        if echo "${response}" | grep -q "FAILED"; then
            echo "  [FAIL] ${service_name} metrics endpoint unreachable" | tee -a "${OUTPUT_FILE}"
            echo "  Error: ${response}" >> "${OUTPUT_FILE}"
            return 1
        elif [ -z "${response}" ]; then
            echo "  [FAIL] ${service_name} returned empty response" | tee -a "${OUTPUT_FILE}"
            return 1
        else
            # Count metrics (lines starting with # or containing =)
            metric_count=$(echo "${response}" | grep -E "^(#|[a-z])" | wc -l)
            echo "  [PASS] ${service_name} returned ${metric_count} metric lines" | tee -a "${OUTPUT_FILE}"
            echo "" >> "${OUTPUT_FILE}"
            echo "--- ${service_name} Sample Metrics ---" >> "${OUTPUT_FILE}"
            echo "${response}" | head -20 >> "${OUTPUT_FILE}"
            echo "" >> "${OUTPUT_FILE}"
            return 0
        fi
    else
        echo "  [SKIP] curl not available" | tee -a "${OUTPUT_FILE}"
        return 1
    fi
}

# Check default endpoints
echo "" | tee -a "${OUTPUT_FILE}"
echo "=== Service Metrics Checks ===" | tee -a "${OUTPUT_FILE}"
echo "" | tee -a "${OUTPUT_FILE}"

# Node metrics (default port 3030)
NODE_URL="${NODE_URL:-http://localhost:3030/metrics}"
check_metrics "Node" "${NODE_URL}" || true

# API server metrics (default port 8787)
API_URL="${API_URL:-http://localhost:8787/metrics}"
check_metrics "API" "${API_URL}" || true

# AI Oracle metrics (default port 9091)
AI_URL="${AI_URL:-http://localhost:9091/metrics}"
check_metrics "AI Oracle" "${AI_URL}" || true

echo "" | tee -a "${OUTPUT_FILE}"
echo "=== Probe Complete ===" | tee -a "${OUTPUT_FILE}"
echo "Results saved to: ${OUTPUT_FILE}" | tee -a "${OUTPUT_FILE}"
echo ""

# Exit with success if at least one service responded
if grep -q "\[PASS\]" "${OUTPUT_FILE}"; then
    echo "✓ At least one metrics endpoint is working"
    exit 0
else
    echo "✗ No metrics endpoints are responding"
    echo "  Make sure services are running with metrics enabled"
    exit 1
fi
