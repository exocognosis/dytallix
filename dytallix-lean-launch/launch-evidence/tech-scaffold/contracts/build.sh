#!/bin/bash

# CosmWasm Contract Build Script
# Supports both rust-optimizer (Docker) and standard cargo builds

set -euo pipefail

# Configuration with defaults
USE_RUST_OPTIMIZER="${USE_RUST_OPTIMIZER:-true}"
WASM_OUTPUT_DIR="${WASM_OUTPUT_DIR:-.}"
CONTRACT_DIR="counter"
CONTRACT_NAME="counter_contract"

# Script directory for relative paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACT_PATH="$SCRIPT_DIR/$CONTRACT_DIR"
OUTPUT_PATH="$SCRIPT_DIR/$WASM_OUTPUT_DIR"

# Logging functions
log_info() {
    echo "[INFO] $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo "[ERROR] $(date '+%Y-%m-%d %H:%M:%S') - $1" >&2
}

log_success() {
    echo "[SUCCESS] $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Validate build environment
validate_environment() {
    log_info "Validating build environment..."

    # Check Rust installation
    if ! command -v cargo &> /dev/null; then
        log_error "Rust/Cargo not found. Install from https://rustup.rs/"
        exit 1
    fi

    # Check WASM target
    if ! rustup target list --installed | grep -q "wasm32-unknown-unknown"; then
        log_info "Installing wasm32-unknown-unknown target..."
        rustup target add wasm32-unknown-unknown
    fi

    # Check contract directory
    if [[ ! -d "$CONTRACT_PATH" ]]; then
        log_error "Contract directory not found: $CONTRACT_PATH"
        exit 1
    fi

    if [[ ! -f "$CONTRACT_PATH/Cargo.toml" ]]; then
        log_error "Contract Cargo.toml not found: $CONTRACT_PATH/Cargo.toml"
        exit 1
    fi

    # Check Docker for rust-optimizer
    if [[ "$USE_RUST_OPTIMIZER" == "true" ]]; then
        if ! command -v docker &> /dev/null; then
            log_error "Docker not found. Set USE_RUST_OPTIMIZER=false or install Docker"
            exit 1
        fi

        if ! docker info &> /dev/null; then
            log_error "Docker daemon not running. Start Docker or set USE_RUST_OPTIMIZER=false"
            exit 1
        fi
    else
        # Check wasm-strip for manual optimization
        if ! command -v wasm-strip &> /dev/null; then
            log_info "wasm-strip not found. Installing..."
            cargo install wasm-strip || {
                log_error "Failed to install wasm-strip"
                exit 1
            }
        fi
    fi

    log_success "Environment validation passed"
}

# Build with rust-optimizer (recommended)
build_with_optimizer() {
    log_info "Building contract with rust-optimizer..."

    local temp_dir
    temp_dir=$(mktemp -d)
    
    # Copy contract to temp directory
    cp -r "$CONTRACT_PATH" "$temp_dir/"
    
    # Run rust-optimizer
    docker run --rm -v "$temp_dir:/code" \
        --mount type=volume,source="$(basename $temp_dir)_cache",target=/code/target \
        --mount type=volume,source=registry_cache,target=/usr/local/cargo/registry \
        cosmwasm/rust-optimizer:0.12.13

    # Copy optimized WASM to output directory
    local wasm_file="$temp_dir/artifacts/${CONTRACT_DIR}.wasm"
    if [[ -f "$wasm_file" ]]; then
        cp "$wasm_file" "$OUTPUT_PATH/${CONTRACT_NAME}.wasm"
        log_success "Optimized WASM copied to $OUTPUT_PATH/${CONTRACT_NAME}.wasm"
    else
        log_error "Optimized WASM not found: $wasm_file"
        rm -rf "$temp_dir"
        exit 1
    fi

    # Show optimization results
    local original_size
    original_size=$(du -h "$OUTPUT_PATH/${CONTRACT_NAME}.wasm" | cut -f1)
    log_info "Final optimized WASM size: $original_size"

    # Cleanup
    rm -rf "$temp_dir"
}

# Build with standard cargo (fallback)
build_with_cargo() {
    log_info "Building contract with cargo..."

    # Build contract
    cd "$CONTRACT_PATH"
    RUSTFLAGS='-C link-arg=-s' cargo build --release --target wasm32-unknown-unknown

    # Check if build succeeded
    local target_wasm="target/wasm32-unknown-unknown/release/${CONTRACT_DIR}.wasm"
    if [[ ! -f "$target_wasm" ]]; then
        log_error "Build failed - WASM not found: $target_wasm"
        exit 1
    fi

    # Copy and optimize WASM
    cp "$target_wasm" "$OUTPUT_PATH/${CONTRACT_NAME}.wasm"
    
    # Strip debug info
    wasm-strip "$OUTPUT_PATH/${CONTRACT_NAME}.wasm"

    local size
    size=$(du -h "$OUTPUT_PATH/${CONTRACT_NAME}.wasm" | cut -f1)
    log_success "Contract built and stripped: $size"

    cd "$SCRIPT_DIR"
}

# Generate contract schema
generate_schema() {
    log_info "Generating contract schema..."

    cd "$CONTRACT_PATH"
    
    # Check if schema generation is available
    if grep -q "cosmwasm-schema" Cargo.toml; then
        cargo schema || {
            log_error "Schema generation failed"
            cd "$SCRIPT_DIR"
            return 1
        }
        log_success "Contract schema generated"
    else
        log_info "Schema generation not configured (cosmwasm-schema not found)"
    fi

    cd "$SCRIPT_DIR"
}

# Validate final WASM
validate_wasm() {
    local wasm_file="$OUTPUT_PATH/${CONTRACT_NAME}.wasm"
    
    log_info "Validating WASM binary..."

    # Check file exists and has content
    if [[ ! -f "$wasm_file" ]]; then
        log_error "WASM file not found: $wasm_file"
        exit 1
    fi

    local size
    size=$(stat -c%s "$wasm_file")
    if [[ $size -eq 0 ]]; then
        log_error "WASM file is empty"
        exit 1
    fi

    # Check WASM magic number
    local magic
    magic=$(hexdump -C "$wasm_file" | head -1 | cut -d' ' -f2-5)
    if [[ "$magic" != "00 61 73 6d" ]]; then
        log_error "Invalid WASM magic number. File may be corrupted."
        exit 1
    fi

    # Report final size
    local human_size
    human_size=$(du -h "$wasm_file" | cut -f1)
    log_success "WASM validation passed - Size: $human_size ($size bytes)"

    # Size recommendations
    if [[ $size -gt 800000 ]]; then
        log_error "WASM size is quite large (>800KB). Consider optimizing dependencies."
    elif [[ $size -gt 500000 ]]; then
        log_info "WASM size is moderately large (>500KB). Optimization recommended."
    else
        log_success "WASM size is optimal (<500KB)"
    fi
}

# Clean up build artifacts
cleanup_build() {
    log_info "Cleaning up build artifacts..."
    
    if [[ -d "$CONTRACT_PATH/target" ]]; then
        rm -rf "$CONTRACT_PATH/target"
        log_info "Removed cargo target directory"
    fi
}

# Main build flow
main() {
    log_info "Starting contract build process..."
    log_info "Contract: $CONTRACT_DIR"
    log_info "Output: $OUTPUT_PATH/${CONTRACT_NAME}.wasm"
    log_info "Use rust-optimizer: $USE_RUST_OPTIMIZER"

    # Ensure output directory exists
    mkdir -p "$OUTPUT_PATH"

    validate_environment

    # Build contract
    if [[ "$USE_RUST_OPTIMIZER" == "true" ]]; then
        build_with_optimizer
    else
        build_with_cargo
    fi

    # Generate schema if possible
    generate_schema

    # Validate result
    validate_wasm

    # Optional cleanup
    if [[ "${CLEANUP_BUILD:-false}" == "true" ]]; then
        cleanup_build
    fi

    log_success "Contract build completed successfully!"
    log_info "WASM binary: $OUTPUT_PATH/${CONTRACT_NAME}.wasm"
    
    if [[ -d "$CONTRACT_PATH/schema" ]]; then
        log_info "Schema files: $CONTRACT_PATH/schema/"
    fi
}

# Execute if run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi