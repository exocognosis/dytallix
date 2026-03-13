#!/bin/bash
# Update existing Kubernetes deployments with RBAC and security contexts

echo "🔧 Updating Kubernetes deployments with RBAC and security contexts..."

# Function to patch deployment with security context
patch_deployment_security() {
    local deployment="$1"
    local namespace="dytallix"
    local service_account="$2"
    
    echo "📝 Patching deployment: $deployment"
    
    # Patch with service account
    kubectl patch deployment "$deployment" -n "$namespace" --patch "
spec:
  template:
    spec:
      serviceAccountName: $service_account
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        runAsGroup: 1000
        fsGroup: 1000
        seccompProfile:
          type: RuntimeDefault
      containers:
      - name: $deployment
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          runAsNonRoot: true
          runAsUser: 1000
          runAsGroup: 1000
          capabilities:
            drop:
            - ALL
          seccompProfile:
            type: RuntimeDefault
        volumeMounts:
        - name: tmp-volume
          mountPath: /tmp
        - name: var-cache
          mountPath: /var/cache
      volumes:
      - name: tmp-volume
        emptyDir: {}
      - name: var-cache
        emptyDir: {}
"
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully patched: $deployment"
    else
        echo "❌ Failed to patch: $deployment"
    fi
}

# Create namespace if it doesn't exist
kubectl create namespace dytallix --dry-run=client -o yaml | kubectl apply -f -

# Apply RBAC configurations
echo "📋 Applying RBAC configurations..."
kubectl apply -f ./security-implementation/day2-rbac/service-accounts.yaml
kubectl apply -f ./security-implementation/day2-rbac/cluster-roles.yaml
kubectl apply -f ./security-implementation/day2-rbac/role-bindings.yaml

# Apply network policies
echo "🌐 Applying network policies..."
kubectl apply -f ./security-implementation/day2-rbac/network-policies.yaml

# Update deployments with security contexts
echo "🔒 Updating deployments with security contexts..."
patch_deployment_security "dytallix-testnet" "dytallix-node"
patch_deployment_security "dytallix-ai-services" "dytallix-ai-services"
patch_deployment_security "dytallix-frontend" "dytallix-frontend"
patch_deployment_security "dytallix-bridge" "dytallix-bridge"

echo "🎉 RBAC and security context updates complete!"
echo "💡 Run './security-implementation/day2-rbac/test_rbac.sh' to validate permissions"
