#!/bin/bash

# Dytallix Transfer to Hetzner Script
# This script handles the transfer of the Dytallix deployment to Hetzner Cloud

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
HETZNER_SERVER="${HETZNER_SERVER:-testnet.dytallix.com}"
HETZNER_USER="${HETZNER_USER:-dytallix}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if rsync is available
    if ! command -v rsync &> /dev/null; then
        print_error "rsync is required but not installed. Please install rsync."
        exit 1
    fi
    
    # Check if ssh is available
    if ! command -v ssh &> /dev/null; then
        print_error "ssh is required but not installed. Please install openssh."
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Function to test SSH connection
test_ssh_connection() {
    print_status "Testing SSH connection to ${HETZNER_USER}@${HETZNER_SERVER}..."
    
    if ssh -o ConnectTimeout=10 -o BatchMode=yes "${HETZNER_USER}@${HETZNER_SERVER}" exit 2>/dev/null; then
        print_success "SSH connection successful!"
        return 0
    else
        print_error "SSH connection failed!"
        echo "Please ensure:"
        echo "1. Your SSH key is added to the server"
        echo "2. The server hostname/IP is correct: ${HETZNER_SERVER}"
        echo "3. The user exists on the server: ${HETZNER_USER}"
        echo
        echo "To add your SSH key to the server:"
        echo "ssh-copy-id ${HETZNER_USER}@${HETZNER_SERVER}"
        return 1
    fi
}

# Function to create backup of existing deployment
create_backup() {
    print_status "Creating backup of existing deployment on server..."
    
    ssh "${HETZNER_USER}@${HETZNER_SERVER}" "
        if [ -d ~/dytallix ]; then
            backup_dir=~/dytallix_backup_\$(date +%Y%m%d_%H%M%S)
            echo 'Creating backup at: '\$backup_dir
            cp -r ~/dytallix \$backup_dir
            echo 'Backup created successfully'
        else
            echo 'No existing deployment found, skipping backup'
        fi
    "
}

# Function to prepare server directories
prepare_server() {
    print_status "Preparing server directories..."
    
    ssh "${HETZNER_USER}@${HETZNER_SERVER}" "
        # Create main directory
        mkdir -p ~/dytallix
        
        # Create subdirectories
        mkdir -p ~/dytallix/logs
        mkdir -p ~/dytallix/backups
        mkdir -p ~/dytallix/data
        
        echo 'Server directories prepared'
    "
    
    print_success "Server directories ready"
}

# Function to transfer core files
transfer_core_files() {
    print_status "Transferring core Dytallix files..."
    
    # List of files/directories to transfer
    local transfer_items=(
        "blockchain-core/"
        "frontend/"
        "explorer/"
        "bridge/"
        "ai-services/"
        "deployment/hetzner/"
        "config/"
        "Cargo.toml"
        "Cargo.lock"
        "docker-compose.yml"
        "Dockerfile"
    )
    
    for item in "${transfer_items[@]}"; do
        local source_path="${PROJECT_ROOT}/${item}"
        if [ -e "${source_path}" ]; then
            print_status "Transferring ${item}..."
            rsync -av --progress "${source_path}" "${HETZNER_USER}@${HETZNER_SERVER}:~/dytallix/"
        else
            print_warning "Skipping ${item} - not found"
        fi
    done
    
    print_success "Core files transferred"
}

# Function to transfer deployment configuration
transfer_deployment_config() {
    print_status "Transferring deployment configuration..."
    
    # Transfer Hetzner-specific deployment files
    rsync -av --progress "${SCRIPT_DIR}/" "${HETZNER_USER}@${HETZNER_SERVER}:~/dytallix/deployment/hetzner/"
    
    # Transfer environment configuration
    if [ -f "${SCRIPT_DIR}/docker-compose/.env" ]; then
        print_status "Transferring existing .env configuration..."
        rsync -av "${SCRIPT_DIR}/docker-compose/.env" "${HETZNER_USER}@${HETZNER_SERVER}:~/dytallix/deployment/hetzner/docker-compose/"
    else
        print_warning "No .env file found, transferring template..."
        rsync -av "${SCRIPT_DIR}/docker-compose/.env.example" "${HETZNER_USER}@${HETZNER_SERVER}:~/dytallix/deployment/hetzner/docker-compose/"
        ssh "${HETZNER_USER}@${HETZNER_SERVER}" "
            cd ~/dytallix/deployment/hetzner/docker-compose
            if [ ! -f .env ]; then
                cp .env.example .env
                echo 'Please edit .env file with your configuration'
            fi
        "
    fi
    
    print_success "Deployment configuration transferred"
}

# Function to set executable permissions
set_permissions() {
    print_status "Setting correct permissions..."
    
    ssh "${HETZNER_USER}@${HETZNER_SERVER}" "
        cd ~/dytallix
        
        # Make all shell scripts executable
        find . -name '*.sh' -type f -exec chmod +x {} \;
        
        # Set correct permissions for deployment directory
        chmod -R 755 deployment/hetzner/scripts/
        
        echo 'Permissions set correctly'
    "
    
    print_success "Permissions configured"
}

# Function to verify transfer
verify_transfer() {
    print_status "Verifying transfer..."
    
    ssh "${HETZNER_USER}@${HETZNER_SERVER}" "
        cd ~/dytallix
        
        echo '=== TRANSFER VERIFICATION ==='
        echo 'Directory structure:'
        ls -la
        echo
        echo 'Deployment files:'
        ls -la deployment/hetzner/
        echo
        echo 'Scripts:'
        ls -la deployment/hetzner/scripts/
        echo
        echo 'Docker Compose:'
        ls -la deployment/hetzner/docker-compose/
        echo
        
        # Check if key files exist
        key_files=(
            'deployment/hetzner/docker-compose/docker-compose.yml'
            'deployment/hetzner/scripts/deploy.sh'
            'deployment/hetzner/scripts/setup-server.sh'
            'deployment/hetzner/scripts/monitor.sh'
        )
        
        echo 'Checking key files:'
        for file in \"\${key_files[@]}\"; do
            if [ -f \"\$file\" ]; then
                echo \"✓ \$file\"
            else
                echo \"✗ \$file (missing)\"
            fi
        done
    "
    
    print_success "Transfer verification complete"
}

# Function to show next steps
show_next_steps() {
    print_success "Transfer completed successfully!"
    echo
    echo "=== NEXT STEPS ==="
    echo "1. SSH to the server:"
    echo "   ssh ${HETZNER_USER}@${HETZNER_SERVER}"
    echo
    echo "2. Configure environment:"
    echo "   cd ~/dytallix/deployment/hetzner/docker-compose"
    echo "   nano .env"
    echo
    echo "3. Setup server (if not done already):"
    echo "   cd ~/dytallix/deployment/hetzner"
    echo "   ./scripts/setup-server.sh"
    echo
    echo "4. Deploy Dytallix:"
    echo "   ./scripts/deploy.sh"
    echo
    echo "5. Monitor deployment:"
    echo "   ./scripts/monitor.sh"
    echo
    echo "Or use the connect script for interactive setup:"
    echo "   ./connect-to-hetzner.sh"
}

# Main function
main() {
    echo "=== Dytallix Transfer to Hetzner ==="
    echo "Target: ${HETZNER_USER}@${HETZNER_SERVER}"
    echo "Source: ${PROJECT_ROOT}"
    echo
    
    # Check prerequisites
    check_prerequisites
    
    # Test SSH connection
    if ! test_ssh_connection; then
        exit 1
    fi
    
    # Confirm transfer
    read -p "Do you want to proceed with the transfer? (y/N): " confirm
    if [[ ! $confirm =~ ^[Yy]$ ]]; then
        print_status "Transfer cancelled"
        exit 0
    fi
    
    # Execute transfer steps
    create_backup
    prepare_server
    transfer_core_files
    transfer_deployment_config
    set_permissions
    verify_transfer
    
    # Show next steps
    show_next_steps
}

# Handle command line arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [options]"
        echo
        echo "Environment variables:"
        echo "  HETZNER_SERVER    Target server hostname/IP (default: testnet.dytallix.com)"
        echo "  HETZNER_USER      Username on target server (default: dytallix)"
        echo
        echo "Example:"
        echo "  HETZNER_SERVER=my-server.com HETZNER_USER=ubuntu $0"
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac