#!/usr/bin/env python3
"""
Purpose: Vault client for secure validator key retrieval
Only outputs key fingerprints, never private key material
"""
import os
import sys
import json
import hashlib
import hvac
from datetime import datetime

def compute_key_fingerprint(private_key_data):
    """Compute SHA256 fingerprint of private key for logging/verification"""
    if not private_key_data:
        return "EMPTY_KEY"
    
    # Hash the key data (never log the actual key)
    key_bytes = private_key_data.encode('utf-8') if isinstance(private_key_data, str) else private_key_data
    fingerprint = hashlib.sha256(key_bytes).hexdigest()[:16]  # First 16 chars for brevity
    return fingerprint

def main():
    # Get Vault configuration from environment
    vault_addr = os.getenv('VAULT_ADDR', 'http://127.0.0.1:8200')
    vault_token = os.getenv('VAULT_TOKEN')
    vault_role_id = os.getenv('VAULT_ROLE_ID')
    vault_secret_id = os.getenv('VAULT_SECRET_ID')
    
    validator_name = sys.argv[1] if len(sys.argv) > 1 else 'validator1'
    
    if not vault_token and not (vault_role_id and vault_secret_id):
        print("ERROR: Must provide VAULT_TOKEN or (VAULT_ROLE_ID + VAULT_SECRET_ID)", file=sys.stderr)
        sys.exit(1)
    
    try:
        # Initialize Vault client
        client = hvac.Client(url=vault_addr)
        
        # Authenticate
        if vault_token:
            client.token = vault_token
        else:
            # Use AppRole authentication
            auth_response = client.auth.approle.login(
                role_id=vault_role_id,
                secret_id=vault_secret_id
            )
            client.token = auth_response['auth']['client_token']
        
        # Verify authentication worked
        if not client.is_authenticated():
            print("ERROR: Vault authentication failed", file=sys.stderr)
            sys.exit(1)
        
        # Retrieve validator key
        secret_path = f'secret/validators/{validator_name}'
        try:
            secret_response = client.secrets.kv.v2.read_secret_version(path=f'validators/{validator_name}')
            secret_data = secret_response['data']['data']
        except Exception as e:
            print(f"ERROR: Failed to retrieve key from {secret_path}: {e}", file=sys.stderr)
            sys.exit(1)
        
        # Extract key data
        private_key = secret_data.get('private_key', '')
        public_key = secret_data.get('public_key', '')
        address = secret_data.get('address', '')
        algorithm = secret_data.get('algorithm', 'unknown')
        created_at = secret_data.get('created_at', 'unknown')
        
        # Compute fingerprints (safe to log)
        private_fingerprint = compute_key_fingerprint(private_key)
        public_fingerprint = compute_key_fingerprint(public_key)
        
        # Output safe information only
        result = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'validator': validator_name,
            'address': address,
            'algorithm': algorithm,
            'created_at': created_at,
            'private_key_fingerprint': private_fingerprint,
            'public_key_fingerprint': public_fingerprint,
            'vault_path': secret_path,
            'status': 'retrieved'
        }
        
        # Print only the fingerprint to stdout (for shell scripts)
        print(private_fingerprint)
        
        # Print full info to stderr for logging
        print(f"INFO: {json.dumps(result)}", file=sys.stderr)
        
    except Exception as e:
        error_result = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'validator': validator_name,
            'error': str(e),
            'status': 'failed'
        }
        print(f"ERROR: {json.dumps(error_result)}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()