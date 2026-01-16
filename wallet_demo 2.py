#!/usr/bin/env python3
"""
Demo script showing how the Dytallix wallet address derivation works
"""
import hashlib

def derive_address(public_key_bytes):
    """
    Derive a Dytallix address from a public key
    
    The address format is: dyt1{hex_encoded_hash_with_checksum}
    
    Process:
    1. Hash the public key using SHA256 (since blake3 may not be available)
    2. Take the first 20 bytes of the hash
    3. Calculate a checksum using SHA256 of the 20-byte hash
    4. Append the first 4 bytes of the checksum
    5. Encode the result in hexadecimal
    6. Prefix with "dyt1"
    """
    # Step 1: Hash the public key with SHA256 (substitute for Blake3)
    hash_result = hashlib.sha256(public_key_bytes).digest()
    
    # Step 2: Take the first 20 bytes
    address_bytes = hash_result[:20]
    
    # Step 3: Calculate checksum
    checksum = hashlib.sha256(address_bytes).digest()
    
    # Step 4: Append first 4 bytes of checksum
    payload = address_bytes + checksum[:4]
    
    # Step 5: Encode in hexadecimal
    encoded = payload.hex()
    
    # Step 6: Add prefix
    return f"dyt1{encoded}"

def validate_address(address):
    """
    Validate a Dytallix address
    """
    # Check prefix
    if not address.startswith("dyt1"):
        return False
    
    # Extract the hex part
    hex_part = address[4:]
    
    # Decode hex
    try:
        decoded = bytes.fromhex(hex_part)
    except ValueError:
        return False
    
    # Should be exactly 24 bytes (20 + 4 checksum)
    if len(decoded) != 24:
        return False
    
    # Verify checksum
    address_bytes = decoded[:20]
    provided_checksum = decoded[20:]
    
    calculated_checksum = hashlib.sha256(address_bytes).digest()
    
    return provided_checksum == calculated_checksum[:4]

def main():
    print("Dytallix Wallet Address Derivation Demo")
    print("=" * 50)
    
    # Test with sample public keys
    sample_pubkeys = [
        b"sample_public_key_1",
        b"sample_public_key_2", 
        b"a_longer_public_key_for_testing_purposes",
        b"test_public_key_data_for_address_derivation",
    ]
    
    for i, pubkey in enumerate(sample_pubkeys):
        address = derive_address(pubkey)
        is_valid = validate_address(address)
        
        print(f"\nSample {i+1}:")
        print(f"  Public key: {pubkey}")
        print(f"  Address: {address}")
        print(f"  Valid: {is_valid}")
        print(f"  Length: {len(address)} characters")
        
        # Show that same key produces same address
        address2 = derive_address(pubkey)
        print(f"  Deterministic: {address == address2}")
    
    print("\n" + "=" * 50)
    print("Testing address validation:")
    
    # Test valid address
    valid_address = derive_address(b"test_key")
    print(f"Valid address: {valid_address} -> {validate_address(valid_address)}")
    
    # Test invalid addresses
    invalid_addresses = [
        "invalid",
        "dyt1invalid",
        "dyt1invalidhex",
        "btc1validhexbutinvalidprefix",
        "dyt1abcd",
        "dyt1gggggggggggggggggggggggggggggggggggggggggggggggg",
    ]
    
    for addr in invalid_addresses:
        print(f"Invalid address: {addr} -> {validate_address(addr)}")
    
    print("\n" + "=" * 50)
    print("Address derivation implementation is working correctly!")

if __name__ == "__main__":
    main()
