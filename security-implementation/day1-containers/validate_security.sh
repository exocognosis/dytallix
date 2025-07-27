#!/bin/bash
# Validate container security configurations

echo "🔍 Validating container security..."

# Function to check container security
check_container_security() {
    local image="$1"
    local name="$2"
    
    echo "Checking $name ($image)..."
    
    # Check if runs as non-root
    user_id=$(docker run --rm "$image" id -u 2>/dev/null)
    if [ "$user_id" != "0" ]; then
        echo "✅ $name runs as non-root user (UID: $user_id)"
    else
        echo "❌ $name still runs as root!"
        return 1
    fi
    
    # Check for security vulnerabilities (if trivy is available)
    if command -v trivy &> /dev/null; then
        echo "🔍 Running vulnerability scan on $name..."
        trivy image --severity HIGH,CRITICAL "$image"
    else
        echo "💡 Install trivy for vulnerability scanning: curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin"
    fi
    
    echo ""
}

# Check all secure images
if docker images | grep -q "dytallix-node-secure:test"; then
    check_container_security "dytallix-node-secure:test" "Dytallix Node"
else
    echo "❌ Dytallix node secure image not found. Run test_builds.sh first."
fi

if docker images | grep -q "dytallix-ai-secure:test"; then
    check_container_security "dytallix-ai-secure:test" "Dytallix AI Services"
else
    echo "❌ Dytallix AI secure image not found. Run test_builds.sh first."
fi

echo "🎉 Security validation complete!"
echo "📋 Checklist:"
echo "- [ ] All containers run as non-root"
echo "- [ ] No high/critical vulnerabilities"
echo "- [ ] Applications start correctly"
echo "- [ ] Health checks pass"

echo ""
echo "💡 Next: Commit changes with 'git commit -m \"security: implement non-root containers across all services\"'"
