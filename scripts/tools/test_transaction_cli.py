#!/usr/bin/env python3
"""
Test script to verify transaction handling in the CLI
"""
import subprocess
import time
import sys
import os

def run_command(cmd, cwd=None):
    """Run a command and return stdout, stderr, and return code"""
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=cwd)
        return result.stdout, result.stderr, result.returncode
    except Exception as e:
        return "", str(e), 1

def test_transaction_commands():
    """Test the CLI transaction commands"""
    print("🧪 Testing Dytallix CLI Transaction Commands")
    print("=" * 50)
    
    # Change to developer-tools directory
    cli_dir = "/Users/rickglenn/Desktop/dytallix/developer-tools"
    
    # Build the CLI first
    print("📦 Building CLI...")
    stdout, stderr, code = run_command("cargo build --release", cwd=cli_dir)
    if code != 0:
        print(f"❌ Build failed: {stderr}")
        return False
    
    cli_path = os.path.join(cli_dir, "target", "release", "dytallix-cli")
    
    # Test 1: Send transaction
    print("\n💸 Testing send transaction...")
    cmd = f"{cli_path} transaction send dyt1receiver123 500000 --from dyt1sender456"
    stdout, stderr, code = run_command(cmd)
    print(f"Command: {cmd}")
    print(f"Output: {stdout}")
    if stderr:
        print(f"Error: {stderr}")
    
    # Test 2: Get transaction
    print("\n🔍 Testing get transaction...")
    cmd = f"{cli_path} transaction get 0x1234567890abcdef"
    stdout, stderr, code = run_command(cmd)
    print(f"Command: {cmd}")
    print(f"Output: {stdout}")
    if stderr:
        print(f"Error: {stderr}")
    
    # Test 3: List transactions
    print("\n📜 Testing list transactions...")
    cmd = f"{cli_path} transaction list --account dyt1sender456 --limit 5"
    stdout, stderr, code = run_command(cmd)
    print(f"Command: {cmd}")
    print(f"Output: {stdout}")
    if stderr:
        print(f"Error: {stderr}")
    
    # Test 4: List all transactions
    print("\n📜 Testing list all transactions...")
    cmd = f"{cli_path} transaction list --limit 10"
    stdout, stderr, code = run_command(cmd)
    print(f"Command: {cmd}")
    print(f"Output: {stdout}")
    if stderr:
        print(f"Error: {stderr}")
    
    return True

def start_blockchain_node():
    """Start the blockchain node in the background"""
    print("🚀 Starting blockchain node...")
    node_dir = "/Users/rickglenn/Desktop/dytallix/blockchain-core"
    
    # Build the node
    stdout, stderr, code = run_command("cargo build --release", cwd=node_dir)
    if code != 0:
        print(f"❌ Node build failed: {stderr}")
        return None
    
    # Start the node (this will run in background)
    node_path = os.path.join(node_dir, "target", "release", "dytallix-node")
    process = subprocess.Popen([node_path], cwd=node_dir)
    
    # Wait a bit for the node to start
    time.sleep(3)
    
    return process

if __name__ == "__main__":
    print("🌟 Dytallix Transaction CLI Test")
    print("=" * 50)
    
    # Start the blockchain node
    node_process = start_blockchain_node()
    
    if node_process:
        try:
            # Test the transaction commands
            test_transaction_commands()
        finally:
            # Clean up
            print("\n🛑 Stopping blockchain node...")
            node_process.terminate()
            node_process.wait()
    else:
        print("❌ Failed to start blockchain node")
        sys.exit(1)
    
    print("\n✅ Test completed!")
