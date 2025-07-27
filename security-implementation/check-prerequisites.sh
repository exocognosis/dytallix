#!/bin/bash
# Prerequisites check for Dytallix security implementation

echo "🔍 Checking prerequisites for security implementation..."

# Function to check command availability
check_command() {
    if command -v "$1" &> /dev/null; then
        echo "✅ $1 is available"
        return 0
    else
        echo "❌ $1 is not installed or not in PATH"
        return 1
    fi
}

# Function to check kubernetes connection
check_k8s_connection() {
    if kubectl cluster-info &> /dev/null; then
        echo "✅ Kubernetes cluster connection successful"
        return 0
    else
        echo "❌ Cannot connect to Kubernetes cluster"
        echo "💡 Run: kubectl config current-context"
        return 1
    fi
}

# Function to check docker daemon
check_docker() {
    if docker info &> /dev/null; then
        echo "✅ Docker daemon is running"
        return 0
    else
        echo "❌ Docker daemon is not running"
        echo "💡 Start Docker Desktop or run: sudo systemctl start docker"
        return 1
    fi
}

# Function to check GCP authentication
check_gcp_auth() {
    if gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
        echo "✅ Google Cloud authentication is active"
        return 0
    else
        echo "❌ Google Cloud authentication required"
        echo "💡 Run: gcloud auth login"
        return 1
    fi
}

errors=0

echo ""
echo "🛠️  Required Tools:"
check_command "docker" || ((errors++))
check_command "kubectl" || ((errors++))
check_command "gcloud" || ((errors++))
check_command "git" || ((errors++))

echo ""
echo "🔗 Connections:"
check_docker || ((errors++))
check_k8s_connection || ((errors++))
check_gcp_auth || ((errors++))

echo ""
echo "📋 Optional Tools (recommended):"
check_command "trivy" || echo "💡 Install trivy for vulnerability scanning: curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin"
check_command "helm" || echo "💡 Install helm for Kubernetes package management"

echo ""
if [ $errors -eq 0 ]; then
    echo "🎉 All prerequisites are met! Ready to start security implementation."
    echo ""
    echo "🚀 Next steps:"
    echo "1. Review the implementation plan: ./security-implementation/README.md"
    echo "2. Start with Day 1: ./security-implementation/day1-containers/README.md"
    echo "3. Track progress: ./security-implementation/daily-progress-tracker.md"
else
    echo "⚠️  $errors prerequisite(s) need attention before starting implementation."
    echo ""
    echo "🔧 Common fixes:"
    echo "- Install missing tools using your package manager"
    echo "- Configure kubectl: kubectl config use-context <your-context>"
    echo "- Authenticate with GCP: gcloud auth login"
    echo "- Start Docker daemon"
fi

echo ""
echo "📚 For detailed help, see: ./security-implementation/README.md"
