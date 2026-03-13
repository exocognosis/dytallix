#!/bin/bash

# Hetzner Server Setup Guide
# This script helps you set up SSH connection to your Hetzner server

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() {
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

show_help() {
    echo "=== Dytallix Hetzner Setup Guide ==="
    echo
    echo "It looks like you need to either provision a Hetzner server or update"
    echo "the connection details. Here are your options:"
    echo
    echo "1. PROVISION NEW HETZNER SERVER"
    echo "   - Go to https://console.hetzner.cloud/"
    echo "   - Create a new project (if needed)"
    echo "   - Create a server with these specs:"
    echo "     • Image: Ubuntu 22.04 LTS"
    echo "     • Type: CPX31 (4 vCPU, 8 GB RAM) or higher"
    echo "     • Storage: 80 GB+ SSD"
    echo "     • Location: Choose closest to your users"
    echo "     • SSH Key: Add your public SSH key"
    echo "     • Name: dytallix-testnet"
    echo
    echo "2. CONFIGURE DOMAIN (Optional)"
    echo "   - If you have a domain, create A records:"
    echo "     testnet.dytallix.com → SERVER_IP"
    echo "     *.testnet.dytallix.com → SERVER_IP"
    echo
    echo "3. UPDATE CONNECTION DETAILS"
    echo "   - Use server IP address instead of domain name"
    echo "   - Or update domain configuration"
    echo
    echo "4. TEST SSH CONNECTION"
    echo "   ssh root@YOUR_SERVER_IP"
    echo "   or"
    echo "   ssh root@testnet.dytallix.com"
    echo
}

test_connection() {
    local target="${1}"
    
    if [[ -z "$target" ]]; then
        read -p "Enter server IP or hostname: " target
    fi
    
    print_info "Testing connection to: $target"
    
    # Test as root first (new server)
    print_info "Testing SSH as root..."
    if ssh -o ConnectTimeout=10 -o BatchMode=yes "root@${target}" exit 2>/dev/null; then
        print_success "SSH connection as root successful!"
        echo
        print_info "Server is ready for setup. You can now:"
        echo "1. Run server setup script as root"
        echo "2. Create the dytallix user"
        echo "3. Transfer deployment files"
        return 0
    fi
    
    # Test as dytallix user (already setup)
    print_info "Testing SSH as dytallix user..."
    if ssh -o ConnectTimeout=10 -o BatchMode=yes "dytallix@${target}" exit 2>/dev/null; then
        print_success "SSH connection as dytallix user successful!"
        echo
        print_info "Server is already set up. You can continue with deployment."
        return 0
    fi
    
    print_error "Cannot connect to server: $target"
    echo
    echo "Possible issues:"
    echo "1. Server is not running or doesn't exist"
    echo "2. SSH key is not configured"
    echo "3. Firewall is blocking SSH"
    echo "4. Wrong IP address or hostname"
    echo
    return 1
}

setup_ssh_key() {
    local target="${1}"
    
    if [[ -z "$target" ]]; then
        read -p "Enter server IP or hostname: " target
    fi
    
    print_info "Setting up SSH key for server: $target"
    
    # Check if SSH key exists
    if [[ ! -f ~/.ssh/id_rsa.pub ]] && [[ ! -f ~/.ssh/id_ed25519.pub ]]; then
        print_warning "No SSH key found. Generating one..."
        ssh-keygen -t ed25519 -C "dytallix-deployment" -f ~/.ssh/id_ed25519 -N ""
        print_success "SSH key generated: ~/.ssh/id_ed25519.pub"
    fi
    
    # Copy SSH key to server
    if ssh-copy-id "root@${target}" 2>/dev/null; then
        print_success "SSH key copied to root@${target}"
    else
        print_error "Failed to copy SSH key. You may need to:"
        echo "1. Use password authentication initially"
        echo "2. Add your SSH key through Hetzner console"
        echo "3. Manually copy the key"
        echo
        echo "Manual copy command:"
        if [[ -f ~/.ssh/id_ed25519.pub ]]; then
            echo "cat ~/.ssh/id_ed25519.pub | ssh root@${target} 'mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys'"
        elif [[ -f ~/.ssh/id_rsa.pub ]]; then
            echo "cat ~/.ssh/id_rsa.pub | ssh root@${target} 'mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys'"
        fi
    fi
}

update_server_config() {
    local target="${1}"
    
    if [[ -z "$target" ]]; then
        read -p "Enter server IP or hostname: " target
    fi
    
    print_info "Updating server configuration to use: $target"
    
    # Update environment file
    local env_file="$(dirname "$0")/docker-compose/.env.example"
    if [[ -f "$env_file" ]]; then
        # Create .env from template if it doesn't exist
        local actual_env="$(dirname "$0")/docker-compose/.env"
        if [[ ! -f "$actual_env" ]]; then
            cp "$env_file" "$actual_env"
            print_info "Created .env file from template"
        fi
        
        # Update IP address
        if [[ "$target" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            sed -i.bak "s/EXTERNAL_IP=.*/EXTERNAL_IP=${target}/" "$actual_env"
            print_success "Updated EXTERNAL_IP to $target"
        fi
        
        # Update domain if it's a hostname
        if [[ ! "$target" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            sed -i.bak "s/DOMAIN_NAME=.*/DOMAIN_NAME=${target}/" "$actual_env"
            print_success "Updated DOMAIN_NAME to $target"
        fi
    fi
    
    # Update connection scripts
    export HETZNER_SERVER="$target"
    print_success "Set HETZNER_SERVER environment variable to: $target"
    echo "You can now run: HETZNER_SERVER=$target ./connect-to-hetzner.sh"
}

# Main menu
main() {
    echo "=== Dytallix Hetzner Setup Assistant ==="
    echo
    echo "Current configuration:"
    echo "  Default server: testnet.dytallix.com"
    echo "  Default user: dytallix"
    echo
    
    while true; do
        echo "Please select an option:"
        echo "1. Show setup guide"
        echo "2. Test connection to server"
        echo "3. Setup SSH key"
        echo "4. Update server configuration"
        echo "5. Connect with custom server"
        echo "6. Exit"
        echo
        
        read -p "Choice (1-6): " choice
        
        case $choice in
            1)
                show_help
                ;;
            2)
                test_connection
                ;;
            3)
                setup_ssh_key
                ;;
            4)
                update_server_config
                ;;
            5)
                read -p "Enter server IP or hostname: " custom_server
                if [[ -n "$custom_server" ]]; then
                    export HETZNER_SERVER="$custom_server"
                    print_info "Connecting to $custom_server..."
                    exec ./connect-to-hetzner.sh "$custom_server"
                fi
                ;;
            6)
                print_info "Goodbye!"
                exit 0
                ;;
            *)
                print_error "Invalid choice. Please try again."
                ;;
        esac
        
        echo
        read -p "Press Enter to continue..."
        echo
    done
}

# Check if script is being run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
