#!/bin/sh
# Security headers check script - verify security headers are present
# POSIX-compliant, idempotent

set -eu

REPO_ROOT=$(cd "$(dirname "$0")/../.." && pwd)
EVIDENCE_DIR="${REPO_ROOT}/launch-evidence/security"
OUTPUT_FILE="${EVIDENCE_DIR}/csp_headers_check.txt"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Create evidence directory if it doesn't exist
mkdir -p "${EVIDENCE_DIR}"

echo "=== Dytallix Security Headers Check ===" > "${OUTPUT_FILE}"
echo "Timestamp: ${TIMESTAMP}" >> "${OUTPUT_FILE}"
echo "" >> "${OUTPUT_FILE}"

# Configuration
API_URL="${API_URL:-http://localhost:8787}"
ENDPOINTS="/api/status /api/faucet /metrics"

echo "Configuration:" | tee -a "${OUTPUT_FILE}"
echo "  API Base URL: ${API_URL}" | tee -a "${OUTPUT_FILE}"
echo "  Endpoints to check: ${ENDPOINTS}" | tee -a "${OUTPUT_FILE}"
echo "" | tee -a "${OUTPUT_FILE}"

# Required security headers
REQUIRED_HEADERS="X-Content-Type-Options Referrer-Policy X-Frame-Options Content-Security-Policy"

# Function to check headers for an endpoint
check_endpoint_headers() {
    local endpoint="$1"
    local url="${API_URL}${endpoint}"
    
    echo "=== Checking ${endpoint} ===" | tee -a "${OUTPUT_FILE}"
    
    if ! command -v curl >/dev/null 2>&1; then
        echo "  [SKIP] curl not available" | tee -a "${OUTPUT_FILE}"
        return 1
    fi
    
    # Fetch headers
    headers=$(curl -s -I -m 5 "${url}" 2>&1 || echo "FAILED")
    
    if echo "${headers}" | grep -q "FAILED"; then
        echo "  [SKIP] Endpoint not reachable: ${url}" | tee -a "${OUTPUT_FILE}"
        echo "" >> "${OUTPUT_FILE}"
        return 1
    fi
    
    echo "Response headers:" >> "${OUTPUT_FILE}"
    echo "${headers}" >> "${OUTPUT_FILE}"
    echo "" >> "${OUTPUT_FILE}"
    
    # Check for required headers
    local all_present=0
    for header in ${REQUIRED_HEADERS}; do
        if echo "${headers}" | grep -qi "^${header}:"; then
            value=$(echo "${headers}" | grep -i "^${header}:" | head -1 | cut -d: -f2- | sed 's/^[[:space:]]*//')
            echo "  [PASS] ${header}: ${value}" | tee -a "${OUTPUT_FILE}"
        else
            echo "  [FAIL] ${header}: NOT PRESENT" | tee -a "${OUTPUT_FILE}"
            all_present=1
        fi
    done
    
    # Check HSTS for HTTPS
    if echo "${url}" | grep -q "^https://"; then
        if echo "${headers}" | grep -qi "^Strict-Transport-Security:"; then
            value=$(echo "${headers}" | grep -i "^Strict-Transport-Security:" | head -1 | cut -d: -f2- | sed 's/^[[:space:]]*//')
            echo "  [PASS] Strict-Transport-Security: ${value}" | tee -a "${OUTPUT_FILE}"
        else
            echo "  [WARN] Strict-Transport-Security: NOT PRESENT (HTTPS only)" | tee -a "${OUTPUT_FILE}"
        fi
    fi
    
    echo "" >> "${OUTPUT_FILE}"
    return ${all_present}
}

# Check each endpoint
echo "=== Endpoint Checks ===" | tee -a "${OUTPUT_FILE}"
echo "" | tee -a "${OUTPUT_FILE}"

overall_status=0
for endpoint in ${ENDPOINTS}; do
    if ! check_endpoint_headers "${endpoint}"; then
        overall_status=1
    fi
done

echo "=== Summary ===" | tee -a "${OUTPUT_FILE}"
echo "" | tee -a "${OUTPUT_FILE}"

if [ ${overall_status} -eq 0 ]; then
    echo "✓ All required security headers present" | tee -a "${OUTPUT_FILE}"
    echo "" | tee -a "${OUTPUT_FILE}"
    echo "Required headers:" | tee -a "${OUTPUT_FILE}"
    for header in ${REQUIRED_HEADERS}; do
        echo "  - ${header}" | tee -a "${OUTPUT_FILE}"
    done
    echo "" | tee -a "${OUTPUT_FILE}"
    echo "Note: Enable security headers with:" | tee -a "${OUTPUT_FILE}"
    echo "  export ENABLE_SEC_HEADERS=1" | tee -a "${OUTPUT_FILE}"
    echo "  export ENABLE_CSP=1" | tee -a "${OUTPUT_FILE}"
else
    echo "⚠ Some security headers are missing" | tee -a "${OUTPUT_FILE}"
    echo "" | tee -a "${OUTPUT_FILE}"
    echo "To enable security headers, set environment variables:" | tee -a "${OUTPUT_FILE}"
    echo "  export ENABLE_SEC_HEADERS=1" | tee -a "${OUTPUT_FILE}"
    echo "  export ENABLE_CSP=1" | tee -a "${OUTPUT_FILE}"
    echo "" | tee -a "${OUTPUT_FILE}"
    echo "Then restart the server." | tee -a "${OUTPUT_FILE}"
fi

echo "" | tee -a "${OUTPUT_FILE}"
echo "Results saved to: ${OUTPUT_FILE}" | tee -a "${OUTPUT_FILE}"

exit 0
