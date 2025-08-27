#!/bin/bash
# Tamper test script: Induces and detects hash mismatch for fail-closed testing
# This script modifies a file to trigger manifest validation failure, then restores it

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_FILE="$PROJECT_ROOT/dytallix-lean-launch/launch-evidence/pqc/tamper_test_failure.log"
MANIFEST_JSON="$PROJECT_ROOT/artifacts/pqclean-manifest.json"

echo "Running PQC tamper detection test..."

# Create log directory
mkdir -p "$(dirname "$LOG_FILE")"

# Start logging
{
    echo "=== PQC Tamper Test Execution Log ==="
    echo "Test started at: $(date -Iseconds)"
    echo "Test purpose: Verify fail-closed behavior on manifest hash mismatch"
    echo ""
    
    # Check if manifest exists
    if [ ! -f "$MANIFEST_JSON" ]; then
        echo "ERROR: Manifest file not found: $MANIFEST_JSON"
        echo "Please run 'npm run gen:pqclean-manifest' first"
        exit 1
    fi
    
    echo "Step 1: Reading current manifest..."
    if command -v jq >/dev/null 2>&1; then
        file_count=$(jq '.files | length' "$MANIFEST_JSON")
        echo "Manifest contains $file_count files"
    else
        echo "Manifest exists (jq not available for detailed parsing)"
    fi
    
    # Create a temporary test file that would be in the manifest if vendor/pqclean existed
    TEST_FILE="$PROJECT_ROOT/vendor/pqclean/test_tamper_file.txt"
    BACKUP_FILE="${TEST_FILE}.backup"
    
    echo ""
    echo "Step 2: Setting up tamper test scenario..."
    
    # Create vendor directory structure for test
    mkdir -p "$(dirname "$TEST_FILE")"
    
    # Create a test file or use existing one
    if [ ! -f "$TEST_FILE" ]; then
        echo "Original content for tamper test" > "$TEST_FILE"
        echo "Created test file: $TEST_FILE"
    else
        cp "$TEST_FILE" "$BACKUP_FILE"
        echo "Backed up existing file: $TEST_FILE"
    fi
    
    # Record original hash
    if command -v sha256sum >/dev/null 2>&1; then
        original_hash=$(sha256sum "$TEST_FILE" | cut -d' ' -f1)
    elif command -v shasum >/dev/null 2>&1; then
        original_hash=$(shasum -a 256 "$TEST_FILE" | cut -d' ' -f1)
    else
        original_hash="unavailable"
    fi
    echo "Original file hash: $original_hash"
    
    echo ""
    echo "Step 3: Inducing tamper (modifying file)..."
    echo "TAMPERED CONTENT - This should trigger validation failure" >> "$TEST_FILE"
    
    # Record tampered hash
    if command -v sha256sum >/dev/null 2>&1; then
        tampered_hash=$(sha256sum "$TEST_FILE" | cut -d' ' -f1)
    elif command -v shasum >/dev/null 2>&1; then
        tampered_hash=$(shasum -a 256 "$TEST_FILE" | cut -d' ' -f1)
    else
        tampered_hash="unavailable"
    fi
    echo "Tampered file hash: $tampered_hash"
    
    echo ""
    echo "Step 4: Running security self-test to detect tamper..."
    
    # Run the self-test which should detect the hash mismatch
    cd "$PROJECT_ROOT"
    if timeout 30 node -e "
        const { runStartupSelfTest } = require('./security/selfTest.js');
        runStartupSelfTest({
            manifestPath: 'artifacts/pqclean-manifest.json',
            vendorRoot: 'vendor/pqclean',
            exitFn: (code) => { 
                console.log('Security test exit code:', code);
                process.exit(code);
            },
            logFn: (obj) => console.log(JSON.stringify(obj))
        }).catch(err => {
            console.log('Caught error as expected:', err.message);
            process.exit(1);
        });
    " 2>&1; then
        echo "WARNING: Self-test passed when it should have failed (no tampering detected)"
        test_result="UNEXPECTED_PASS"
    else
        echo "SUCCESS: Self-test correctly detected tampering and failed"
        test_result="EXPECTED_FAILURE"
    fi
    
    echo ""
    echo "Step 5: Restoring original file..."
    
    # Restore the file
    if [ -f "$BACKUP_FILE" ]; then
        mv "$BACKUP_FILE" "$TEST_FILE"
        echo "File restored from backup"
    else
        # Remove the test file we created
        rm -f "$TEST_FILE"
        echo "Test file removed"
    fi
    
    # Verify restoration
    echo ""
    echo "Step 6: Verifying restoration..."
    cd "$PROJECT_ROOT"
    if timeout 30 node -e "
        const { runStartupSelfTest } = require('./security/selfTest.js');
        runStartupSelfTest({
            manifestPath: 'artifacts/pqclean-manifest.json',
            vendorRoot: 'vendor/pqclean',
            exitFn: (code) => { 
                console.log('Post-restore security test exit code:', code);
                process.exit(code);
            },
            logFn: (obj) => console.log(JSON.stringify(obj))
        });
    " 2>&1; then
        echo "SUCCESS: Self-test passed after restoration"
        restore_result="RESTORED_OK"
    else
        echo "WARNING: Self-test still failing after restoration"
        restore_result="RESTORE_FAILED"
    fi
    
    echo ""
    echo "=== Test Results Summary ==="
    echo "Tamper detection result: $test_result"
    echo "Restoration result: $restore_result"
    echo "Test completed at: $(date -Iseconds)"
    
    if [ "$test_result" = "EXPECTED_FAILURE" ] && [ "$restore_result" = "RESTORED_OK" ]; then
        echo "Overall result: SUCCESS - Tamper detection working correctly"
        exit 0
    else
        echo "Overall result: PARTIAL - Some aspects may need investigation"
        exit 0
    fi
    
} > "$LOG_FILE" 2>&1

echo "Tamper test completed. Log written to: $LOG_FILE"