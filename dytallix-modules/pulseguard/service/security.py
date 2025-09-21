"""Security layer with HMAC validation, Ed25519 signing, and PQC stubs."""
import logging
import time
import hmac
import hashlib
import base64
from typing import Dict, Any, Optional
import json

logger = logging.getLogger(__name__)

try:
    import ed25519
    ED25519_AVAILABLE = True
except ImportError:
    ED25519_AVAILABLE = False
    ed25519 = None


class SecurityManager:
    """Manages HMAC validation, signing, and PQC operations."""
    
    def __init__(self, 
                 hmac_key: str = "change_me",
                 signing_secret: str = "",
                 pqc_enabled: bool = False):
        
        self.hmac_key = hmac_key.encode('utf-8')
        self.pqc_enabled = pqc_enabled
        
        # Initialize Ed25519 key pair
        self.signing_key = None
        self.verify_key = None
        
        if signing_secret and ED25519_AVAILABLE:
            try:
                # Load signing key from base64
                key_bytes = base64.b64decode(signing_secret)
                self.signing_key = ed25519.SigningKey(key_bytes)
                self.verify_key = self.signing_key.get_verifying_key()
            except Exception as e:
                logger.error(f"Failed to load Ed25519 key: {e}")
                self._generate_new_keypair()
        elif ED25519_AVAILABLE:
            self._generate_new_keypair()
        else:
            logger.warning("Ed25519 not available, signatures disabled")
            
    def _generate_new_keypair(self):
        """Generate a new Ed25519 keypair."""
        try:
            if not ED25519_AVAILABLE:
                return
                
            self.signing_key = ed25519.SigningKey()
            self.verify_key = self.signing_key.get_verifying_key()
            
            # Log the base64 encoded secret for configuration
            secret_b64 = base64.b64encode(self.signing_key.to_bytes()).decode('ascii')
            logger.info(f"Generated new Ed25519 keypair. Secret (add to config): {secret_b64}")
            
        except Exception as e:
            logger.error(f"Error generating Ed25519 keypair: {e}")
            
    def validate_hmac(self, data: bytes, provided_signature: str) -> bool:
        """Validate HMAC signature on request data."""
        try:
            # Compute expected HMAC
            expected_signature = hmac.new(
                self.hmac_key,
                data,
                hashlib.sha256
            ).hexdigest()
            
            # Compare signatures (timing-safe)
            return hmac.compare_digest(expected_signature, provided_signature)
            
        except Exception as e:
            logger.error(f"Error validating HMAC: {e}")
            return False
            
    def sign_response(self, data: Dict[str, Any]) -> Dict[str, str]:
        """Sign response data with Ed25519."""
        try:
            if not self.signing_key:
                return {
                    "algorithm": "none",
                    "signature": None,
                    "signed_at": str(int(time.time()))
                }
                
            # Serialize data deterministically
            data_json = json.dumps(data, sort_keys=True, separators=(',', ':'))
            data_bytes = data_json.encode('utf-8')
            
            # Sign with Ed25519
            signature = self.signing_key.sign(data_bytes)
            signature_b64 = base64.b64encode(signature).decode('ascii')
            
            return {
                "algorithm": "ed25519",
                "signature": signature_b64,
                "signed_at": str(int(time.time())),
                "public_key": base64.b64encode(self.verify_key.to_bytes()).decode('ascii')
            }
            
        except Exception as e:
            logger.error(f"Error signing response: {e}")
            return {
                "algorithm": "error",
                "signature": None,
                "signed_at": str(int(time.time()))
            }
            
    def verify_signature(self, data: Dict[str, Any], signature_info: Dict[str, str]) -> bool:
        """Verify Ed25519 signature."""
        try:
            if not self.verify_key or signature_info.get("algorithm") != "ed25519":
                return False
                
            signature_b64 = signature_info.get("signature")
            if not signature_b64:
                return False
                
            # Reconstruct data
            data_json = json.dumps(data, sort_keys=True, separators=(',', ':'))
            data_bytes = data_json.encode('utf-8')
            
            # Verify signature
            signature = base64.b64decode(signature_b64)
            self.verify_key.verify(signature, data_bytes)
            return True
            
        except Exception as e:
            logger.error(f"Error verifying signature: {e}")
            return False
            
    def pqc_sign(self, data: bytes, algorithm: str = "dilithium") -> Dict[str, Any]:
        """Post-quantum cryptography signing (stub implementation)."""
        try:
            if not self.pqc_enabled:
                raise NotImplementedError("PQC not enabled in configuration")
                
            # TODO: Implement actual PQC signing
            # This is a placeholder for future PQC integration
            logger.warning(f"PQC signing with {algorithm} - STUB IMPLEMENTATION")
            
            return {
                "algorithm": algorithm,
                "signature": base64.b64encode(b"pqc_stub_signature").decode('ascii'),
                "public_key": base64.b64encode(b"pqc_stub_public_key").decode('ascii'),
                "status": "stub"
            }
            
        except Exception as e:
            logger.error(f"PQC signing error: {e}")
            return {
                "algorithm": algorithm,
                "signature": None,
                "public_key": None,
                "status": "error"
            }
            
    def pqc_verify(self, data: bytes, signature_info: Dict[str, Any]) -> bool:
        """Post-quantum cryptography verification (stub implementation)."""
        try:
            if not self.pqc_enabled:
                return False
                
            # TODO: Implement actual PQC verification
            # This is a placeholder for future PQC integration
            algorithm = signature_info.get("algorithm", "")
            logger.warning(f"PQC verification with {algorithm} - STUB IMPLEMENTATION")
            
            # Stub always returns True for testing
            return signature_info.get("status") == "stub"
            
        except Exception as e:
            logger.error(f"PQC verification error: {e}")
            return False
            
    def get_public_keys(self) -> Dict[str, str]:
        """Get public keys for verification."""
        try:
            keys = {}
            
            # Ed25519 public key
            if self.verify_key:
                keys["ed25519"] = base64.b64encode(self.verify_key.to_bytes()).decode('ascii')
                
            # PQC public keys (stub)
            if self.pqc_enabled:
                keys["dilithium"] = base64.b64encode(b"pqc_stub_public_key").decode('ascii')
                
            return keys
            
        except Exception as e:
            logger.error(f"Error getting public keys: {e}")
            return {}
            
    def sign_run_metadata(self, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Sign run metadata for attestation."""
        try:
            # Add timestamp and run ID
            metadata["signed_at"] = int(time.time())
            metadata["run_id"] = metadata.get("run_id", "unknown")
            
            # Sign with Ed25519
            signature_info = self.sign_response(metadata)
            
            # Add PQC signature if enabled
            if self.pqc_enabled:
                metadata_bytes = json.dumps(metadata, sort_keys=True).encode('utf-8')
                pqc_sig = self.pqc_sign(metadata_bytes)
                signature_info["pqc"] = pqc_sig
                
            return {
                "metadata": metadata,
                "signatures": signature_info
            }
            
        except Exception as e:
            logger.error(f"Error signing run metadata: {e}")
            return {"metadata": metadata, "signatures": {}}


def create_request_id() -> str:
    """Generate a unique request ID."""
    import uuid
    return str(uuid.uuid4())


def extract_hmac_signature(headers: Dict[str, str]) -> Optional[str]:
    """Extract HMAC signature from request headers."""
    # Try different header names
    for header_name in ["X-HMAC-Signature", "X-Signature", "Authorization"]:
        value = headers.get(header_name, "")
        if value.startswith("HMAC-SHA256 "):
            return value[12:]  # Remove "HMAC-SHA256 " prefix
        elif value and header_name in ["X-HMAC-Signature", "X-Signature"]:
            return value
    return None


def validate_request_hmac(request_data: bytes, headers: Dict[str, str], security_manager: SecurityManager) -> bool:
    """Validate HMAC for incoming request."""
    try:
        signature = extract_hmac_signature(headers)
        if not signature:
            logger.warning("No HMAC signature found in request headers")
            return False
            
        return security_manager.validate_hmac(request_data, signature)
        
    except Exception as e:
        logger.error(f"Error validating request HMAC: {e}")
        return False


# Global security manager instance
security_manager = None


def init_security_manager(hmac_key: str, signing_secret: str = "", pqc_enabled: bool = False) -> SecurityManager:
    """Initialize global security manager."""
    global security_manager
    security_manager = SecurityManager(hmac_key, signing_secret, pqc_enabled)
    return security_manager


def get_security_manager() -> Optional[SecurityManager]:
    """Get the global security manager."""
    return security_manager