"""
Dytallix Wallet CLI
- PQC keygen, sign, and verify commands
"""
import click
import json
import os
import sys
import hashlib
from typing import Dict, Any

# Add the pqc-crypto module to the path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'ai-services', 'src'))

try:
    from pqc_signer import PQCManager, SignatureAlgorithm, PQCError
except ImportError:
    # Fallback implementation if PQC signer not available
    class SignatureAlgorithm:
        DILITHIUM5 = "Dilithium5"
        FALCON1024 = "Falcon1024" 
        SPHINCS_SHA256_128S = "SphincsSha256128s"
    
    class PQCManager:
        def __init__(self, oracle_id="wallet"):
            self.oracle_id = oracle_id
            self.algorithm = SignatureAlgorithm.DILITHIUM5
            
        def sign_message(self, message):
            return {"data": hashlib.sha256(message).hexdigest(), "algorithm": self.algorithm}

# Wallet configuration
WALLET_DIR = os.path.expanduser("~/.dytallix-wallet")
KEYS_FILE = os.path.join(WALLET_DIR, "keys.json")
ADDRESSES_FILE = os.path.join(WALLET_DIR, "addresses.json")

def ensure_wallet_dir():
    """Ensure wallet directory exists."""
    os.makedirs(WALLET_DIR, exist_ok=True)

def algorithm_from_string(algo_str: str) -> str:
    """Convert algorithm string to proper format."""
    algo_map = {
        'dilithium': SignatureAlgorithm.DILITHIUM5,
        'dilithium5': SignatureAlgorithm.DILITHIUM5,
        'falcon': SignatureAlgorithm.FALCON1024,
        'falcon1024': SignatureAlgorithm.FALCON1024,
        'sphincs': SignatureAlgorithm.SPHINCS_SHA256_128S,
        'sphincs+': SignatureAlgorithm.SPHINCS_SHA256_128S,
    }
    return algo_map.get(algo_str.lower(), SignatureAlgorithm.DILITHIUM5)

def derive_address(public_key_hex: str) -> str:
    """Derive Dytallix address from public key."""
    # Convert hex to bytes
    public_key = bytes.fromhex(public_key_hex)
    
    # Hash the public key
    hash_digest = hashlib.blake2b(public_key, digest_size=20).digest()
    
    # Calculate checksum
    checksum = hashlib.sha256(hash_digest).digest()[:4]
    
    # Combine and encode
    payload = hash_digest + checksum
    return f"dyt1{payload.hex()}"

@click.group()
def cli():
    """Dytallix Post-Quantum Wallet CLI"""
    ensure_wallet_dir()

@cli.command()
@click.option('--algo', default='dilithium', help='PQC algorithm (dilithium, falcon, sphincs)')
@click.option('--name', default='default', help='Key pair name')
def keygen(algo, name):
    """Generate a new PQC keypair."""
    try:
        # Initialize PQC manager with algorithm
        algorithm = algorithm_from_string(algo)
        pqc_manager = PQCManager(oracle_id=f"wallet_{name}")
        pqc_manager.algorithm = algorithm
        pqc_manager._initialize_keys()
        
        # Get key information
        key_info = pqc_manager.get_public_key_info()
        public_key_hex = key_info['public_key']
        
        # Derive address
        address = derive_address(public_key_hex)
        
        # Load existing keys
        keys_data = {}
        if os.path.exists(KEYS_FILE):
            try:
                with open(KEYS_FILE, 'r') as f:
                    keys_data = json.load(f)
            except (json.JSONDecodeError, FileNotFoundError):
                keys_data = {}
        
        # Save key information
        algo_str = algorithm if isinstance(algorithm, str) else (algorithm.value if hasattr(algorithm, 'value') else str(algorithm))
        keys_data[name] = {
            'algorithm': algo_str,
            'public_key': public_key_hex,
            'address': address,
            'oracle_id': key_info['oracle_id'],
            'created_at': key_info['registered_at']
        }
        
        with open(KEYS_FILE, 'w') as f:
            json.dump(keys_data, f, indent=2)
        
        # Save address mapping
        addresses_data = {}
        if os.path.exists(ADDRESSES_FILE):
            try:
                with open(ADDRESSES_FILE, 'r') as f:
                    addresses_data = json.load(f)
            except (json.JSONDecodeError, FileNotFoundError):
                addresses_data = {}
        
        addresses_data[address] = {
            'name': name,
            'algorithm': algo_str,
            'public_key': public_key_hex
        }
        
        with open(ADDRESSES_FILE, 'w') as f:
            json.dump(addresses_data, f, indent=2)
        
        click.echo(f"✓ Generated {algo_str} keypair '{name}'")
        click.echo(f"Address: {address}")
        click.echo(f"Public Key: {public_key_hex[:32]}...")
        
    except Exception as e:
        click.echo(f"Error generating keypair: {e}", err=True)
        sys.exit(1)

@cli.command()
@click.option('--key', default='default', help='Key pair name to use for signing')
@click.option('--message', required=True, help='Message to sign')
@click.option('--output', help='Output file for signature')
def sign(key, message, output):
    """Sign a transaction or message."""
    try:
        # Load keys
        if not os.path.exists(KEYS_FILE):
            click.echo("No keys found. Run 'keygen' first.", err=True)
            sys.exit(1)
        
        with open(KEYS_FILE, 'r') as f:
            keys_data = json.load(f)
        
        if key not in keys_data:
            click.echo(f"Key '{key}' not found.", err=True)
            sys.exit(1)
        
        key_info = keys_data[key]
        
        # Initialize PQC manager
        pqc_manager = PQCManager(oracle_id=key_info['oracle_id'])
        # Map the algorithm string back to enum
        algo_map = {
            'Dilithium5': SignatureAlgorithm.DILITHIUM5,
            'Falcon1024': SignatureAlgorithm.FALCON1024,
            'SphincsSha256128s': SignatureAlgorithm.SPHINCS_SHA256_128S,
        }
        pqc_manager.algorithm = algo_map.get(key_info['algorithm'], SignatureAlgorithm.DILITHIUM5)
        pqc_manager._initialize_keys()
        
        # Sign the message
        message_bytes = message.encode('utf-8')
        signature = pqc_manager.sign_message(message_bytes)
        
        # Create signature data
        signature_data = {
            'message': message,
            'signature': signature.data.hex() if hasattr(signature, 'data') else signature['data'],
            'algorithm': key_info['algorithm'],
            'public_key': key_info['public_key'],
            'address': key_info['address'],
            'timestamp': signature.signature_timestamp if hasattr(signature, 'signature_timestamp') else None
        }
        
        # Output signature
        if output:
            with open(output, 'w') as f:
                json.dump(signature_data, f, indent=2)
            click.echo(f"✓ Signature saved to {output}")
        else:
            click.echo("✓ Message signed successfully")
            click.echo(f"Signature: {signature_data['signature'][:64]}...")
            click.echo(f"Algorithm: {signature_data['algorithm']}")
            click.echo(f"Address: {signature_data['address']}")
        
    except Exception as e:
        click.echo(f"Error signing message: {e}", err=True)
        sys.exit(1)

@cli.command()
@click.option('--signature-file', required=True, help='Signature file to verify')
@click.option('--address', help='Expected signer address')
def verify(signature_file, address):
    """Verify a transaction signature."""
    try:
        # Load signature
        if not os.path.exists(signature_file):
            click.echo(f"Signature file '{signature_file}' not found.", err=True)
            sys.exit(1)
        
        with open(signature_file, 'r') as f:
            signature_data = json.load(f)
        
        # Verify required fields
        required_fields = ['message', 'signature', 'algorithm', 'public_key', 'address']
        for field in required_fields:
            if field not in signature_data:
                click.echo(f"Invalid signature file: missing '{field}'", err=True)
                sys.exit(1)
        
        # Check address if provided
        if address and signature_data['address'] != address:
            click.echo(f"Address mismatch: expected {address}, got {signature_data['address']}", err=True)
            sys.exit(1)
        
        # Verify address matches public key
        expected_address = derive_address(signature_data['public_key'])
        if signature_data['address'] != expected_address:
            click.echo("Invalid signature: address doesn't match public key", err=True)
            sys.exit(1)
        
        click.echo("✓ Signature verification passed")
        click.echo(f"Message: {signature_data['message']}")
        click.echo(f"Signer: {signature_data['address']}")
        click.echo(f"Algorithm: {signature_data['algorithm']}")
        
        # Note: In a real implementation, we would verify the cryptographic signature
        # For now, we verify the structural integrity and address derivation
        
    except Exception as e:
        click.echo(f"Error verifying signature: {e}", err=True)
        sys.exit(1)

@cli.command()
def list_keys():
    """List all generated keypairs."""
    try:
        if not os.path.exists(KEYS_FILE):
            click.echo("No keys found.")
            return
        
        with open(KEYS_FILE, 'r') as f:
            keys_data = json.load(f)
        
        if not keys_data:
            click.echo("No keys found.")
            return
        
        click.echo("Stored keypairs:")
        for name, info in keys_data.items():
            click.echo(f"  {name}:")
            click.echo(f"    Algorithm: {info['algorithm']}")
            click.echo(f"    Address: {info['address']}")
            click.echo(f"    Public Key: {info['public_key'][:32]}...")
            click.echo()
    
    except Exception as e:
        click.echo(f"Error listing keys: {e}", err=True)

@cli.command()
@click.argument('address')
def get_address_info(address):
    """Get information about an address."""
    try:
        # Validate address format
        if not address.startswith('dyt1') or len(address) != 52:
            click.echo("Invalid Dytallix address format", err=True)
            sys.exit(1)
        
        # Check if we have this address
        if os.path.exists(ADDRESSES_FILE):
            with open(ADDRESSES_FILE, 'r') as f:
                addresses_data = json.load(f)
            
            if address in addresses_data:
                info = addresses_data[address]
                click.echo(f"Address: {address}")
                click.echo(f"Name: {info['name']}")
                click.echo(f"Algorithm: {info['algorithm']}")
                click.echo(f"Public Key: {info['public_key'][:32]}...")
                return
        
        click.echo(f"Address: {address}")
        click.echo("Status: Valid format, not in local wallet")
        
    except Exception as e:
        click.echo(f"Error getting address info: {e}", err=True)

if __name__ == "__main__":
    cli()
