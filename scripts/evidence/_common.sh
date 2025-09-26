#!/usr/bin/env bash
# Common helper functions for release/ops evidence scripts
# Provides: utc_stamp, ensure_dir, write_json, log utilities

set -euo pipefail

# UTC timestamp in ISO 8601 format
utc_stamp() {
    date -u +"%Y-%m-%dT%H:%M:%SZ"
}

# Ensure directory exists, create if needed
ensure_dir() {
    local dir="$1"
    if [[ ! -d "$dir" ]]; then
        mkdir -p "$dir"
    fi
}

# Write JSON with proper formatting
write_json() {
    local file="$1"
    local content="$2"
    ensure_dir "$(dirname "$file")"
    echo "$content" | jq '.' > "$file"
}

# Logging functions
log_info() {
    echo "[$(utc_stamp)] INFO: $*" >&2
}

log_error() {
    echo "[$(utc_stamp)] ERROR: $*" >&2
}

log_success() {
    echo "[$(utc_stamp)] SUCCESS: $*" >&2
}

# Simple HTTP header validation
validate_header() {
    local header_name="$1"
    local header_value="$2"
    local expected_patterns="$3"  # space-separated patterns
    
    if [[ -z "$header_value" ]]; then
        echo "FAIL - $header_name: missing"
        return 1
    fi
    
    for pattern in $expected_patterns; do
        if [[ "$header_value" =~ $pattern ]]; then
            echo "PASS - $header_name: $header_value"
            return 0
        fi
    done
    
    echo "FAIL - $header_name: $header_value (doesn't match expected patterns: $expected_patterns)"
    return 1
}

# Check if command exists
require_cmd() {
    local cmd="$1"
    if ! command -v "$cmd" >/dev/null 2>&1; then
        log_error "Required command not found: $cmd"
        exit 1
    fi
}

# Set default environment variables if not set
set_defaults() {
    export NODE_RPC="${NODE_RPC:-http://127.0.0.1:3030}"
    export RPS="${RPS:-50}"
    export DURATION_S="${DURATION_S:-60}"
    export CONCURRENCY="${CONCURRENCY:-64}"
    export READINESS_OUT="${READINESS_OUT:-$(pwd)/readiness_out}"
}

# Initialize readiness output structure
init_readiness_structure() {
    ensure_dir "$READINESS_OUT/perf"
    ensure_dir "$READINESS_OUT/observability"
    ensure_dir "$READINESS_OUT/security"
    ensure_dir "$READINESS_OUT/faucet_e2e"
}