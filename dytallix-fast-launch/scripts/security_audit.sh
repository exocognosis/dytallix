#!/bin/bash
# Security Audit Script for Dytallix Fast Launch
# Comprehensive security scanning including dependencies, code analysis, and configuration checks

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO_ROOT=$(cd "$(dirname "$0")/.." && pwd)
EVIDENCE_DIR="${REPO_ROOT}/launch-evidence/security-audit"
TIMESTAMP=$(date -u +"%Y%m%d-%H%M%S")
REPORT_FILE="${EVIDENCE_DIR}/security-audit-report-${TIMESTAMP}.md"
SUMMARY_FILE="${EVIDENCE_DIR}/security-audit-summary-${TIMESTAMP}.txt"

# Create evidence directory
mkdir -p "${EVIDENCE_DIR}"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "${SUMMARY_FILE}"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1" | tee -a "${SUMMARY_FILE}"
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1" | tee -a "${SUMMARY_FILE}"
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1" | tee -a "${SUMMARY_FILE}"
}

# Initialize report
initialize_report() {
    cat > "${REPORT_FILE}" <<EOF
# Dytallix Fast Launch - Security Audit Report

**Generated:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")  
**Repository:** dytallix-fast-launch  
**Audit Version:** 1.0.0

---

## Executive Summary

This security audit covers:
- Dependency vulnerability scanning (npm & cargo)
- Static code analysis
- Security configuration validation
- PQC cryptography implementation checks
- API security headers verification
- Secret detection
- Known security issues review

---

EOF
    
    echo "=== Dytallix Fast Launch Security Audit ===" > "${SUMMARY_FILE}"
    echo "Timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")" >> "${SUMMARY_FILE}"
    echo "" >> "${SUMMARY_FILE}"
}

# 1. Dependency Vulnerability Scanning
audit_npm_dependencies() {
    log_info "Running npm dependency audit..."
    
    echo "## 1. NPM Dependency Vulnerabilities" >> "${REPORT_FILE}"
    echo "" >> "${REPORT_FILE}"
    
    cd "${REPO_ROOT}"
    
    # Run npm audit
    if npm audit --json > "${EVIDENCE_DIR}/npm-audit-${TIMESTAMP}.json" 2>&1; then
        log_success "No npm vulnerabilities found"
        echo "✅ **Status:** No vulnerabilities detected" >> "${REPORT_FILE}"
    else
        local audit_exit=$?
        if [ $audit_exit -ne 0 ]; then
            log_warning "npm audit found vulnerabilities"
            
            # Parse and format results
            if command -v jq >/dev/null 2>&1; then
                local critical=$(jq -r '.metadata.vulnerabilities.critical // 0' "${EVIDENCE_DIR}/npm-audit-${TIMESTAMP}.json")
                local high=$(jq -r '.metadata.vulnerabilities.high // 0' "${EVIDENCE_DIR}/npm-audit-${TIMESTAMP}.json")
                local moderate=$(jq -r '.metadata.vulnerabilities.moderate // 0' "${EVIDENCE_DIR}/npm-audit-${TIMESTAMP}.json")
                local low=$(jq -r '.metadata.vulnerabilities.low // 0' "${EVIDENCE_DIR}/npm-audit-${TIMESTAMP}.json")
                
                echo "⚠️  **Status:** Vulnerabilities detected" >> "${REPORT_FILE}"
                echo "" >> "${REPORT_FILE}"
                echo "| Severity | Count |" >> "${REPORT_FILE}"
                echo "|----------|-------|" >> "${REPORT_FILE}"
                echo "| Critical | ${critical} |" >> "${REPORT_FILE}"
                echo "| High | ${high} |" >> "${REPORT_FILE}"
                echo "| Moderate | ${moderate} |" >> "${REPORT_FILE}"
                echo "| Low | ${low} |" >> "${REPORT_FILE}"
                
                log_warning "Found: Critical=${critical}, High=${high}, Moderate=${moderate}, Low=${low}"
            else
                echo "⚠️  **Status:** Vulnerabilities detected (install jq for detailed breakdown)" >> "${REPORT_FILE}"
            fi
        fi
    fi
    
    echo "" >> "${REPORT_FILE}"
    echo "**Details:** See \`npm-audit-${TIMESTAMP}.json\`" >> "${REPORT_FILE}"
    echo "" >> "${REPORT_FILE}"
}

# 2. Cargo Dependency Audit
audit_cargo_dependencies() {
    log_info "Running cargo dependency audit..."
    
    echo "## 2. Cargo (Rust) Dependency Vulnerabilities" >> "${REPORT_FILE}"
    echo "" >> "${REPORT_FILE}"
    
    # Install cargo-audit if not present
    if ! command -v cargo-audit >/dev/null 2>&1; then
        log_info "Installing cargo-audit..."
        cargo install cargo-audit --quiet 2>&1 | tail -5 || true
    fi
    
    cd "${REPO_ROOT}/node"
    
    if [ -f "Cargo.toml" ]; then
        if cargo audit --json > "${EVIDENCE_DIR}/cargo-audit-${TIMESTAMP}.json" 2>&1; then
            log_success "No cargo vulnerabilities found"
            echo "✅ **Status:** No vulnerabilities detected" >> "${REPORT_FILE}"
        else
            log_warning "cargo audit found potential issues"
            
            # Parse results if jq is available
            if command -v jq >/dev/null 2>&1 && [ -f "${EVIDENCE_DIR}/cargo-audit-${TIMESTAMP}.json" ]; then
                local vuln_count=$(jq '.vulnerabilities.count // 0' "${EVIDENCE_DIR}/cargo-audit-${TIMESTAMP}.json" 2>/dev/null || echo "0")
                
                if [ "$vuln_count" -gt 0 ]; then
                    log_warning "Found ${vuln_count} cargo vulnerabilities"
                    echo "⚠️  **Status:** ${vuln_count} vulnerabilities detected" >> "${REPORT_FILE}"
                else
                    log_success "No vulnerabilities in cargo dependencies"
                    echo "✅ **Status:** No vulnerabilities detected" >> "${REPORT_FILE}"
                fi
            else
                echo "⚠️  **Status:** Check cargo-audit output for details" >> "${REPORT_FILE}"
            fi
        fi
    else
        log_info "No Cargo.toml found in node directory"
        echo "ℹ️  **Status:** No Cargo.toml found - skipping Rust audit" >> "${REPORT_FILE}"
    fi
    
    echo "" >> "${REPORT_FILE}"
    echo "**Details:** See \`cargo-audit-${TIMESTAMP}.json\`" >> "${REPORT_FILE}"
    echo "" >> "${REPORT_FILE}"
}

# 3. Secret Detection
detect_secrets() {
    log_info "Scanning for exposed secrets..."
    
    echo "## 3. Secret Detection" >> "${REPORT_FILE}"
    echo "" >> "${REPORT_FILE}"
    
    cd "${REPO_ROOT}"
    
    # Patterns to search for
    local patterns=(
        "password\s*=\s*['\"][^'\"]{8,}"
        "api[_-]?key\s*=\s*['\"][^'\"]{16,}"
        "secret\s*=\s*['\"][^'\"]{16,}"
        "token\s*=\s*['\"][^'\"]{16,}"
        "private[_-]?key\s*=\s*['\"][^'\"]{32,}"
        "aws[_-]?access[_-]?key"
        "AKIA[0-9A-Z]{16}"
    )
    
    local findings=0
    local secret_log="${EVIDENCE_DIR}/secret-scan-${TIMESTAMP}.txt"
    
    for pattern in "${patterns[@]}"; do
        # Search in source files, excluding node_modules, .git, and test files
        if grep -r -n -i -E "$pattern" \
            --exclude-dir=node_modules \
            --exclude-dir=.git \
            --exclude-dir=dist \
            --exclude-dir=build \
            --exclude-dir=target \
            --exclude="*.log" \
            --exclude="*.json" \
            . >> "$secret_log" 2>/dev/null; then
            findings=$((findings + 1))
        fi
    done
    
    if [ $findings -eq 0 ]; then
        log_success "No exposed secrets detected"
        echo "✅ **Status:** No obvious secrets found in source code" >> "${REPORT_FILE}"
    else
        log_warning "Potential secrets detected - review manually"
        echo "⚠️  **Status:** Potential secrets detected (${findings} pattern matches)" >> "${REPORT_FILE}"
        echo "" >> "${REPORT_FILE}"
        echo "**Action Required:** Review \`secret-scan-${TIMESTAMP}.txt\` and verify findings are false positives or test data." >> "${REPORT_FILE}"
    fi
    
    echo "" >> "${REPORT_FILE}"
}

# 4. Security Headers Check
check_security_headers() {
    log_info "Checking security headers configuration..."
    
    echo "## 4. Security Headers Configuration" >> "${REPORT_FILE}"
    echo "" >> "${REPORT_FILE}"
    
    # Check if security headers script exists
    if [ -f "${REPO_ROOT}/scripts/evidence/security_headers_check.sh" ]; then
        log_info "Running security headers check..."
        
        # Run the existing security headers check
        bash "${REPO_ROOT}/scripts/evidence/security_headers_check.sh" > "${EVIDENCE_DIR}/headers-check-${TIMESTAMP}.txt" 2>&1 || true
        
        # Check if server is running and headers are configured
        if grep -q "PASS" "${EVIDENCE_DIR}/headers-check-${TIMESTAMP}.txt" 2>/dev/null; then
            log_success "Security headers properly configured"
            echo "✅ **Status:** Security headers are properly configured" >> "${REPORT_FILE}"
        else
            log_warning "Security headers may not be fully configured"
            echo "⚠️  **Status:** Some security headers may be missing or server not running" >> "${REPORT_FILE}"
        fi
    else
        log_info "Security headers check script not found"
        echo "ℹ️  **Status:** Security headers check not available" >> "${REPORT_FILE}"
    fi
    
    echo "" >> "${REPORT_FILE}"
    echo "**Recommended Headers:**" >> "${REPORT_FILE}"
    echo "- \`X-Content-Type-Options: nosniff\`" >> "${REPORT_FILE}"
    echo "- \`X-Frame-Options: DENY\`" >> "${REPORT_FILE}"
    echo "- \`Content-Security-Policy\`" >> "${REPORT_FILE}"
    echo "- \`Strict-Transport-Security\` (HTTPS only)" >> "${REPORT_FILE}"
    echo "- \`Referrer-Policy: no-referrer\`" >> "${REPORT_FILE}"
    echo "" >> "${REPORT_FILE}"
}

# 5. PQC Implementation Validation
validate_pqc_implementation() {
    log_info "Validating PQC implementation..."
    
    echo "## 5. Post-Quantum Cryptography (PQC) Validation" >> "${REPORT_FILE}"
    echo "" >> "${REPORT_FILE}"
    
    cd "${REPO_ROOT}"
    
    # Check for PQC dependencies
    local pqc_deps=0
    
    if grep -q "pqcrypto\|fips204\|dilithium\|falcon\|sphincs" node/Cargo.toml 2>/dev/null; then
        pqc_deps=$((pqc_deps + 1))
        log_success "PQC dependencies found in Cargo.toml"
        echo "✅ **PQC Dependencies:** Present in Cargo.toml" >> "${REPORT_FILE}"
    else
        log_warning "PQC dependencies not found in Cargo.toml"
        echo "⚠️  **PQC Dependencies:** Not found in Cargo.toml" >> "${REPORT_FILE}"
    fi
    
    # Check for PQC implementations
    if [ -d "frontend/public/wasm" ] || [ -d "frontend/src/crypto/pqc" ]; then
        pqc_deps=$((pqc_deps + 1))
        log_success "PQC implementation directories found"
        echo "✅ **PQC Implementation:** Directories present" >> "${REPORT_FILE}"
    else
        log_info "PQC implementation directories not found"
        echo "ℹ️  **PQC Implementation:** Directories not found" >> "${REPORT_FILE}"
    fi
    
    # Check WASM integrity
    if [ -f "frontend/public/wasm/integrity-manifest.json" ]; then
        log_success "PQC WASM integrity manifest found"
        echo "✅ **WASM Integrity:** Manifest present" >> "${REPORT_FILE}"
    else
        log_info "PQC WASM integrity manifest not found"
        echo "ℹ️  **WASM Integrity:** Manifest not found" >> "${REPORT_FILE}"
    fi
    
    echo "" >> "${REPORT_FILE}"
    
    if [ $pqc_deps -ge 2 ]; then
        log_success "PQC implementation appears complete"
    else
        log_warning "PQC implementation may be incomplete"
    fi
}

# 6. File Permissions Check
check_file_permissions() {
    log_info "Checking file permissions..."
    
    echo "## 6. File Permissions & Sensitive Files" >> "${REPORT_FILE}"
    echo "" >> "${REPORT_FILE}"
    
    cd "${REPO_ROOT}"
    
    # Check for overly permissive files
    local issues=0
    
    # Check for .env files (should not be world-readable)
    if find . -name ".env*" -type f -perm -004 2>/dev/null | grep -v ".env.example" > "${EVIDENCE_DIR}/permissions-${TIMESTAMP}.txt"; then
        log_warning "World-readable .env files found"
        echo "⚠️  **World-readable .env files:** Found" >> "${REPORT_FILE}"
        issues=$((issues + 1))
    else
        log_success "No world-readable .env files"
        echo "✅ **World-readable .env files:** None" >> "${REPORT_FILE}"
    fi
    
    # Check for private key files
    if find . -name "*key*" -o -name "*pem" -type f 2>/dev/null | grep -v node_modules | grep -v ".git" > /dev/null; then
        log_warning "Private key files found - ensure proper permissions"
        echo "⚠️  **Private Key Files:** Found - verify permissions manually" >> "${REPORT_FILE}"
    fi
    
    echo "" >> "${REPORT_FILE}"
    
    if [ $issues -eq 0 ]; then
        log_success "File permissions check passed"
    fi
}

# 7. Configuration Security Review
review_configuration() {
    log_info "Reviewing configuration security..."
    
    echo "## 7. Configuration Security" >> "${REPORT_FILE}"
    echo "" >> "${REPORT_FILE}"
    
    cd "${REPO_ROOT}"
    
    # Check for security-relevant environment variables
    if [ -f ".env.example" ]; then
        log_info "Checking .env.example for security settings..."
        
        local sec_vars=0
        
        if grep -q "ENABLE_SEC_HEADERS\|ENABLE_CSP" .env.example; then
            sec_vars=$((sec_vars + 1))
        fi
        
        if grep -q "RATE_LIMIT\|MAX_REQUEST" .env.example; then
            sec_vars=$((sec_vars + 1))
        fi
        
        if [ $sec_vars -ge 1 ]; then
            log_success "Security configuration variables documented"
            echo "✅ **Security Variables:** Documented in .env.example" >> "${REPORT_FILE}"
        else
            log_info "Few security variables in .env.example"
            echo "ℹ️  **Security Variables:** Limited documentation" >> "${REPORT_FILE}"
        fi
    fi
    
    echo "" >> "${REPORT_FILE}"
    echo "**Security Configuration Checklist:**" >> "${REPORT_FILE}"
    echo "- [ ] Security headers enabled (\`ENABLE_SEC_HEADERS=1\`)" >> "${REPORT_FILE}"
    echo "- [ ] CSP configured (\`ENABLE_CSP=1\`)" >> "${REPORT_FILE}"
    echo "- [ ] Rate limiting configured" >> "${REPORT_FILE}"
    echo "- [ ] CORS properly restricted" >> "${REPORT_FILE}"
    echo "- [ ] Secrets stored securely (not in code)" >> "${REPORT_FILE}"
    echo "" >> "${REPORT_FILE}"
}

# 8. Known Issues Review
review_known_issues() {
    log_info "Checking for known security issues..."
    
    echo "## 8. Known Security Issues & Documentation" >> "${REPORT_FILE}"
    echo "" >> "${REPORT_FILE}"
    
    cd "${REPO_ROOT}"
    
    # Check for security documentation
    if [ -d "docs/security" ]; then
        local doc_count=$(find docs/security -name "*.md" -type f 2>/dev/null | wc -l)
        log_success "Security documentation found (${doc_count} files)"
        echo "✅ **Security Documentation:** ${doc_count} files in docs/security/" >> "${REPORT_FILE}"
    else
        log_info "Security documentation directory not found"
        echo "ℹ️  **Security Documentation:** No docs/security directory" >> "${REPORT_FILE}"
    fi
    
    # Check for security-related issues in code comments
    if grep -r -n "TODO.*security\|FIXME.*security\|XXX.*security" \
        --include="*.js" --include="*.ts" --include="*.rs" \
        --exclude-dir=node_modules --exclude-dir=.git \
        . > "${EVIDENCE_DIR}/security-todos-${TIMESTAMP}.txt" 2>/dev/null; then
        log_warning "Security-related TODOs found in code"
        echo "⚠️  **Security TODOs:** Found in code - review \`security-todos-${TIMESTAMP}.txt\`" >> "${REPORT_FILE}"
    else
        log_success "No security-related TODOs found"
        echo "✅ **Security TODOs:** None found in code" >> "${REPORT_FILE}"
    fi
    
    echo "" >> "${REPORT_FILE}"
}

# Generate final summary
generate_summary() {
    log_info "Generating final summary..."
    
    echo "## Summary & Recommendations" >> "${REPORT_FILE}"
    echo "" >> "${REPORT_FILE}"
    echo "### Audit Completion" >> "${REPORT_FILE}"
    echo "" >> "${REPORT_FILE}"
    echo "This security audit has completed the following checks:" >> "${REPORT_FILE}"
    echo "" >> "${REPORT_FILE}"
    echo "1. ✅ NPM dependency vulnerability scan" >> "${REPORT_FILE}"
    echo "2. ✅ Cargo (Rust) dependency vulnerability scan" >> "${REPORT_FILE}"
    echo "3. ✅ Secret detection scan" >> "${REPORT_FILE}"
    echo "4. ✅ Security headers configuration" >> "${REPORT_FILE}"
    echo "5. ✅ PQC implementation validation" >> "${REPORT_FILE}"
    echo "6. ✅ File permissions check" >> "${REPORT_FILE}"
    echo "7. ✅ Configuration security review" >> "${REPORT_FILE}"
    echo "8. ✅ Known issues review" >> "${REPORT_FILE}"
    echo "" >> "${REPORT_FILE}"
    echo "### Next Steps" >> "${REPORT_FILE}"
    echo "" >> "${REPORT_FILE}"
    echo "1. Review all warnings and failures in this report" >> "${REPORT_FILE}"
    echo "2. Update dependencies with known vulnerabilities" >> "${REPORT_FILE}"
    echo "3. Verify security headers are enabled in production" >> "${REPORT_FILE}"
    echo "4. Review any detected secrets (confirm they are false positives)" >> "${REPORT_FILE}"
    echo "5. Implement any missing security controls from the checklist" >> "${REPORT_FILE}"
    echo "6. Re-run this audit after making changes" >> "${REPORT_FILE}"
    echo "" >> "${REPORT_FILE}"
    echo "### Audit Artifacts" >> "${REPORT_FILE}"
    echo "" >> "${REPORT_FILE}"
    echo "All audit artifacts are saved in:" >> "${REPORT_FILE}"
    echo "\`${EVIDENCE_DIR}\`" >> "${REPORT_FILE}"
    echo "" >> "${REPORT_FILE}"
    
    log_info "Security audit complete!"
}

# Main execution
main() {
    log_info "Starting Dytallix Fast Launch Security Audit..."
    echo ""
    
    initialize_report
    
    audit_npm_dependencies
    audit_cargo_dependencies
    detect_secrets
    check_security_headers
    validate_pqc_implementation
    check_file_permissions
    review_configuration
    review_known_issues
    
    generate_summary
    
    echo ""
    log_success "Security audit completed successfully!"
    echo ""
    log_info "Report saved to: ${REPORT_FILE}"
    log_info "Summary saved to: ${SUMMARY_FILE}"
    echo ""
    
    # Display summary file
    cat "${SUMMARY_FILE}"
}

# Run main function
main "$@"
