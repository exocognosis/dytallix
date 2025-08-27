#!/bin/bash
# Generate textual hash manifest from JSON manifest for human audit
# This script converts artifacts/pqclean-manifest.json to launch-evidence/pqc/manifest_hash_list.txt

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MANIFEST_JSON="$PROJECT_ROOT/artifacts/pqclean-manifest.json"
OUTPUT_FILE="$PROJECT_ROOT/dytallix-lean-launch/launch-evidence/pqc/manifest_hash_list.txt"

echo "Generating textual hash manifest from $MANIFEST_JSON"

# Check if the JSON manifest exists
if [ ! -f "$MANIFEST_JSON" ]; then
    echo "Error: PQClean manifest not found at $MANIFEST_JSON"
    echo "Run 'npm run gen:pqclean-manifest' first to generate the JSON manifest"
    exit 1
fi

# Create output directory if it doesn't exist
mkdir -p "$(dirname "$OUTPUT_FILE")"

# Generate the textual manifest
{
    echo "# PQClean Manifest Hash List"
    echo "# Generated from: artifacts/pqclean-manifest.json"
    echo "# Generated at: $(date -Iseconds)"
    echo "# Tool: scripts/pqc/generate_hash_list.sh"
    echo ""
    
    # Extract generation info from JSON
    if command -v jq >/dev/null 2>&1; then
        echo "# Original manifest generated at: $(jq -r '.generated_at' "$MANIFEST_JSON")"
        echo "# Original tool: $(jq -r '.tool' "$MANIFEST_JSON")"
        echo "# Files count: $(jq '.files | length' "$MANIFEST_JSON")"
        echo ""
        
        # Extract and format file entries
        echo "# Format: sha256 path"
        jq -r '.files[] | "\(.sha256) \(.path)"' "$MANIFEST_JSON" | sort
    else
        echo "# Warning: jq not available, using basic text processing"
        echo ""
        
        # Fallback without jq - extract files array manually
        grep -A 1000 '"files":' "$MANIFEST_JSON" | \
        grep -E '"path"|"sha256"' | \
        sed 's/.*"path": *"\([^"]*\)".*/PATH:\1/' | \
        sed 's/.*"sha256": *"\([^"]*\)".*/HASH:\1/' | \
        awk '/^PATH:/{path=$0; getline; if(/^HASH:/){print substr($0,6) " " substr(path,6)}}' | \
        sort
    fi
} > "$OUTPUT_FILE"

echo "Hash manifest written to: $OUTPUT_FILE"
echo "Lines written: $(wc -l < "$OUTPUT_FILE")"