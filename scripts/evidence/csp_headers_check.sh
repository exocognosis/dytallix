#!/usr/bin/env bash
# Security Headers / CSP Evidence Pack
# Validates security headers on public/frontend endpoints

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_common.sh
source "$SCRIPT_DIR/_common.sh"

main() {
    log_info "Starting Security Headers / CSP Evidence Pack"
    
    # Set defaults and validate environment  
    set_defaults
    init_readiness_structure
    
    # Check required tools
    require_cmd curl
    
    # Define endpoints to check
    local endpoints=(
        "http://localhost:8787/"
        "http://localhost:5173/"
        "http://localhost:3001/"
        "${NODE_RPC}/"
    )
    
    log_info "Checking security headers on ${#endpoints[@]} endpoints"
    
    # Test each endpoint
    check_security_headers "${endpoints[@]}"
    
    # Generate security report
    generate_security_report
    
    log_success "Security Headers Evidence Pack completed"
}

check_security_headers() {
    local endpoints=("$@")
    local headers_file="$READINESS_OUT/security/curl_headers.txt"
    local check_file="$READINESS_OUT/security/csp_headers_check.txt"
    
    ensure_dir "$(dirname "$headers_file")"
    
    # Initialize files
    echo "# Security Headers Check - $(utc_stamp)" > "$headers_file"
    echo "# CSP Headers Validation - $(utc_stamp)" > "$check_file"
    echo "" >> "$check_file"
    
    local overall_status="PASS"
    
    for endpoint in "${endpoints[@]}"; do
        log_info "Checking headers for $endpoint"
        
        echo "" >> "$headers_file"
        echo "=== ENDPOINT: $endpoint ===" >> "$headers_file"
        echo "Timestamp: $(utc_stamp)" >> "$headers_file"
        echo "" >> "$headers_file"
        
        # Fetch headers
        local curl_output http_code
        curl_output=$(curl -I -s -m 10 "$endpoint" 2>&1 || echo "CURL_ERROR")
        http_code=$(echo "$curl_output" | head -1 | grep -o '[0-9][0-9][0-9]' || echo "000")
        
        echo "HTTP Status: $http_code" >> "$headers_file"
        echo "$curl_output" >> "$headers_file"
        echo "" >> "$headers_file"
        
        # Parse and validate headers if successful response
        if [[ "$http_code" =~ ^[23] ]]; then
            validate_endpoint_headers "$endpoint" "$curl_output" "$check_file"
            local endpoint_status=$?
            if [[ $endpoint_status -ne 0 ]]; then
                overall_status="FAIL"
            fi
        else
            echo "ENDPOINT: $endpoint" >> "$check_file"
            echo "STATUS: FAIL - HTTP $http_code (unreachable)" >> "$check_file"
            echo "" >> "$check_file"
            overall_status="FAIL"
        fi
    done
    
    # Add overall summary
    echo "" >> "$check_file"
    echo "=== OVERALL RESULT ===" >> "$check_file"
    echo "Status: $overall_status" >> "$check_file"
    echo "Timestamp: $(utc_stamp)" >> "$check_file"
    
    log_info "Security headers check completed with status: $overall_status"
}

validate_endpoint_headers() {
    local endpoint="$1"
    local headers="$2"
    local check_file="$3"
    
    echo "ENDPOINT: $endpoint" >> "$check_file"
    echo "----------------------------------------" >> "$check_file"
    
    local endpoint_failed=0
    
    # Extract headers (case-insensitive)
    local csp_header x_content_type_options x_frame_options referrer_policy strict_transport_security
    
    csp_header=$(echo "$headers" | grep -i "content-security-policy:" | head -1 | cut -d: -f2- | sed 's/^[[:space:]]*//' || echo "")
    x_content_type_options=$(echo "$headers" | grep -i "x-content-type-options:" | head -1 | cut -d: -f2- | sed 's/^[[:space:]]*//' || echo "")
    x_frame_options=$(echo "$headers" | grep -i -E "(x-frame-options|frame-options):" | head -1 | cut -d: -f2- | sed 's/^[[:space:]]*//' || echo "")
    referrer_policy=$(echo "$headers" | grep -i "referrer-policy:" | head -1 | cut -d: -f2- | sed 's/^[[:space:]]*//' || echo "")
    strict_transport_security=$(echo "$headers" | grep -i "strict-transport-security:" | head -1 | cut -d: -f2- | sed 's/^[[:space:]]*//' || echo "")
    
    # Validate Content-Security-Policy
    if validate_header "Content-Security-Policy" "$csp_header" "default-src 'self' script-src 'unsafe-inline' 'unsafe-eval'" >> "$check_file"; then
        true
    else
        endpoint_failed=1
    fi
    
    # Validate X-Content-Type-Options
    if validate_header "X-Content-Type-Options" "$x_content_type_options" "nosniff" >> "$check_file"; then
        true
    else
        endpoint_failed=1
    fi
    
    # Validate X-Frame-Options / Frame-Options
    if validate_header "X-Frame-Options" "$x_frame_options" "DENY SAMEORIGIN" >> "$check_file"; then
        true
    else
        endpoint_failed=1
    fi
    
    # Validate Referrer-Policy
    if validate_header "Referrer-Policy" "$referrer_policy" "strict-origin-when-cross-origin no-referrer same-origin" >> "$check_file"; then
        true
    else
        endpoint_failed=1
    fi
    
    # Validate Strict-Transport-Security (only if HTTPS)
    if [[ "$endpoint" =~ ^https:// ]]; then
        if validate_header "Strict-Transport-Security" "$strict_transport_security" "max-age=" >> "$check_file"; then
            true
        else
            endpoint_failed=1
        fi
    else
        echo "SKIP - Strict-Transport-Security: Not HTTPS endpoint" >> "$check_file"
    fi
    
    echo "" >> "$check_file"
    
    return $endpoint_failed
}

generate_security_report() {
    log_info "Generating security headers evidence report"
    
    local headers_file="$READINESS_OUT/security/curl_headers.txt"
    local check_file="$READINESS_OUT/security/csp_headers_check.txt"
    
    # Count results - ensure clean numeric values
    local total_checks pass_count fail_count skip_count
    pass_count=$(grep -c "^PASS" "$check_file" 2>/dev/null | tr -d '\n' || echo "0")
    fail_count=$(grep -c "^FAIL" "$check_file" 2>/dev/null | tr -d '\n' || echo "0") 
    skip_count=$(grep -c "^SKIP" "$check_file" 2>/dev/null | tr -d '\n' || echo "0")
    total_checks=$((pass_count + fail_count + skip_count))
    
    # Determine overall status
    local overall_status="PASS"
    if [[ $fail_count -gt 0 ]]; then
        overall_status="FAIL"
    fi
    
    # Key headers status
    local csp_status xct_status ref_policy_status
    csp_status=$(grep "Content-Security-Policy" "$check_file" 2>/dev/null | head -1 | cut -d' ' -f1 || echo "FAIL")
    xct_status=$(grep "X-Content-Type-Options" "$check_file" 2>/dev/null | head -1 | cut -d' ' -f1 || echo "FAIL")  
    ref_policy_status=$(grep "Referrer-Policy" "$check_file" 2>/dev/null | head -1 | cut -d' ' -f1 || echo "FAIL")
    
    # Generate markdown report
    cat > "$READINESS_OUT/security_headers_report.md" << EOF
# Security Headers Evidence Report

**Generated:** $(utc_stamp)

## Test Summary

| Metric | Count |
|--------|-------|
| Total Checks | $total_checks |
| Passed | $pass_count |
| Failed | $fail_count |
| Skipped | $skip_count |
| **Overall Status** | **$overall_status** |

## Core Security Headers

| Header | Status | Requirement |
|--------|--------|-------------|
| Content-Security-Policy | $csp_status | Required for XSS protection |
| X-Content-Type-Options | $xct_status | Required for MIME sniffing protection |
| Referrer-Policy | $ref_policy_status | Required for privacy protection |
| X-Frame-Options | $(grep "X-Frame-Options" "$check_file" 2>/dev/null | head -1 | cut -d' ' -f1 || echo "FAIL") | Required for clickjacking protection |
| Strict-Transport-Security | $(grep "Strict-Transport-Security" "$check_file" 2>/dev/null | head -1 | cut -d' ' -f1 || echo "SKIP") | Required only for HTTPS endpoints |

## Compliance Status

### MVP Requirements Met
$(if [[ "$csp_status" == "PASS" && "$xct_status" == "PASS" && "$ref_policy_status" == "PASS" ]]; then
    echo "✅ **PASS** - Core security headers present"
else
    echo "❌ **FAIL** - Missing required security headers"
fi)

### Detailed Results
$(if [[ "$csp_status" == "PASS" ]]; then echo "- ✅ CSP configured for XSS protection"; else echo "- ❌ CSP missing or insufficient"; fi)
$(if [[ "$xct_status" == "PASS" ]]; then echo "- ✅ Content-Type sniffing protection enabled"; else echo "- ❌ X-Content-Type-Options missing"; fi)
$(if [[ "$ref_policy_status" == "PASS" ]]; then echo "- ✅ Referrer policy configured for privacy"; else echo "- ❌ Referrer-Policy missing or weak"; fi)

## Evidence Artifacts

- **Raw Headers:** [curl_headers.txt](security/curl_headers.txt)
- **Validation Results:** [csp_headers_check.txt](security/csp_headers_check.txt)

## Recommendations

$(if [[ "$overall_status" == "FAIL" ]]; then
cat << RECOMMENDATIONS
### Immediate Actions Required
- Review failed header checks in csp_headers_check.txt
- Implement missing security headers in web server configuration
- Test header implementation across all public endpoints
- Consider implementing additional security headers (HPKP, Expect-CT)

RECOMMENDATIONS
else
cat << RECOMMENDATIONS  
### Optimization Opportunities
- Consider implementing additional security headers (HPKP, Expect-CT)
- Review CSP directives for optimization
- Implement security header monitoring in observability stack

RECOMMENDATIONS
fi)

---
*Report generated by Security Headers Evidence Pack*
EOF

    log_success "Security headers report generated"
}

# Run if called directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi