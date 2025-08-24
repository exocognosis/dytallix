#!/bin/bash

# Dytallix Observability Configuration Validator
# This script validates all observability configurations for syntax and completeness

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if required tools are available
check_dependencies() {
    log_step "Checking dependencies..."
    
    local missing_tools=()
    
    if ! command -v jq &> /dev/null; then
        missing_tools+=("jq")
    fi
    
    if ! command -v yq &> /dev/null; then
        missing_tools+=("yq")
    fi
    
    if ! command -v promtool &> /dev/null; then
        log_warn "promtool not found - Prometheus config validation will be skipped"
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        echo "Please install the missing tools:"
        echo "  - jq: sudo apt-get install jq"
        echo "  - yq: sudo apt-get install yq"
        echo "  - promtool: Download from Prometheus releases"
        exit 1
    fi
    
    log_info "Dependencies check passed"
}

# Validate Prometheus configuration
validate_prometheus_config() {
    log_step "Validating Prometheus configuration..."
    
    local config_file="$PROJECT_ROOT/observability/prometheus/prometheus.yml"
    
    if [ ! -f "$config_file" ]; then
        log_error "Prometheus config not found: $config_file"
        return 1
    fi
    
    # Validate YAML syntax
    if ! yq eval . "$config_file" > /dev/null 2>&1; then
        log_error "Invalid YAML syntax in Prometheus config"
        return 1
    fi
    
    # Check required sections
    local required_sections=("global" "scrape_configs")
    for section in "${required_sections[@]}"; do
        if ! yq eval ".$section" "$config_file" > /dev/null 2>&1; then
            log_error "Missing required section '$section' in Prometheus config"
            return 1
        fi
    done
    
    # Check scrape targets
    local targets=$(yq eval '.scrape_configs[].static_configs[].targets[]' "$config_file" 2>/dev/null || echo "")
    if [ -z "$targets" ]; then
        log_error "No scrape targets defined in Prometheus config"
        return 1
    fi
    
    # Use promtool if available
    if command -v promtool &> /dev/null; then
        if promtool check config "$config_file" > /dev/null 2>&1; then
            log_info "✅ Prometheus config validation passed"
        else
            log_error "❌ Prometheus config failed promtool validation"
            return 1
        fi
    else
        log_info "✅ Prometheus config YAML validation passed (promtool not available)"
    fi
}

# Validate alert rules
validate_alert_rules() {
    log_step "Validating alert rules..."
    
    local alerts_dir="$PROJECT_ROOT/observability/prometheus/alerts"
    
    if [ ! -d "$alerts_dir" ]; then
        log_error "Alerts directory not found: $alerts_dir"
        return 1
    fi
    
    local rule_files=("$alerts_dir"/*.yml "$alerts_dir"/*.yaml)
    local valid_files=0
    
    for rule_file in "${rule_files[@]}"; do
        if [ -f "$rule_file" ]; then
            log_info "Validating alert rules: $(basename "$rule_file")"
            
            # Validate YAML syntax
            if ! yq eval . "$rule_file" > /dev/null 2>&1; then
                log_error "Invalid YAML syntax in alert rules: $rule_file"
                return 1
            fi
            
            # Check required structure
            if ! yq eval '.groups[].rules[]' "$rule_file" > /dev/null 2>&1; then
                log_error "Invalid alert rules structure in: $rule_file"
                return 1
            fi
            
            # Use promtool if available
            if command -v promtool &> /dev/null; then
                if ! promtool check rules "$rule_file" > /dev/null 2>&1; then
                    log_error "❌ Alert rules failed promtool validation: $rule_file"
                    return 1
                fi
            fi
            
            ((valid_files++))
        fi
    done
    
    if [ $valid_files -eq 0 ]; then
        log_error "No alert rule files found in $alerts_dir"
        return 1
    fi
    
    log_info "✅ Alert rules validation passed ($valid_files files)"
}

# Validate Grafana configurations
validate_grafana_configs() {
    log_step "Validating Grafana configurations..."
    
    local grafana_dir="$PROJECT_ROOT/observability/grafana"
    
    # Validate datasource configuration
    local datasource_file="$grafana_dir/provisioning/datasources/datasource.yml"
    if [ -f "$datasource_file" ]; then
        if yq eval . "$datasource_file" > /dev/null 2>&1; then
            log_info "✅ Grafana datasource config valid"
        else
            log_error "❌ Invalid YAML in Grafana datasource config"
            return 1
        fi
    else
        log_error "Grafana datasource config not found: $datasource_file"
        return 1
    fi
    
    # Validate dashboard provisioning
    local dashboard_config="$grafana_dir/provisioning/dashboards/dashboards.yml"
    if [ -f "$dashboard_config" ]; then
        if yq eval . "$dashboard_config" > /dev/null 2>&1; then
            log_info "✅ Grafana dashboard provisioning config valid"
        else
            log_error "❌ Invalid YAML in Grafana dashboard provisioning config"
            return 1
        fi
    else
        log_error "Grafana dashboard provisioning config not found: $dashboard_config"
        return 1
    fi
}

# Validate Grafana dashboards
validate_grafana_dashboards() {
    log_step "Validating Grafana dashboards..."
    
    local dashboards_dir="$PROJECT_ROOT/observability/grafana/dashboards"
    
    if [ ! -d "$dashboards_dir" ]; then
        log_error "Dashboards directory not found: $dashboards_dir"
        return 1
    fi
    
    local dashboard_files=("$dashboards_dir"/*.json)
    local valid_dashboards=0
    
    for dashboard_file in "${dashboard_files[@]}"; do
        if [ -f "$dashboard_file" ]; then
            local dashboard_name=$(basename "$dashboard_file")
            log_info "Validating dashboard: $dashboard_name"
            
            # Validate JSON syntax
            if ! jq empty "$dashboard_file" 2>/dev/null; then
                log_error "❌ Invalid JSON syntax in dashboard: $dashboard_name"
                return 1
            fi
            
            # Check required fields
            local required_fields=("dashboard.uid" "dashboard.title")
            for field in "${required_fields[@]}"; do
                if ! jq -e ".$field" "$dashboard_file" > /dev/null 2>&1; then
                    log_error "❌ Missing required field '$field' in dashboard: $dashboard_name"
                    return 1
                fi
            done
            
            # Check for valid UID format
            local uid=$(jq -r '.dashboard.uid' "$dashboard_file")
            if [[ ! "$uid" =~ ^[a-zA-Z0-9_-]+$ ]]; then
                log_error "❌ Invalid UID format in dashboard: $dashboard_name (got: $uid)"
                return 1
            fi
            
            log_info "✅ Dashboard valid: $dashboard_name (UID: $uid)"
            ((valid_dashboards++))
        fi
    done
    
    if [ $valid_dashboards -eq 0 ]; then
        log_error "No dashboard files found in $dashboards_dir"
        return 1
    fi
    
    log_info "✅ All dashboards validation passed ($valid_dashboards files)"
}

# Validate shell scripts
validate_shell_scripts() {
    log_step "Validating shell scripts..."
    
    local scripts=(
        "$PROJECT_ROOT/scripts/run_observability_stack.sh"
        "$PROJECT_ROOT/scripts/induce_validator_halt.sh"
    )
    
    for script in "${scripts[@]}"; do
        if [ -f "$script" ]; then
            local script_name=$(basename "$script")
            log_info "Validating script: $script_name"
            
            # Check syntax
            if bash -n "$script"; then
                log_info "✅ Script syntax valid: $script_name"
            else
                log_error "❌ Script syntax error: $script_name"
                return 1
            fi
            
            # Check if executable
            if [ -x "$script" ]; then
                log_info "✅ Script is executable: $script_name"
            else
                log_warn "⚠️  Script is not executable: $script_name"
            fi
        else
            log_error "Script not found: $script"
            return 1
        fi
    done
}

# Validate documentation
validate_documentation() {
    log_step "Validating documentation..."
    
    local doc_file="$PROJECT_ROOT/docs/OBSERVABILITY.md"
    
    if [ ! -f "$doc_file" ]; then
        log_error "Documentation not found: $doc_file"
        return 1
    fi
    
    # Check for required sections
    local required_sections=(
        "## Overview"
        "## Quick Start"
        "## Metrics Inventory"
        "## Setup Instructions"
        "## Security Considerations"
        "## Troubleshooting"
    )
    
    for section in "${required_sections[@]}"; do
        if ! grep -q "^$section" "$doc_file"; then
            log_error "❌ Missing required section '$section' in documentation"
            return 1
        fi
    done
    
    log_info "✅ Documentation structure validation passed"
}

# Check metric coverage
validate_metric_coverage() {
    log_step "Validating metric coverage..."
    
    local metrics_file="$PROJECT_ROOT/dytallix-lean-launch/node/src/metrics.rs"
    local doc_file="$PROJECT_ROOT/docs/OBSERVABILITY.md"
    
    if [ ! -f "$metrics_file" ]; then
        log_error "Metrics file not found: $metrics_file"
        return 1
    fi
    
    # Extract dyt_ metrics from code
    local metrics_in_code=$(grep -o 'dyt_[a-zA-Z_]*' "$metrics_file" | sort | uniq)
    local missing_from_docs=()
    
    # Check if each metric is documented
    for metric in $metrics_in_code; do
        if ! grep -q "$metric" "$doc_file"; then
            missing_from_docs+=("$metric")
        fi
    done
    
    if [ ${#missing_from_docs[@]} -gt 0 ]; then
        log_warn "⚠️  Metrics found in code but not documented:"
        for metric in "${missing_from_docs[@]}"; do
            echo "    - $metric"
        done
    fi
    
    # Check for required metrics
    local required_metrics=(
        "dyt_block_height"
        "dyt_blocks_produced_total"
        "dyt_blocks_per_second"
        "dyt_transactions_in_block"
        "dyt_tps"
        "dyt_mempool_size"
        "dyt_gas_used_per_block"
        "dyt_oracle_update_latency_seconds"
        "dyt_emission_pool_amount"
        "dyt_validator_missed_blocks_total"
        "dyt_validator_voting_power"
    )
    
    local missing_metrics=()
    for metric in "${required_metrics[@]}"; do
        if ! grep -q "$metric" "$metrics_file"; then
            missing_metrics+=("$metric")
        fi
    done
    
    if [ ${#missing_metrics[@]} -gt 0 ]; then
        log_error "❌ Required metrics missing from code:"
        for metric in "${missing_metrics[@]}"; do
            echo "    - $metric"
        done
        return 1
    fi
    
    log_info "✅ Metric coverage validation passed"
}

# Run all validations
main() {
    log_info "Starting Dytallix observability configuration validation..."
    echo "Project root: $PROJECT_ROOT"
    echo ""
    
    local validation_functions=(
        check_dependencies
        validate_prometheus_config
        validate_alert_rules
        validate_grafana_configs
        validate_grafana_dashboards
        validate_shell_scripts
        validate_documentation
        validate_metric_coverage
    )
    
    local failed_validations=()
    
    for validation_func in "${validation_functions[@]}"; do
        if ! $validation_func; then
            failed_validations+=("$validation_func")
        fi
        echo ""
    done
    
    # Summary
    if [ ${#failed_validations[@]} -eq 0 ]; then
        log_info "🎉 All observability configuration validations passed!"
        echo ""
        echo "Validated components:"
        echo "  ✅ Prometheus configuration and alert rules"
        echo "  ✅ Grafana datasource and dashboard configurations"
        echo "  ✅ Dashboard JSON syntax and structure"
        echo "  ✅ Shell script syntax"
        echo "  ✅ Metric inventory completeness"
        echo "  ✅ Documentation structure"
        echo ""
        echo "The observability stack is ready for deployment."
        exit 0
    else
        log_error "❌ Some validations failed:"
        for failed in "${failed_validations[@]}"; do
            echo "    - $failed"
        done
        echo ""
        echo "Please fix the issues above before deploying the observability stack."
        exit 1
    fi
}

main "$@"