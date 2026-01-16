#!/usr/bin/env bash
# gen_manifest.sh - Generate manifest.json + PQC signature placeholder
# Used by Public Testnet Launch Pack for phase integrity verification

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

usage() {
    echo "Usage: $0 <phase> <phase_name> <artifacts_dir>"
    echo ""
    echo "Arguments:"
    echo "  phase        - Phase number (1-8)"
    echo "  phase_name   - Phase name (e.g., 'explorer', 'onboarding')"
    echo "  artifacts_dir - Directory containing phase artifacts"
    echo ""
    echo "Example:"
    echo "  $0 1 explorer launch-evidence/public-testnet-pack/explorer"
    echo ""
    echo "Generates:"
    echo "  - manifest.json with artifact hashes and metadata"
    echo "  - manifest.json.sig with PQC signature placeholder"
}

if [[ $# -ne 3 ]]; then
    usage
    exit 1
fi

PHASE="$1"
PHASE_NAME="$2"
ARTIFACTS_DIR="$3"

if [[ ! -d "$ARTIFACTS_DIR" ]]; then
    echo "❌ Artifacts directory not found: $ARTIFACTS_DIR"
    exit 1
fi

MANIFEST_FILE="$ARTIFACTS_DIR/manifest.json"
SIGNATURE_FILE="$ARTIFACTS_DIR/manifest.json.sig"

echo "📝 Generating manifest for Phase $PHASE: $PHASE_NAME"
echo "   Directory: $ARTIFACTS_DIR"
echo ""

# Get git information
GIT_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
GIT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Function to calculate file hash
hash_file() {
    local file="$1"
    if [[ -f "$file" ]]; then
        if command -v sha256sum >/dev/null 2>&1; then
            sha256sum "$file" | cut -d' ' -f1
        else
            shasum -a 256 "$file" | cut -d' ' -f1
        fi
    else
        echo "file_not_found"
    fi
}

# Start building manifest
echo "🔍 Scanning artifacts in $ARTIFACTS_DIR..."

# Build artifacts object
ARTIFACTS_JSON="{"
first_file=true

# Find all files in artifacts directory (excluding manifest files themselves)
while IFS= read -r -d '' file; do
    # Skip manifest files themselves
    if [[ "$file" == *"/manifest.json"* ]]; then
        continue
    fi
    
    # Get relative path from artifacts directory
    rel_path="${file#$ARTIFACTS_DIR/}"
    
    # Calculate hash
    file_hash=$(hash_file "$file")
    
    # Add to JSON (handle comma separation)
    if [[ "$first_file" == "true" ]]; then
        first_file=false
    else
        ARTIFACTS_JSON+=","
    fi
    
    ARTIFACTS_JSON+="
    \"$rel_path\": {
      \"sha256\": \"$file_hash\",
      \"size\": $(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo 0),
      \"modified\": \"$(date -u -r "$file" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || echo "$TIMESTAMP")\""
    
    # Add content type hint for certain files
    case "$rel_path" in
        *.json) ARTIFACTS_JSON+=",
      \"content_type\": \"application/json\"" ;;
        *.md) ARTIFACTS_JSON+=",
      \"content_type\": \"text/markdown\"" ;;
        *.html) ARTIFACTS_JSON+=",
      \"content_type\": \"text/html\"" ;;
        *.css) ARTIFACTS_JSON+=",
      \"content_type\": \"text/css\"" ;;
        *.hcl) ARTIFACTS_JSON+=",
      \"content_type\": \"application/hcl\"" ;;
        *.log) ARTIFACTS_JSON+=",
      \"content_type\": \"text/plain\"" ;;
        *.txt) ARTIFACTS_JSON+=",
      \"content_type\": \"text/plain\"" ;;
    esac
    
    ARTIFACTS_JSON+="
    }"
    
done < <(find "$ARTIFACTS_DIR" -type f -print0 | sort -z)

ARTIFACTS_JSON+="
  }"

# Create full manifest
cat > "$MANIFEST_FILE" << EOF
{
  "schema_version": "1.0",
  "phase": "$PHASE",
  "phase_name": "$PHASE_NAME",
  "generated_at": "$TIMESTAMP",
  "generator": "scripts/gen_manifest.sh",
  "git_info": {
    "commit": "$GIT_COMMIT",
    "branch": "$GIT_BRANCH"
  },
  "pqc_algorithm": "dilithium3",
  "artifacts": $ARTIFACTS_JSON,
  "verification": {
    "cargo_check": "required",
    "cargo_test": "required", 
    "cargo_clippy": "required_with_warnings_as_errors",
    "integrity_hash": "$(echo -n "$ARTIFACTS_JSON" | sha256sum | cut -d' ' -f1)"
  },
  "notes": "Generated for Public Testnet Launch Pack - Phase $PHASE"
}
EOF

echo "✅ Manifest generated: $MANIFEST_FILE"

# Generate PQC signature placeholder
echo "🔐 Generating PQC signature placeholder..."

# Create a canonical representation for signing
CANONICAL_MANIFEST=$(cat "$MANIFEST_FILE" | jq -S -c .)

# Generate signature placeholder (in production, this would use real Dilithium)
SIGNATURE_PLACEHOLDER=$(echo -n "$CANONICAL_MANIFEST" | sha256sum | cut -d' ' -f1)
SIGNATURE_DATA="dilithium3_sig_placeholder_${SIGNATURE_PLACEHOLDER:0:32}"

cat > "$SIGNATURE_FILE" << EOF
{
  "algorithm": "dilithium3",
  "signature": "$SIGNATURE_DATA",
  "public_key_hint": "dilithium3_public_key_placeholder",
  "signed_at": "$TIMESTAMP",
  "manifest_hash": "$(echo -n "$CANONICAL_MANIFEST" | sha256sum | cut -d' ' -f1)",
  "note": "PQC signature placeholder - replace with real Dilithium signature in production"
}
EOF

echo "✅ PQC signature placeholder generated: $SIGNATURE_FILE"

# Validate manifest JSON
if command -v jq >/dev/null 2>&1; then
    if jq . "$MANIFEST_FILE" >/dev/null 2>&1; then
        echo "✅ Manifest JSON validation passed"
    else
        echo "❌ Manifest JSON validation failed"
        exit 1
    fi
else
    echo "⚠️  jq not found - skipping JSON validation"
fi

echo ""
echo "📊 Manifest Summary:"
echo "   Phase: $PHASE ($PHASE_NAME)"
echo "   Artifacts: $(echo "$ARTIFACTS_JSON" | grep -o '"[^"]*":' | wc -l | tr -d ' ')"
echo "   Commit: ${GIT_COMMIT:0:8}"
echo "   Generated: $TIMESTAMP"
echo ""
echo "🔒 Security:"
echo "   Algorithm: dilithium3 (placeholder)"
echo "   Integrity hash: $(echo -n "$ARTIFACTS_JSON" | sha256sum | cut -d' ' -f1)"
echo ""
echo "✅ Phase $PHASE manifest generation complete"