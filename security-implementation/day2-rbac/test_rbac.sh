#!/bin/bash
# Test RBAC permissions and validate security configurations

echo "🧪 Testing RBAC permissions and security configurations..."

# Function to test service account permissions
test_service_account() {
    local sa="$1"
    local namespace="dytallix"
    
    echo "🔍 Testing ServiceAccount: $sa"
    
    # Test if service account can list pods (should succeed)
    kubectl auth can-i list pods --as=system:serviceaccount:$namespace:$sa -n $namespace
    if [ $? -eq 0 ]; then
        echo "✅ $sa can list pods (expected)"
    else
        echo "❌ $sa cannot list pods (unexpected)"
    fi
    
    # Test if service account can create pods (should fail for most)
    kubectl auth can-i create pods --as=system:serviceaccount:$namespace:$sa -n $namespace
    if [ $? -ne 0 ]; then
        echo "✅ $sa cannot create pods (expected - principle of least privilege)"
    else
        echo "⚠️  $sa can create pods (review if necessary)"
    fi
    
    # Test if service account can delete secrets (should fail)
    kubectl auth can-i delete secrets --as=system:serviceaccount:$namespace:$sa -n $namespace
    if [ $? -ne 0 ]; then
        echo "✅ $sa cannot delete secrets (expected)"
    else
        echo "❌ $sa can delete secrets (security risk!)"
    fi
    
    echo ""
}

# Function to check pod security contexts
check_pod_security() {
    local deployment="$1"
    local namespace="dytallix"
    
    echo "🔒 Checking security context for: $deployment"
    
    # Get pod name
    pod=$(kubectl get pods -n $namespace -l app=$deployment -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
    
    if [ -n "$pod" ]; then
        # Check if running as non-root
        user_id=$(kubectl exec -n $namespace $pod -- id -u 2>/dev/null)
        if [ "$user_id" != "0" ]; then
            echo "✅ $deployment runs as non-root (UID: $user_id)"
        else
            echo "❌ $deployment still runs as root!"
        fi
        
        # Check security context in pod spec
        kubectl get pod $pod -n $namespace -o jsonpath='{.spec.securityContext}' | grep -q "runAsNonRoot"
        if [ $? -eq 0 ]; then
            echo "✅ $deployment has runAsNonRoot security context"
        else
            echo "❌ $deployment missing runAsNonRoot security context"
        fi
    else
        echo "⚠️  No pods found for deployment: $deployment"
    fi
    
    echo ""
}

# Function to test network policies
test_network_policies() {
    echo "🌐 Testing network policies..."
    
    # Check if default deny policy is applied
    kubectl get networkpolicy dytallix-default-deny -n dytallix >/dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "✅ Default deny network policy is active"
    else
        echo "❌ Default deny network policy not found"
    fi
    
    # List all network policies
    echo "📋 Active network policies:"
    kubectl get networkpolicy -n dytallix
    echo ""
}

echo "🧪 Starting RBAC and security testing..."
echo ""

# Test all service accounts
test_service_account "dytallix-node"
test_service_account "dytallix-ai-services"
test_service_account "dytallix-frontend"
test_service_account "dytallix-bridge"

# Check pod security contexts
check_pod_security "dytallix-testnet"
check_pod_security "dytallix-ai-services"
check_pod_security "dytallix-frontend"
check_pod_security "dytallix-bridge"

# Test network policies
test_network_policies

echo "🎉 RBAC testing complete!"
echo ""
echo "📋 Summary:"
echo "- ServiceAccounts should have minimal permissions (principle of least privilege)"
echo "- Pods should run as non-root users (UID != 0)"
echo "- Network policies should restrict traffic (default deny + explicit allows)"
echo ""
echo "💡 Next: Run './security-implementation/day2-rbac/validate_security_contexts.sh' for detailed validation"
