#!/usr/bin/env python3
"""
Dytallix Hetzner Auto-Deployment Script
This script automates the complete deployment of Dytallix on Hetzner Cloud
"""

import subprocess
import sys
import time
import json
import os
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import argparse

class Colors:
    """ANSI color codes for terminal output"""
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    PURPLE = '\033[0;35m'
    CYAN = '\033[0;36m'
    WHITE = '\033[1;37m'
    NC = '\033[0m'  # No Color

class DytallixDeployer:
    def __init__(self, server_ip: str, user: str = "root", ssh_key_path: Optional[str] = None):
        self.server_ip = server_ip
        self.user = user
        self.ssh_key_path = ssh_key_path
        self.script_dir = Path(__file__).parent
        self.deployment_status = {}
        
    def log_info(self, message: str):
        print(f"{Colors.BLUE}[INFO]{Colors.NC} {message}")
        
    def log_success(self, message: str):
        print(f"{Colors.GREEN}[SUCCESS]{Colors.NC} {message}")
        
    def log_warning(self, message: str):
        print(f"{Colors.YELLOW}[WARNING]{Colors.NC} {message}")
        
    def log_error(self, message: str):
        print(f"{Colors.RED}[ERROR]{Colors.NC} {message}")
        
    def log_step(self, step: str):
        print(f"\n{Colors.CYAN}{'='*60}{Colors.NC}")
        print(f"{Colors.CYAN}STEP: {step}{Colors.NC}")
        print(f"{Colors.CYAN}{'='*60}{Colors.NC}")

    def run_ssh_command(self, command: str, capture_output: bool = True, timeout: int = 300) -> Tuple[bool, str]:
        """Execute a command on the remote server via SSH"""
        ssh_cmd = ["ssh", "-o", "ConnectTimeout=10", "-o", "StrictHostKeyChecking=no"]
        
        if self.ssh_key_path:
            ssh_cmd.extend(["-i", self.ssh_key_path])
            
        ssh_cmd.extend([f"{self.user}@{self.server_ip}", command])
        
        try:
            if capture_output:
                result = subprocess.run(ssh_cmd, capture_output=True, text=True, timeout=timeout)
                return result.returncode == 0, result.stdout + result.stderr
            else:
                result = subprocess.run(ssh_cmd, timeout=timeout)
                return result.returncode == 0, ""
        except subprocess.TimeoutExpired:
            self.log_error(f"Command timed out after {timeout} seconds")
            return False, "Command timed out"
        except Exception as e:
            self.log_error(f"SSH command failed: {str(e)}")
            return False, str(e)

    def run_local_command(self, command: str, capture_output: bool = True) -> Tuple[bool, str]:
        """Execute a command locally"""
        try:
            if capture_output:
                result = subprocess.run(command, shell=True, capture_output=True, text=True)
                return result.returncode == 0, result.stdout + result.stderr
            else:
                result = subprocess.run(command, shell=True)
                return result.returncode == 0, ""
        except Exception as e:
            self.log_error(f"Local command failed: {str(e)}")
            return False, str(e)

    def test_ssh_connection(self) -> bool:
        """Test SSH connectivity to the server"""
        self.log_step("Testing SSH Connection")
        success, output = self.run_ssh_command("echo 'SSH connection successful'")
        
        if success:
            self.log_success(f"Connected to {self.user}@{self.server_ip}")
            return True
        else:
            self.log_error(f"Failed to connect to {self.user}@{self.server_ip}")
            self.log_error("Please ensure:")
            self.log_error("1. Server is running and accessible")
            self.log_error("2. SSH key is properly configured")
            self.log_error("3. Firewall allows SSH connections")
            return False

    def get_server_info(self) -> Dict[str, str]:
        """Get server information"""
        self.log_step("Getting Server Information")
        
        commands = {
            "hostname": "hostname",
            "os": "cat /etc/os-release | grep PRETTY_NAME | cut -d'=' -f2 | tr -d '\"'",
            "uptime": "uptime",
            "memory": "free -h",
            "disk": "df -h",
            "docker": "docker --version 2>/dev/null || echo 'Not installed'",
            "docker_compose": "docker-compose --version 2>/dev/null || echo 'Not installed'"
        }
        
        server_info = {}
        for key, cmd in commands.items():
            success, output = self.run_ssh_command(cmd)
            server_info[key] = output.strip() if success else "Failed to retrieve"
            
        # Display server info
        self.log_info("Server Information:")
        for key, value in server_info.items():
            print(f"  {key.capitalize()}: {value}")
            
        return server_info

    def setup_server_prerequisites(self) -> bool:
        """Install Docker, Docker Compose, and other prerequisites"""
        self.log_step("Setting Up Server Prerequisites")
        
        # Update system
        self.log_info("Updating system packages...")
        success, output = self.run_ssh_command("""
            apt-get update && apt-get upgrade -y && 
            apt-get install -y curl wget git htop ufw fail2ban unzip jq vim nano tree
        """)
        
        if not success:
            self.log_error("Failed to update system packages")
            return False
            
        # Install Docker
        self.log_info("Installing Docker...")
        success, output = self.run_ssh_command("""
            if ! command -v docker &> /dev/null; then
                curl -fsSL https://get.docker.com -o get-docker.sh
                sh get-docker.sh
                usermod -aG docker $USER
                systemctl enable docker
                systemctl start docker
                echo "Docker installed successfully"
            else
                echo "Docker already installed"
            fi
        """)
        
        if not success:
            self.log_error("Failed to install Docker")
            return False
            
        # Install Docker Compose
        self.log_info("Installing Docker Compose...")
        success, output = self.run_ssh_command("""
            if ! command -v docker-compose &> /dev/null; then
                curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
                chmod +x /usr/local/bin/docker-compose
                echo "Docker Compose installed successfully"
            else
                echo "Docker Compose already installed"
            fi
        """)
        
        if not success:
            self.log_error("Failed to install Docker Compose")
            return False
            
        self.log_success("Server prerequisites installed successfully")
        return True

    def configure_firewall(self) -> bool:
        """Configure UFW firewall"""
        self.log_step("Configuring Firewall")
        
        firewall_rules = [
            "ufw --force reset",
            "ufw default deny incoming",
            "ufw default allow outgoing",
            "ufw allow ssh",
            "ufw allow 22/tcp",
            "ufw allow 80/tcp",
            "ufw allow 443/tcp",
            "ufw allow 26656/tcp",  # P2P
            "ufw allow 26657/tcp",  # RPC
            "ufw allow 26660/tcp",  # Prometheus
            "ufw allow 8080/tcp",   # Bridge
            "ufw allow 3000/tcp",   # Grafana
            "ufw allow 9090/tcp",   # Prometheus
            "ufw --force enable"
        ]
        
        for rule in firewall_rules:
            success, output = self.run_ssh_command(rule)
            if not success:
                self.log_warning(f"Firewall rule failed: {rule}")
                
        self.log_success("Firewall configured")
        return True

    def transfer_deployment_files(self) -> bool:
        """Transfer deployment files to the server"""
        self.log_step("Transferring Deployment Files")
        
        # Create remote directory
        success, output = self.run_ssh_command("mkdir -p ~/dytallix")
        if not success:
            self.log_error("Failed to create deployment directory")
            return False
            
        # Use rsync to transfer files
        rsync_cmd = [
            "rsync", "-av", "--progress",
            "--exclude='.git'",
            "--exclude='target'", 
            "--exclude='node_modules'",
            "--exclude='*.log'",
            str(self.script_dir) + "/",
            f"{self.user}@{self.server_ip}:~/dytallix/"
        ]
        
        if self.ssh_key_path:
            rsync_cmd.extend(["-e", f"ssh -i {self.ssh_key_path}"])
            
        try:
            result = subprocess.run(rsync_cmd, capture_output=True, text=True)
            if result.returncode == 0:
                self.log_success("Files transferred successfully")
                return True
            else:
                self.log_error(f"File transfer failed: {result.stderr}")
                return False
        except Exception as e:
            self.log_error(f"File transfer error: {str(e)}")
            return False

    def setup_environment_config(self) -> bool:
        """Setup environment configuration"""
        self.log_step("Setting Up Environment Configuration")
        
        # Check if .env already exists
        success, output = self.run_ssh_command("test -f ~/dytallix/docker-compose/.env")
        
        if not success:
            self.log_info("Creating .env file from template...")
            success, output = self.run_ssh_command("""
                cd ~/dytallix/docker-compose
                cp .env.example .env
                
                # Update with server IP
                sed -i "s/EXTERNAL_IP=.*/EXTERNAL_IP={}/g" .env
                sed -i "s/DOMAIN_NAME=.*/DOMAIN_NAME={}/g" .env
                
                echo "Environment file created"
            """.format(self.server_ip, self.server_ip))
            
            if success:
                self.log_success("Environment configuration created")
            else:
                self.log_error("Failed to create environment configuration")
                return False
        else:
            self.log_info("Environment file already exists")
            
        return True

    def build_dytallix_images(self) -> bool:
        """Build Dytallix Docker images"""
        self.log_step("Building Dytallix Images")
        
        # Make scripts executable
        success, output = self.run_ssh_command("chmod +x ~/dytallix/scripts/*.sh")
        
        # Build images
        build_commands = [
            "cd ~/dytallix",
            "docker-compose -f docker-compose/docker-compose.yml build --no-cache"
        ]
        
        for cmd in build_commands:
            self.log_info(f"Running: {cmd}")
            success, output = self.run_ssh_command(cmd, timeout=600)  # 10 minutes timeout
            
            if not success:
                self.log_error(f"Build command failed: {cmd}")
                self.log_error(output)
                return False
                
        self.log_success("Dytallix images built successfully")
        return True

    def initialize_blockchain(self) -> bool:
        """Initialize the blockchain"""
        self.log_step("Initializing Blockchain")
        
        init_commands = [
            "cd ~/dytallix",
            "./scripts/setup-server.sh",
        ]
        
        for cmd in init_commands:
            self.log_info(f"Running: {cmd}")
            success, output = self.run_ssh_command(cmd, timeout=300)
            
            if not success:
                self.log_warning(f"Init command warning: {cmd}")
                self.log_warning(output)
            else:
                self.log_info(output)
                
        return True

    def deploy_services(self) -> bool:
        """Deploy all Dytallix services"""
        self.log_step("Deploying Dytallix Services")
        
        deploy_cmd = """
            cd ~/dytallix/docker-compose
            docker-compose down --remove-orphans
            docker-compose up -d
        """
        
        self.log_info("Starting deployment...")
        success, output = self.run_ssh_command(deploy_cmd, timeout=600)
        
        if success:
            self.log_success("Services deployed successfully")
            self.log_info(output)
        else:
            self.log_error("Deployment failed")
            self.log_error(output)
            return False
            
        # Wait for services to start
        self.log_info("Waiting for services to start...")
        time.sleep(30)
        
        return True

    def check_deployment_status(self) -> Dict[str, str]:
        """Check the status of deployed services"""
        self.log_step("Checking Deployment Status")
        
        # Check container status
        success, output = self.run_ssh_command("cd ~/dytallix/docker-compose && docker-compose ps")
        
        if success:
            self.log_info("Container Status:")
            print(output)
        else:
            self.log_error("Failed to get container status")
            
        # Check service health
        health_checks = {
            "Blockchain RPC": "curl -s http://localhost:26657/status",
            "Frontend": "curl -s http://localhost:3000/health || curl -s http://localhost:3000",
            "Explorer": "curl -s http://localhost:3002/health || curl -s http://localhost:3002", 
            "Faucet": "curl -s http://localhost:3001/health || curl -s http://localhost:3001",
            "Bridge": "curl -s http://localhost:8080/health || curl -s http://localhost:8080",
            "Grafana": "curl -s http://localhost:3003/api/health"
        }
        
        service_status = {}
        self.log_info("Service Health Checks:")
        
        for service, check_cmd in health_checks.items():
            success, output = self.run_ssh_command(check_cmd)
            status = "✅ Healthy" if success else "❌ Unhealthy"
            service_status[service] = status
            print(f"  {service}: {status}")
            
        return service_status

    def show_access_information(self):
        """Display access information for deployed services"""
        self.log_step("Service Access Information")
        
        services = {
            "Frontend": f"http://{self.server_ip}:3000",
            "Explorer": f"http://{self.server_ip}:3002", 
            "Faucet": f"http://{self.server_ip}:3001",
            "RPC Endpoint": f"http://{self.server_ip}:26657",
            "API Endpoint": f"http://{self.server_ip}:1317",
            "Bridge Service": f"http://{self.server_ip}:8080",
            "Grafana": f"http://{self.server_ip}:3003",
            "Prometheus": f"http://{self.server_ip}:9090"
        }
        
        print(f"\n{Colors.GREEN}🚀 Dytallix Services Deployed Successfully!{Colors.NC}\n")
        print("Service URLs:")
        
        for service, url in services.items():
            print(f"  📍 {service}: {Colors.BLUE}{url}{Colors.NC}")
            
        print(f"\n{Colors.YELLOW}📋 Important Notes:{Colors.NC}")
        print("  • Default Grafana login: admin / (check .env file for password)")
        print("  • Blockchain data is persisted in Docker volumes")
        print("  • Logs can be viewed with: docker-compose logs [service-name]")
        print("  • To stop services: docker-compose down")
        print("  • To restart services: docker-compose restart")

    def run_deployment(self) -> bool:
        """Run the complete deployment process"""
        self.log_info(f"Starting Dytallix deployment on {self.server_ip}")
        
        steps = [
            ("Test SSH Connection", self.test_ssh_connection),
            ("Get Server Info", lambda: self.get_server_info() is not None),
            ("Setup Prerequisites", self.setup_server_prerequisites),
            ("Configure Firewall", self.configure_firewall),
            ("Transfer Files", self.transfer_deployment_files),
            ("Setup Environment", self.setup_environment_config),
            ("Initialize System", self.initialize_blockchain),
            ("Deploy Services", self.deploy_services),
        ]
        
        for step_name, step_func in steps:
            try:
                if not step_func():
                    self.log_error(f"Step failed: {step_name}")
                    return False
            except Exception as e:
                self.log_error(f"Step failed with exception: {step_name} - {str(e)}")
                return False
                
        # Final status check
        self.check_deployment_status()
        self.show_access_information()
        
        return True

def main():
    parser = argparse.ArgumentParser(description="Deploy Dytallix on Hetzner Cloud")
    parser.add_argument("server_ip", help="Server IP address")
    parser.add_argument("--user", default="root", help="SSH user (default: root)")
    parser.add_argument("--ssh-key", help="Path to SSH private key")
    parser.add_argument("--check-only", action="store_true", help="Only check deployment status")
    
    args = parser.parse_args()
    
    deployer = DytallixDeployer(args.server_ip, args.user, args.ssh_key)
    
    if args.check_only:
        if deployer.test_ssh_connection():
            deployer.check_deployment_status()
            deployer.show_access_information()
    else:
        success = deployer.run_deployment()
        sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
