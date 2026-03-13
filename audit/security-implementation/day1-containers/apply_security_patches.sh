#!/bin/bash
# Apply security patches to all Dockerfiles

echo "🔧 Applying security patches to Dockerfiles..."

# Function to apply patches
apply_patch() {
    local source="./security-implementation/day1-containers/$1"
    local target="$2"
    
    if [ -f "$source" ]; then
        echo "📝 Applying patch: $1 -> $target"
        cp "$source" "$target"
        echo "✅ Applied: $target"
    else
        echo "❌ Source file not found: $source"
    fi
}

# Apply patches to all Dockerfiles
apply_patch "Dockerfile.secure" "./Dockerfile"
apply_patch "ai-services-Dockerfile.secure" "./ai-services/Dockerfile"

echo "🎉 Security patches applied successfully!"
echo "💡 Run './security-implementation/day1-containers/test_builds.sh' to test builds"
