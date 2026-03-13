#!/bin/bash
# Test container builds with security patches

echo "🧪 Testing secure container builds..."

# Test main blockchain node
echo "📦 Building main Dytallix node..."
if docker build -t dytallix-node-secure:test .; then
    echo "✅ Main node build successful"
else
    echo "❌ Main node build failed"
    exit 1
fi

# Test AI services
echo "📦 Building AI services..."
if docker build -t dytallix-ai-secure:test ./ai-services/; then
    echo "✅ AI services build successful"
else
    echo "❌ AI services build failed"
    exit 1
fi

# Quick security validation
echo "🔍 Running security validation..."

# Check if containers run as non-root
echo "Checking user IDs in containers..."
docker run --rm dytallix-node-secure:test id
docker run --rm dytallix-ai-secure:test id

echo "🎉 All builds completed successfully!"
echo "💡 Run './security-implementation/day1-containers/validate_security.sh' for detailed security checks"
