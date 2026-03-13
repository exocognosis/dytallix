#!/bin/bash

# Hetzner Server Setup Script for Dytallix
# This script prepares a fresh Hetzner server for Dytallix deployment

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root"
        exit 1
    fi
}

# Update system packages
update_system() {
    log_info "Updating system packages..."
    apt-get update
    apt-get upgrade -y
    apt-get install -y \
        curl \
        wget \
        git \
        htop \
        ufw \
        fail2ban \
        unzip \
        jq \
        vim \
        nano \
        tree \
        software-properties-common \
        apt-transport-https \
        ca-certificates \
        gnupg \
        lsb-release
    log_success "System packages updated"
}

# Install Docker
install_docker() {
    log_info "Installing Docker..."
    
    # Remove old versions
    apt-get remove -y docker docker-engine docker.io containerd runc || true
    
    # Add Docker's official GPG key
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # Add Docker repository
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Enable Docker service
    systemctl enable docker
    systemctl start docker
    
    # Add current user to docker group
    if [[ -n "${SUDO_USER:-}" ]]; then
        usermod -aG docker "$SUDO_USER"
        log_info "Added $SUDO_USER to docker group"
    fi
    
    log_success "Docker installed successfully"
}

# Configure firewall
configure_firewall() {
    log_info "Configuring firewall..."
    
    # Reset UFW to defaults
    ufw --force reset
    
    # Default policies
    ufw default deny incoming
    ufw default allow outgoing
    
    # SSH access
    ufw allow ssh
    ufw allow 22/tcp
    
    # HTTP and HTTPS
    ufw allow 80/tcp
    ufw allow 443/tcp
    
    # Dytallix node ports
    ufw allow 26656/tcp  # P2P
    ufw allow 26657/tcp  # RPC
    ufw allow 26660/tcp  # Prometheus metrics
    
    # Bridge service
    ufw allow 8080/tcp
    
    # Monitoring (restrict to local network if needed)
    ufw allow 3000/tcp   # Grafana
    ufw allow 9090/tcp   # Prometheus
    ufw allow 3100/tcp   # Loki
    
    # Enable firewall
    ufw --force enable
    
    log_success "Firewall configured"
}

# Configure fail2ban
configure_fail2ban() {
    log_info "Configuring fail2ban..."
    
    cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
backend = systemd

[sshd]
enabled = true
port = ssh
logpath = %(sshd_log)s
maxretry = 3
bantime = 86400

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 3

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
bantime = 600
EOF

    systemctl enable fail2ban
    systemctl restart fail2ban
    
    log_success "Fail2ban configured"
}

# Create deployment user
create_deployment_user() {
    local username="${1:-dytallix}"
    
    log_info "Creating deployment user: $username"
    
    if id "$username" &>/dev/null; then
        log_warning "User $username already exists"
    else
        # Create user with home directory
        useradd -m -s /bin/bash "$username"
        
        # Add to docker group
        usermod -aG docker "$username"
        
        # Create .ssh directory
        mkdir -p "/home/$username/.ssh"
        chmod 700 "/home/$username/.ssh"
        chown "$username:$username" "/home/$username/.ssh"
        
        log_success "User $username created"
    fi
    
    # Create deployment directory
    mkdir -p "/home/$username/dytallix"
    chown -R "$username:$username" "/home/$username/dytallix"
}

# Setup SSH key (optional)
setup_ssh_key() {
    local username="${1:-dytallix}"
    local ssh_key="$2"
    
    if [[ -n "$ssh_key" ]]; then
        log_info "Setting up SSH key for $username"
        
        echo "$ssh_key" > "/home/$username/.ssh/authorized_keys"
        chmod 600 "/home/$username/.ssh/authorized_keys"
        chown "$username:$username" "/home/$username/.ssh/authorized_keys"
        
        log_success "SSH key configured for $username"
    fi
}

# Configure system limits
configure_limits() {
    log_info "Configuring system limits..."
    
    cat >> /etc/security/limits.conf << EOF
# Dytallix limits
* soft nofile 65536
* hard nofile 65536
* soft nproc 65536
* hard nproc 65536
EOF

    # Configure systemd limits
    mkdir -p /etc/systemd/system.conf.d
    cat > /etc/systemd/system.conf.d/limits.conf << EOF
[Manager]
DefaultLimitNOFILE=65536
DefaultLimitNPROC=65536
EOF

    log_success "System limits configured"
}

# Configure swap
configure_swap() {
    log_info "Configuring swap..."
    
    # Check if swap already exists
    if swapon --show | grep -q "/swapfile"; then
        log_warning "Swap already configured"
        return 0
    fi
    
    # Create 2GB swap file
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    
    # Make swap permanent
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    
    # Configure swappiness
    echo 'vm.swappiness=10' >> /etc/sysctl.conf
    sysctl vm.swappiness=10
    
    log_success "Swap configured"
}

# Install monitoring tools
install_monitoring_tools() {
    log_info "Installing monitoring tools..."
    
    # Install node exporter
    cd /tmp
    wget https://github.com/prometheus/node_exporter/releases/download/v1.6.1/node_exporter-1.6.1.linux-amd64.tar.gz
    tar xvfz node_exporter-1.6.1.linux-amd64.tar.gz
    cp node_exporter-1.6.1.linux-amd64/node_exporter /usr/local/bin/
    
    # Create node_exporter user
    useradd --no-create-home --shell /bin/false node_exporter || true
    chown node_exporter:node_exporter /usr/local/bin/node_exporter
    
    # Create systemd service
    cat > /etc/systemd/system/node_exporter.service << EOF
[Unit]
Description=Node Exporter
Wants=network-online.target
After=network-online.target

[Service]
User=node_exporter
Group=node_exporter
Type=simple
ExecStart=/usr/local/bin/node_exporter

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable node_exporter
    systemctl start node_exporter
    
    log_success "Monitoring tools installed"
}

# Main function
main() {
    local username="${1:-dytallix}"
    local ssh_key="${2:-}"
    
    log_info "Starting Hetzner server setup for Dytallix..."
    
    check_root
    update_system
    install_docker
    configure_firewall
    configure_fail2ban
    create_deployment_user "$username"
    
    if [[ -n "$ssh_key" ]]; then
        setup_ssh_key "$username" "$ssh_key"
    fi
    
    configure_limits
    configure_swap
    install_monitoring_tools
    
    log_success "Hetzner server setup completed!"
    log_info "Next steps:"
    log_info "1. Switch to the $username user: su - $username"
    log_info "2. Clone the Dytallix repository"
    log_info "3. Copy the deployment files to the server"
    log_info "4. Configure the .env file"
    log_info "5. Run the deployment script"
    
    # Show system info
    echo ""
    log_info "System Information:"
    echo "  OS: $(lsb_release -d | cut -f2)"
    echo "  Kernel: $(uname -r)"
    echo "  Memory: $(free -h | awk '/^Mem:/ {print $2}')"
    echo "  Disk: $(df -h / | awk 'NR==2 {print $2}')"
    echo "  Docker: $(docker --version)"
}

# Run main function with arguments
main "$@"
