#!/bin/bash

# Dytallix Hetzner Server Connection Script
# This script connects to the Hetzner server and provides options to continue setup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEFAULT_SERVER="testnet.dytallix.com"
DEFAULT_USER="dytallix"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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

# Function to check SSH connection
check_ssh_connection() {
    local server=$1
    local user=$2
    
    print_status "Testing SSH connection to ${user}@${server}..."
    
    if ssh -o ConnectTimeout=10 -o BatchMode=yes "${user}@${server}" exit 2>/dev/null; then
        print_success "SSH connection successful!"
        return 0
    else
        print_warning "SSH connection failed. You may need to:"
        echo "  1. Add your SSH key to the server"
        echo "  2. Verify the server IP/hostname"
        echo "  3. Check if the user exists on the server"
        return 1
    fi
}

# Function to display server information
show_server_info() {
    local server=$1
    local user=$2
    
    print_status "Getting server information..."
    
    ssh "${user}@${server}" "
        echo '=== SERVER INFORMATION ==='
        echo 'Hostname: ' \$(hostname)
        echo 'OS: ' \$(cat /etc/os-release | grep PRETTY_NAME | cut -d'=' -f2 | tr -d '\"')
        echo 'Uptime: ' \$(uptime | cut -d',' -f1)
        echo 'Disk Usage:'
        df -h | grep -E '^/dev/'
        echo 'Memory Usage:'
        free -h
        echo 'Docker Status:'
        docker --version 2>/dev/null || echo 'Docker not installed'
        docker-compose --version 2>/dev/null || echo 'Docker Compose not installed'
        echo 'Current Directory: ' \$(pwd)
        echo 'User: ' \$(whoami)
    "
}

# Function to transfer deployment files
transfer_files() {
    local server=$1
    local user=$2
    
    print_status "Transferring deployment files to server..."
    
    # Create target directory
    ssh "${user}@${server}" "mkdir -p ~/dytallix"
    
    # Transfer files
    rsync -av --exclude='.git' --exclude='target' --exclude='node_modules' \
          "${SCRIPT_DIR}/" "${user}@${server}:~/dytallix/"
    
    print_success "Files transferred successfully!"
}

# Function to setup server environment
setup_server() {
    local server=$1
    local user=$2
    
    print_status "Setting up server environment..."
    
    ssh "${user}@${server}" "
        cd ~/dytallix
        
        echo '=== CHECKING PREREQUISITES ==='
        
        # Check if Docker is installed
        if ! command -v docker &> /dev/null; then
            echo 'Installing Docker...'
            curl -fsSL https://get.docker.com -o get-docker.sh
            sudo sh get-docker.sh
            sudo usermod -aG docker \$USER
            echo 'Docker installed. You may need to log out and back in.'
        else
            echo 'Docker is already installed: ' \$(docker --version)
        fi
        
        # Check if Docker Compose is installed
        if ! command -v docker-compose &> /dev/null; then
            echo 'Installing Docker Compose...'
            sudo curl -L \"https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)\" -o /usr/local/bin/docker-compose
            sudo chmod +x /usr/local/bin/docker-compose
            echo 'Docker Compose installed: ' \$(docker-compose --version)
        else
            echo 'Docker Compose is already installed: ' \$(docker-compose --version)
        fi
        
        # Make scripts executable
        chmod +x scripts/*.sh
        
        echo '=== SETUP COMPLETE ==='
    "
    
    print_success "Server setup completed!"
}

# Function to check deployment status
check_deployment_status() {
    local server=$1
    local user=$2
    
    print_status "Checking deployment status..."
    
    ssh "${user}@${server}" "
        cd ~/dytallix/docker-compose
        
        if [ -f docker-compose.yml ]; then
            echo '=== DEPLOYMENT STATUS ==='
            docker-compose ps
            echo
            echo '=== CONTAINER LOGS (last 20 lines) ==='
            docker-compose logs --tail=20
        else
            echo 'No deployment found. Run setup first.'
        fi
    "
}

# Function to start interactive SSH session
start_ssh_session() {
    local server=$1
    local user=$2
    
    print_status "Starting interactive SSH session..."
    print_status "You'll be connected to ${user}@${server}"
    print_status "Use 'exit' to return to your local machine"
    
    ssh -t "${user}@${server}" "
        cd ~/dytallix 2>/dev/null || cd ~
        echo '=== DYTALLIX HETZNER SERVER ==='
        echo 'Available commands:'
        echo '  cd ~/dytallix                  - Go to Dytallix directory'
        echo '  ./scripts/deploy.sh            - Deploy Dytallix'
        echo '  ./scripts/monitor.sh           - Monitor services'
        echo '  ./scripts/backup-restore.sh    - Backup/restore data'
        echo '  docker-compose ps              - Check container status'
        echo '  docker-compose logs            - View logs'
        echo
        bash -l
    "
}

# Main menu
show_menu() {
    echo
    echo "=== Dytallix Hetzner Connection Menu ==="
    echo "1. Test SSH connection"
    echo "2. Show server information"
    echo "3. Transfer deployment files"
    echo "4. Setup server environment"
    echo "5. Check deployment status"
    echo "6. Start interactive SSH session"
    echo "7. Quick deploy (transfer + setup + deploy)"
    echo "8. Exit"
    echo
}

# Main script
main() {
    # Parse command line arguments
    SERVER="${1:-$DEFAULT_SERVER}"
    USER="${2:-$DEFAULT_USER}"
    
    print_status "Dytallix Hetzner Server Connection"
    print_status "Server: ${SERVER}"
    print_status "User: ${USER}"
    echo
    
    # Quick connection test
    if check_ssh_connection "${SERVER}" "${USER}"; then
        print_success "Ready to proceed with server operations"
    else
        print_error "Cannot connect to server. Please check connection details."
        echo
        echo "Usage: $0 [server] [user]"
        echo "Example: $0 testnet.dytallix.com dytallix"
        exit 1
    fi
    
    # Interactive menu
    while true; do
        show_menu
        read -p "Please select an option (1-8): " choice
        
        case $choice in
            1)
                check_ssh_connection "${SERVER}" "${USER}"
                ;;
            2)
                show_server_info "${SERVER}" "${USER}"
                ;;
            3)
                transfer_files "${SERVER}" "${USER}"
                ;;
            4)
                setup_server "${SERVER}" "${USER}"
                ;;
            5)
                check_deployment_status "${SERVER}" "${USER}"
                ;;
            6)
                start_ssh_session "${SERVER}" "${USER}"
                ;;
            7)
                print_status "Starting quick deploy process..."
                transfer_files "${SERVER}" "${USER}"
                setup_server "${SERVER}" "${USER}"
                
                print_status "Files transferred and server setup complete."
                print_status "Starting interactive session for deployment..."
                start_ssh_session "${SERVER}" "${USER}"
                ;;
            8)
                print_status "Goodbye!"
                exit 0
                ;;
            *)
                print_error "Invalid option. Please try again."
                ;;
        esac
        
        echo
        read -p "Press Enter to continue..."
    done
}

# Check if script is being run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi