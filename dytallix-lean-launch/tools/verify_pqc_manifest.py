#!/usr/bin/env python3
"""
Purpose: Verify PQC WASM file checksums against manifest.json
Validates integrity of post-quantum cryptography artifacts
"""
import json
import hashlib
import os
import sys
from pathlib import Path

def compute_sha256(file_path):
    """Compute SHA256 hash of a file"""
    sha256_hash = hashlib.sha256()
    try:
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                sha256_hash.update(chunk)
        return sha256_hash.hexdigest()
    except Exception as e:
        print(f"ERROR: Cannot compute hash for {file_path}: {e}")
        return None

def main():
    script_dir = Path(__file__).parent
    root_dir = script_dir.parent
    pqc_dir = root_dir / "public" / "wasm" / "pqc"
    manifest_path = pqc_dir / "manifest.json"
    
    if not manifest_path.exists():
        print(f"ERROR: Manifest not found at {manifest_path}")
        return 1
    
    try:
        with open(manifest_path, 'r') as f:
            manifest = json.load(f)
    except Exception as e:
        print(f"ERROR: Cannot read manifest: {e}")
        return 1
    
    print("PQC WASM Integrity Verification")
    print("=" * 50)
    print(f"Manifest: {manifest_path}")
    print(f"PQC Directory: {pqc_dir}")
    print()
    
    errors = 0
    verified_files = 0
    
    print(f"{'File':<20} {'Expected':<64} {'Actual':<64} {'Status'}")
    print("-" * 160)
    
    for filename, file_info in manifest.items():
        expected_hash = file_info.get('sha256', '')
        file_path = pqc_dir / filename
        
        if not file_path.exists():
            print(f"{filename:<20} {expected_hash:<64} {'MISSING':<64} ❌ MISSING")
            errors += 1
            continue
        
        actual_hash = compute_sha256(file_path)
        if actual_hash is None:
            print(f"{filename:<20} {expected_hash:<64} {'ERROR':<64} ❌ ERROR")
            errors += 1
            continue
            
        if actual_hash == expected_hash:
            print(f"{filename:<20} {expected_hash:<64} {actual_hash:<64} ✅ OK")
            verified_files += 1
        else:
            print(f"{filename:<20} {expected_hash:<64} {actual_hash:<64} ❌ MISMATCH")
            errors += 1
    
    print()
    print(f"Summary: {verified_files} verified, {errors} errors")
    
    if errors == 0:
        print("✅ All PQC WASM files passed integrity verification")
        return 0
    else:
        print(f"❌ {errors} files failed integrity verification")
        return 1

if __name__ == "__main__":
    sys.exit(main())